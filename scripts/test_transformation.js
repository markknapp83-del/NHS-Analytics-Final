const NHSDataTransformer = require('./data_transformer');
const ValidationEngine = require('./validation_engine');
const fs = require('fs');
const Papa = require('papaparse');

/**
 * Test script to validate transformation logic without database connection
 * This demonstrates Phase I Task 1.4 functionality
 */

class TransformationTester {
  constructor() {
    this.csvFilePath = '../Data/unified_monthly_data_enhanced.csv';
    // Create transformer without Supabase connection for testing
    this.transformer = this.createTestTransformer();
    this.validator = new ValidationEngine();
    this.testResults = {
      sample_size: 10,
      successful_transforms: 0,
      failed_transforms: 0,
      validation_passes: 0,
      validation_failures: 0,
      sample_records: []
    };
  }

  createTestTransformer() {
    // Create a mock transformer that doesn't need Supabase connection
    const mockTransformer = new NHSDataTransformer.__proto__.constructor();

    // Copy the necessary methods without creating Supabase client
    mockTransformer.validationRules = {
      trust_code: {
        required: true,
        pattern: /^[A-Z0-9]{3}$/,
        description: "3-character trust code"
      },
      period: {
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        description: "ISO date format YYYY-MM-DD"
      }
    };

    mockTransformer.transformationMapping = JSON.parse(fs.readFileSync('../transformation_strategy.json', 'utf8'));
    mockTransformer.errors = [];
    mockTransformer.warnings = [];
    mockTransformer.successfulTransforms = 0;
    mockTransformer.failedTransforms = 0;

    // Copy all the transformation methods
    const originalTransformer = require('./data_transformer');
    const proto = originalTransformer.prototype;

    mockTransformer.transform_csv_row = proto.transform_csv_row.bind(mockTransformer);
    mockTransformer.build_rtt_data = proto.build_rtt_data.bind(mockTransformer);
    mockTransformer.build_ae_data = proto.build_ae_data.bind(mockTransformer);
    mockTransformer.build_diagnostics_data = proto.build_diagnostics_data.bind(mockTransformer);
    mockTransformer.build_capacity_data = proto.build_capacity_data.bind(mockTransformer);
    mockTransformer.validateTrustCode = proto.validateTrustCode.bind(mockTransformer);
    mockTransformer.validatePeriod = proto.validatePeriod.bind(mockTransformer);
    mockTransformer.parseNumericValue = proto.parseNumericValue.bind(mockTransformer);
    mockTransformer.validate_record = proto.validate_record.bind(mockTransformer);
    mockTransformer.countCoreMetrics = proto.countCoreMetrics.bind(mockTransformer);
    mockTransformer.validateCrossFieldRelationships = proto.validateCrossFieldRelationships.bind(mockTransformer);
    mockTransformer.validatePercentageRanges = proto.validatePercentageRanges.bind(mockTransformer);
    mockTransformer.loadValidationRules = proto.loadValidationRules.bind(mockTransformer);
    mockTransformer.loadTransformationMapping = proto.loadTransformationMapping.bind(mockTransformer);

    return mockTransformer;
  }

  async runTransformationTest() {
    console.log('🧪 Running transformation test...');
    console.log(`📁 CSV file: ${this.csvFilePath}`);

    try {
      await this.validateCSVExists();
      await this.testSampleTransformations();
      this.generateTestReport();

      console.log('✅ Transformation test completed successfully!');
      return this.testResults;

    } catch (error) {
      console.error('❌ Transformation test failed:', error.message);
      throw error;
    }
  }

  async validateCSVExists() {
    if (!fs.existsSync(this.csvFilePath)) {
      throw new Error(`CSV file not found: ${this.csvFilePath}`);
    }

    const stats = fs.statSync(this.csvFilePath);
    console.log(`📊 CSV file size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);
  }

  async testSampleTransformations() {
    return new Promise((resolve, reject) => {
      let processedRows = 0;

      Papa.parse(fs.createReadStream(this.csvFilePath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          if (processedRows >= this.testResults.sample_size) {
            return; // Stop after sample size
          }

          try {
            // Transform CSV row
            const transformedRecord = this.transformer.transform_csv_row(row.data);

            if (transformedRecord) {
              this.testResults.successful_transforms++;

              // Validate transformed record
              const validationResult = this.validator.validateRecord(transformedRecord);

              if (validationResult.isValid) {
                this.testResults.validation_passes++;
              } else {
                this.testResults.validation_failures++;
                console.log(`⚠️  Validation failed for ${transformedRecord.trust_code}: ${validationResult.errors.join(', ')}`);
              }

              // Store sample for analysis
              this.testResults.sample_records.push({
                original_data: {
                  trust_code: row.data.trust_code,
                  trust_name: row.data.trust_name,
                  period: row.data.period
                },
                transformed_data: {
                  trust_code: transformedRecord.trust_code,
                  rtt_data_sample: this.extractSample(transformedRecord.rtt_data),
                  ae_data_sample: this.extractSample(transformedRecord.ae_data),
                  diagnostics_data_sample: this.extractSample(transformedRecord.diagnostics_data),
                  capacity_data_sample: this.extractSample(transformedRecord.capacity_data)
                },
                validation_result: {
                  is_valid: validationResult.isValid,
                  error_count: validationResult.errors.length,
                  warning_count: validationResult.warnings.length,
                  completeness: Math.round(validationResult.completeness * 100)
                }
              });

            } else {
              this.testResults.failed_transforms++;
              console.log(`❌ Transformation failed for row ${processedRows + 1}`);
            }

            processedRows++;

            if (processedRows % 5 === 0) {
              console.log(`📈 Processed ${processedRows}/${this.testResults.sample_size} sample records`);
            }

          } catch (error) {
            this.testResults.failed_transforms++;
            console.error(`❌ Error processing row ${processedRows + 1}:`, error.message);
            processedRows++;
          }
        },
        complete: () => {
          console.log(`🎯 Sample processing complete: ${processedRows} records processed`);
          resolve();
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  extractSample(jsonbData) {
    if (!jsonbData || typeof jsonbData !== 'object') {
      return 'Invalid or empty';
    }

    const keys = Object.keys(jsonbData);
    if (keys.length === 0) {
      return 'Empty object';
    }

    // Return first few keys and values as sample
    const sample = {};
    keys.slice(0, 3).forEach(key => {
      sample[key] = jsonbData[key];
    });

    return sample;
  }

  generateTestReport() {
    const report = {
      test_metadata: {
        timestamp: new Date().toISOString(),
        csv_file: this.csvFilePath,
        sample_size: this.testResults.sample_size
      },
      transformation_results: {
        successful_transforms: this.testResults.successful_transforms,
        failed_transforms: this.testResults.failed_transforms,
        success_rate: Math.round(this.testResults.successful_transforms / this.testResults.sample_size * 100)
      },
      validation_results: {
        validation_passes: this.testResults.validation_passes,
        validation_failures: this.testResults.validation_failures,
        validation_success_rate: Math.round(this.testResults.validation_passes / this.testResults.successful_transforms * 100)
      },
      data_structure_analysis: this.analyzeDataStructures(),
      sample_records: this.testResults.sample_records,
      success_criteria_assessment: this.assessTestCriteria(),
      recommendations: this.generateTestRecommendations()
    };

    const reportFilename = `transformation_test_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    console.log(`📄 Test report saved: ${reportFilename}`);

    // Also generate a human-readable summary
    this.generateHumanReadableSummary(report);

    return report;
  }

  analyzeDataStructures() {
    const analysis = {
      rtt_data_structures: {},
      ae_data_structures: {},
      diagnostics_data_structures: {},
      capacity_data_structures: {}
    };

    this.testResults.sample_records.forEach(record => {
      const rttData = record.transformed_data.rtt_data_sample;
      const aeData = record.transformed_data.ae_data_sample;
      const diagData = record.transformed_data.diagnostics_data_sample;
      const capData = record.transformed_data.capacity_data_sample;

      // Analyze RTT data structure
      if (rttData && typeof rttData === 'object') {
        Object.keys(rttData).forEach(key => {
          analysis.rtt_data_structures[key] = (analysis.rtt_data_structures[key] || 0) + 1;
        });
      }

      // Analyze A&E data structure
      if (aeData && typeof aeData === 'object') {
        Object.keys(aeData).forEach(key => {
          analysis.ae_data_structures[key] = (analysis.ae_data_structures[key] || 0) + 1;
        });
      }

      // Similar for other data types...
    });

    return analysis;
  }

  assessTestCriteria() {
    const criteria = {
      csv_parsing: {
        target: 'Successfully parse CSV data',
        status: this.testResults.sample_size > 0 ? 'PASS' : 'FAIL'
      },
      data_transformation: {
        target: 'Transform CSV rows to JSONB format',
        actual: `${this.testResults.successful_transforms}/${this.testResults.sample_size}`,
        status: this.testResults.successful_transforms / this.testResults.sample_size >= 0.9 ? 'PASS' : 'NEEDS_REVIEW'
      },
      data_validation: {
        target: 'Validate transformed records',
        actual: `${this.testResults.validation_passes}/${this.testResults.successful_transforms}`,
        status: this.testResults.validation_passes / this.testResults.successful_transforms >= 0.8 ? 'PASS' : 'NEEDS_REVIEW'
      },
      jsonb_structure: {
        target: 'Generate proper JSONB structure',
        status: this.hasValidJSONBStructures() ? 'PASS' : 'NEEDS_REVIEW'
      }
    };

    const passCount = Object.values(criteria).filter(c => c.status === 'PASS').length;
    const totalCriteria = Object.keys(criteria).length;

    return {
      overall_status: passCount === totalCriteria ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      criteria_met: `${passCount}/${totalCriteria}`,
      detailed_assessment: criteria
    };
  }

  hasValidJSONBStructures() {
    return this.testResults.sample_records.some(record => {
      const rttData = record.transformed_data.rtt_data_sample;
      const aeData = record.transformed_data.ae_data_sample;

      return (rttData && typeof rttData === 'object' && Object.keys(rttData).length > 0) &&
             (aeData && typeof aeData === 'object' && Object.keys(aeData).length > 0);
    });
  }

  generateTestRecommendations() {
    const recommendations = [];

    const transformationSuccessRate = this.testResults.successful_transforms / this.testResults.sample_size;
    if (transformationSuccessRate < 0.9) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Low transformation success rate',
        recommendation: 'Review CSV data format and transformation logic'
      });
    }

    const validationSuccessRate = this.testResults.validation_passes / this.testResults.successful_transforms;
    if (validationSuccessRate < 0.8) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'High validation failure rate',
        recommendation: 'Review validation rules and data quality standards'
      });
    }

    if (!this.hasValidJSONBStructures()) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Invalid JSONB structure generation',
        recommendation: 'Fix transformation logic to generate proper nested JSON structures'
      });
    }

    return recommendations;
  }

  generateHumanReadableSummary(report) {
    const summary = `
# NHS Data Transformation Test Summary

**Generated:** ${new Date().toISOString()}

## Test Results

### Transformation Performance
- ✅ Successful Transformations: ${report.transformation_results.successful_transforms}/${this.testResults.sample_size} (${report.transformation_results.success_rate}%)
- ❌ Failed Transformations: ${report.transformation_results.failed_transforms}

### Validation Performance
- ✅ Validation Passes: ${report.validation_results.validation_passes}
- ⚠️  Validation Failures: ${report.validation_results.validation_failures}
- 📊 Validation Success Rate: ${report.validation_results.validation_success_rate}%

### Overall Assessment
**Status:** ${report.success_criteria_assessment.overall_status}
**Criteria Met:** ${report.success_criteria_assessment.criteria_met}

### Sample Data Structure (First Record)
\`\`\`json
${JSON.stringify(this.testResults.sample_records[0]?.transformed_data, null, 2)}
\`\`\`

### Recommendations
${report.recommendations.map(r => `- **${r.priority}:** ${r.issue} - ${r.recommendation}`).join('\n')}

---
*This test validates the Phase I Task 1.3 transformation engine before database population.*
    `;

    const summaryFilename = `transformation_test_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    fs.writeFileSync(summaryFilename, summary);
    console.log(`📄 Human-readable summary saved: ${summaryFilename}`);
  }
}

// CLI usage
async function main() {
  const tester = new TransformationTester();

  try {
    const results = await tester.runTransformationTest();

    console.log('\n📋 Test Summary:');
    console.log(`  Transformation Success Rate: ${Math.round(results.successful_transforms / results.sample_size * 100)}%`);
    console.log(`  Validation Success Rate: ${Math.round(results.validation_passes / results.successful_transforms * 100)}%`);

    if (results.successful_transforms === results.sample_size &&
        results.validation_passes === results.successful_transforms) {
      console.log('\n🎉 All tests passed! Ready for database population.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the detailed reports.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TransformationTester;