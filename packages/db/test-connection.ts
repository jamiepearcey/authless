import { db } from "./src/client";

async function testConnection() {
  try {
    console.log("🔍 Testing database connection...");
    
    const userCount = await db.user.count();
    console.log("✅ Database connected! User count:", userCount);
    
    const notifications = await db.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log("📢 Recent notifications:", notifications.length);
    
    console.log("🎉 Database is working correctly!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    await db.$disconnect();
  }
}

testConnection();
