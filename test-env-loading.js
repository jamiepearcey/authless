// Test environment variable loading from the web app context
const { db } = require("./packages/db/src/client");

async function testEnvLoading() {
  try {
    console.log("🔍 Testing environment variable loading from web app context...");
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set (hidden for security)" : "Not set");
    
    // Test database connection
    const userCount = await db.user.count();
    console.log("✅ Database connection successful! User count:", userCount);
    
    await db.$disconnect();
    console.log("🎉 Environment variable loading test passed!");
  } catch (error) {
    console.error("❌ Environment variable loading test failed:", error.message);
  }
}

testEnvLoading();
