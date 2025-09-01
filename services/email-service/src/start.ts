import { EmailServiceFactory } from './index.js';
import { exampleConfig } from './example-config.js';

/**
 * Start the Email Service
 */
async function startEmailService() {
  try {
    console.log('🚀 Starting Email Service...');
    
    // Create the service using the factory
    const emailService = EmailServiceFactory.createService(exampleConfig);
    
    // Start the service
    await emailService.start();
    
    console.log('✅ Email Service started successfully');
    console.log(`📧 Service running on port ${exampleConfig.port}`);
    console.log(`📊 Metrics available on port ${exampleConfig.metricsPort}`);
    
    // Signal handling is managed by the service wrapper
    
  } catch (error) {
    console.error('❌ Failed to start Email Service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startEmailService();
}
