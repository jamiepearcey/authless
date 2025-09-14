-- Fixed script to create the case number generation function and trigger

-- ==========================================
-- CREATE BASE32 ENCODING FUNCTION (FIXED)
-- ==========================================

-- Drop and recreate the base32 encoding function with correct casting
DROP FUNCTION IF EXISTS encode_base32(bigint);

CREATE OR REPLACE FUNCTION encode_base32(input_num bigint) RETURNS text AS $$
DECLARE
    alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; -- Base32 alphabet (RFC 4648)
    base integer := 32;
    result text := '';
    num bigint := input_num;
    pos integer;
BEGIN
    -- Handle zero case
    IF num = 0 THEN
        RETURN 'A';
    END IF;
    
    -- Convert to base32
    WHILE num > 0 LOOP
        pos := (num % base)::integer + 1;
        result := substr(alphabet, pos, 1) || result;
        num := num / base;
    END LOOP;
    
    -- Pad to minimum 4 characters
    WHILE length(result) < 4 LOOP
        result := 'A' || result;
    END LOOP;
    
    -- Add 'CS' prefix for Case Support
    RETURN 'CS' || result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- CREATE CASE NUMBER GENERATION FUNCTION (FIXED)
-- ==========================================

-- Drop and recreate the case number generation function
DROP FUNCTION IF EXISTS generate_case_number_base32();

CREATE OR REPLACE FUNCTION generate_case_number_base32(seq_val bigint DEFAULT NULL) RETURNS text AS $$
DECLARE
    sequence_val bigint;
    case_number text;
    max_attempts integer := 10;
    attempt integer := 0;
BEGIN
    -- Use provided sequence value or get the last value + 1
    IF seq_val IS NOT NULL THEN
        sequence_val := seq_val;
    ELSE
        -- Get the last used sequence value and add 1 for next case
        SELECT COALESCE(MAX("caseNumberSeq"), 0) + 1000000 + 1
        FROM "SupportCase" 
        INTO sequence_val;
    END IF;
    
    LOOP
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
        
        -- Try next sequence number
        sequence_val := sequence_val + 1;
    END LOOP;
    
    RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CREATE TRIGGER FUNCTION (FIXED)
-- ==========================================

-- Drop and recreate trigger function to auto-populate case number
DROP FUNCTION IF EXISTS set_case_number();

CREATE OR REPLACE FUNCTION set_case_number() RETURNS trigger AS $$
DECLARE
    base_seq bigint;
BEGIN
    -- Only set case number if it's not already provided
    IF NEW."caseNumber" IS NULL THEN
        -- Use the current sequence number + base offset
        base_seq := NEW."caseNumberSeq" + 1000000;
        NEW."caseNumber" := encode_base32(base_seq);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- RECREATE THE TRIGGER
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

-- Verify trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'SupportCase'
AND trigger_name = 'support_case_set_number';

-- Test that the next case number will be generated correctly
SELECT generate_case_number_base32() as next_case_number;