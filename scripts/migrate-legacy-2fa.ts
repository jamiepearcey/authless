#!/usr/bin/env tsx
/**
 * Migration script to move legacy AuthenticatorCode entries to the unified TwoFactorMethod system
 * 
 * Usage: pnpm tsx scripts/migrate-legacy-2fa.ts
 */

import { db } from "@db/base";
import { twoFactorService } from "../packages/trpc/src/two-factor-service";

async function migrateLegacy2FA() {
  console.log("🔄 Starting migration of legacy 2FA data...");

  try {
    // Get all active legacy authenticator codes
    const legacyCodes = await db.authenticatorCode.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    console.log(`📊 Found ${legacyCodes.length} legacy authenticator codes to migrate`);

    if (legacyCodes.length === 0) {
      console.log("✅ No legacy codes found - migration complete!");
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const legacyCode of legacyCodes) {
      try {
        // Check if already migrated
        const existing = await db.twoFactorMethod.findFirst({
          where: {
            userId: legacyCode.userId,
            type: "totp",
            identifier: legacyCode.name,
          },
        });

        if (existing) {
          console.log(`⏭️  Skipping ${legacyCode.user.email} - ${legacyCode.name} (already migrated)`);
          skipped++;
          continue;
        }

        // Migrate to unified system
        await twoFactorService.enableTOTP2FA(
          legacyCode.userId,
          null, // Legacy codes don't have tenantId
          legacyCode.name,
          legacyCode.secret
        );

        console.log(`✅ Migrated ${legacyCode.user.email} - ${legacyCode.name}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate ${legacyCode.user.email} - ${legacyCode.name}:`, error);
        errors++;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${legacyCodes.length}`);

    if (errors === 0) {
      console.log("\n🎉 Migration completed successfully!");
      console.log("\n💡 Note: Legacy AuthenticatorCode entries are preserved for safety.");
      console.log("   You can manually clean them up after verifying the migration worked correctly.");
    } else {
      console.log("\n⚠️  Migration completed with errors. Please review the failed entries above.");
    }

  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateLegacy2FA()
  .then(() => {
    console.log("\n🏁 Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
