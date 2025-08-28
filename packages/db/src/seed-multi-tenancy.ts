import { db } from "@db/base"
import bcrypt from "bcryptjs";


async function main() {
  console.log("🌱 Seeding multi-tenancy system...");

  // Create platform admin user
  console.log("Creating platform admin...");
  const platformAdminEmail = "admin@example.com";
  
  let platformAdmin = await db.user.findUnique({
    where: { email: platformAdminEmail },
  });

  if (!platformAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    platformAdmin = await db.user.create({
      data: {
        email: platformAdminEmail,
        name: "Platform Admin",
        hashedPassword,
        isEmailVerified: true,
        platformRole: "admin",
      },
    });
    
    console.log("✅ Created platform admin:", platformAdmin.email);
  } else {
    // Update existing user to be platform admin
    await db.user.update({
      where: { id: platformAdmin.id },
      data: { platformRole: "admin" },
    });
    console.log("✅ Updated existing user to platform admin:", platformAdmin.email);
  }

  // Create sample tenants
  const sampleTenants = [
    {
      slug: "acme-corp",
      name: "Acme Corporation",
      subdomain: "acme",
      plan: "pro",
      invitePolicy: "admin_only" as const,
    },
    {
      slug: "startup-xyz",
      name: "Startup XYZ",
      subdomain: "startup",
      plan: "free",
      invitePolicy: "open" as const,
    },
    {
      slug: "enterprise-llc",
      name: "Enterprise LLC",
      subdomain: "enterprise",
      plan: "enterprise",
      invitePolicy: "admin_only" as const,
    },
  ];

  for (const tenantData of sampleTenants) {
    console.log(`Creating tenant: ${tenantData.name}...`);
    
    const existingTenant = await db.tenant.findUnique({
      where: { slug: tenantData.slug },
    });

    if (existingTenant) {
      console.log(`✅ Tenant ${tenantData.name} already exists`);
      continue;
    }

    const tenant = await db.tenant.create({
      data: tenantData,
    });

    console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug})`);

    // Create tenant admin membership for platform admin
    await db.membership.create({
      data: {
        tenantId: tenant.id,
        userId: platformAdmin.id,
        role: "admin",
        invitationAcceptedAt: new Date(),
      },
    });

    console.log(`✅ Added platform admin as tenant admin for ${tenant.name}`);

    // Create some sample members for each tenant
    const sampleMembers = [
      {
        email: `user1@${tenant.slug}.com`,
        name: `User 1 ${tenant.name}`,
        role: "member" as const,
      },
      {
        email: `user2@${tenant.slug}.com`,
        name: `User 2 ${tenant.name}`,
        role: "admin" as const,
      },
    ];

    for (const memberData of sampleMembers) {
      // Create user if doesn't exist
      let user = await db.user.findUnique({
        where: { email: memberData.email },
      });

      if (!user) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        
        user = await db.user.create({
          data: {
            email: memberData.email,
            name: memberData.name,
            hashedPassword,
            isEmailVerified: true,
          },
        });
        
        console.log(`  ✅ Created user: ${user.email}`);
      }

      // Create membership
      await db.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: memberData.role,
          invitedByUserId: platformAdmin.id,
          invitationAcceptedAt: new Date(),
        },
      });

      console.log(`  ✅ Added ${user.email} as ${memberData.role} to ${tenant.name}`);
    }
  }

  // Create some sample invitations
  console.log("Creating sample invitations...");
  
  const sampleInvitations = [
    {
      tenantSlug: "acme-corp",
      email: "invite1@acme.com",
      role: "member" as const,
      bypassEmailVerification: false,
    },
    {
      tenantSlug: "startup-xyz",
      email: "invite2@startup.com",
      role: "admin" as const,
      bypassEmailVerification: true,
    },
  ];

  for (const invitationData of sampleInvitations) {
    const tenant = await db.tenant.findUnique({
      where: { slug: invitationData.tenantSlug },
    });

    if (!tenant) continue;

    // Check if invitation already exists
    const existingInvitation = await db.invitation.findFirst({
      where: {
        tenantId: tenant.id,
        email: invitationData.email,
        status: "pending",
      },
    });

    if (existingInvitation) {
      console.log(`✅ Invitation for ${invitationData.email} already exists`);
      continue;
    }

    // Generate invitation token
    const token = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.invitation.create({
      data: {
        tenantId: tenant.id,
        email: invitationData.email,
        role: invitationData.role,
        token: require("crypto").createHash("sha256").update(token).digest("hex"),
        expiresAt,
        bypassEmailVerification: invitationData.bypassEmailVerification,
        invitedByUserId: platformAdmin.id,
      },
    });

    console.log(`✅ Created invitation for ${invitationData.email} to ${tenant.name}`);
  }

  console.log("🎉 Multi-tenancy seeding completed!");
  console.log("\n📋 Summary:");
  console.log(`- Platform Admin: ${platformAdmin.email}`);
  console.log(`- Sample Tenants: ${sampleTenants.length}`);
  console.log(`- Sample Users: ${sampleTenants.length * 2 + 1}`);
  console.log(`- Sample Invitations: ${sampleInvitations.length}`);
  
  console.log("\n🔑 Default Passwords:");
  console.log("- Platform Admin: admin123");
  console.log("- Sample Users: password123");
  
  console.log("\n🌐 Access URLs:");
  console.log("- Platform: http://localhost:3000");
  console.log("- ACME Corp: http://acme.localhost:3000 or http://localhost:3000/tenants/acme-corp");
  console.log("- Startup XYZ: http://startup.localhost:3000 or http://localhost:3000/tenants/startup-xyz");
  console.log("- Enterprise LLC: http://enterprise.localhost:3000 or http://localhost:3000/tenants/enterprise-llc");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding multi-tenancy:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
