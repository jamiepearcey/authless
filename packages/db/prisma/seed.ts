import { db } from '../src/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await db.user.upsert({
    where: { email: 'admin@authless.uk' },
    update: {},
    create: {
      email: 'admin@authless.uk',
      name: 'Admin User',
      hashedPassword,
      platformRole: 'admin',
      isEmailVerified: true,
      status: 'active',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create a default tenant
  const defaultTenant = await db.tenant.upsert({
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
      domainAlias: null,
      registrationClosed: false,
    },
  });

  console.log('✅ Default tenant created:', defaultTenant.slug);

  // Create admin membership for the default tenant
  await db.membership.upsert({
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

  // Create demoday.deepintrospect.com tenant
  const demodayTenant = await db.tenant.upsert({
    where: { slug: 'demoday' },
    update: {},
    create: {
      slug: 'demoday',
      name: 'Demo Day',
      status: 'active',
      domainAlias: 'demoday.deepintrospect.com',
      invitePolicy: 'admin_only',
      emailVerificationBypassEnabled: false,
      locale: 'en',
      timezone: 'UTC',
      plan: 'free',
      registrationClosed: false,
    },
  });

  console.log('✅ Demoday tenant created:', demodayTenant.slug);

  // Create a tenant admin user for demoday
  const demodayUserPassword = 'demoday123';
  const demodayUserHashedPassword = await bcrypt.hash(demodayUserPassword, 12);
  
  const demodayUser = await db.user.upsert({
    where: { email: 'admin@demoday.deepintrospect.com' },
    update: {},
    create: {
      email: 'admin@demoday.deepintrospect.com',
      name: 'Demoday Admin',
      hashedPassword: demodayUserHashedPassword,
      platformRole: null, // Not a platform admin
      isEmailVerified: true,
      status: 'active',
    },
  });

  console.log('✅ Demoday user created:', demodayUser.email);

  // Create admin membership for the demoday tenant
  await db.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: demodayTenant.id,
        userId: demodayUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demodayTenant.id,
      userId: demodayUser.id,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('✅ Demoday tenant admin membership created');

  // Create some contact reasons
  const contactReasons = [
    { key: 'technical', label: 'Technical Issue', description: 'Problems with the platform or features', icon: 'wrench' },
    { key: 'billing', label: 'Billing Question', description: 'Questions about pricing or payments', icon: 'credit-card' },
    { key: 'account', label: 'Account Issue', description: 'Problems with your account or access', icon: 'user' },
    { key: 'feature', label: 'Feature Request', description: 'Suggestions for new features', icon: 'lightbulb' },
    { key: 'general', label: 'General Inquiry', description: 'Other questions or feedback', icon: 'help-circle' },
  ];

  for (const reason of contactReasons) {
    await db.contactReason.upsert({
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
  console.log('📧 Admin email: admin@authless.uk');
  console.log('🔑 Admin password: admin123');
  console.log('📧 Demoday admin email: admin@demoday.deepintrospect.com');
  console.log('🔑 Demoday admin password: demoday123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
