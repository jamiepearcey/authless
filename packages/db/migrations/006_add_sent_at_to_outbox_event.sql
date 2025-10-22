-- Add sentAt timestamp field to OutboxEvent table
-- This tracks when events were successfully sent to the message queue

ALTER TABLE "OutboxEvent" ADD COLUMN "sentAt" TIMESTAMP(3);

-- Create index for efficient queries on sentAt
CREATE INDEX "OutboxEvent_sentAt_idx" ON "OutboxEvent"("sentAt");

-- Update existing 'sent' events to have a sentAt timestamp (use updatedAt as approximation)
UPDATE "OutboxEvent" 
SET "sentAt" = "updatedAt" 
WHERE status = 'sent' AND "sentAt" IS NULL;
