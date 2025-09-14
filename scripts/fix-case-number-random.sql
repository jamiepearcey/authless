-- Fixed script to create TRULY RANDOM-LOOKING case numbers using hash scrambling
-- This uses a hash-based scrambling algorithm to make sequential numbers appear random

-- ==========================================
-- CREATE BASE32 ENCODING FUNCTION (UNCHANGED)
-- ==========================================

-- Keep the existing base32 function
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
-- CREATE HASH-BASED SCRAMBLING FUNCTION
-- ==========================================

-- This function takes a sequential number and scrambles it to appear random
-- Uses a combination of multiplication, XOR, and bit shifting for scrambling
CREATE OR REPLACE FUNCTION scramble_sequence(seq_num bigint) RETURNS bigint AS $$
DECLARE
    -- Magic numbers for Linear Congruential Generator (LCG)
    -- Using constants from Numerical Recipes (good distribution properties)
    multiplier bigint := 1664525;
    increment bigint := 1013904223;
    
    -- Additional scrambling constants
    xor_mask bigint := 3735928559; -- 0xDEADBEEF in decimal
    bit_shift integer := 13;
    
    scrambled bigint;
BEGIN
    -- Step 1: Apply LCG transformation
    scrambled := (seq_num * multiplier + increment);
    
    -- Step 2: XOR with mask
    scrambled := scrambled # xor_mask;
    
    -- Step 3: Bit rotation (simulated with shifts and OR)
    scrambled := ((scrambled << bit_shift) | (scrambled >> (32 - bit_shift))) & 4294967295; -- Keep it 32-bit
    
    -- Step 4: Final multiplication to spread values
    scrambled := scrambled * 2654435769; -- Golden ratio based constant
    
    -- Ensure we have a reasonable range (between 1M and 100M for decent base32 length)
    scrambled := 1000000 + (ABS(scrambled) % 99000000);
    
    RETURN scrambled;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- CREATE UPDATED TRIGGER FUNCTION
-- ==========================================

-- Drop and recreate trigger function to use scrambled numbers
DROP FUNCTION IF EXISTS set_case_number();

CREATE OR REPLACE FUNCTION set_case_number() RETURNS trigger AS $$
DECLARE
    scrambled_num bigint;
    attempt integer := 0;
    max_attempts integer := 10;
    candidate_number text;
BEGIN
    -- Only set case number if it's not already provided
    IF NEW."caseNumber" IS NULL THEN
        LOOP
            -- Scramble the sequence number to make it appear random
            scrambled_num := scramble_sequence(NEW."caseNumberSeq" + attempt);
            candidate_number := encode_base32(scrambled_num);
            
            -- Check if this case number already exists (should be extremely rare)
            IF NOT EXISTS (SELECT 1 FROM "SupportCase" WHERE "caseNumber" = candidate_number) THEN
                NEW."caseNumber" := candidate_number;
                EXIT;
            END IF;
            
            -- Safety mechanism to prevent infinite loops
            attempt := attempt + 1;
            IF attempt >= max_attempts THEN
                -- Fall back to timestamp suffix if we somehow get collisions
                NEW."caseNumber" := candidate_number || TO_CHAR(NOW(), 'SS');
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- RECREATE THE TRIGGER  
-- ==========================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS support_case_set_number ON "SupportCase";

-- Create new trigger
CREATE TRIGGER support_case_set_number
    BEFORE INSERT ON "SupportCase"
    FOR EACH ROW
    EXECUTE FUNCTION set_case_number();

-- ==========================================
-- UPDATE ALL EXISTING CASES WITH SCRAMBLED NUMBERS
-- ==========================================

-- Update existing support cases to use the new scrambled algorithm
UPDATE "SupportCase" 
SET "caseNumber" = encode_base32(scramble_sequence("caseNumberSeq"))
WHERE "caseNumber" IS NOT NULL;

-- ==========================================
-- VERIFY THE RANDOMIZATION
-- ==========================================

-- Test the scrambling - show how sequential numbers become scrambled
SELECT 
    seq,
    scramble_sequence(seq) as scrambled,
    encode_base32(scramble_sequence(seq)) as case_number
FROM generate_series(1, 10) as seq
ORDER BY seq;

-- Show the updated case numbers
SELECT 
    "caseNumberSeq",
    "caseNumber",
    title,
    "createdAt"
FROM "SupportCase" 
ORDER BY "caseNumberSeq" 
LIMIT 10;

-- Show that sequential IDs now have random-looking case numbers
SELECT 
    "caseNumberSeq",
    "caseNumber"
FROM "SupportCase" 
WHERE "caseNumberSeq" BETWEEN 1 AND 20
ORDER BY "caseNumberSeq";