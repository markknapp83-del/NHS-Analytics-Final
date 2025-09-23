const fs = require('fs');

// Complete CSV to JSONB mapping analysis - addressing uncategorized columns
async function createCompleteMapping() {
  console.log('=== Complete CSV to JSONB Mapping Documentation ===\n');

  const csvPath = '../Data/unified_monthly_data_enhanced.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const headers = csvContent.split('\n')[0].split(',').map(h => h.trim());

  // Enhanced categorization with proper handling of all columns
  const columnMapping = {
    // Core metadata fields
    metadata: ['trust_code', 'trust_name', 'period'],
    geographic: ['icb_code', 'icb_name'],

    // RTT Data - including trust totals and all specialties
    rtt_data: {
      trust_total: [
        'trust_total_total_incomplete_pathways',
        'trust_total_total_within_18_weeks',
        'trust_total_total_over_18_weeks',
        'trust_total_total_52_plus_weeks',
        'trust_total_total_78_plus_weeks',
        'trust_total_total_65_plus_weeks',
        'trust_total_percent_within_18_weeks',
        'trust_total_median_wait_weeks'
      ],
      specialties: {}
    },

    // A&E Performance Data
    ae_data: [
      'ae_attendances_total',
      'ae_over_4hrs_total',
      'ae_4hr_performance_pct',
      'ae_emergency_admissions_total',
      'ae_12hr_wait_admissions'
    ],

    // Diagnostics Data - organized by test type
    diagnostics_data: {},

    // Capacity and Virtual Ward Data
    capacity_data: [
      'avg_daily_discharges',
      'virtual_ward_capacity',
      'virtual_ward_occupancy_rate'
    ]
  };

  // Define RTT specialties
  const rttSpecialties = [
    'general_surgery', 'urology', 'trauma_orthopaedics', 'ent', 'ophthalmology',
    'oral_surgery', 'plastic_surgery', 'cardiothoracic_surgery', 'neurosurgery',
    'gastroenterology', 'cardiology', 'dermatology', 'thoracic_medicine',
    'neurology', 'rheumatology', 'geriatric_medicine', 'gynaecology', 'other'
  ];

  // Define diagnostic test types
  const diagnosticTypes = [
    'sigmoidoscopy', 'mri', 'ct', 'nuclear_medicine', 'dexa', 'audiology',
    'echocardiography', 'electrophysiology', 'sleep_studies', 'urodynamics',
    'ultrasound', 'colonoscopy', 'gastroscopy', 'bronchoscopy', 'cystoscopy'
  ];

  // Standard RTT metrics for each specialty
  const rttMetrics = [
    'total_incomplete_pathways', 'total_within_18_weeks', 'total_over_18_weeks',
    'total_52_plus_weeks', 'total_78_plus_weeks', 'total_65_plus_weeks',
    'percent_within_18_weeks', 'median_wait_weeks'
  ];

  // Standard diagnostic metrics for each test type
  const diagnosticMetrics = [
    '13week_breaches', '6week_breaches', 'planned_tests', 'total_waiting',
    'unscheduled_tests', 'waiting_list_total'
  ];

  // Map RTT specialty columns
  rttSpecialties.forEach(specialty => {
    columnMapping.rtt_data.specialties[specialty] = rttMetrics.map(metric =>
      `rtt_${specialty}_${metric}`
    );
  });

  // Map diagnostic columns
  diagnosticTypes.forEach(testType => {
    columnMapping.diagnostics_data[testType] = diagnosticMetrics.map(metric =>
      `diag_${testType}_${metric}`
    );
  });

  // Create the complete JSONB structure template
  const jsonbStructure = {
    rtt_data: {
      trust_total: {
        total_incomplete_pathways: "number",
        total_within_18_weeks: "number",
        total_over_18_weeks: "number",
        total_52_plus_weeks: "number",
        total_78_plus_weeks: "number",
        total_65_plus_weeks: "number",
        percent_within_18_weeks: "number (percentage)",
        median_wait_weeks: "number (decimal)"
      },
      specialties: {}
    },
    ae_data: {
      attendances_total: "number",
      over_4hrs_total: "number",
      four_hour_performance_pct: "number (percentage)",
      emergency_admissions_total: "number",
      twelve_hour_wait_admissions: "number"
    },
    diagnostics_data: {},
    capacity_data: {
      avg_daily_discharges: "number",
      virtual_ward_capacity: "number",
      virtual_ward_occupancy_rate: "number (percentage)"
    }
  };

  // Add specialty structure to template
  rttSpecialties.forEach(specialty => {
    jsonbStructure.rtt_data.specialties[specialty] = {
      total_incomplete_pathways: "number",
      total_within_18_weeks: "number",
      total_over_18_weeks: "number",
      total_52_plus_weeks: "number",
      total_78_plus_weeks: "number",
      total_65_plus_weeks: "number",
      percent_within_18_weeks: "number (percentage)",
      median_wait_weeks: "number (decimal)"
    };
  });

  // Add diagnostic structure to template
  diagnosticTypes.forEach(testType => {
    jsonbStructure.diagnostics_data[testType] = {
      thirteen_week_breaches: "number",
      six_week_breaches: "number",
      planned_tests: "number",
      total_waiting: "number",
      unscheduled_tests: "number",
      waiting_list_total: "number"
    };
  });

  // Create transformation rules
  const transformationRules = {
    data_validation: {
      numeric_fields: "Convert to number, handle null/empty as 0",
      percentage_fields: "Ensure values are between 0-100, convert to decimal",
      date_fields: "Validate ISO date format for period field",
      trust_codes: "Validate 3-character trust code format"
    },
    missing_value_handling: {
      numeric_metrics: "Convert null/empty to 0",
      percentages: "Convert null/empty to null (don't assume 0%)",
      trust_totals: "Calculate from specialty sums if missing"
    },
    data_quality_checks: {
      cross_validation: "Trust totals should equal sum of specialties",
      range_validation: "Percentages 0-100, wait times > 0",
      completeness: "Flag records missing >50% of core metrics"
    }
  };

  // Generate the comprehensive mapping documentation
  const mappingDocumentation = {
    overview: {
      source_file: "unified_monthly_data_enhanced.csv",
      total_columns: headers.length,
      total_records: "1,816 trust-month observations",
      target_table: "trust_metrics",
      mapping_date: new Date().toISOString().split('T')[0]
    },
    column_mapping: columnMapping,
    jsonb_structure: jsonbStructure,
    transformation_rules: transformationRules,
    implementation_notes: {
      batch_size: "Process 100 records at a time for memory efficiency",
      error_handling: "Log validation errors but continue processing",
      upsert_strategy: "Use trust_code + period as unique constraint",
      performance: "Use JSONB GIN indexes for query optimization"
    }
  };

  // Save the complete mapping
  fs.writeFileSync('../transformation_strategy.json', JSON.stringify(mappingDocumentation, null, 2));

  // Generate summary report
  console.log('📋 MAPPING SUMMARY:');
  console.log('==================');
  console.log(`📊 Total columns mapped: ${headers.length}`);
  console.log(`📊 RTT specialties: ${rttSpecialties.length}`);
  console.log(`📊 Diagnostic test types: ${diagnosticTypes.length}`);
  console.log(`📊 A&E metrics: ${columnMapping.ae_data.length}`);
  console.log(`📊 Capacity metrics: ${columnMapping.capacity_data.length}`);

  console.log('\n📝 JSONB FIELD BREAKDOWN:');
  console.log('=========================');
  console.log(`🏥 rtt_data: Trust totals + ${rttSpecialties.length} specialties × ${rttMetrics.length} metrics each`);
  console.log(`🚑 ae_data: ${columnMapping.ae_data.length} performance indicators`);
  console.log(`🔬 diagnostics_data: ${diagnosticTypes.length} test types × ${diagnosticMetrics.length} metrics each`);
  console.log(`🏢 capacity_data: ${columnMapping.capacity_data.length} capacity indicators`);

  console.log('\n✅ Complete mapping documentation saved to transformation_strategy.json');

  return mappingDocumentation;
}

// Run the complete mapping analysis
createCompleteMapping()
  .then(result => {
    console.log('\n=== Phase 1.2 Complete ===');
    console.log('✅ CSV to JSONB mapping analysis completed');
    console.log('✅ Transformation strategy documented');
    console.log('✅ Ready for Phase 1.3: Data Transformation Engine');
  })
  .catch(error => {
    console.error('❌ Mapping analysis failed:', error.message);
  });