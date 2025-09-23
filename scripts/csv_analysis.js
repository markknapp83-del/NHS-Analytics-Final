const fs = require('fs');
const path = require('path');

// CSV Analysis for Phase 1.2 - Analyze structure and create JSONB mapping
async function analyzeCsvStructure() {
  console.log('=== CSV Structure Analysis for JSONB Mapping ===\n');

  const csvPath = '../Data/unified_monthly_data_enhanced.csv';

  try {
    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    console.log(`📊 Total columns: ${headers.length}`);
    console.log(`📊 Total data rows: ${lines.length - 1}`);

    // Categorize columns by data domain
    const columnCategories = {
      rtt_data: [],
      ae_data: [],
      diagnostics_data: [],
      capacity_data: [],
      geographic_data: [],
      metadata: []
    };

    // RTT Specialties mapping
    const rttSpecialties = {
      'general_surgery': 'rtt_general_surgery',
      'urology': 'rtt_urology',
      'trauma_orthopaedics': 'rtt_trauma_orthopaedics',
      'ent': 'rtt_ent',
      'ophthalmology': 'rtt_ophthalmology',
      'oral_surgery': 'rtt_oral_surgery',
      'plastic_surgery': 'rtt_plastic_surgery',
      'cardiothoracic_surgery': 'rtt_cardiothoracic_surgery',
      'neurosurgery': 'rtt_neurosurgery',
      'gastroenterology': 'rtt_gastroenterology',
      'cardiology': 'rtt_cardiology',
      'dermatology': 'rtt_dermatology',
      'thoracic_medicine': 'rtt_thoracic_medicine',
      'neurology': 'rtt_neurology',
      'rheumatology': 'rtt_rheumatology',
      'geriatric_medicine': 'rtt_geriatric_medicine',
      'gynaecology': 'rtt_gynaecology',
      'other': 'rtt_other'
    };

    // Diagnostic test types
    const diagnosticTypes = [
      'mri_scans', 'ct_scans', 'ultrasound', 'echo_cardiology',
      'endoscopy', 'colonoscopy', 'flexi_sigmoidoscopy', 'cystoscopy',
      'gastroscopy', 'bronchoscopy', 'urodynamics', 'audiometry',
      'dexa_scan', 'sleep_studies', 'neurophysiology'
    ];

    // Categorize each column
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();

      if (header === 'trust_code' || header === 'trust_name' || header === 'period') {
        columnCategories.metadata.push(header);
      }
      else if (lowerHeader.includes('icb_') || lowerHeader.includes('region_') || lowerHeader.includes('stp_')) {
        columnCategories.geographic_data.push(header);
      }
      else if (lowerHeader.startsWith('rtt_')) {
        columnCategories.rtt_data.push(header);
      }
      else if (lowerHeader.includes('ae_') || lowerHeader.includes('emergency') || lowerHeader.includes('four_hour')) {
        columnCategories.ae_data.push(header);
      }
      else if (diagnosticTypes.some(type => lowerHeader.includes(type)) || lowerHeader.includes('diagnostic')) {
        columnCategories.diagnostics_data.push(header);
      }
      else if (lowerHeader.includes('capacity') || lowerHeader.includes('virtual_ward') || lowerHeader.includes('discharge')) {
        columnCategories.capacity_data.push(header);
      }
      else {
        // Uncategorized - need manual review
        console.log(`❓ Uncategorized column: ${header}`);
      }
    });

    // Display categorization results
    console.log('\n📋 COLUMN CATEGORIZATION:');
    console.log('========================');

    Object.entries(columnCategories).forEach(([category, columns]) => {
      console.log(`\n${category.toUpperCase()} (${columns.length} columns):`);
      columns.slice(0, 10).forEach(col => console.log(`  - ${col}`));
      if (columns.length > 10) {
        console.log(`  ... and ${columns.length - 10} more`);
      }
    });

    // Analyze RTT specialty structure
    console.log('\n🏥 RTT SPECIALTY ANALYSIS:');
    console.log('==========================');

    const rttColumns = columnCategories.rtt_data;
    const rttMetrics = {};

    // Group RTT columns by specialty
    Object.keys(rttSpecialties).forEach(specialty => {
      const prefix = rttSpecialties[specialty];
      const specialtyColumns = rttColumns.filter(col => col.startsWith(prefix + '_'));

      if (specialtyColumns.length > 0) {
        rttMetrics[specialty] = specialtyColumns.map(col => col.replace(prefix + '_', ''));
        console.log(`\n${specialty.toUpperCase()}:`);
        rttMetrics[specialty].forEach(metric => console.log(`  - ${metric}`));
      }
    });

    // Analyze sample data for validation
    console.log('\n📊 SAMPLE DATA ANALYSIS:');
    console.log('========================');

    if (lines.length > 1) {
      const sampleRow = lines[1].split(',');
      console.log('\nFirst data row sample:');
      console.log(`Trust: ${sampleRow[0]}`);
      console.log(`Period: ${sampleRow[2]}`);

      // Check for empty/null values
      let emptyCount = 0;
      sampleRow.forEach((value, index) => {
        if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
          emptyCount++;
        }
      });
      console.log(`Empty values in sample row: ${emptyCount}/${sampleRow.length} (${((emptyCount/sampleRow.length)*100).toFixed(1)}%)`);
    }

    // Generate mapping configuration
    const mappingConfig = {
      metadata_fields: ['trust_code', 'trust_name', 'period'],
      geographic_fields: columnCategories.geographic_data,
      jsonb_mappings: {
        rtt_data: {
          description: 'Referral to Treatment waiting time metrics',
          structure: 'nested object with specialty-specific metrics',
          source_columns: columnCategories.rtt_data.length,
          specialties: Object.keys(rttMetrics)
        },
        ae_data: {
          description: 'Accident & Emergency performance metrics',
          structure: 'flat object with performance indicators',
          source_columns: columnCategories.ae_data.length
        },
        diagnostics_data: {
          description: 'Diagnostic testing metrics by test type',
          structure: 'nested object with test-type-specific metrics',
          source_columns: columnCategories.diagnostics_data.length
        },
        capacity_data: {
          description: 'Hospital capacity and discharge metrics',
          structure: 'flat object with capacity indicators',
          source_columns: columnCategories.capacity_data.length
        }
      }
    };

    // Save mapping configuration
    fs.writeFileSync('./csv_jsonb_mapping.json', JSON.stringify(mappingConfig, null, 2));
    console.log('\n✅ Mapping configuration saved to csv_jsonb_mapping.json');

    return {
      totalColumns: headers.length,
      categorization: columnCategories,
      rttMetrics: rttMetrics,
      mappingConfig: mappingConfig
    };

  } catch (error) {
    console.error('❌ Error analyzing CSV:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeCsvStructure()
  .then(result => {
    console.log('\n=== Analysis Complete ===');
    console.log(`✅ Successfully analyzed ${result.totalColumns} columns`);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error.message);
  });