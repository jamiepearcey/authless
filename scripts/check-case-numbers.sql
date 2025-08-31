-- Check current state of support cases and case numbers
-- Run this to see if the migration has been applied

-- ==========================================
-- CHECK CURRENT STATE
-- ==========================================

-- Check if the new field exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'SupportCase' 
AND column_name IN ('caseNumberSeq', 'caseNumber')
ORDER BY column_name;

-- Check current support cases
SELECT 
    id,
    "caseNumber",
    "caseNumberSeq",
    title,
    "createdAt"
FROM "SupportCase" 
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check if the sequence exists
SELECT 
    sequence_name,
    last_value,
    is_called
FROM pg_sequences 
WHERE sequence_name LIKE '%caseNumberSeq%';

-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'SupportCase'
AND trigger_name LIKE '%case_number%';

-- Check if the functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%case_number%'
OR routine_name LIKE '%base32%';
