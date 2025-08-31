-- Script to migrate existing support cases to the new base32 case number system
-- Run this after applying the migration file

-- ==========================================
-- VERIFY CURRENT STATE
-- ==========================================

-- Check current support cases
SELECT 
    id,
    "caseNumber",
    "createdAt"
FROM "SupportCase" 
ORDER BY "createdAt" 
LIMIT 10;

-- ==========================================
-- RUN THE MIGRATION
-- ==========================================

-- This will be handled by the migration file, but you can run it manually if needed:

-- 1. Add the new auto-incrementing field
-- ALTER TABLE "SupportCase" ADD COLUMN "caseNumberSeq" SERIAL;
-- ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_caseNumberSeq_unique" UNIQUE ("caseNumberSeq");

-- 2. Clear existing case numbers
-- UPDATE "SupportCase" SET "caseNumber" = NULL;

-- 3. Generate new base32 case numbers
-- UPDATE "SupportCase" 
-- SET "caseNumber" = generate_case_number_base32()
-- WHERE "caseNumber" IS NULL;

-- ==========================================
-- VERIFY MIGRATION RESULTS
-- ==========================================

-- Check the results
SELECT 
    "caseNumberSeq",
    "caseNumber",
    id,
    "createdAt"
FROM "SupportCase" 
ORDER BY "caseNumberSeq" 
LIMIT 20;

-- Check for any duplicates
SELECT "caseNumber", COUNT(*) as count
FROM "SupportCase" 
GROUP BY "caseNumber" 
HAVING COUNT(*) > 1;

-- Check the sequence
SELECT 
    pg_get_serial_sequence('"SupportCase"', 'caseNumberSeq') as sequence_name,
    last_value,
    is_called
FROM pg_get_serial_sequence('"SupportCase"', 'caseNumberSeq') s
JOIN pg_sequences seq ON seq.sequencename = s::text;
