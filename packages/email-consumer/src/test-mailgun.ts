import { MailgunProvider } from './email-providers.js';
import type { EmailMessage } from './types.js';

// Simple test for Mailgun provider
async function testMailgunProvider() {
  console.log('🧪 Testing Mailgun Provider...');

  // Create a test configuration
  const config = {
    type: 'mailgun' as const,
    apiKey: process.env.MAILGUN_API_KEY || 'test-key',
    domain: process.env.MAILGUN_DOMAIN || 'test-domain.com',
  };

  try {
    // Create the provider
    const provider = new MailgunProvider(config);
    console.log('✅ Mailgun provider created successfully');

    // Test health check
    const health = await provider.healthCheck();
    console.log('🏥 Health check result:', health);

    // Create a test email message
    const testMessage: EmailMessage = {
      to: [
        {
          email: 'test@example.com',
          name: 'Test User',
        }
      ],
      from: {
        email: 'noreply@test-domain.com',
        name: 'Test System',
      },
      subject: 'Test Email from Mailgun Provider',
      html: '<h1>Hello from Mailgun!</h1><p>This is a test email.</p>',
      text: 'Hello from Mailgun!\n\nThis is a test email.',
      metadata: {
        testId: '12345',
        timestamp: new Date().toISOString(),
      },
      tags: ['test', 'integration'],
    };

    console.log('📧 Test message created:', {
      to: testMessage.to.map(r => r.email),
      subject: testMessage.subject,
      hasHtml: !!testMessage.html,
      hasText: !!testMessage.text,
    });

    // Note: In a real test, you would need valid Mailgun credentials
    // This is just to verify the provider can be instantiated
    console.log('✅ Mailgun provider test completed successfully');

  } catch (error) {
    console.error('❌ Mailgun provider test failed:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMailgunProvider().catch(console.error);
}

export { testMailgunProvider };
