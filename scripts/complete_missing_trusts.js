const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
const NHSDataTransformer = require('./data_transformer');
const ValidationEngine = require('./validation_engine');

/**
 * Complete Missing Trusts Population Script
 *
 * This script identifies the missing trusts and processes only those records
 * to complete the 151 trust, 1,816 record target
 */

class CompleteMissingTrusts {
  constructor() {
    this.supabaseConfig = this.loadSupabaseConfig();
    this.supabase = null;
    this.transformer = null;
    this.validator = null;
    this.missingTrusts = [];
    this.processedRecords = 0;
    this.successfulInserts = 0;
  }

  loadSupabaseConfig() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      return {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY
      };
    }

    const envPaths = ['../hooks/.env', '../.env', '../.env.local'];
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
          console.warn(`Could not load ${envPath}:`, error.message);
        }
      }
    }

    throw new Error('Supabase configuration required');
  }

  async initialize() {
    console.log('🚀 Initializing Complete Missing Trusts processor...');
    this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.key);
    this.transformer = new NHSDataTransformer(this.supabaseConfig.url, this.supabaseConfig.key);
    this.validator = new ValidationEngine();
    console.log('✅ All components initialized');
  }

  async identifyMissingTrusts() {
    console.log('\n🔍 Identifying missing trusts...');

    // Get existing trusts from database
    const { data: existingRecords, error } = await this.supabase
      .from('trust_metrics')
      .select('trust_code');

    if (error) {
      throw new Error(`Failed to query existing trusts: ${error.message}`);
    }

    const existingTrusts = new Set(existingRecords.map(r => r.trust_code));
    console.log(`📊 Found ${existingTrusts.size} trusts already in database`);

    // Get all trusts from CSV
    return new Promise((resolve, reject) => {
      const csvTrusts = new Set();
      const csvPath = '../Data/unified_monthly_data_enhanced.csv';

      Papa.parse(fs.createReadStream(csvPath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          if (row.data.trust_code && row.data.trust_code !== 'trust_code') {
            csvTrusts.add(row.data.trust_code);
          }
        },
        complete: () => {
          this.missingTrusts = Array.from(csvTrusts).filter(trust => !existingTrusts.has(trust));
          this.missingTrusts.sort();

          console.log(`📁 Total trusts in CSV: ${csvTrusts.size}`);
          console.log(`❌ Missing trusts: ${this.missingTrusts.length}`);
          console.log(`🎯 Missing trusts: ${this.missingTrusts.slice(0, 10).join(', ')}${this.missingTrusts.length > 10 ? '...' : ''}`);

          resolve();
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  async processMissingTrusts() {
    if (this.missingTrusts.length === 0) {
      console.log('✅ No missing trusts - all trusts already in database');
      return { success: true, message: 'Database complete' };
    }

    console.log(`\n📊 Processing ${this.missingTrusts.length} missing trusts...`);
    console.log('======================================================');

    return new Promise((resolve, reject) => {
      const csvPath = '../Data/unified_monthly_data_enhanced.csv';
      const recordsToInsert = [];

      Papa.parse(fs.createReadStream(csvPath), {
        header: true,
        skipEmptyLines: true,
        step: async (row) => {
          const trustCode = row.data.trust_code;

          // Only process rows for missing trusts
          if (this.missingTrusts.includes(trustCode)) {
            try {
              // Transform CSV row
              const transformedRecord = this.transformer.transform_csv_row(row.data);

              if (transformedRecord) {
                // Use permissive validation to ensure we capture partial data
                const validationResult = this.validator.validateRecord(transformedRecord, true);

                if (validationResult.isValid) {
                  recordsToInsert.push(transformedRecord);
                  this.processedRecords++;

                  // Insert in smaller batches to avoid constraints/timeouts
                  if (recordsToInsert.length >= 50) {
                    await this.insertBatch(recordsToInsert.splice(0, 50));
                  }
                } else {
                  console.log(`⚠️  Could not validate ${trustCode}: ${validationResult.errors.join(', ')}`);
                }
              }

              // Progress reporting
              if (this.processedRecords % 100 === 0) {
                console.log(`📈 Processed ${this.processedRecords} missing trust records, inserted ${this.successfulInserts}`);
              }

            } catch (error) {
              console.error(`❌ Error processing ${trustCode}:`, error.message);
            }
          }
        },
        complete: async () => {
          // Insert remaining records
          if (recordsToInsert.length > 0) {
            await this.insertBatch(recordsToInsert);
          }

          console.log('\n✅ Missing trusts processing completed');
          console.log(`📊 Processed records: ${this.processedRecords}`);
          console.log(`💾 Successfully inserted: ${this.successfulInserts}`);

          resolve({
            success: true,
            processed: this.processedRecords,
            inserted: this.successfulInserts
          });
        },
        error: (error) => {
          reject(new Error(`CSV processing error: ${error.message}`));
        }
      });
    });
  }

  async insertBatch(records) {
    if (records.length === 0) return;

    try {
      console.log(`📤 Inserting batch of ${records.length} records...`);

      // Use simple insert to avoid constraint conflicts
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .insert(records);

      if (error) {
        // Handle specific constraint violations
        if (error.code === '23505') {
          console.log(`⚠️  Duplicate key constraint - some records already exist`);
          // Try individual inserts for this batch
          await this.insertRecordsIndividually(records);
        } else {
          console.error(`❌ Batch insert failed: ${error.message}`);
          // Try individual inserts as fallback
          await this.insertRecordsIndividually(records);
        }
      } else {
        this.successfulInserts += records.length;
        console.log(`✅ Successfully inserted ${records.length} records`);
      }

    } catch (error) {
      console.error(`❌ Unexpected error in batch insert:`, error.message);
      // Try individual inserts as fallback
      await this.insertRecordsIndividually(records);
    }
  }

  async insertRecordsIndividually(records) {
    console.log(`🔄 Attempting individual inserts for ${records.length} records...`);

    for (const record of records) {
      try {
        const { data, error } = await this.supabase
          .from('trust_metrics')
          .insert([record]);

        if (error) {
          if (error.code === '23505') {
            // Duplicate key - skip silently
            continue;
          } else {
            console.log(`⚠️  Failed to insert ${record.trust_code} ${record.period}: ${error.message}`);
          }
        } else {
          this.successfulInserts++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        console.log(`❌ Error inserting ${record.trust_code}: ${error.message}`);
      }
    }
  }

  async verifyCompletion() {
    console.log('\n🔍 Verifying database completion...');

    const { data: allRecords, error } = await this.supabase
      .from('trust_metrics')
      .select('trust_code, period');

    if (error) {
      throw new Error(`Failed to verify database: ${error.message}`);
    }

    const uniqueTrusts = new Set(allRecords.map(r => r.trust_code));
    const totalRecords = allRecords.length;

    console.log(`📊 Final Database State:`);
    console.log(`   Total records: ${totalRecords}`);
    console.log(`   Unique trusts: ${uniqueTrusts.size}`);
    console.log(`   Target: 1,816 records, 151 trusts`);

    const targetAchieved = {
      records: totalRecords >= 1816,
      trusts: uniqueTrusts.size >= 151
    };

    if (targetAchieved.records && targetAchieved.trusts) {
      console.log('🎉 TARGET ACHIEVED: 151 trusts with 1,816 records!');
    } else {
      console.log(`📈 Progress: ${uniqueTrusts.size}/151 trusts (${Math.round(uniqueTrusts.size/151*100)}%), ${totalRecords}/1816 records (${Math.round(totalRecords/1816*100)}%)`);
    }

    return {
      total_records: totalRecords,
      unique_trusts: uniqueTrusts.size,
      target_records: 1816,
      target_trusts: 151,
      records_achieved: targetAchieved.records,
      trusts_achieved: targetAchieved.trusts,
      success: targetAchieved.records && targetAchieved.trusts
    };
  }

  async generateCompletionReport() {
    const verification = await this.verifyCompletion();

    const report = {
      completion_metadata: {
        timestamp: new Date().toISOString(),
        operation: 'Complete Missing Trusts Population',
        target_records: 1816,
        target_trusts: 151
      },
      processing_summary: {
        missing_trusts_processed: this.missingTrusts.length,
        records_processed: this.processedRecords,
        records_inserted: this.successfulInserts
      },
      final_state: verification,
      success_criteria: {
        all_trusts_captured: verification.trusts_achieved,
        all_records_stored: verification.records_achieved,
        overall_success: verification.success
      }
    };

    const reportFile = `completion_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Completion report saved: ${reportFile}`);

    return report;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    process.env.SUPABASE_URL = args[0];
    process.env.SUPABASE_ANON_KEY = args[1];
  }

  const processor = new CompleteMissingTrusts();

  try {
    await processor.initialize();
    await processor.identifyMissingTrusts();

    const result = await processor.processMissingTrusts();
    const report = await processor.generateCompletionReport();

    if (report.success_criteria.overall_success) {
      console.log('\n🎉 MISSION ACCOMPLISHED!');
      console.log('✅ All 151 NHS trusts with 1,816 records successfully captured');
      process.exit(0);
    } else {
      console.log('\n📈 Significant progress made, but target not yet reached');
      console.log('💡 Consider running the script again or investigating remaining issues');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Processing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CompleteMissingTrusts;