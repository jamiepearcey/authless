-- Script to create the missing case number generation function and trigger
-- This implements the base32 encoded case number system using the caseNumberSeq

-- ==========================================
-- CREATE BASE32 ENCODING FUNCTION
-- ==========================================

-- Create base32 encoding function
CREATE OR REPLACE FUNCTION encode_base32(input_num bigint) RETURNS text AS $$
DECLARE
    alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; -- Base32 alphabet (RFC 4648)
    base integer := 32;
    result text := '';
    num bigint := input_num;
BEGIN
    -- Handle zero case
    IF num = 0 THEN
        RETURN 'A';
    END IF;
    
    -- Convert to base32
    WHILE num > 0 LOOP
        result := substring(alphabet, (num % base) + 1, 1) || result;
        num := num / base;
    END LOOP;
    
    -- Pad to minimum 4 characters and add prefix
    WHILE length(result) < 4 LOOP
        result := 'A' || result;
    END LOOP;
    
    -- Add 'CS' prefix for Case Support
    RETURN 'CS' || result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- CREATE CASE NUMBER GENERATION FUNCTION
-- ==========================================

-- Create the main case number generation function
CREATE OR REPLACE FUNCTION generate_case_number_base32() RETURNS text AS $$
DECLARE
    sequence_val bigint;
    case_number text;
    max_attempts integer := 10;
    attempt integer := 0;
BEGIN
    LOOP
        -- Get the current sequence value for this case
        -- Use a base offset of 1000000 to make case numbers look more professional
        SELECT currval('"SupportCase_caseNumberSeq_seq"') + 1000000 INTO sequence_val;
        
        -- Generate base32 encoded case number
        case_number := encode_base32(sequence_val);
        
        -- Check if this case number already exists (should be very rare)
        IF NOT EXISTS (SELECT 1 FROM "SupportCase" WHERE "caseNumber" = case_number) THEN
            RETURN case_number;
        END IF;
        
        -- Safety mechanism to prevent infinite loops
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            -- Fall back to including timestamp if we somehow get collisions
            case_number := case_number || TO_CHAR(NOW(), 'MMSS');
            EXIT;
        END IF;
    END LOOP;
    
    RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CREATE TRIGGER FUNCTION
-- ==========================================

-- Create trigger function to auto-populate case number
CREATE OR REPLACE FUNCTION set_case_number() RETURNS trigger AS $$
BEGIN
    -- Only set case number if it's not already provided
    IF NEW."caseNumber" IS NULL THEN
        NEW."caseNumber" := generate_case_number_base32();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CREATE THE TRIGGER
-- ==========================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS support_case_set_number ON "SupportCase";

-- Create trigger to auto-generate case numbers on insert
CREATE TRIGGER support_case_set_number
    BEFORE INSERT ON "SupportCase"
    FOR EACH ROW
    EXECUTE FUNCTION set_case_number();

-- ==========================================
-- UPDATE EXISTING CASES
-- ==========================================

-- Update existing support cases to have case numbers
UPDATE "SupportCase" 
SET "caseNumber" = encode_base32("caseNumberSeq" + 1000000)
WHERE "caseNumber" IS NULL;

-- ==========================================
-- VERIFY THE SETUP
-- ==========================================

-- Test the functions
SELECT 
    encode_base32(1000001) as test_encode_1,
    encode_base32(1000010) as test_encode_10,
    encode_base32(1500000) as test_encode_large;

-- Check updated cases
SELECT 
    "caseNumberSeq",
    "caseNumber",
    title,
    "createdAt"
FROM "SupportCase" 
ORDER BY "caseNumberSeq" 
LIMIT 10;

-- Test trigger by checking if a new insert would work
-- (This is just a dry run to show what would happen)
SELECT generate_case_number_base32() as next_case_number;