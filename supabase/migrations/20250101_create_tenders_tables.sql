-- =====================================================
-- NHS Tenders Integration - Database Schema
-- Phase 1: Core Tables for Contracts Finder Integration
-- =====================================================

-- Main tenders table
CREATE TABLE IF NOT EXISTS tenders (
    -- Primary identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contracts_finder_id VARCHAR(255) UNIQUE NOT NULL, -- CF unique identifier
    ocid VARCHAR(255), -- Open Contracting ID (if available)

    -- Basic tender information
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50), -- 'open', 'closed', 'awarded', 'cancelled'

    -- Buyer information
    buyer_organisation_name TEXT NOT NULL,
    buyer_organisation_id VARCHAR(255),
    trust_code VARCHAR(10), -- Mapped to our trust_metrics.trust_code
    icb_code VARCHAR(10), -- Geographic grouping
    buyer_contact_name VARCHAR(255),
    buyer_contact_email VARCHAR(255),
    buyer_contact_phone VARCHAR(50),

    -- Contract details
    contract_value_min DECIMAL(15,2),
    contract_value_max DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'GBP',
    contract_type VARCHAR(100), -- 'Goods', 'Services', 'Works'

    -- Classification
    cpv_codes JSONB, -- Common Procurement Vocabulary codes
    service_category VARCHAR(255), -- Our categorization: 'Surgery', 'Diagnostics', etc.

    -- Timeline
    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    deadline_date TIMESTAMP WITH TIME ZONE,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_duration_months INTEGER,

    -- Links and documents
    tender_url TEXT,
    documents JSONB, -- Array of document URLs and descriptions

    -- Source metadata
    source VARCHAR(50) DEFAULT 'contracts_finder',
    data_source_url TEXT,

    -- Processing metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_fetched_at TIMESTAMP WITH TIME ZONE,

    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(title, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(buyer_organisation_name, '')
        )
    ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenders_trust_code ON tenders(trust_code);
CREATE INDEX IF NOT EXISTS idx_tenders_published_date ON tenders(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline_date);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_buyer_org ON tenders(buyer_organisation_name);
CREATE INDEX IF NOT EXISTS idx_tenders_contract_value ON tenders(contract_value_max);
CREATE INDEX IF NOT EXISTS idx_tenders_search ON tenders USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_tenders_cpv ON tenders USING GIN(cpv_codes);

-- Trust mapping helper table
CREATE TABLE IF NOT EXISTS trust_tender_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_organisation_name TEXT NOT NULL,
    trust_code VARCHAR(10) NOT NULL,
    trust_name TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00 mapping confidence
    mapping_method VARCHAR(50), -- 'exact_match', 'fuzzy_match', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(buyer_organisation_name, trust_code)
);

-- Tender categories for our service classification
CREATE TABLE IF NOT EXISTS tender_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    category_description TEXT,
    cpv_codes_pattern JSONB, -- CPV codes that map to this category
    keywords JSONB, -- Keywords that suggest this category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Populate initial categories
INSERT INTO tender_categories (category_name, category_description, keywords) VALUES
('Surgery & Theatre Services', 'Surgical procedures, theatre staffing, surgical equipment', '["surgery", "surgical", "theatre", "operating", "anaesthesia", "orthopaedic", "cardiothoracic"]'),
('Diagnostic Services', 'MRI, CT, ultrasound, pathology, radiology services', '["diagnostic", "radiology", "imaging", "MRI", "CT scan", "ultrasound", "pathology", "x-ray"]'),
('Outpatient Services', 'Outpatient clinics, consultation services', '["outpatient", "clinic", "consultation", "appointment"]'),
('Emergency Services', 'A&E services, urgent care', '["emergency", "A&E", "urgent care", "emergency department"]'),
('Medical Equipment', 'Medical devices, equipment procurement', '["equipment", "medical devices", "apparatus", "machinery"]'),
('Clinical Staffing', 'Doctor, nurse, clinical staff recruitment', '["staffing", "recruitment", "locum", "nursing", "medical staff", "clinical staff"]'),
('Primary Care Services', 'GP services, community health', '["primary care", "GP", "general practice", "community health"]'),
('Mental Health Services', 'Mental health and psychiatric services', '["mental health", "psychiatric", "psychology", "CAMHS"]'),
('Other Healthcare Services', 'Miscellaneous healthcare services', '[]')
ON CONFLICT (category_name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON tenders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE tenders IS 'NHS tender opportunities from UK Contracts Finder API';
COMMENT ON TABLE trust_tender_mapping IS 'Mapping table to link buyer organizations to NHS trust codes';
COMMENT ON TABLE tender_categories IS 'Service categories for tender classification';
COMMENT ON COLUMN tenders.contracts_finder_id IS 'Unique identifier from Contracts Finder API';
COMMENT ON COLUMN tenders.trust_code IS 'Links to trust_metrics.trust_code for our NHS trust data';
COMMENT ON COLUMN tenders.service_category IS 'Our internal categorization of tender services';
