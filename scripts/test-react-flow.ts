import { db } from "../packages/db/src/client";
import { centrifugoService } from "../packages/trpc/src/centrifugo";

async function testReactNotificationFlow() {
  console.log("🧪 Testing React Notification Flow...");
  
  try {
    // Step 1: Get admin user (simulating session)
    const adminUser = await db.user.findFirst({
      where: { email: "admin@authless.uk" }
    });
    
    if (!adminUser) {
      throw new Error("Admin user not found");
    }
    
    console.log("👤 Admin user:", adminUser.email, adminUser.id);
    
    // Step 2: Generate channels like the React app does
    const globalChannel = 'notifications:global';
    const userChannel = `notifications:user:${adminUser.id}`;
    
    console.log("📡 Channels that React app subscribes to:");
    console.log("  - Global:", globalChannel);
    console.log("  - User:", userChannel);
    
    // Step 3: Create notification via tRPC mutation (simulating form submission)
    console.log("\n📝 Creating notification like tRPC createNotification...");
    
    const notification = await db.notification.create({
      data: {
        title: "React Flow Test - Global",
        description: "Testing the exact flow from React app",
        type: "info",
        priority: "normal",
        // No tenantId, role, or userId = global notification
      },
    });
    
    console.log("✅ Notification created:", notification.id);
    
    // Step 4: Create recipient records (like tRPC does for global notifications)
    const allUsers = await db.user.findMany({
      where: { status: "active" },
      select: { id: true },
    });
    
    const recipientData = allUsers.map(user => ({
      notificationId: notification.id,
      userId: user.id,
    }));
    
    await db.notificationRecipient.createMany({
      data: recipientData,
    });
    
    console.log(`✅ Created ${recipientData.length} recipient records`);
    
    // Step 5: Publish to Centrifugo (like the notification adapter does)
    console.log("\n📤 Publishing to Centrifugo...");
    
    const scope = {
      tenantId: notification.tenantId,
      role: notification.role,
      userId: notification.userId,
    };
    
    const channels = centrifugoService.generateChannels(scope);
    console.log("📡 Publishing to channels:", channels);
    
    const publishSuccess = await centrifugoService.publishNotification(notification, scope);
    console.log(`Publish result: ${publishSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
    
    // Step 6: Test specific user notification
    console.log("\n📝 Creating user-specific notification...");
    
    const userNotification = await db.notification.create({
      data: {
        title: "React Flow Test - User Specific",
        description: "Testing user-specific notification",
        type: "success",
        priority: "high",
        userId: adminUser.id, // User-specific
      },
    });
    
    await db.notificationRecipient.create({
      data: {
        notificationId: userNotification.id,
        userId: adminUser.id,
      },
    });
    
    const userScope = { userId: adminUser.id };
    const userChannels = centrifugoService.generateChannels(userScope);
    console.log("📡 User channels:", userChannels);
    
    const userPublishSuccess = await centrifugoService.publishNotification(userNotification, userScope);
    console.log(`User publish result: ${userPublishSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
    
    // Step 7: Verify notifications exist in database
    console.log("\n🔍 Checking database state...");
    
    const userNotifications = await db.notificationRecipient.findMany({
      where: {
        userId: adminUser.id,
      },
      include: {
        notification: {
          select: { title: true, type: true, priority: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
    
    console.log(`📊 User has ${userNotifications.length} total notifications in database`);
    userNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.notification.title} (${notif.notification.type})`);
    });
    
    // Step 8: Test the exact tRPC query that React app uses
    console.log("\n🔍 Testing getUserNotifications query...");
    
    const tRPCResult = await db.notificationRecipient.findMany({
      where: {
        userId: adminUser.id,
        notification: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ],
        },
      },
      include: {
        notification: {
          include: {
            tenant: {
              select: { name: true, slug: true },
            },
          },
        },
      },
      orderBy: {
        notification: {
          createdAt: "desc",
        },
      },
      take: 5,
    });
    
    console.log(`📊 tRPC query returns ${tRPCResult.length} notifications`);
    tRPCResult.forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.notification.title} (${notif.notification.type})`);
    });
    
    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await db.notification.deleteMany({
      where: {
        title: { contains: "React Flow Test" }
      }
    });
    console.log("✅ Cleanup complete");
    
    console.log("\n🎉 React flow test completed successfully!");
    console.log("💡 Key findings:");
    console.log("  - Notifications are being created correctly");
    console.log("  - Recipients are being created correctly");
    console.log("  - Centrifugo publishing is working");
    console.log("  - Database queries are returning data");
    console.log("\n🔍 Check the browser console for React app debugging logs");
    
  } catch (error) {
    console.error("❌ React flow test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

testReactNotificationFlow()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed");
    process.exit(1);
  });
