-- Community Health Data Validation Queries
-- Phase 4: Data Quality Validation SQL Queries

-- ========================================
-- 1. BASIC COMPLETENESS CHECKS
-- ========================================

-- Check how many trusts have community data
SELECT
    COUNT(DISTINCT trust_code) as trusts_with_community_data,
    COUNT(*) as total_records_with_community_data
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb;

-- Overall record coverage
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN community_data IS NOT NULL AND community_data != '{}' THEN 1 END) as records_with_community_data,
    ROUND(
        COUNT(CASE WHEN community_data IS NOT NULL AND community_data != '{}' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) as percentage_with_community_data
FROM trust_metrics;

-- ========================================
-- 2. SERVICE COVERAGE STATISTICS
-- ========================================

-- Get service coverage statistics by trust
SELECT
    trust_code,
    trust_name,
    COUNT(*) as periods_with_data,
    AVG((community_data->'metadata'->>'services_reported')::int) as avg_services_per_period,
    SUM((community_data->'metadata'->>'total_waiting_all_services')::int) as total_waiting_all_periods
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb
    AND community_data->'metadata'->>'services_reported' IS NOT NULL
GROUP BY trust_code, trust_name
ORDER BY avg_services_per_period DESC;

-- ========================================
-- 3. TEMPORAL COVERAGE ANALYSIS
-- ========================================

-- Check coverage across time periods
SELECT
    DATE_TRUNC('month', period) as month_year,
    COUNT(DISTINCT trust_code) as trusts_with_data,
    COUNT(*) as total_records,
    AVG((community_data->'metadata'->>'services_reported')::int) as avg_services,
    SUM((community_data->'metadata'->>'total_waiting_all_services')::int) as total_waiting
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb
GROUP BY DATE_TRUNC('month', period)
ORDER BY month_year;

-- ========================================
-- 4. JSONB STRUCTURE VALIDATION
-- ========================================

-- Sample a few records to verify structure
SELECT
    trust_code,
    trust_name,
    period,
    jsonb_pretty(community_data) as community_data_formatted
FROM trust_metrics
WHERE trust_code IN ('RGT', 'R1H', 'RA2')
    AND community_data IS NOT NULL
    AND community_data != '{}'::jsonb
ORDER BY trust_code, period DESC
LIMIT 3;

-- Check for required JSONB keys
SELECT
    trust_code,
    period,
    CASE WHEN community_data ? 'adult_services' THEN 'Yes' ELSE 'No' END as has_adult_services,
    CASE WHEN community_data ? 'cyp_services' THEN 'Yes' ELSE 'No' END as has_cyp_services,
    CASE WHEN community_data ? 'metadata' THEN 'Yes' ELSE 'No' END as has_metadata,
    community_data->'metadata'->>'services_reported' as services_reported,
    community_data->'metadata'->>'total_waiting_all_services' as total_waiting
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb
    AND (NOT community_data ? 'adult_services'
         OR NOT community_data ? 'cyp_services'
         OR NOT community_data ? 'metadata')
LIMIT 10;

-- ========================================
-- 5. HIGH-VOLUME SERVICES ANALYSIS
-- ========================================

-- Check for adult services with high waiting lists
SELECT
    trust_code,
    trust_name,
    period,
    service_name,
    (value->>'total_waiting')::int as total_waiting,
    (value->>'wait_52_plus_weeks')::int as breaches_52plus,
    CASE
        WHEN (value->>'total_waiting')::int > 0
        THEN ROUND((value->>'wait_52_plus_weeks')::int * 100.0 / (value->>'total_waiting')::int, 2)
        ELSE 0
    END as breach_percentage
FROM trust_metrics,
    jsonb_each(community_data->'adult_services') as service(service_name, value)
WHERE community_data IS NOT NULL
    AND community_data->'adult_services' IS NOT NULL
    AND (value->>'total_waiting')::int > 1000
ORDER BY total_waiting DESC
LIMIT 20;

-- Check for CYP services with high waiting lists
SELECT
    trust_code,
    trust_name,
    period,
    service_name,
    (value->>'total_waiting')::int as total_waiting,
    (value->>'wait_52_plus_weeks')::int as breaches_52plus
FROM trust_metrics,
    jsonb_each(community_data->'cyp_services') as service(service_name, value)
WHERE community_data IS NOT NULL
    AND community_data->'cyp_services' IS NOT NULL
    AND (value->>'total_waiting')::int > 500
ORDER BY total_waiting DESC
LIMIT 20;

-- ========================================
-- 6. WAIT TIME BAND VALIDATION
-- ========================================

-- Validate that wait time bands add up to total waiting
WITH wait_time_validation AS (
    SELECT
        trust_code,
        trust_name,
        period,
        service_name,
        service_type,
        (value->>'total_waiting')::int as total_waiting,
        (value->>'wait_0_1_weeks')::int +
        (value->>'wait_1_2_weeks')::int +
        (value->>'wait_2_4_weeks')::int +
        (value->>'wait_4_12_weeks')::int +
        (value->>'wait_12_18_weeks')::int +
        (value->>'wait_18_52_weeks')::int +
        (value->>'wait_52_plus_weeks')::int as sum_of_bands
    FROM (
        SELECT
            trust_code, trust_name, period,
            service_name, 'adult' as service_type, value
        FROM trust_metrics,
            jsonb_each(community_data->'adult_services') as service(service_name, value)
        WHERE community_data->'adult_services' IS NOT NULL

        UNION ALL

        SELECT
            trust_code, trust_name, period,
            service_name, 'cyp' as service_type, value
        FROM trust_metrics,
            jsonb_each(community_data->'cyp_services') as service(service_name, value)
        WHERE community_data->'cyp_services' IS NOT NULL
    ) services
    WHERE (value->>'total_waiting')::int > 0
)
SELECT
    trust_code,
    trust_name,
    period,
    service_name,
    service_type,
    total_waiting,
    sum_of_bands,
    total_waiting - sum_of_bands as difference
FROM wait_time_validation
WHERE ABS(total_waiting - sum_of_bands) > 0
ORDER BY ABS(total_waiting - sum_of_bands) DESC
LIMIT 20;

-- ========================================
-- 7. TOP PERFORMERS AND PROBLEM AREAS
-- ========================================

-- Trusts with most services reported
SELECT
    trust_code,
    trust_name,
    AVG((community_data->'metadata'->>'services_reported')::int) as avg_services,
    SUM((community_data->'metadata'->>'total_waiting_all_services')::int) as total_waiting,
    COUNT(*) as periods_reported
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb
    AND community_data->'metadata'->>'services_reported' IS NOT NULL
GROUP BY trust_code, trust_name
HAVING COUNT(*) >= 6  -- At least 6 months of data
ORDER BY avg_services DESC
LIMIT 15;

-- Services with highest 52+ week breaches across all trusts
WITH breach_analysis AS (
    SELECT
        service_name,
        service_type,
        COUNT(*) as total_instances,
        SUM((value->>'total_waiting')::int) as total_waiting_all_trusts,
        SUM((value->>'wait_52_plus_weeks')::int) as total_breaches_all_trusts,
        AVG((value->>'wait_52_plus_weeks')::int) as avg_breaches_per_trust
    FROM (
        SELECT
            service_name, 'adult' as service_type, value
        FROM trust_metrics,
            jsonb_each(community_data->'adult_services') as service(service_name, value)
        WHERE community_data->'adult_services' IS NOT NULL

        UNION ALL

        SELECT
            service_name, 'cyp' as service_type, value
        FROM trust_metrics,
            jsonb_each(community_data->'cyp_services') as service(service_name, value)
        WHERE community_data->'cyp_services' IS NOT NULL
    ) all_services
    WHERE (value->>'total_waiting')::int > 0
    GROUP BY service_name, service_type
)
SELECT
    service_name,
    service_type,
    total_instances,
    total_waiting_all_trusts,
    total_breaches_all_trusts,
    CASE
        WHEN total_waiting_all_trusts > 0
        THEN ROUND(total_breaches_all_trusts * 100.0 / total_waiting_all_trusts, 2)
        ELSE 0
    END as overall_breach_percentage,
    ROUND(avg_breaches_per_trust, 0) as avg_breaches_per_trust
FROM breach_analysis
WHERE total_breaches_all_trusts > 0
ORDER BY total_breaches_all_trusts DESC
LIMIT 20;

-- ========================================
-- 8. DATA QUALITY SUMMARY
-- ========================================

-- Overall data quality summary
SELECT
    'Community Health Data Quality Summary' as report_type,
    (SELECT COUNT(DISTINCT trust_code)
     FROM trust_metrics
     WHERE community_data IS NOT NULL AND community_data != '{}') as trusts_with_data,

    (SELECT COUNT(DISTINCT DATE_TRUNC('month', period))
     FROM trust_metrics
     WHERE community_data IS NOT NULL AND community_data != '{}') as months_covered,

    (SELECT SUM((community_data->'metadata'->>'total_waiting_all_services')::int)
     FROM trust_metrics
     WHERE community_data IS NOT NULL
       AND community_data != '{}'
       AND community_data->'metadata'->>'total_waiting_all_services' IS NOT NULL) as total_patients_waiting,

    (SELECT COUNT(*)
     FROM trust_metrics,
          jsonb_each(community_data->'adult_services') as service(service_name, value)
     WHERE community_data->'adult_services' IS NOT NULL
       AND (value->>'wait_52_plus_weeks')::int > 0) +
    (SELECT COUNT(*)
     FROM trust_metrics,
          jsonb_each(community_data->'cyp_services') as service(service_name, value)
     WHERE community_data->'cyp_services' IS NOT NULL
       AND (value->>'wait_52_plus_weeks')::int > 0) as service_instances_with_52plus_breaches;

-- ========================================
-- 9. RECENT DATA CHECK
-- ========================================

-- Check most recent data to ensure it's up to date
SELECT
    MAX(period) as most_recent_period,
    COUNT(DISTINCT trust_code) as trusts_in_most_recent_month,
    AVG((community_data->'metadata'->>'services_reported')::int) as avg_services_latest_month
FROM trust_metrics
WHERE community_data IS NOT NULL
    AND community_data != '{}'::jsonb
    AND period = (
        SELECT MAX(period)
        FROM trust_metrics
        WHERE community_data IS NOT NULL AND community_data != '{}'
    );

-- ========================================
-- 10. CROSS-REFERENCE WITH RTT DATA
-- ========================================

-- Check alignment between community data and RTT data
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN rtt_data IS NOT NULL AND rtt_data != '{}' THEN 1 END) as has_rtt_data,
    COUNT(CASE WHEN community_data IS NOT NULL AND community_data != '{}' THEN 1 END) as has_community_data,
    COUNT(CASE WHEN rtt_data IS NOT NULL AND rtt_data != '{}'
                  AND community_data IS NOT NULL AND community_data != '{}' THEN 1 END) as has_both_datasets
FROM trust_metrics
WHERE data_type = 'monthly';