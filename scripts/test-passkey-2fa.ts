import { db } from "../packages/db/src/client";

async function testPasskeyAnd2FA() {
  console.log("🔐 Testing Passkey and 2FA functionality with PostgreSQL...");
  
  try {
    // Get the admin user for testing
    const user = await db.user.findUnique({
      where: { email: "admin@beatthefine.london" }
    });
    
    if (!user) {
      throw new Error("Admin user not found");
    }
    
    // Test 1: Passkey creation and management
    console.log("\n1️⃣ Testing passkey creation and management...");
    
    const testPasskey = await db.passkey.create({
      data: {
        userId: user.id,
        name: "Test Device",
        credentialId: "test-credential-id-123",
        publicKey: "test-public-key-data",
        signCount: 0,
        isActive: true,
      }
    });
    
    console.log("   ✅ Test passkey created:", testPasskey.id);
    console.log("   📱 Device name:", testPasskey.name);
    console.log("   🔑 Credential ID:", testPasskey.credentialId);
    
    // Test passkey lookup (for authentication)
    const userPasskeys = await db.passkey.findMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
    });
    
    console.log("   📊 Active passkeys for user:", userPasskeys.length);
    
    // Test 2: Authenticator code creation and management
    console.log("\n2️⃣ Testing authenticator code creation and management...");
    
    const testAuthCode = await db.authenticatorCode.create({
      data: {
        userId: user.id,
        name: "iPhone Authenticator",
        secret: "JBSWY3DPEHPK3PXP",
        isActive: true,
      }
    });
    
    console.log("   ✅ Test authenticator code created:", testAuthCode.id);
    console.log("   📱 Device name:", testAuthCode.name);
    console.log("   🔐 Secret (first 4 chars):", testAuthCode.secret.substring(0, 4) + "...");
    
    // Test authenticator code lookup
    const userAuthCodes = await db.authenticatorCode.findMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
    });
    
    console.log("   📊 Active authenticator codes for user:", userAuthCodes.length);
    
    // Test 3: Two-factor status update
    console.log("\n3️⃣ Testing two-factor status management...");
    
    // Enable 2FA for the user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    
    console.log("   ✅ Two-factor authentication enabled:", updatedUser.twoFactorEnabled);
    
    // Test 4: 2FA verification scenario
    console.log("\n4️⃣ Testing 2FA verification scenarios...");
    
    // Update authenticator code usage
    const usedAuthCode = await db.authenticatorCode.update({
      where: { id: testAuthCode.id },
      data: { lastUsedAt: new Date() },
    });
    
    console.log("   ✅ Authenticator code marked as used");
    console.log("   ⏰ Last used at:", usedAuthCode.lastUsedAt);
    
    // Update passkey usage
    const usedPasskey = await db.passkey.update({
      where: { id: testPasskey.id },
      data: { 
        signCount: 1,
        lastUsedAt: new Date(),
      },
    });
    
    console.log("   ✅ Passkey signCount updated to:", usedPasskey.signCount);
    
    // Test 5: User's complete 2FA status
    console.log("\n5️⃣ Testing complete 2FA status query...");
    
    const userWith2FA = await db.user.findUnique({
      where: { id: user.id },
      include: {
        passkeys: {
          where: { isActive: true },
          select: { id: true, name: true, lastUsedAt: true }
        },
        authenticatorCodes: {
          where: { isActive: true },
          select: { id: true, name: true, lastUsedAt: true }
        }
      }
    });
    
    if (userWith2FA) {
      console.log("   🔒 Two-factor enabled:", userWith2FA.twoFactorEnabled);
      console.log("   🔐 Active passkeys:", userWith2FA.passkeys.length);
      console.log("   📱 Active authenticator codes:", userWith2FA.authenticatorCodes.length);
      
      const has2FAMethods = userWith2FA.passkeys.length > 0 || userWith2FA.authenticatorCodes.length > 0;
      console.log("   ✅ Has 2FA methods configured:", has2FAMethods);
    }
    
    // Test 6: Cleanup test data
    console.log("\n6️⃣ Cleaning up test data...");
    
    await db.passkey.delete({ where: { id: testPasskey.id } });
    await db.authenticatorCode.delete({ where: { id: testAuthCode.id } });
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });
    
    console.log("   🧹 Test data cleaned up");
    
    console.log("\n🎉 All Passkey and 2FA tests passed!");
    console.log("\n📊 Summary:");
    console.log(`   - Passkey creation/management: Working ✅`);
    console.log(`   - Authenticator code management: Working ✅`);
    console.log(`   - Two-factor status management: Working ✅`);
    console.log(`   - 2FA verification scenarios: Working ✅`);
    console.log(`   - Complete 2FA status queries: Working ✅`);
    console.log(`   - Data cleanup: Working ✅`);
    
  } catch (error) {
    console.error("❌ Passkey and 2FA test failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testPasskeyAnd2FA()
  .then(() => {
    console.log("\n✅ Passkey and 2FA system verification complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Passkey and 2FA system verification failed!");
    process.exit(1);
  });
