import { db } from "./src/client";

async function testNotification() {
  try {
    console.log("🔍 Testing notification creation...");
    
    // Create a test notification
    const notification = await db.notification.create({
      data: {
        title: "Test PostgreSQL Notification",
        description: "Testing notification system with PostgreSQL database",
        type: "info",
        priority: "normal",
      },
    });
    
    console.log("✅ Notification created:", notification.id);
    
    // Get all users to create notification recipients
    const users = await db.user.findMany({
      where: { status: "active" },
    });
    
    console.log("👥 Found users:", users.length);
    
    // Create notification recipients for all users
    if (users.length > 0) {
      const recipientData = users.map(user => ({
        notificationId: notification.id,
        userId: user.id,
      }));
      
      await db.notificationRecipient.createMany({
        data: recipientData,
      });
      
      console.log("📬 Created notification recipients:", recipientData.length);
    }
    
    // Verify the notification and recipients were created
    const notificationWithRecipients = await db.notification.findUnique({
      where: { id: notification.id },
      include: {
        recipients: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    });
    
    console.log("🎉 Notification system test successful!");
    console.log("📧 Recipients:", notificationWithRecipients?.recipients.map(r => r.user.email));
    
  } catch (error) {
    console.error("❌ Notification test failed:", error);
  } finally {
    await db.$disconnect();
  }
}

testNotification();
