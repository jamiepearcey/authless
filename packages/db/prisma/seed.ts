import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@beatthefine.london' },
    update: {},
    create: {
      email: 'admin@beatthefine.london',
      name: 'Admin User',
      hashedPassword,
      platformRole: 'admin',
      isEmailVerified: true,
      status: 'active',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create a default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      name: 'Default Tenant',
      status: 'active',
      invitePolicy: 'admin_only',
      emailVerificationBypassEnabled: false,
      locale: 'en',
      timezone: 'UTC',
      plan: 'free',
    },
  });

  console.log('✅ Default tenant created:', defaultTenant.slug);

  // Create admin membership for the default tenant
  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      userId: adminUser.id,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('✅ Admin membership created');

  // Create some contact reasons
  const contactReasons = [
    { key: 'technical', label: 'Technical Issue', description: 'Problems with the platform or features', icon: 'wrench' },
    { key: 'billing', label: 'Billing Question', description: 'Questions about pricing or payments', icon: 'credit-card' },
    { key: 'account', label: 'Account Issue', description: 'Problems with your account or access', icon: 'user' },
    { key: 'feature', label: 'Feature Request', description: 'Suggestions for new features', icon: 'lightbulb' },
    { key: 'general', label: 'General Inquiry', description: 'Other questions or feedback', icon: 'help-circle' },
  ];

  for (const reason of contactReasons) {
    await prisma.contactReason.upsert({
      where: { key: reason.key },
      update: {},
      create: {
        key: reason.key,
        label: reason.label,
        description: reason.description,
        icon: reason.icon,
        isActive: true,
        sortOrder: contactReasons.indexOf(reason),
      },
    });
  }

  console.log('✅ Contact reasons created');

  console.log('🎉 Database seeding completed!');
  console.log('📧 Admin email: admin@beatthefine.london');
  console.log('🔑 Admin password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
