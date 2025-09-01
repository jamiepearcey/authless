import { db } from "../packages/db/src/client";
import { centrifugoService } from "../packages/trpc/src/centrifugo";
import { Centrifuge } from "centrifuge";

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class NotificationE2ETest {
  private results: TestResult[] = [];
  private adminUser: any;

  async runTest(): Promise<TestResult[]> {
    console.log("🧪 Starting End-to-End Notification Test...\n");

    await this.step1_DatabaseSetup();
    await this.step2_CentrifugoConnection();
    await this.step3_TokenGeneration();
    await this.step4_ClientConnection();
    await this.step5_ChannelSubscription();
    await this.step6_CreateNotification();
    await this.step7_VerifyDelivery();
    await this.step8_DatabaseVerification();
    await this.step9_Cleanup();

    this.printSummary();
    return this.results;
  }

  private async runStep(stepName: string, stepFn: () => Promise<any>): Promise<void> {
    const start = Date.now();
    try {
      console.log(`⏳ ${stepName}...`);
      const result = await stepFn();
      const duration = Date.now() - start;
      
      this.results.push({
        step: stepName,
        success: true,
        duration,
        details: result
      });
      
      console.log(`✅ ${stepName} (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - start;
      
      this.results.push({
        step: stepName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`❌ ${stepName} failed (${duration}ms): ${error}\n`);
      throw error;
    }
  }

  private async step1_DatabaseSetup(): Promise<any> {
    return this.runStep("Step 1: Database Setup", async () => {
      // Get admin user
      this.adminUser = await db.user.findFirst({
        where: { email: "admin@authless.uk" },
        select: { id: true, email: true, name: true }
      });

      if (!this.adminUser) {
        throw new Error("Admin user not found");
      }

      // Check database connectivity
      const userCount = await db.user.count();
      const notificationCount = await db.notification.count();
      
      return {
        adminUser: this.adminUser,
        userCount,
        notificationCount
      };
    });
  }

  private async step2_CentrifugoConnection(): Promise<any> {
    return this.runStep("Step 2: Centrifugo Server Connection", async () => {
      const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
      
      // Test health endpoint
      const healthResponse = await fetch(`${centrifugoUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Centrifugo health check failed: ${healthResponse.statusText}`);
      }

      // Test API endpoint
      const apiKey = process.env.CENTRIFUGO_API_KEY || "your-api-key-change-in-production";
      const infoResponse = await fetch(`${centrifugoUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `apikey ${apiKey}`,
        },
        body: JSON.stringify({}),
      });

      if (!infoResponse.ok) {
        throw new Error(`Centrifugo API check failed: ${infoResponse.statusText}`);
      }

      const info = await infoResponse.json();
      
      return {
        url: centrifugoUrl,
        health: "OK",
        apiAccess: "OK",
        version: info.result?.nodes?.[0]?.version || 'unknown'
      };
    });
  }

  private async step3_TokenGeneration(): Promise<any> {
    return this.runStep("Step 3: JWT Token Generation", async () => {
      const token = centrifugoService.generateToken(this.adminUser.id, 3600);
      
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error("Invalid JWT token generated");
      }

      const channels = centrifugoService.generateChannels({ userId: this.adminUser.id });
      
      return {
        tokenGenerated: true,
        tokenLength: token.length,
        channels
      };
    });
  }

  private async step4_ClientConnection(): Promise<any> {
    return this.runStep("Step 4: Client WebSocket Connection", async () => {
      const token = centrifugoService.generateToken(this.adminUser.id, 3600);
      const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
      const wsUrl = centrifugoUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/connection/websocket';
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout after 10 seconds"));
        }, 10000);

        const centrifuge = new Centrifuge(wsUrl, { 
          token,
          debug: true
        });

        centrifuge.on('connected', (ctx) => {
          clearTimeout(timeout);
          centrifuge.disconnect();
          resolve({
            connected: true,
            client: ctx.client || 'unknown',
            transport: ctx.transport || 'unknown'
          });
        });

        centrifuge.on('error', (ctx) => {
          clearTimeout(timeout);
          reject(new Error(`Connection error: ${ctx.error?.message || 'Unknown error'}`));
        });

        centrifuge.connect();
      });
    });
  }

  private async step5_ChannelSubscription(): Promise<any> {
    return this.runStep("Step 5: Channel Subscription", async () => {
      const token = centrifugoService.generateToken(this.adminUser.id, 3600);
      const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
      const wsUrl = centrifugoUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/connection/websocket';
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Subscription timeout after 10 seconds"));
        }, 10000);

        const centrifuge = new Centrifuge(wsUrl, { token });
        const testChannel = `notifications:user:${this.adminUser.id}`;
        
        centrifuge.on('connected', () => {
          const sub = centrifuge.newSubscription(testChannel);
          
          sub.on('subscribed', (ctx) => {
            clearTimeout(timeout);
            centrifuge.disconnect();
            resolve({
              subscribed: true,
              channel: testChannel,
              recovered: ctx.recovered || false
            });
          });

          sub.on('error', (ctx) => {
            clearTimeout(timeout);
            centrifuge.disconnect();
            reject(new Error(`Subscription error: ${ctx.error?.message || 'Unknown error'}`));
          });

          sub.subscribe();
        });

        centrifuge.on('error', (ctx) => {
          clearTimeout(timeout);
          reject(new Error(`Connection error: ${ctx.error?.message || 'Unknown error'}`));
        });

        centrifuge.connect();
      });
    });
  }

  private async step6_CreateNotification(): Promise<any> {
    return this.runStep("Step 6: Create Notification", async () => {
      // Create notification in database
      const notification = await db.notification.create({
        data: {
          title: "E2E Test Notification",
          description: "This notification was created during the E2E test",
          type: "info",
          priority: "normal",
        },
      });

      // Create recipient record
      await db.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: this.adminUser.id,
        },
      });

      // Publish to Centrifugo
      const publishSuccess = await centrifugoService.publishNotification(
        notification,
        { userId: this.adminUser.id }
      );

      if (!publishSuccess) {
        throw new Error("Failed to publish notification to Centrifugo");
      }

      return {
        notificationId: notification.id,
        published: publishSuccess,
        channels: centrifugoService.generateChannels({ userId: this.adminUser.id })
      };
    });
  }

  private async step7_VerifyDelivery(): Promise<any> {
    return this.runStep("Step 7: Verify Message Delivery", async () => {
      const token = centrifugoService.generateToken(this.adminUser.id, 3600);
      const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
      const wsUrl = centrifugoUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/connection/websocket';
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Message delivery verification timeout after 15 seconds"));
        }, 15000);

        const centrifuge = new Centrifuge(wsUrl, { token });
        const testChannel = `notifications:user:${this.adminUser.id}`;
        let messageReceived = false;
        
        centrifuge.on('connected', async () => {
          const sub = centrifuge.newSubscription(testChannel);
          
          sub.on('publication', (ctx) => {
            messageReceived = true;
            clearTimeout(timeout);
            centrifuge.disconnect();
            resolve({
              messageReceived: true,
              messageData: ctx.data,
              channel: testChannel
            });
          });

          sub.on('subscribed', async () => {
            // Create and publish a test notification after subscription
            const testNotification = await db.notification.create({
              data: {
                title: "E2E Delivery Test",
                description: "Testing real-time delivery",
                type: "success",
                priority: "high",
              },
            });

            await db.notificationRecipient.create({
              data: {
                notificationId: testNotification.id,
                userId: this.adminUser.id,
              },
            });

            await centrifugoService.publishNotification(
              testNotification,
              { userId: this.adminUser.id }
            );
          });

          sub.subscribe();
        });

        centrifuge.connect();
      });
    });
  }

  private async step8_DatabaseVerification(): Promise<any> {
    return this.runStep("Step 8: Database Verification", async () => {
      // Count notifications created during test
      const testNotifications = await db.notification.findMany({
        where: {
          title: {
            contains: "E2E"
          }
        },
        include: {
          recipients: {
            where: {
              userId: this.adminUser.id
            }
          }
        }
      });

      const recipientCount = testNotifications.reduce(
        (sum, notif) => sum + notif.recipients.length, 
        0
      );

      return {
        testNotificationsCreated: testNotifications.length,
        recipientRecordsCreated: recipientCount,
        notifications: testNotifications.map(n => ({
          id: n.id,
          title: n.title,
          hasRecipients: n.recipients.length > 0
        }))
      };
    });
  }

  private async step9_Cleanup(): Promise<any> {
    return this.runStep("Step 9: Cleanup Test Data", async () => {
      // Delete test notifications
      const deleted = await db.notification.deleteMany({
        where: {
          title: {
            contains: "E2E"
          }
        }
      });

      return {
        deletedNotifications: deleted.count
      };
    });
  }

  private printSummary(): void {
    console.log("📊 E2E Test Summary:");
    console.log("=".repeat(50));
    
    const totalSteps = this.results.length;
    const successfulSteps = this.results.filter(r => r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Steps: ${totalSteps}`);
    console.log(`Successful: ${successfulSteps}`);
    console.log(`Failed: ${totalSteps - successfulSteps}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((successfulSteps / totalSteps) * 100).toFixed(1)}%`);
    
    console.log("\nStep Details:");
    this.results.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${index + 1}. ${status} ${result.step} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (successfulSteps === totalSteps) {
      console.log("\n🎉 All tests passed! Notification system is working correctly.");
    } else {
      console.log("\n⚠️  Some tests failed. Check the errors above.");
    }
  }
}

// Run the test
async function runE2ETest() {
  const test = new NotificationE2ETest();
  
  try {
    await test.runTest();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E Test failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runE2ETest();
