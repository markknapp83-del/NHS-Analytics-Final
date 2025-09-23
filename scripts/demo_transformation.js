const fs = require('fs');
const Papa = require('papaparse');

/**
 * Simple demonstration of the transformation process
 * Shows Phase I Task 1.3-1.4 functionality without database dependency
 */

function loadTransformationMapping() {
  const mappingPath = '../transformation_strategy.json';
  const mappingData = fs.readFileSync(mappingPath, 'utf8');
  return JSON.parse(mappingData);
}

function parseNumericValue(value) {
  if (value === null || value === undefined || value === '' || value === 'null') {
    return null;
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return null;
  }

  return numValue >= 0 ? numValue : null;
}

function buildRTTData(csvRow, mapping) {
  const rttData = {
    trust_total: {},
    specialties: {}
  };

  // Build trust total metrics
  const trustTotalMapping = mapping.column_mapping.rtt_data.trust_total;
  trustTotalMapping.forEach(column => {
    const value = parseNumericValue(csvRow[column]);
    const metricName = column.replace('trust_total_', '');
    rttData.trust_total[metricName] = value;
  });

  // Build specialty-specific metrics (sample first 3 specialties)
  const specialties = mapping.column_mapping.rtt_data.specialties;
  const specialtyKeys = Object.keys(specialties).slice(0, 3); // Sample first 3 for demo

  specialtyKeys.forEach(specialty => {
    rttData.specialties[specialty] = {};
    specialties[specialty].forEach(column => {
      const value = parseNumericValue(csvRow[column]);
      const metricName = column.replace(`rtt_${specialty}_`, '');
      rttData.specialties[specialty][metricName] = value;
    });
  });

  return rttData;
}

function buildAEData(csvRow, mapping) {
  const aeData = {};
  const aeMapping = mapping.column_mapping.ae_data;

  aeMapping.forEach(column => {
    const value = parseNumericValue(csvRow[column]);
    const metricName = column.replace('ae_', '');
    aeData[metricName] = value;
  });

  return aeData;
}

function buildDiagnosticsData(csvRow, mapping) {
  const diagnosticsData = {};
  const diagnosticsMapping = mapping.column_mapping.diagnostics_data;

  // Sample first 3 diagnostic types for demo
  const diagnosticKeys = Object.keys(diagnosticsMapping).slice(0, 3);

  diagnosticKeys.forEach(testType => {
    diagnosticsData[testType] = {};
    diagnosticsMapping[testType].forEach(column => {
      const value = parseNumericValue(csvRow[column]);
      const metricName = column.replace(`diag_${testType}_`, '');
      diagnosticsData[testType][metricName] = value;
    });
  });

  return diagnosticsData;
}

function buildCapacityData(csvRow, mapping) {
  const capacityData = {};
  const capacityMapping = mapping.column_mapping.capacity_data;

  capacityMapping.forEach(column => {
    const value = parseNumericValue(csvRow[column]);
    capacityData[column] = value;
  });

  return capacityData;
}

function transformCSVRow(csvRow, mapping) {
  try {
    const record = {
      trust_code: csvRow.trust_code,
      trust_name: csvRow.trust_name || '',
      period: csvRow.period,
      icb_code: csvRow.icb_code || null,
      icb_name: csvRow.icb_name || null,
      data_type: 'monthly',
      rtt_data: buildRTTData(csvRow, mapping),
      ae_data: buildAEData(csvRow, mapping),
      diagnostics_data: buildDiagnosticsData(csvRow, mapping),
      capacity_data: buildCapacityData(csvRow, mapping),
      quality_data: null,
      financial_data: null
    };

    return record;
  } catch (error) {
    console.error('Transformation error:', error.message);
    return null;
  }
}

function validateRecord(record) {
  const errors = [];
  const warnings = [];

  // Basic validation
  if (!record.trust_code || !/^[A-Z0-9]{3}$/.test(record.trust_code)) {
    errors.push('Invalid trust code');
  }

  if (!record.period || !/^\d{4}-\d{2}-\d{2}$/.test(record.period)) {
    errors.push('Invalid period format');
  }

  // Check data completeness
  let totalMetrics = 0;
  let populatedMetrics = 0;

  // Count RTT metrics
  if (record.rtt_data?.trust_total) {
    Object.values(record.rtt_data.trust_total).forEach(value => {
      totalMetrics++;
      if (value !== null && value !== undefined) populatedMetrics++;
    });
  }

  // Count A&E metrics
  if (record.ae_data) {
    Object.values(record.ae_data).forEach(value => {
      totalMetrics++;
      if (value !== null && value !== undefined) populatedMetrics++;
    });
  }

  const completeness = totalMetrics > 0 ? populatedMetrics / totalMetrics : 0;

  if (completeness < 0.5) {
    warnings.push(`Low data completeness: ${Math.round(completeness * 100)}%`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness
  };
}

async function runTransformationDemo() {
  console.log('🧪 NHS Data Transformation Demo');
  console.log('================================\n');

  const csvFilePath = '../Data/unified_monthly_data_enhanced.csv';

  try {
    // Check CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    const stats = fs.statSync(csvFilePath);
    console.log(`📁 CSV file: ${csvFilePath}`);
    console.log(`📊 File size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB\n`);

    // Load transformation mapping
    console.log('📋 Loading transformation mapping...');
    const mapping = loadTransformationMapping();
    console.log(`✅ Loaded mapping for ${Object.keys(mapping.column_mapping).length} data categories\n`);

    // Process sample records
    console.log('🔄 Processing sample records...');

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      valid: 0,
      invalid: 0,
      samples: []
    };

    return new Promise((resolve, reject) => {
      Papa.parse(fs.createReadStream(csvFilePath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          if (results.processed >= 5) { // Process 5 sample records
            return;
          }

          try {
            // Transform CSV row
            const transformedRecord = transformCSVRow(row.data, mapping);

            if (transformedRecord) {
              results.successful++;

              // Validate transformed record
              const validationResult = validateRecord(transformedRecord);

              if (validationResult.isValid) {
                results.valid++;
              } else {
                results.invalid++;
                console.log(`⚠️  Validation warnings for ${transformedRecord.trust_code}:`);
                validationResult.errors.forEach(error => console.log(`   ❌ ${error}`));
                validationResult.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
              }

              // Store sample for display
              if (results.samples.length < 2) {
                results.samples.push({
                  original: {
                    trust_code: row.data.trust_code,
                    trust_name: row.data.trust_name,
                    period: row.data.period
                  },
                  transformed: {
                    trust_code: transformedRecord.trust_code,
                    rtt_sample: Object.keys(transformedRecord.rtt_data.trust_total).slice(0, 3),
                    ae_sample: Object.keys(transformedRecord.ae_data).slice(0, 3),
                    completeness: Math.round(validationResult.completeness * 100) + '%'
                  }
                });
              }

            } else {
              results.failed++;
            }

            results.processed++;

          } catch (error) {
            console.error(`❌ Error processing row ${results.processed + 1}:`, error.message);
            results.failed++;
            results.processed++;
          }
        },
        complete: () => {
          console.log('\n📊 Transformation Demo Results:');
          console.log('================================');
          console.log(`Total Processed: ${results.processed}`);
          console.log(`Successful Transforms: ${results.successful}`);
          console.log(`Failed Transforms: ${results.failed}`);
          console.log(`Valid Records: ${results.valid}`);
          console.log(`Invalid Records: ${results.invalid}`);
          console.log(`Success Rate: ${Math.round(results.successful / results.processed * 100)}%`);
          console.log(`Validation Rate: ${Math.round(results.valid / results.successful * 100)}%\n`);

          // Show sample transformations
          console.log('📋 Sample Transformations:');
          console.log('==========================');
          results.samples.forEach((sample, idx) => {
            console.log(`\nSample ${idx + 1}:`);
            console.log(`  Original: ${sample.original.trust_code} - ${sample.original.trust_name}`);
            console.log(`  Period: ${sample.original.period}`);
            console.log(`  RTT Metrics: ${sample.transformed.rtt_sample.join(', ')}`);
            console.log(`  A&E Metrics: ${sample.transformed.ae_sample.join(', ')}`);
            console.log(`  Completeness: ${sample.transformed.completeness}`);
          });

          // Assessment
          console.log('\n🎯 Phase I Task 1.3-1.4 Assessment:');
          console.log('====================================');

          if (results.successful === results.processed) {
            console.log('✅ CSV to JSONB transformation: PASS');
          } else {
            console.log('⚠️  CSV to JSONB transformation: NEEDS_REVIEW');
          }

          if (results.valid / results.successful >= 0.8) {
            console.log('✅ Data validation: PASS');
          } else {
            console.log('⚠️  Data validation: NEEDS_REVIEW');
          }

          if (results.samples.length > 0) {
            console.log('✅ JSONB structure generation: PASS');
          } else {
            console.log('❌ JSONB structure generation: FAIL');
          }

          console.log('\n🚀 Ready for database population with Supabase credentials!');

          resolve(results);
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    throw error;
  }
}

// Run the demo
if (require.main === module) {
  runTransformationDemo()
    .then(results => {
      console.log('\n🎉 Transformation demo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Demo failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runTransformationDemo };