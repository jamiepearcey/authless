import { db } from "../packages/db/src/client";

async function testNotificationCreation() {
  console.log("🧪 Testing notification creation via tRPC logic...");
  
  try {
    // Simulate the createNotification logic
    const { tenantId, role, userId } = {
      tenantId: undefined,
      role: undefined,
      userId: undefined,
    };
    
    console.log("Input:", { tenantId, role, userId });
    
    // Create the notification
    const notification = await db.notification.create({
      data: {
        title: "Test Notification Creation Logic",
        description: "Testing if the tRPC logic works correctly",
        type: "info",
        priority: "normal",
        tenantId: tenantId,
        role: role,
        userId: userId,
        metadata: null,
        expiresAt: null,
      },
    });
    
    console.log("✅ Notification created:", notification.id);
    
    // Now test the recipient creation logic
    if (userId) {
      console.log("Creating recipient for specific user...");
      await db.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: userId,
        },
      });
    } else if (tenantId && role) {
      console.log("Creating recipients for tenant + role...");
      const memberships = await db.membership.findMany({
        where: {
          tenantId: tenantId,
          role: role,
          status: "active",
        },
        select: { userId: true },
      });
      
      if (memberships.length > 0) {
        const recipientData = memberships.map(membership => ({
          notificationId: notification.id,
          userId: membership.userId,
        }));
        
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
        console.log("Created recipients for role:", recipientData.length);
      }
    } else if (tenantId) {
      console.log("Creating recipients for tenant...");
      const memberships = await db.membership.findMany({
        where: {
          tenantId: tenantId,
          status: "active",
        },
        select: { userId: true },
      });
      
      if (memberships.length > 0) {
        const recipientData = memberships.map(membership => ({
          notificationId: notification.id,
          userId: membership.userId,
        }));
        
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
        console.log("Created recipients for tenant:", recipientData.length);
      }
    } else {
      console.log("Creating recipients for ALL users (global notification)...");
      const allUsers = await db.user.findMany({
        where: { status: "active" },
        select: { id: true },
      });
      
      console.log("Found active users:", allUsers.length);
      
      if (allUsers.length > 0) {
        const recipientData = allUsers.map(user => ({
          notificationId: notification.id,
          userId: user.id,
        }));
        
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
        console.log("✅ Created global recipients:", recipientData.length);
      }
    }
    
    // Verify the notification and recipients were created
    const notificationWithRecipients = await db.notification.findUnique({
      where: { id: notification.id },
      include: {
        recipients: {
          include: {
            user: {
              select: { email: true }
            }
          }
        }
      }
    });
    
    console.log("🎉 Final result:");
    console.log("Notification ID:", notificationWithRecipients?.id);
    console.log("Recipients count:", notificationWithRecipients?.recipients.length);
    console.log("Recipient emails:", notificationWithRecipients?.recipients.map(r => r.user.email));
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testNotificationCreation()
  .then(() => {
    console.log("\n✅ Notification creation test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Notification creation test failed!");
    process.exit(1);
  });
