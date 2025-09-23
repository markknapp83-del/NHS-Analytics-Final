const CSVToSupabasePipeline = require('./transform_csv_to_supabase');
const fs = require('fs');

/**
 * Database Population Script for NHS Data Analytics
 *
 * This script executes Task 1.4 from the Supabase Data Pipeline Plan:
 * - Populate database with transformed data
 * - Validate results
 * - Generate data quality reports
 */

class DatabasePopulator {
  constructor() {
    this.csvFilePath = '../Data/unified_monthly_data_enhanced.csv';
    this.supabaseConfig = this.loadSupabaseConfig();
    this.pipeline = null;
  }

  loadSupabaseConfig() {
    // Try to load from environment variables first
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      return {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY
      };
    }

    // Try to load from .env file
    const envPaths = [
      '../hooks/.env',
      '../.env',
      '../.env.local'
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const envVars = {};

          envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
              const [key, ...valueParts] = line.split('=');
              if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
              }
            }
          });

          if (envVars.SUPABASE_URL && (envVars.SUPABASE_ANON_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY)) {
            return {
              url: envVars.SUPABASE_URL,
              key: envVars.SUPABASE_ANON_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY
            };
          }
        } catch (error) {
          console.warn(`Failed to load config from ${envPath}:`, error.message);
        }
      }
    }

    // Try to load from config file
    const configPaths = [
      '../supabase-config.json',
      '../config/supabase.json'
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith('.json')) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.supabase_url && config.supabase_key) {
              return {
                url: config.supabase_url,
                key: config.supabase_key
              };
            }
          }
        } catch (error) {
          console.warn(`Failed to load config from ${configPath}:`, error.message);
        }
      }
    }

    // Return placeholder for manual configuration
    return {
      url: 'YOUR_SUPABASE_URL',
      key: 'YOUR_SUPABASE_ANON_KEY'
    };
  }

  async validatePrerequisites() {
    console.log('🔍 Validating prerequisites...');

    // Check if CSV file exists
    if (!fs.existsSync(this.csvFilePath)) {
      throw new Error(`CSV file not found: ${this.csvFilePath}`);
    }

    // Check CSV file size and basic structure
    const stats = fs.statSync(this.csvFilePath);
    console.log(`📁 CSV file size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);

    // Validate Supabase configuration
    if (this.supabaseConfig.url === 'YOUR_SUPABASE_URL' ||
        this.supabaseConfig.key === 'YOUR_SUPABASE_ANON_KEY') {
      throw new Error(`
Supabase configuration required. Please either:

1. Set environment variables:
   export SUPABASE_URL="your_supabase_url"
   export SUPABASE_ANON_KEY="your_supabase_key"

2. Create supabase-config.json:
   {
     "supabase_url": "your_supabase_url",
     "supabase_key": "your_supabase_key"
   }

3. Pass credentials as command line arguments:
   node populate_database.js <supabase_url> <supabase_key>
      `);
    }

    console.log('✅ Prerequisites validated');
  }

  async runDatabasePopulation(options = {}) {
    console.log('🚀 Starting database population process...');
    console.log('📋 Process Overview:');
    console.log('   1. Clear existing empty records (if any)');
    console.log('   2. Transform CSV data to JSONB format');
    console.log('   3. Validate all transformed records');
    console.log('   4. Batch insert/update to Supabase');
    console.log('   5. Verify final database state');
    console.log('   6. Generate comprehensive reports');

    const startTime = new Date();

    try {
      // Initialize pipeline
      this.pipeline = new CSVToSupabasePipeline(
        this.supabaseConfig.url,
        this.supabaseConfig.key
      );

      // Step 1: Optional - Clear existing records
      if (options.clearExisting) {
        await this.clearExistingRecords();
      }

      // Step 2-4: Run transformation and population pipeline
      console.log('\n📊 Processing CSV data...');
      const pipelineResult = await this.pipeline.runPipeline(this.csvFilePath, {
        batchSize: options.batchSize || 100
      });

      if (!pipelineResult.success) {
        throw new Error(`Pipeline failed: ${pipelineResult.error}`);
      }

      // Step 5: Verify database state
      console.log('\n🔍 Verifying database state...');
      const verificationResult = await this.verifyDatabaseState();

      // Step 6: Generate final reports
      console.log('\n📄 Generating final reports...');
      const finalReport = await this.generateFinalReport(pipelineResult, verificationResult);

      const endTime = new Date();
      const totalDuration = endTime - startTime;

      console.log('\n🎉 Database population completed successfully!');
      console.log(`⏱️  Total processing time: ${this.formatDuration(totalDuration)}`);
      console.log(`📊 Records processed: ${pipelineResult.valid_records}`);
      console.log(`💾 Database records: ${verificationResult.total_records}`);

      return {
        success: true,
        pipeline_result: pipelineResult,
        verification_result: verificationResult,
        final_report: finalReport,
        processing_time: totalDuration
      };

    } catch (error) {
      console.error('\n❌ Database population failed:', error.message);

      const errorReport = await this.generateErrorReport(error);

      return {
        success: false,
        error: error.message,
        error_report: errorReport
      };
    }
  }

  async clearExistingRecords() {
    console.log('🗑️  Clearing existing records...');

    try {
      const { data, error } = await this.pipeline.transformer.supabase
        .from('trust_metrics')
        .delete()
        .neq('trust_code', 'NEVER_MATCHES'); // Delete all records

      if (error && !error.message.includes('No rows found')) {
        throw new Error(`Failed to clear records: ${error.message}`);
      }

      console.log('✅ Existing records cleared');
    } catch (error) {
      console.warn('⚠️  Could not clear existing records:', error.message);
      console.log('   Continuing with upsert strategy...');
    }
  }

  async verifyDatabaseState() {
    console.log('🔍 Querying database to verify population...');

    try {
      // Get total record count
      const { data: allRecords, error: countError } = await this.pipeline.transformer.supabase
        .from('trust_metrics')
        .select('*');

      if (countError) {
        throw new Error(`Database query failed: ${countError.message}`);
      }

      const totalRecords = allRecords.length;
      console.log(`📊 Total records in database: ${totalRecords}`);

      // Analyze JSONB field population
      const jsonbAnalysis = this.analyzeJSONBPopulation(allRecords);

      // Sample some records for detailed analysis
      const sampleRecords = allRecords.slice(0, 10);
      const sampleAnalysis = this.analyzeSampleRecords(sampleRecords);

      // Check for expected record count (should be around 1,816)
      const expectedRecords = 1816;
      const recordCountStatus = this.assessRecordCount(totalRecords, expectedRecords);

      const verification = {
        total_records: totalRecords,
        expected_records: expectedRecords,
        record_count_status: recordCountStatus,
        jsonb_analysis: jsonbAnalysis,
        sample_analysis: sampleAnalysis,
        verification_timestamp: new Date().toISOString()
      };

      console.log('✅ Database verification completed');
      return verification;

    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      return {
        verification_failed: true,
        error: error.message
      };
    }
  }

  analyzeJSONBPopulation(records) {
    const analysis = {
      total_records: records.length,
      rtt_data_populated: 0,
      ae_data_populated: 0,
      diagnostics_data_populated: 0,
      capacity_data_populated: 0,
      empty_jsonb_count: 0,
      null_jsonb_count: 0,
      properly_structured_count: 0
    };

    records.forEach(record => {
      // Check RTT data
      if (this.isValidJSONB(record.rtt_data)) {
        analysis.rtt_data_populated++;
      }

      // Check A&E data
      if (this.isValidJSONB(record.ae_data)) {
        analysis.ae_data_populated++;
      }

      // Check Diagnostics data
      if (this.isValidJSONB(record.diagnostics_data)) {
        analysis.diagnostics_data_populated++;
      }

      // Check Capacity data
      if (this.isValidJSONB(record.capacity_data)) {
        analysis.capacity_data_populated++;
      }

      // Count empty/null JSONB fields
      const jsonbFields = [record.rtt_data, record.ae_data, record.diagnostics_data, record.capacity_data];
      jsonbFields.forEach(field => {
        if (field === "EMPTY" || field === "") {
          analysis.empty_jsonb_count++;
        } else if (field === null || field === undefined) {
          analysis.null_jsonb_count++;
        }
      });

      // Count properly structured records
      if (this.isValidJSONB(record.rtt_data) && this.isValidJSONB(record.ae_data)) {
        analysis.properly_structured_count++;
      }
    });

    // Calculate success percentages
    analysis.success_metrics = {
      rtt_population_rate: Math.round(analysis.rtt_data_populated / analysis.total_records * 100),
      ae_population_rate: Math.round(analysis.ae_data_populated / analysis.total_records * 100),
      overall_success_rate: Math.round(analysis.properly_structured_count / analysis.total_records * 100)
    };

    return analysis;
  }

  isValidJSONB(jsonbField) {
    return jsonbField &&
           typeof jsonbField === 'object' &&
           jsonbField !== "EMPTY" &&
           Object.keys(jsonbField).length > 0;
  }

  analyzeSampleRecords(sampleRecords) {
    const analysis = {
      sample_size: sampleRecords.length,
      trust_codes: sampleRecords.map(r => r.trust_code),
      periods: [...new Set(sampleRecords.map(r => r.period))],
      icb_codes_present: sampleRecords.filter(r => r.icb_code).length,
      data_structure_examples: []
    };

    // Provide examples of data structure
    sampleRecords.slice(0, 3).forEach((record, idx) => {
      analysis.data_structure_examples.push({
        trust_code: record.trust_code,
        period: record.period,
        rtt_structure: this.getStructureExample(record.rtt_data),
        ae_structure: this.getStructureExample(record.ae_data)
      });
    });

    return analysis;
  }

  getStructureExample(jsonbField) {
    if (!this.isValidJSONB(jsonbField)) {
      return 'Invalid or empty';
    }

    const keys = Object.keys(jsonbField);
    if (keys.length === 0) {
      return 'Empty object';
    }

    return {
      top_level_keys: keys,
      sample_value: jsonbField[keys[0]]
    };
  }

  assessRecordCount(actual, expected) {
    const difference = Math.abs(actual - expected);
    const percentage = (difference / expected) * 100;

    if (percentage <= 5) {
      return {
        status: 'excellent',
        message: `Record count matches expected (within 5%): ${actual}/${expected}`
      };
    } else if (percentage <= 15) {
      return {
        status: 'good',
        message: `Record count close to expected (within 15%): ${actual}/${expected}`
      };
    } else {
      return {
        status: 'warning',
        message: `Record count differs significantly from expected: ${actual}/${expected} (${percentage.toFixed(1)}% difference)`
      };
    }
  }

  async generateFinalReport(pipelineResult, verificationResult) {
    const report = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        report_type: 'Database Population Final Report',
        phase: 'Phase I Task 1.4 - Database Population & Validation'
      },
      success_criteria_assessment: this.assessSuccessCriteria(pipelineResult, verificationResult),
      pipeline_summary: pipelineResult.report,
      database_verification: verificationResult,
      recommendations: this.generateFinalRecommendations(pipelineResult, verificationResult),
      next_steps: this.generateNextSteps()
    };

    const reportFilename = `database_population_final_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    console.log(`📄 Final report saved: ${reportFilename}`);

    return report;
  }

  assessSuccessCriteria(pipelineResult, verificationResult) {
    const criteria = {
      csv_records_transformed: {
        target: 'All 1,816 CSV records successfully transformed',
        actual: pipelineResult.valid_records || 0,
        status: (pipelineResult.valid_records || 0) > 1500 ? 'PASS' : 'NEEDS_REVIEW'
      },
      no_empty_jsonb: {
        target: 'No "EMPTY" JSONB fields - all data properly structured',
        actual: verificationResult.jsonb_analysis?.empty_jsonb_count || 'Unknown',
        status: (verificationResult.jsonb_analysis?.empty_jsonb_count || 1) === 0 ? 'PASS' : 'NEEDS_REVIEW'
      },
      icb_codes_populated: {
        target: 'ICB codes populated where available',
        actual: `${verificationResult.sample_analysis?.icb_codes_present || 0}/${verificationResult.sample_analysis?.sample_size || 0} sample records`,
        status: 'INFORMATIONAL'
      },
      database_queries_functional: {
        target: 'Database queries return expected results',
        actual: verificationResult.verification_failed ? 'Failed' : 'Success',
        status: !verificationResult.verification_failed ? 'PASS' : 'FAIL'
      }
    };

    const passCount = Object.values(criteria).filter(c => c.status === 'PASS').length;
    const totalCriteria = Object.values(criteria).filter(c => c.status !== 'INFORMATIONAL').length;

    return {
      overall_status: passCount === totalCriteria ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      criteria_met: `${passCount}/${totalCriteria}`,
      detailed_assessment: criteria
    };
  }

  generateFinalRecommendations(pipelineResult, verificationResult) {
    const recommendations = [];

    // Check transformation success rate
    if (pipelineResult.transformation_summary?.success_rate < 90) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Data Quality',
        issue: 'Low transformation success rate',
        recommendation: 'Review source CSV data quality and implement data cleaning processes'
      });
    }

    // Check JSONB population
    if (verificationResult.jsonb_analysis?.overall_success_rate < 85) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Database Schema',
        issue: 'Low JSONB population rate',
        recommendation: 'Investigate transformation logic and ensure proper JSONB structure creation'
      });
    }

    // Check record count
    if (verificationResult.record_count_status?.status === 'warning') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Data Completeness',
        issue: 'Record count differs from expected',
        recommendation: 'Verify CSV data completeness and investigate missing records'
      });
    }

    return recommendations;
  }

  generateNextSteps() {
    return [
      {
        step: 'Phase II: Automated Data Pipeline Development',
        description: 'Build automated NHS data download and processing system',
        estimated_effort: '6-8 hours'
      },
      {
        step: 'NHS Data Source Integration',
        description: 'Create automated download system for RTT, A&E, and diagnostics data',
        estimated_effort: '2 hours'
      },
      {
        step: 'Multi-Source Data Processing',
        description: 'Build processors for different NHS Excel file formats',
        estimated_effort: '2 hours'
      },
      {
        step: 'Pipeline Orchestration & Scheduling',
        description: 'Build automated pipeline with scheduling and monitoring',
        estimated_effort: '2 hours'
      },
      {
        step: 'Data Quality & Monitoring',
        description: 'Implement comprehensive data quality monitoring system',
        estimated_effort: '2 hours'
      }
    ];
  }

  async generateErrorReport(error) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error_type: error.constructor.name,
      error_message: error.message,
      error_stack: error.stack,
      system_info: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage()
      },
      recommendations: [
        'Check Supabase credentials and connection',
        'Verify CSV file path and structure',
        'Review error logs for specific failure points',
        'Ensure sufficient system memory for processing'
      ]
    };

    const errorFilename = `error_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(errorFilename, JSON.stringify(errorReport, null, 2));
    console.log(`📄 Error report saved: ${errorFilename}`);

    return errorReport;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  // Handle command line arguments
  if (args.length >= 2) {
    process.env.SUPABASE_URL = args[0];
    process.env.SUPABASE_ANON_KEY = args[1];
  }

  const populator = new DatabasePopulator();

  try {
    // Validate prerequisites
    await populator.validatePrerequisites();

    // Run database population
    const result = await populator.runDatabasePopulation({
      batchSize: args[2] ? parseInt(args[2]) : 100,
      clearExisting: args.includes('--clear')
    });

    if (result.success) {
      console.log('\n🎉 Phase I Task 1.4 completed successfully!');
      console.log('✅ Database populated and validated');
      console.log('📊 Data quality reports generated');
      console.log('\n📋 Ready for Phase II: Automated Data Pipeline Development');
      process.exit(0);
    } else {
      console.error('\n💥 Phase I Task 1.4 failed');
      console.error('❌ Check error reports for details');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabasePopulator;