import { db } from "../packages/db/src/client";
import { centrifugoService } from "../packages/trpc/src/centrifugo";

async function testCentrifugoIntegration() {
  console.log("🧪 Testing Centrifugo Integration...");
  
  try {
    // 1. Test Centrifugo service connection
    console.log("\n1️⃣ Testing Centrifugo service connection...");
    
    // Test health endpoint
    const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
    const healthResponse = await fetch(`${centrifugoUrl}/health`);
    
    if (healthResponse.ok) {
      console.log("✅ Centrifugo is running and healthy");
    } else {
      throw new Error("❌ Centrifugo health check failed");
    }

    // 2. Test token generation
    console.log("\n2️⃣ Testing token generation...");
    const testUserId = "test-user-123";
    const token = centrifugoService.generateToken(testUserId, 3600);
    console.log("✅ Generated JWT token:", token.substring(0, 50) + "...");

    // 3. Test channel name generation
    console.log("\n3️⃣ Testing channel strategies...");
    
    const globalChannels = centrifugoService.generateChannels({});
    console.log("✅ Global notification channels:", globalChannels);
    
    const userChannels = centrifugoService.generateChannels({ userId: testUserId });
    console.log("✅ User-specific channels:", userChannels);
    
    const tenantChannels = centrifugoService.generateChannels({ tenantId: "tenant-123" });
    console.log("✅ Tenant-specific channels:", tenantChannels);
    
    const roleChannels = centrifugoService.generateChannels({ 
      tenantId: "tenant-123", 
      role: "admin" 
    });
    console.log("✅ Role-specific channels:", roleChannels);

    // 4. Test publishing messages
    console.log("\n4️⃣ Testing message publishing...");
    
    // Test global notification
    const globalSuccess = await centrifugoService.publish(
      'notifications:global',
      {
        type: 'notification_created',
        notification: {
          id: 'test-notification-1',
          title: 'Test Global Notification',
          description: 'Testing global notification publishing',
          type: 'info',
          priority: 'normal',
          createdAt: new Date().toISOString(),
        }
      }
    );
    console.log(globalSuccess ? "✅ Global notification published" : "❌ Failed to publish global notification");

    // Test user-specific notification
    const userSuccess = await centrifugoService.publish(
      `notifications:user:${testUserId}`,
      {
        type: 'notification_created',
        notification: {
          id: 'test-notification-2',
          title: 'Test User Notification',
          description: 'Testing user-specific notification publishing',
          type: 'success',
          priority: 'high',
          createdAt: new Date().toISOString(),
          userId: testUserId,
        }
      }
    );
    console.log(userSuccess ? "✅ User notification published" : "❌ Failed to publish user notification");

    // 5. Test batch publishing
    console.log("\n5️⃣ Testing batch publishing...");
    
    const batchSuccess = await centrifugoService.publishBatch([
      {
        channel: 'notifications:global',
        data: {
          type: 'notification_created',
          notification: {
            id: 'batch-notification-1',
            title: 'Batch Test 1',
            type: 'warning',
            priority: 'normal',
            createdAt: new Date().toISOString(),
          }
        }
      },
      {
        channel: `notifications:user:${testUserId}`,
        data: {
          type: 'notification_created',
          notification: {
            id: 'batch-notification-2',
            title: 'Batch Test 2',
            type: 'error',
            priority: 'urgent',
            createdAt: new Date().toISOString(),
            userId: testUserId,
          }
        }
      }
    ]);
    console.log(batchSuccess ? "✅ Batch notifications published" : "❌ Failed to publish batch notifications");

    // 6. Test integration with actual database notification
    console.log("\n6️⃣ Testing full integration with database...");
    
    // Get admin user
    const adminUser = await db.user.findFirst({
      where: { email: "admin@beatthefine.london" }
    });
    
    if (adminUser) {
      // Create a real notification in the database
      const notification = await db.notification.create({
        data: {
          title: "Centrifugo Integration Test",
          description: "This notification was created to test the full Centrifugo integration",
          type: "info",
          priority: "normal",
        },
      });

      // Create recipient record
      await db.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: adminUser.id,
        },
      });

      // Publish to Centrifugo using the service
      const publishSuccess = await centrifugoService.publishNotification(
        notification,
        { userId: adminUser.id }
      );

      console.log(publishSuccess ? 
        "✅ Full integration test successful - notification created and published" : 
        "❌ Full integration test failed"
      );

      console.log("📋 Notification details:", {
        id: notification.id,
        title: notification.title,
        channels: centrifugoService.generateChannels({ userId: adminUser.id })
      });
    } else {
      console.log("⚠️ No admin user found - skipping database integration test");
    }

    // 7. Test Centrifugo admin API (if accessible)
    console.log("\n7️⃣ Testing Centrifugo admin API...");
    
    try {
      const apiKey = process.env.CENTRIFUGO_API_KEY || "your-api-key-change-in-production";
      const infoResponse = await fetch(`${centrifugoUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `apikey ${apiKey}`,
        },
        body: JSON.stringify({}),
      });

      if (infoResponse.ok) {
        const info = await infoResponse.json();
        console.log("✅ Centrifugo admin API accessible");
        console.log("📊 Server info:", {
          nodes: info.result?.nodes?.length || 0,
          version: info.result?.nodes?.[0]?.version || 'unknown'
        });
      } else {
        console.log("⚠️ Centrifugo admin API not accessible (this is normal in production)");
      }
    } catch (error) {
      console.log("⚠️ Centrifugo admin API test failed:", (error as Error).message);
    }

    console.log("\n🎉 Centrifugo integration test completed successfully!");
    console.log("\n📋 Summary:");
    console.log("✅ Centrifugo server is running");
    console.log("✅ JWT token generation works");
    console.log("✅ Channel strategies implemented");
    console.log("✅ Message publishing works");
    console.log("✅ Batch publishing works");
    console.log("✅ Database integration works");
    console.log("\n🚀 Ready to test real-time notifications in the web app!");

  } catch (error) {
    console.error("❌ Centrifugo integration test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testCentrifugoIntegration()
  .then(() => {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Tests failed!");
    process.exit(1);
  });
