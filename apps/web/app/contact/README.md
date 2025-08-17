# Contact System

A comprehensive contact system that allows users to submit messages and view replies, with webhook support for external integrations.

## Features

- **Contact Form**: Public form for submitting messages (name, email, subject, message)
- **User Authentication**: Logged-in users can view their message history
- **Reply System**: Users can add replies to their messages
- **Status Tracking**: Messages have status (pending, in_progress, resolved, closed)
- **Priority Levels**: Messages can have priority (low, normal, high, urgent)
- **Webhook Integration**: External systems can post replies via authenticated webhook
- **Real-time Updates**: Messages and replies update in real-time

## Database Schema

### ContactMessage
- `id`: Unique identifier
- `name`: Sender's name
- `email`: Sender's email
- `subject`: Message subject
- `message`: Message content
- `userId`: Optional user ID (if logged in)
- `status`: Message status (pending, in_progress, resolved, closed)
- `priority`: Priority level (low, normal, high, urgent)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### ContactReply
- `id`: Unique identifier
- `contactMessageId`: Reference to parent message
- `message`: Reply content
- `isFromUser`: Boolean indicating if reply is from user or support
- `createdAt`: Creation timestamp

## API Endpoints

### tRPC Procedures

#### `submitContactMessage` (Public)
Submit a new contact message.

```typescript
submitContactMessage({
  name: string,
  email: string,
  subject: string,
  message: string,
  userId?: string // Optional, auto-filled for logged-in users
})
```

#### `getUserContactMessages` (Protected)
Get paginated list of user's contact messages.

```typescript
getUserContactMessages({
  limit: number, // Default: 20, Max: 100
  offset: number, // Default: 0
  status?: string // Optional filter by status
})
```

#### `getContactMessage` (Protected)
Get detailed view of a specific contact message with replies.

```typescript
getContactMessage({
  messageId: string
})
```

#### `addContactReply` (Protected)
Add a user reply to a contact message.

```typescript
addContactReply({
  messageId: string,
  message: string
})
```

### Webhook Endpoint

#### `POST /api/webhook/contact-reply`
Receive replies from external systems (requires JWT authentication).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "messageId": "string",
  "message": "string",
  "status": "string", // Optional
  "priority": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "replyId": "string",
  "message": "Reply added successfully"
}
```

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Webhook authentication secret
WEBHOOK_SECRET=your-super-secret-webhook-key

# Optional: App URL for webhook examples
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Migration

Run the Prisma migration to create the contact tables:

```bash
cd packages/db
pnpm prisma migrate dev --name add_contact_system
```

### 3. Generate Webhook Tokens

Use the utility script to generate JWT tokens for webhook authentication:

```bash
cd packages/i18n-core
tsx src/scripts/webhook-token.ts --action reply --message-id "msg_123"
```

## Usage Examples

### Submit a Contact Message

```typescript
import { trpc } from "@/lib/trpc";

const submitMessage = trpc.submitContactMessage.useMutation();

const handleSubmit = async () => {
  const result = await submitMessage.mutateAsync({
    name: "John Doe",
    email: "john@example.com",
    subject: "General Inquiry",
    message: "I have a question about your service."
  });
  
  if (result.success) {
    console.log("Message sent:", result.messageId);
  }
};
```

### View User Messages

```typescript
import { trpc } from "@/lib/trpc";

const { data: messages } = trpc.getUserContactMessages.useQuery({
  limit: 20,
  status: "pending"
});

// messages.messages contains array of ContactMessage objects
// messages.total contains total count
// messages.hasMore indicates if there are more messages
```

### Add a Reply

```typescript
import { trpc } from "@/lib/trpc";

const addReply = trpc.addContactReply.useMutation();

const handleReply = async () => {
  const result = await addReply.mutateAsync({
    messageId: "msg_123",
    message: "Thank you for your response!"
  });
  
  if (result.success) {
    console.log("Reply added:", result.replyId);
  }
};
```

### Webhook Integration

#### Generate Token
```bash
tsx webhook-token.ts --action reply --message-id "msg_123" --expires "1h"
```

#### Send Webhook Request
```bash
curl -X POST http://localhost:3000/api/webhook/contact-reply \
  -H "Authorization: Bearer <GENERATED_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg_123",
    "message": "We have received your inquiry and are working on it.",
    "status": "in_progress"
  }'
```

## Webhook Security

The webhook endpoint is protected by JWT tokens that include:

- **Action**: What operation is being performed (reply, status_update, priority_update)
- **Message ID**: Optional, specific message being affected
- **Expiration**: Token validity period
- **Signature**: Cryptographically signed with your webhook secret

### Token Payload Structure
```json
{
  "action": "reply",
  "messageId": "msg_123",
  "exp": 1640995200
}
```

### Best Practices
1. **Rotate Secrets**: Regularly change your `WEBHOOK_SECRET`
2. **Short Expiry**: Use short-lived tokens (1 hour or less)
3. **Specific Actions**: Generate tokens for specific actions and message IDs
4. **HTTPS Only**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting on your webhook endpoint

## Status Management

### Message Statuses
- **pending**: New message, awaiting response
- **in_progress**: Being worked on by support team
- **resolved**: Issue resolved, awaiting user confirmation
- **closed**: Conversation closed

### Priority Levels
- **low**: General inquiries, non-urgent
- **normal**: Standard support requests
- **high**: Important issues requiring attention
- **urgent**: Critical issues requiring immediate response

## UI Components

The contact page includes:

- **Contact Form**: Public form for submitting messages
- **Message History**: For logged-in users to view their messages
- **Message Detail Modal**: View full conversation with replies
- **Reply Interface**: Add replies to ongoing conversations
- **Status Indicators**: Visual status and priority badges
- **Responsive Design**: Works on all device sizes

## Internationalization

All user-facing text is internationalized using the `t()` function:

```typescript
{t("Contact Us", "contact.page.ContactPage.contact_us__1itlrq")}
```

Run the i18n generation script to update locale files:

```bash
pnpm i18n:generate
```

## Testing

### Manual Testing
1. Submit a contact message as a non-logged-in user
2. Log in and verify the message appears in history
3. Add a reply to the message
4. Test webhook integration with generated tokens

### Automated Testing
The system includes comprehensive test coverage for:
- Form validation
- API endpoints
- Webhook authentication
- Database operations

## Troubleshooting

### Common Issues

1. **Webhook Authentication Fails**
   - Verify `WEBHOOK_SECRET` environment variable
   - Check token expiration
   - Ensure proper Authorization header format

2. **Messages Not Appearing**
   - Check database connection
   - Verify user authentication
   - Check for JavaScript errors in console

3. **Replies Not Saving**
   - Verify message ownership
   - Check database constraints
   - Ensure proper error handling

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=contact:*
```

## Future Enhancements

- **Email Notifications**: Send email alerts for new messages/replies
- **File Attachments**: Support for file uploads in messages
- **Rich Text**: Markdown/HTML support in messages
- **Automated Responses**: Bot responses for common questions
- **Integration APIs**: Connect with popular help desk systems
- **Analytics**: Message volume, response time metrics
- **Multi-language Support**: Automatic language detection and translation
