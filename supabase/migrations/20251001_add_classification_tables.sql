-- Migration: Add classification tables and fields for Phase 1C
-- Date: 2025-10-01
-- Purpose: Support intelligent tender classification with frameworks and discarded tenders tracking

-- ============================================================================
-- STEP 1: Enhance tenders table with classification fields
-- ============================================================================

ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS classification VARCHAR(50),
  ADD COLUMN IF NOT EXISTS classification_reason TEXT,
  ADD COLUMN IF NOT EXISTS classification_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS is_framework BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS framework_name TEXT,
  ADD COLUMN IF NOT EXISTS matched_entity_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS buyer_search_text TEXT;

COMMENT ON COLUMN tenders.classification IS 'Classification type: insourcing_opportunity, framework, or discard';
COMMENT ON COLUMN tenders.classification_reason IS 'Explanation of why this classification was assigned';
COMMENT ON COLUMN tenders.classification_confidence IS 'Confidence score 0-100 for classification accuracy';
COMMENT ON COLUMN tenders.is_framework IS 'TRUE if this is a framework agreement rather than a direct tender';
COMMENT ON COLUMN tenders.framework_name IS 'Name of the framework if identified';
COMMENT ON COLUMN tenders.matched_entity_type IS 'Entity type matched: trust or icb';
COMMENT ON COLUMN tenders.buyer_search_text IS 'Concatenated search text for debugging matches';

-- ============================================================================
-- STEP 2: Create frameworks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS frameworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    framework_name TEXT NOT NULL,
    description TEXT,
    managing_organization TEXT,
    framework_type VARCHAR(100),
    is_member BOOLEAN DEFAULT FALSE,
    membership_expiry DATE,
    contracts_finder_references JSONB,
    first_seen_date DATE,
    last_seen_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(framework_name)
);

COMMENT ON TABLE frameworks IS 'NHS procurement frameworks identified from Contracts Finder';
COMMENT ON COLUMN frameworks.framework_name IS 'Name of the framework agreement';
COMMENT ON COLUMN frameworks.managing_organization IS 'Organization managing this framework';
COMMENT ON COLUMN frameworks.framework_type IS 'Type: Workforce, Clinical Services, Equipment, etc.';
COMMENT ON COLUMN frameworks.is_member IS 'TRUE if we are members of this framework';
COMMENT ON COLUMN frameworks.membership_expiry IS 'Date our membership expires';
COMMENT ON COLUMN frameworks.contracts_finder_references IS 'Array of OCID/Notice IDs referencing this framework';
COMMENT ON COLUMN frameworks.first_seen_date IS 'First time this framework was observed';
COMMENT ON COLUMN frameworks.last_seen_date IS 'Most recent observation of this framework';

-- ============================================================================
-- STEP 3: Create discarded_tenders table for review
-- ============================================================================

CREATE TABLE IF NOT EXISTS discarded_tenders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contracts_finder_id VARCHAR(255) UNIQUE NOT NULL,
    ocid VARCHAR(255),
    title TEXT,
    description TEXT,
    buyer_organisation_name TEXT,
    published_date DATE,
    discard_reason TEXT,
    discard_confidence INTEGER,
    search_text TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    should_include BOOLEAN,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE discarded_tenders IS 'Tenders discarded by classification system for review and refinement';
COMMENT ON COLUMN discarded_tenders.contracts_finder_id IS 'Unique identifier from Contracts Finder';
COMMENT ON COLUMN discarded_tenders.ocid IS 'Open Contracting ID from OCDS data';
COMMENT ON COLUMN discarded_tenders.discard_reason IS 'Why this tender was discarded';
COMMENT ON COLUMN discarded_tenders.discard_confidence IS 'Confidence 0-100 in discard decision';
COMMENT ON COLUMN discarded_tenders.search_text IS 'Full concatenated search text for debugging';
COMMENT ON COLUMN discarded_tenders.reviewed IS 'TRUE if manually reviewed by a human';
COMMENT ON COLUMN discarded_tenders.should_include IS 'Manual override: TRUE if should be included after review';
COMMENT ON COLUMN discarded_tenders.reviewer_notes IS 'Notes from manual review';

-- ============================================================================
-- STEP 4: Create trust name variants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_name_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(10) NOT NULL,
    variant_name TEXT NOT NULL,
    variant_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trust_code, variant_name)
);

COMMENT ON TABLE trust_name_variants IS 'Multiple name variants for each NHS Trust to improve matching';
COMMENT ON COLUMN trust_name_variants.variant_type IS 'Type: full_name, short_name, abbreviation, hospital_name';
COMMENT ON COLUMN trust_name_variants.is_primary IS 'TRUE if this is the primary/official name';

-- ============================================================================
-- STEP 5: Create ICB name variants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS icb_name_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    icb_code VARCHAR(10) NOT NULL,
    variant_name TEXT NOT NULL,
    variant_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(icb_code, variant_name)
);

COMMENT ON TABLE icb_name_variants IS 'Multiple name variants for each ICB to improve matching';
COMMENT ON COLUMN icb_name_variants.variant_type IS 'Type: full_name, short_name, abbreviation';
COMMENT ON COLUMN icb_name_variants.is_primary IS 'TRUE if this is the primary/official name';

-- ============================================================================
-- STEP 6: Populate initial trust name variants
-- ============================================================================

INSERT INTO trust_name_variants (trust_code, variant_name, variant_type, is_primary)
SELECT DISTINCT
    trust_code,
    trust_name,
    'full_name',
    TRUE
FROM trust_metrics
WHERE trust_code IS NOT NULL AND trust_name IS NOT NULL
ON CONFLICT (trust_code, variant_name) DO NOTHING;

-- ============================================================================
-- STEP 7: Populate initial ICB name variants
-- ============================================================================

INSERT INTO icb_name_variants (icb_code, variant_name, variant_type, is_primary)
SELECT
    icb_code,
    icb_name,
    'full_name',
    TRUE
FROM icbs
WHERE icb_code IS NOT NULL AND icb_name IS NOT NULL
ON CONFLICT (icb_code, variant_name) DO NOTHING;

-- ============================================================================
-- STEP 8: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenders_classification ON tenders(classification);
CREATE INDEX IF NOT EXISTS idx_tenders_matched_trust ON tenders(trust_code) WHERE classification = 'insourcing_opportunity';
CREATE INDEX IF NOT EXISTS idx_tenders_matched_icb ON tenders(icb_code) WHERE classification = 'insourcing_opportunity';
CREATE INDEX IF NOT EXISTS idx_tenders_is_framework ON tenders(is_framework);
CREATE INDEX IF NOT EXISTS idx_discarded_reviewed ON discarded_tenders(reviewed);
CREATE INDEX IF NOT EXISTS idx_discarded_should_include ON discarded_tenders(should_include);
CREATE INDEX IF NOT EXISTS idx_frameworks_member ON frameworks(is_member);
CREATE INDEX IF NOT EXISTS idx_frameworks_type ON frameworks(framework_type);

-- ============================================================================
-- STEP 9: Create helper function to update framework last_seen_date
-- ============================================================================

CREATE OR REPLACE FUNCTION update_framework_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_seen_date = NOW()::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_framework_timestamp
    BEFORE UPDATE ON frameworks
    FOR EACH ROW
    EXECUTE FUNCTION update_framework_last_seen();

-- ============================================================================
-- Migration Complete
-- ============================================================================
