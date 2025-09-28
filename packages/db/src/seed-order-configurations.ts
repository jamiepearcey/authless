/**
 * Seed script for Order Configurations
 * 
 * This script creates sample order configurations to demonstrate the new
 * admin-configurable checkout system with various pricing models.
 */

import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding order configurations...');

  // Clear existing order configurations
  await prisma.orderConfigurationPricing.deleteMany();
  await prisma.orderConfiguration.deleteMany();

  // 1. Pro Subscription Plans
  const proPlans = await prisma.orderConfiguration.create({
    data: {
      name: 'Pro Plans',
      slug: 'pro-plans',
      description: 'Professional features with advanced analytics, priority support, and team collaboration tools.',
      shortDescription: 'Perfect for growing businesses and professional teams.',
      features: [
        'Advanced analytics dashboard',
        'Priority email support',
        'Team collaboration tools',
        'Custom integrations',
        'Advanced security features',
        'Monthly reporting',
        'API access',
        'Up to 50 team members'
      ],
      termsContent: `
        <h3>Pro Plans Terms of Service</h3>
        <p>By subscribing to our Pro Plans, you agree to the following terms:</p>
        <ul>
          <li>Your subscription will automatically renew unless cancelled 24 hours before the next billing cycle</li>
          <li>You may cancel your subscription at any time from your account settings</li>
          <li>No refunds are provided for partial months</li>
          <li>Support response time is guaranteed within 4 business hours</li>
          <li>Usage limits apply as specified in your plan</li>
        </ul>
        <p>For full terms, please see our <a href="/terms">Terms of Service</a>.</p>
      `,
      requiresTerms: true,
      displayOrder: 1,
      isActive: true,
      isPublic: true,
      category: 'subscription',
      tags: ['popular', 'business', 'teams'],
    },
  });

  // Pro Plans pricing options
  await prisma.orderConfigurationPricing.createMany({
    data: [
      {
        orderConfigurationId: proPlans.id,
        name: 'Monthly',
        amount: 2900, // £29.00
        currency: 'gbp',
        frequency: 'MONTHLY',
        isRecurring: true,
        discountPercent: 0,
        trialDays: 14,
        setupFee: 0,
        displayOrder: 1,
        isDefault: true,
        isPopular: false,
        isActive: true,
      },
      {
        orderConfigurationId: proPlans.id,
        name: 'Yearly',
        amount: 29000, // £290.00 (2 months free)
        currency: 'gbp',
        frequency: 'YEARLY',
        isRecurring: true,
        discountPercent: 17, // ~2 months free
        discountDescription: '2 months free - Save £58!',
        trialDays: 14,
        setupFee: 0,
        displayOrder: 2,
        isDefault: false,
        isPopular: true,
        isActive: true,
      },
    ],
  });

  // 2. Enterprise Solutions
  const enterprisePlans = await prisma.orderConfiguration.create({
    data: {
      name: 'Enterprise Solutions',
      slug: 'enterprise',
      description: 'Custom enterprise solutions with unlimited users, advanced security, dedicated support, and custom integrations.',
      shortDescription: 'Scalable solutions for large organizations.',
      features: [
        'Unlimited team members',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security & compliance',
        'SLA guarantees',
        'White-label options',
        'Custom training sessions',
        'Priority feature requests',
        'Advanced analytics & reporting',
        'SSO integration'
      ],
      termsContent: `
        <h3>Enterprise Solutions Terms</h3>
        <p>Enterprise solutions include:</p>
        <ul>
          <li>Custom service level agreements (SLA)</li>
          <li>Dedicated support team with 1-hour response time</li>
          <li>Monthly business reviews with your account manager</li>
          <li>Custom integration development available</li>
          <li>Flexible billing terms available</li>
        </ul>
        <p>Contact our sales team for detailed terms and custom pricing.</p>
      `,
      requiresTerms: true,
      displayOrder: 2,
      isActive: true,
      isPublic: true,
      category: 'enterprise',
      tags: ['enterprise', 'custom', 'unlimited'],
    },
  });

  // Enterprise pricing options
  await prisma.orderConfigurationPricing.createMany({
    data: [
      {
        orderConfigurationId: enterprisePlans.id,
        name: 'Monthly',
        amount: 9900, // £99.00
        currency: 'gbp',
        frequency: 'MONTHLY',
        isRecurring: true,
        discountPercent: 0,
        trialDays: 30,
        setupFee: 49900, // £499.00 setup fee
        displayOrder: 1,
        isDefault: true,
        isPopular: false,
        isActive: true,
      },
      {
        orderConfigurationId: enterprisePlans.id,
        name: 'Yearly',
        amount: 99000, // £990.00 (2 months free)
        currency: 'gbp',
        frequency: 'YEARLY',
        isRecurring: true,
        discountPercent: 17,
        discountDescription: '2 months free + waived setup fee',
        trialDays: 30,
        setupFee: 0, // Waived for yearly
        displayOrder: 2,
        isDefault: false,
        isPopular: true,
        isActive: true,
      },
    ],
  });

  // 3. Training & Onboarding Services
  const trainingServices = await prisma.orderConfiguration.create({
    data: {
      name: 'Training & Onboarding',
      slug: 'training',
      description: 'Comprehensive training and onboarding services to get your team up and running quickly.',
      shortDescription: 'Expert training to maximize your team productivity.',
      features: [
        'Live training sessions (4 hours)',
        'Custom training materials',
        'Team onboarding checklist',
        'Best practices guide',
        'Q&A session with experts',
        'Follow-up support (30 days)',
        'Training completion certificates',
        'Access to recorded sessions'
      ],
      termsContent: `
        <h3>Training Services Terms</h3>
        <p>Training services include:</p>
        <ul>
          <li>Live training sessions must be scheduled within 60 days of purchase</li>
          <li>Sessions can be rescheduled up to 48 hours in advance</li>
          <li>Materials provided are for internal use only</li>
          <li>Follow-up support is available for 30 days after training completion</li>
          <li>Additional training sessions can be purchased separately</li>
        </ul>
      `,
      requiresTerms: true,
      displayOrder: 3,
      isActive: true,
      isPublic: true,
      category: 'services',
      tags: ['training', 'onboarding', 'one-time'],
    },
  });

  // Training pricing options
  await prisma.orderConfigurationPricing.createMany({
    data: [
      {
        orderConfigurationId: trainingServices.id,
        name: 'Standard Training',
        amount: 79900, // £799.00
        currency: 'gbp',
        frequency: null,
        isRecurring: false,
        discountPercent: 0,
        trialDays: 0,
        setupFee: 0,
        displayOrder: 1,
        isDefault: true,
        isPopular: true,
        isActive: true,
      },
      {
        orderConfigurationId: trainingServices.id,
        name: 'Premium Training',
        amount: 129900, // £1,299.00
        currency: 'gbp',
        frequency: null,
        isRecurring: false,
        discountPercent: 0,
        discountDescription: 'Includes 2 additional follow-up sessions',
        trialDays: 0,
        setupFee: 0,
        displayOrder: 2,
        isDefault: false,
        isPopular: false,
        isActive: true,
      },
    ],
  });

  // 4. Starter Plan (For testing)
  const starterPlan = await prisma.orderConfiguration.create({
    data: {
      name: 'Starter Plan',
      slug: 'starter',
      description: 'Perfect for individuals and small teams getting started with basic features and support.',
      shortDescription: 'Ideal for individuals and small teams.',
      features: [
        'Core features included',
        'Email support',
        'Basic analytics',
        'Up to 5 team members',
        'Standard integrations',
        'Community access'
      ],
      termsContent: `
        <h3>Starter Plan Terms</h3>
        <p>This plan includes:</p>
        <ul>
          <li>Month-to-month billing with no long-term commitment</li>
          <li>Email support with 24-hour response time</li>
          <li>Standard usage limits apply</li>
          <li>Upgrade or downgrade anytime</li>
        </ul>
      `,
      requiresTerms: true,
      displayOrder: 0,
      isActive: true,
      isPublic: true,
      category: 'subscription',
      tags: ['starter', 'basic', 'affordable'],
    },
  });

  // Starter pricing options
  await prisma.orderConfigurationPricing.createMany({
    data: [
      {
        orderConfigurationId: starterPlan.id,
        name: 'Monthly',
        amount: 990, // £9.90
        currency: 'gbp',
        frequency: 'MONTHLY',
        isRecurring: true,
        discountPercent: 0,
        trialDays: 7,
        setupFee: 0,
        displayOrder: 1,
        isDefault: true,
        isPopular: false,
        isActive: true,
      },
      {
        orderConfigurationId: starterPlan.id,
        name: 'Yearly',
        amount: 9900, // £99.00 (2 months free)
        currency: 'gbp',
        frequency: 'YEARLY',
        isRecurring: true,
        discountPercent: 17,
        discountDescription: '2 months free',
        trialDays: 7,
        setupFee: 0,
        displayOrder: 2,
        isDefault: false,
        isPopular: true,
        isActive: true,
      },
    ],
  });

  // 5. Testing Plan (10-minute intervals for workflow testing)
  const testingPlan = await prisma.orderConfiguration.create({
    data: {
      name: 'Testing Plan (10-min billing)',
      slug: 'testing-plan',
      description: 'Special plan for testing subscription billing workflows with 10-minute intervals.',
      shortDescription: 'For testing subscription workflows only.',
      features: [
        'Billing every 10 minutes',
        'Perfect for testing workflows',
        'All pro features included',
        'Automatic invoice generation',
        'Real-time billing updates'
      ],
      termsContent: `
        <h3>Testing Plan Terms</h3>
        <p>This plan is designed for testing purposes only:</p>
        <ul>
          <li>Billing occurs every 10 minutes</li>
          <li>Intended for development and testing</li>
          <li>Should not be used in production</li>
          <li>Can be cancelled at any time</li>
        </ul>
      `,
      requiresTerms: true,
      displayOrder: 99,
      isActive: true,
      isPublic: false, // Hidden from public pricing
      category: 'testing',
      tags: ['testing', 'development', 'workflow'],
    },
  });

  // Testing pricing options
  await prisma.orderConfigurationPricing.create({
    data: {
      orderConfigurationId: testingPlan.id,
      name: '10-minute billing',
      amount: 100, // £1.00
      currency: 'gbp',
      frequency: 'EVERY_10_MINUTES',
      isRecurring: true,
      discountPercent: 0,
      trialDays: 0,
      setupFee: 0,
      displayOrder: 1,
      isDefault: true,
      isPopular: false,
      isActive: true,
    },
  });

  console.log('✅ Order configurations seeded successfully!');
  console.log('\nCreated configurations:');
  console.log('- Starter Plan (£9.90/month)');
  console.log('- Pro Plans (£29/month, £290/year)');
  console.log('- Enterprise Solutions (£99/month, £990/year)');
  console.log('- Training & Onboarding (£799 one-time)');
  console.log('- Testing Plan (£1 every 10 minutes)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding order configurations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });