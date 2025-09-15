-- Make userId nullable in AuditLog table to support system-initiated events
-- This allows auditing of events that don't have a specific user context (like tenant updates)

ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- Update the foreign key constraint to allow for nullable userId
-- The constraint already supports this with ON DELETE CASCADE, no changes needed to the constraint itself