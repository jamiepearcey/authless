# Email Consumer

A NATS JetStream consumer that processes events and sends templated emails using React Email components.

## Features

- **Event-Driven Email Processing**: Consumes events from NATS JetStream streams
- **React Email Templates**: Uses React components for email templates instead of Handlebars
- **Smart Routing**: Routes events to appropriate email templates based on configurable rules
- **Priority-Based Processing**: Handles email priorities (urgent, high, normal, low)
- **Rate Limiting**: Built-in rate limiting to prevent spam
- **Multiple Providers**: Support for SMTP, SendGrid, SES, and Mailgun
- **Delivery Tracking**: Comprehensive logging and delivery result tracking

## Architecture

### Email Router
The `EmailRouter` class handles routing events to appropriate email templates based on:
- Event name patterns (e.g., `user.*`, `alert.*`)
- Tenant-specific routing
- Custom routing conditions
- Template priority levels

### React Email Templates
Templates are React components that define the email structure:
- **Component**: React component that renders the email
- **Subject**: Static string or dynamic function
- **Variables**: Required variables for the template
- **Metadata**: Category, description, and preview text

### Template Renderer
The `ReactEmailRenderer` converts React components to HTML:
- Renders React components to HTML
- Generates plain text versions
- Validates template variables
- Provides template previews

## Email Providers

The email consumer supports multiple email providers:

### SMTP Provider
```typescript
provider: {
  type: 'smtp',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
}
```

### SendGrid Provider
```typescript
provider: {
  type: 'sendgrid',
  apiKey: 'SG.your-sendgrid-api-key',
}
```

### Mailgun Provider
```typescript
provider: {
  type: 'mailgun',
  apiKey: 'your-mailgun-api-key',
  domain: 'your-domain.com',
}
```

## Usage

### 1. Define Email Templates

```typescript
import { ReactEmailTemplate } from '@jetstream/email-consumer';

const welcomeTemplate: ReactEmailTemplate = {
  name: 'welcome-email',
  component: WelcomeEmailComponent, // Your React component
  subject: 'Welcome to our platform!',
  variables: ['userName', 'userEmail', 'tenantName'],
  metadata: {
    category: 'onboarding',
    description: 'Welcome email for new users',
  },
};
```

### 2. Create Routing Rules

```typescript
import { EmailRoutingRule } from '@jetstream/email-consumer';

const routingRules: EmailRoutingRule[] = [
  {
    eventPattern: 'user.registered',
    templateName: 'welcome-email',
    priority: 'high',
    extractVariables: (event) => ({
      userName: event.payload.userName,
      userEmail: event.payload.userEmail,
      tenantName: event.tenantId,
    }),
    condition: (event) => event.payload.userEmail && event.payload.userName,
  },
];
```

### 3. Configure the Consumer

```typescript
import { EmailConsumer } from '@jetstream/email-consumer';

const consumer = new EmailConsumer({
  natsUrl: 'nats://localhost:4223',
  streamName: 'events',
  consumerName: 'email-consumer',
  filterSubjects: ['events.*'],
  provider: {
    type: 'smtp',
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: { user: 'test', pass: 'test' },
  },
  defaultFrom: {
    email: 'noreply@example.com',
    name: 'Example System',
  },
  routingRules,
  templates: new Map([['welcome-email', welcomeTemplate]]),
  database: {
    getEmailTemplates: async () => [], // Legacy support
    getRecipients: async (eventName, tenantId) => [
      { email: 'user@example.com', name: 'User' }
    ],
    logEmailDelivery: async (result) => console.log(result),
  },
});
```

### 4. Start the Consumer

```typescript
await consumer.start();
```

## Template Examples

### Welcome Email Template

```tsx
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  tenantName: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  userEmail,
  tenantName,
}) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, sans-serif' }}>
      <Container>
        <Heading>Welcome to {tenantName}!</Heading>
        <Text>Hi {userName},</Text>
        <Text>Welcome to our platform. We're excited to have you on board!</Text>
        <Button href="https://example.com/getting-started">
          Get Started
        </Button>
      </Container>
    </Body>
  </Html>
);
```

### Alert Notification Template

```tsx
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Alert } from '@react-email/components';

interface AlertEmailProps {
  alertType: string;
  alertTitle: string;
  alertMessage: string;
  priority: string;
}

export const AlertEmail: React.FC<AlertEmailProps> = ({
  alertType,
  alertTitle,
  alertMessage,
  priority,
}) => (
  <Html>
    <Head />
    <Body>
      <Container>
        <Heading style={{ color: priority === 'urgent' ? '#dc3545' : '#ffc107' }}>
          {alertTitle}
        </Heading>
        <Alert severity={priority}>
          <Text>{alertMessage}</Text>
        </Alert>
      </Container>
    </Body>
  </Html>
);
```

## Event Patterns

The routing system supports glob-style patterns:

- `user.*` - Matches all user-related events
- `alert.*` - Matches all alert events
- `support.case.*` - Matches support case events
- `tenant.*` - Matches tenant-related events

## Priority Levels

Emails are processed in priority order:
1. **Urgent** - Highest priority, processed first
2. **High** - High priority
3. **Normal** - Default priority
4. **Low** - Lowest priority, processed last

## Rate Limiting

Built-in rate limiting prevents spam:
- `maxEmailsPerSecond`: Maximum emails per second
- `maxEmailsPerHour`: Maximum emails per hour

## Database Integration

The consumer requires a database interface for:
- **Recipients**: Getting email recipients for events
- **Delivery Logging**: Logging email delivery results
- **Legacy Templates**: Support for existing Handlebars templates

## Migration from Handlebars

To migrate from Handlebars to React Email:

1. **Convert Templates**: Replace Handlebars templates with React components
2. **Update Routing**: Use the new routing system instead of template matching
3. **Test Rendering**: Verify React Email components render correctly
4. **Deploy Gradually**: Use both systems during transition

## Example Configuration

See `src/examples/basic-templates.ts` for complete examples of:
- Template definitions
- Routing rules
- Consumer configuration

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Start in development mode
pnpm dev
```

## Dependencies

- **NATS**: Event streaming and messaging
- **React Email**: Email template rendering
- **Nodemailer**: SMTP email sending
- **SendGrid**: Alternative email provider
- **Mailgun**: Alternative email provider
- **Zod**: Schema validation
