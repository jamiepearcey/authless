import { db } from "./client";

const BASELINE_FEATURES = [
  // Core features - essential platform functionality
  {
    key: "notifications",
    name: "Notifications",
    description: "Core notification system for user communications",
    tier: "Core",
    defaultEnabled: true
  },
  {
    key: "user_management",
    name: "User Management",
    description: "Core user registration, authentication, and profile management",
    tier: "Core",
    defaultEnabled: true
  },
  {
    key: "tenant_management",
    name: "Tenant Management", 
    description: "Core multi-tenancy and workspace management",
    tier: "Core",
    defaultEnabled: true
  },
  {
    key: "audit_logs",
    name: "Audit Logs",
    description: "Core security and compliance audit logging",
    tier: "Core",
    defaultEnabled: true
  },
  {
    key: "two_factor_auth",
    name: "Two-Factor Authentication",
    description: "Enhanced security with 2FA support",
    tier: "Core",
    defaultEnabled: false
  },

  // Secondary features - valuable but optional
  {
    key: "support_system",
    name: "Support System", 
    description: "Built-in customer support and ticketing system",
    tier: "Secondary",
    defaultEnabled: false
  },
  {
    key: "email_notifications",
    name: "Email Notifications",
    description: "Email delivery for notifications and alerts",
    tier: "Secondary",
    defaultEnabled: true
  },
  {
    key: "webhooks",
    name: "Webhooks",
    description: "External webhook integrations for events",
    tier: "Secondary",
    defaultEnabled: false
  },
  {
    key: "api_access",
    name: "API Access",
    description: "External API access and key management",
    tier: "Secondary",
    defaultEnabled: false
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Usage analytics and reporting dashboard",
    tier: "Secondary",
    defaultEnabled: false
  },
  {
    key: "bulk_operations",
    name: "Bulk Operations",
    description: "Batch processing for data import/export",
    tier: "Secondary",
    defaultEnabled: false
  },

  // Tenancy-only features - tenant-specific customizations
  {
    key: "custom_branding",
    name: "Custom Branding",
    description: "Tenant-specific logos, colors, and themes",
    tier: "Tenancy-only",
    defaultEnabled: true
  },
  {
    key: "sso_integration", 
    name: "SSO Integration",
    description: "Single Sign-On with external identity providers",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "discussion_wall",
    name: "Discussion Wall",
    description: "Internal team discussion and collaboration features",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "file_storage",
    name: "File Storage",
    description: "Document and file storage with sharing capabilities",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "custom_fields",
    name: "Custom Fields",
    description: "Tenant-defined custom data fields and forms",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "advanced_permissions",
    name: "Advanced Permissions",
    description: "Granular role-based access control system",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "scheduled_reports",
    name: "Scheduled Reports",
    description: "Automated report generation and delivery",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "mobile_app",
    name: "Mobile App Access",
    description: "Access via dedicated mobile applications",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "integrations",
    name: "Third-party Integrations",
    description: "Connect with external tools and services",
    tier: "Tenancy-only",
    defaultEnabled: false
  },
  {
    key: "white_label",
    name: "White Label Mode",
    description: "Complete platform rebranding and customization",
    tier: "Tenancy-only",
    defaultEnabled: false
  }
];

export async function seedFeatures() {
  console.log("🌱 Seeding baseline feature definitions...");

  // Create a system user for seeding (if not exists)
  let systemUser = await db.user.findFirst({
    where: { email: "system@platform.local" }
  });

  if (!systemUser) {
    systemUser = await db.user.create({
      data: {
        email: "system@platform.local",
        name: "System",
        platformRole: "admin",
        status: "active",
        isEmailVerified: true
      }
    });
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const featureData of BASELINE_FEATURES) {
    try {
      const existing = await db.featureDefinition.findUnique({
        where: { key: featureData.key }
      });

      if (existing) {
        // Update existing feature if needed
        await db.featureDefinition.update({
          where: { key: featureData.key },
          data: {
            name: featureData.name,
            description: featureData.description,
            tier: featureData.tier,
            defaultEnabled: featureData.defaultEnabled
          }
        });
        updatedCount++;
        console.log(`  ✅ Updated feature: ${featureData.key}`);
      } else {
        // Create new feature
        await db.featureDefinition.create({
          data: {
            ...featureData,
            createdBy: systemUser.id
          }
        });
        createdCount++;
        console.log(`  ✨ Created feature: ${featureData.key}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to seed feature ${featureData.key}:`, error);
    }
  }

  // Initialize setup state if it doesn't exist
  const setupState = await db.setupState.findUnique({
    where: { id: "singleton" }
  });

  if (!setupState) {
    await db.setupState.create({
      data: {
        id: "singleton",
        isCompleted: false,
        currentStep: "welcome"
      }
    });
    console.log("  ✨ Created initial setup state");
  }

  console.log(`\n🎉 Feature seeding completed!`);
  console.log(`   Created: ${createdCount} features`);
  console.log(`   Updated: ${updatedCount} features`);
  console.log(`   Total features: ${BASELINE_FEATURES.length}`);

  return {
    created: createdCount,
    updated: updatedCount,
    total: BASELINE_FEATURES.length
  };
}

// Export features for testing
export { BASELINE_FEATURES };
