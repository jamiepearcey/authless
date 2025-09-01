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
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
      
      try {
        await emailService.stop();
        console.log('✅ Email Service stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('❌ Failed to start Email Service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startEmailService();
}
