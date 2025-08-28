import { db } from "../packages/db/src/client";

async function testNotificationQuery() {
  console.log("🧪 Testing fixed notification query...");
  
  try {
    // Get the admin user
    const adminUser = await db.user.findFirst({
      where: { email: "admin@beatthefine.london" },
      select: { id: true, email: true }
    });
    
    if (!adminUser) {
      throw new Error("Admin user not found");
    }
    
    console.log("Testing query for user:", adminUser.email);
    
    // Test the exact query structure from getUserNotifications (with the fix)
    const notifications = await db.notificationRecipient.findMany({
      where: {
        userId: adminUser.id,
        notification: {
          OR: [
            { expiresAt: null }, // Notifications with no expiration
            { expiresAt: { gte: new Date() } }, // Notifications that haven't expired yet
          ],
        },
      },
      include: {
        notification: {
          select: { title: true, type: true, priority: true }
        }
      },
      orderBy: {
        notification: {
          createdAt: "desc",
        },
      },
      take: 5,
    });
    
    console.log(`\n✅ Found ${notifications.length} notifications with fixed query:`);
    notifications.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.notification.title} (${item.notification.type}/${item.notification.priority})`);
    });
    
    // Also test the unread count query
    const unreadCount = await db.notificationRecipient.count({
      where: {
        userId: adminUser.id,
        status: "unread",
        notification: {
          OR: [
            { expiresAt: null }, // Notifications with no expiration
            { expiresAt: { gte: new Date() } }, // Notifications that haven't expired yet
          ],
        },
      },
    });
    
    console.log(`\n📊 Unread count: ${unreadCount}`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testNotificationQuery()
  .then(() => {
    console.log("\n✅ Notification query test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Notification query test failed!");
    process.exit(1);
  });
