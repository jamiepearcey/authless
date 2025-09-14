-- PostgreSQL trigger function and trigger for instant outbox event notifications
-- This provides low-latency processing by waking up the processor immediately
-- when new events are inserted into the OutboxEvent table

-- Create the notification function
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to wake up the outbox processor
  PERFORM pg_notify('outbox_wakeup', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_outbox_notify ON "OutboxEvent";

-- Create trigger that fires after INSERT on OutboxEvent
CREATE TRIGGER trg_outbox_notify
  AFTER INSERT ON "OutboxEvent"
  FOR EACH ROW 
  EXECUTE FUNCTION notify_outbox();

-- Optional: Create trigger for when events are reset to pending status
-- This helps with retry scenarios
DROP TRIGGER IF EXISTS trg_outbox_retry_notify ON "OutboxEvent";

CREATE TRIGGER trg_outbox_retry_notify
  AFTER UPDATE OF status ON "OutboxEvent"
  FOR EACH ROW 
  WHEN (OLD.status != 'pending' AND NEW.status = 'pending')
  EXECUTE FUNCTION notify_outbox();

-- Create index for efficient pending event queries if not exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_OutboxEvent_pending_processing 
ON "OutboxEvent" (status, "nextAttemptAt", "createdAt", id) 
WHERE status IN ('pending', 'processing');

-- Create partial index for faster cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_OutboxEvent_sent_cleanup
ON "OutboxEvent" ("createdAt")
WHERE status = 'sent';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_OutboxEvent_dead_cleanup  
ON "OutboxEvent" ("createdAt")
WHERE status = 'dead';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "OutboxEvent" TO your_app_user;