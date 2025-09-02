# Authless Temporal Workflows

This directory contains Temporal workflow definitions and workers for the Authless SaaS platform.

## 🏗️ **Architecture**

```
workflows/
├── src/
│   ├── workflows/          # Workflow definitions (business logic)
│   │   └── hello.ts       # Hello World example workflow
│   ├── activities/         # Activities (external interactions)
│   │   └── hello.ts       # Hello World activities
│   ├── worker.ts          # Worker process (executes workflows)
│   └── client.ts          # Client utilities (starts workflows)
├── package.json           # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🚀 **Quick Start**

### **Prerequisites**
Make sure Temporal is running via Docker Compose:
```bash
# From project root
docker compose up -d temporal
```

### **Install Dependencies**
```bash
cd workflows
pnpm install
```

### **Development**
```bash
# Build TypeScript
pnpm run build

# Start the worker (in one terminal)
pnpm run worker:dev

# The worker will connect to Temporal and wait for workflows to execute
```

### **Test the Integration**
Once the worker is running, you can trigger workflows via the Next.js app:
```bash
# From another terminal, test the API endpoint
curl "http://localhost:3000/api/workflows/hello?name=World&includeRandomFact=true"
```

## 📚 **Concepts**

### **Workflows**
- **Deterministic functions** that define business logic
- Can run for seconds, hours, or even years
- Automatically retried on failure
- Can be paused and resumed across deployments

### **Activities** 
- **Non-deterministic functions** that interact with external systems
- Database calls, API requests, file operations
- Automatically retried with exponential backoff
- Can be mocked for testing

### **Workers**
- **Processes that execute workflows and activities**
- Poll Temporal service for work
- Can be scaled horizontally
- Handle failures and retries automatically

## 🔄 **Integration with Existing Architecture**

This Temporal setup integrates seamlessly with your existing event-driven architecture:

### **Workflow → Outbox Pattern**
```typescript
// Inside a workflow
await pushToOutbox({
  eventType: 'workflow.completed',
  // ... your existing outbox event structure
});
```

### **Outbox → Workflow Trigger**
Your existing services can trigger workflows:
```typescript
// In your existing services
import { startHelloWorkflow } from '@authless/workflows';

await startHelloWorkflow({
  name: 'Customer Onboarding',
  includeRandomFact: true,
  pushToOutboxAfter: true
});
```

## 🎯 **Example Workflows**

### **Hello World Workflow**
- **Purpose**: Demonstrate basic Temporal concepts
- **Trigger**: GET `/api/workflows/hello`
- **Activities**: Greeting, random facts, outbox integration
- **Duration**: ~3 seconds
- **Use Cases**: Testing, learning, proof of concept

### **Future Workflow Ideas**
Based on your SaaS architecture, consider these workflows:

- **User Onboarding**: Multi-step user setup with email verification
- **Payment Processing**: Handle payment flows with retries and rollbacks  
- **Support Case Management**: SLA tracking with escalation rules
- **Tenant Provisioning**: Complete tenant setup with all dependencies
- **Audit Compliance**: Long-running compliance workflows
- **Feature Flag Rollouts**: Gradual feature releases with monitoring

## 🌐 **API Integration**

### **Triggering Workflows**
```typescript
// GET /api/workflows/hello?name=World
{
  "workflowId": "hello-World-1234567890",
  "status": "running",
  "result": null  // Will be populated when workflow completes
}
```

### **Checking Status**
```typescript  
// GET /api/workflows/hello/status?workflowId=hello-World-1234567890
{
  "workflowId": "hello-World-1234567890",
  "status": "completed",
  "result": {
    "greeting": "Hello, World! 👋",
    "randomFact": "Temporal workflows are deterministic and can be replayed",
    "executionTime": 3142,
    "workflowId": "hello-World-1234567890"
  }
}
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Temporal connection (default: localhost:7233)
TEMPORAL_ADDRESS=localhost:7233

# Task queue name (default: hello-world-queue)  
TEMPORAL_TASK_QUEUE=hello-world-queue
```

### **Docker Compose Integration**
Temporal is automatically configured in your `docker-compose.yml`:
- **Temporal Server**: `localhost:7233`
- **Web UI**: `http://localhost:8233`
- **Database**: Uses your existing PostgreSQL instance

## 📊 **Monitoring**

### **Temporal Web UI**
Visit `http://localhost:8233` to see:
- Running workflows
- Workflow history and logs  
- Performance metrics
- Error details and stack traces

### **Integration with Your Monitoring**
Workflows automatically integrate with your existing observability:
- **Audit Events**: Workflows can push completion events to your audit service
- **Real-time Updates**: Use Centrifugo to broadcast workflow status changes
- **Email Notifications**: Trigger email workflows on important events

## 🧪 **Testing**

### **Unit Testing Workflows**
```bash
# Add to your test suite
pnpm run test:workflows
```

### **Integration Testing**
Workflows integrate with your existing test infrastructure:
- Use the same test database
- Mock external activities
- Verify outbox events are created
- Test end-to-end user journeys

## 🚀 **Production Deployment**

### **Scaling Workers**
```bash
# Run multiple workers for high availability
pnpm run worker &
pnpm run worker &
pnpm run worker &
```

### **Monitoring**
- Workers automatically report metrics to Temporal
- Use your existing logging infrastructure
- Set up alerts on workflow failures

---

**Ready to orchestrate complex business logic?**

This Temporal integration gives you the power to build reliable, long-running workflows while seamlessly integrating with your existing event-driven architecture. Start simple with the hello world example, then expand to handle your complex SaaS workflows with confidence.