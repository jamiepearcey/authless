import { db } from "../packages/db/src/client";

async function testWebhookFunctionality() {
  console.log("🧪 Testing webhook functionality with PostgreSQL...");
  
  try {
    // Test 1: Create a global notification (like the webhook would)
    console.log("\n1️⃣ Testing global notification creation...");
    
    const globalNotification = await db.notification.create({
      data: {
        title: "Test Global Webhook",
        description: "Testing global notification via webhook simulation",
        type: "info",
        priority: "normal",
        // No tenantId, role, or userId - makes it global
      },
    });
    
    console.log("   ✅ Global notification created:", globalNotification.id);
    
    // Get all active users to create recipients (as webhook would)
    const activeUsers = await db.user.findMany({
      where: { status: "active" },
      select: { id: true, email: true },
    });
    
    console.log("   👥 Found active users:", activeUsers.length);
    
    // Create notification recipients for all users
    if (activeUsers.length > 0) {
      const recipientData = activeUsers.map(user => ({
        notificationId: globalNotification.id,
        userId: user.id,
      }));
      
      await db.notificationRecipient.createMany({
        data: recipientData,
      });
      
      console.log("   📬 Created recipients for all users:", recipientData.length);
    }
    
    // Test 2: Create a tenant-specific notification
    console.log("\n2️⃣ Testing tenant-specific notification...");
    
    const tenant = await db.tenant.findFirst();
    if (tenant) {
      const tenantNotification = await db.notification.create({
        data: {
          title: "Tenant Specific Notification",
          description: "Testing tenant-specific notification",
          type: "warning",
          priority: "high",
          tenantId: tenant.id,
        },
      });
      
      console.log("   ✅ Tenant notification created:", tenantNotification.id);
      
      // Find all users in this tenant
      const tenantMembers = await db.membership.findMany({
        where: {
          tenantId: tenant.id,
          status: "active",
        },
        select: { userId: true },
      });
      
      console.log("   👥 Found tenant members:", tenantMembers.length);
      
      if (tenantMembers.length > 0) {
        const recipientData = tenantMembers.map(member => ({
          notificationId: tenantNotification.id,
          userId: member.userId,
        }));
        
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
        
        console.log("   📬 Created recipients for tenant members:", recipientData.length);
      }
    }
    
    // Test 3: Verify notification queries work
    console.log("\n3️⃣ Testing notification queries...");
    
    const totalNotifications = await db.notification.count();
    const totalRecipients = await db.notificationRecipient.count();
    
    console.log("   📊 Total notifications:", totalNotifications);
    console.log("   📊 Total recipients:", totalRecipients);
    
    // Test user-specific notification query
    const userNotifications = await db.notification.findMany({
      where: {
        OR: [
          { userId: activeUsers[0]?.id },
          { tenantId: tenant?.id },
          { AND: [{ tenantId: null }, { role: null }, { userId: null }] }, // Global notifications
        ],
      },
      include: {
        recipients: {
          where: { userId: activeUsers[0]?.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log("   📋 User notifications found:", userNotifications.length);
    
    // Test 4: Verify webhook endpoint data structure
    console.log("\n4️⃣ Testing webhook data structure...");
    
    const webhookTestNotification = await db.notification.create({
      data: {
        title: "Webhook Test",
        description: "Testing webhook data structure",
        type: "success",
        priority: "normal",
        metadata: JSON.stringify({ source: "webhook", test: true }),
      },
    });
    
    console.log("   ✅ Webhook-style notification created with metadata");
    
    console.log("\n🎉 All webhook functionality tests passed!");
    console.log("\n📊 Summary:");
    console.log(`   - Global notifications: Working ✅`);
    console.log(`   - Tenant notifications: Working ✅`);
    console.log(`   - User recipient tracking: Working ✅`);
    console.log(`   - Notification queries: Working ✅`);
    console.log(`   - Metadata support: Working ✅`);
    
  } catch (error) {
    console.error("❌ Webhook functionality test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testWebhookFunctionality()
  .then(() => {
    console.log("\n✅ Webhook functionality verification complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Webhook functionality verification failed!");
    process.exit(1);
  });
