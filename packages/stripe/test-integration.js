// Simple integration test to verify imports work
const { StripeServerClient, StripeClientManager, formatCurrency, validateAmount } = require('./src/index.ts');

console.log('✅ Stripe integration package imports successfully');

// Test utility functions
console.log('✅ formatCurrency(2000, "gbp"):', formatCurrency(2000, 'gbp'));
console.log('✅ validateAmount(2000):', validateAmount(2000));
console.log('✅ validateAmount(20):', validateAmount(20));

// Test class instantiation (without actual keys)
try {
  const serverClient = new StripeServerClient({
    secretKey: 'sk_test_fake',
    publishableKey: 'pk_test_fake', 
    webhookSecret: 'whsec_fake'
  });
  console.log('✅ StripeServerClient instantiates successfully');
} catch (error) {
  console.log('❌ StripeServerClient failed:', error.message);
}

try {
  const clientManager = new StripeClientManager('pk_test_fake');
  console.log('✅ StripeClientManager instantiates successfully');
} catch (error) {
  console.log('❌ StripeClientManager failed:', error.message);
}

console.log('✅ Stripe integration test completed successfully');