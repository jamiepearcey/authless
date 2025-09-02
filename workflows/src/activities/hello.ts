/**
 * Hello World Activities
 * 
 * Activities are where you put your business logic that interacts with external systems.
 * They can fail and will be retried automatically by Temporal.
 */

export async function greet(name: string): Promise<string> {
  // Simulate some work - in real scenarios this might be:
  // - API calls
  // - Database operations  
  // - File I/O
  // - Email sending
  // - Pushing to your outbox pattern
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `Hello, ${name}! 👋`;
}

export async function getRandomFact(): Promise<string> {
  // Simulate fetching data from an external service
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const facts = [
    "Temporal workflows are deterministic and can be replayed",
    "Activities handle all the non-deterministic work", 
    "You can have workflows that run for months or years",
    "Temporal provides exactly-once execution guarantees",
    "Workflows can be paused and resumed across deployments"
  ];
  
  return facts[Math.floor(Math.random() * facts.length)];
}

export async function pushToOutbox(eventData: any): Promise<void> {
  console.log('📦 Pushing to outbox:', eventData);
  
  try {
    // In a real implementation, you would:
    // 1. Connect to your database
    // 2. Insert into your OutboxEvent table
    // 3. Let your OutboxProcessor pick it up
    // 4. Publish to NATS JetStream
    // 5. Have your services consume the events
    
    // For now, we'll simulate the database insertion
    // This would typically use your existing database client
    const outboxEvent = {
      id: crypto.randomUUID(),
      eventType: eventData.eventType,
      aggregateType: eventData.aggregateType,
      aggregateId: eventData.aggregateId,
      tenantId: eventData.tenantId,
      payloadJson: eventData.payloadJson,
      createdAt: new Date().toISOString(),
      processed: false,
    };
    
    console.log('📝 Outbox event created:', outboxEvent);
    
    // Simulate database insertion delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('✅ Event pushed to outbox successfully');
    
    // In production, you might also want to:
    // - Add retry logic for database failures
    // - Use transactions to ensure consistency
    // - Add proper error handling and logging
    // - Integrate with your existing audit system
    
  } catch (error) {
    console.error('❌ Failed to push to outbox:', error);
    throw new Error(`Failed to push event to outbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}