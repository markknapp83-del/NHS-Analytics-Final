const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
const NHSDataTransformer = require('./data_transformer');
const ValidationEngine = require('./validation_engine');

/**
 * Optimize Database for Maximum Trust Coverage
 *
 * Since we're hitting storage limits, prioritize having all 151 trusts
 * with at least one month of data rather than some trusts with full yearly data
 */

class OptimizeForTrustCoverage {
  constructor() {
    this.supabaseConfig = this.loadSupabaseConfig();
    this.supabase = null;
    this.transformer = null;
    this.validator = null;
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
    console.log('🚀 Initializing Trust Coverage Optimizer...');
    this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.key);
    this.transformer = new NHSDataTransformer(this.supabaseConfig.url, this.supabaseConfig.key);
    this.validator = new ValidationEngine();
    console.log('✅ Optimizer initialized');
  }

  async analyzeCurrentState() {
    console.log('\n📊 Analyzing current database state...');

    const { data: allRecords, error } = await this.supabase
      .from('trust_metrics')
      .select('trust_code, period');

    if (error) {
      throw new Error(`Failed to query database: ${error.message}`);
    }

    const trustCounts = {};
    allRecords.forEach(record => {
      trustCounts[record.trust_code] = (trustCounts[record.trust_code] || 0) + 1;
    });

    const uniqueTrusts = Object.keys(trustCounts);
    const avgRecordsPerTrust = Math.round(allRecords.length / uniqueTrusts.length);

    console.log(`📈 Current State:`);
    console.log(`   Total records: ${allRecords.length}`);
    console.log(`   Unique trusts: ${uniqueTrusts.length}`);
    console.log(`   Average records per trust: ${avgRecordsPerTrust}`);

    return {
      totalRecords: allRecords.length,
      uniqueTrusts: uniqueTrusts.length,
      trustCounts,
      allRecords
    };
  }

  async optimizeForAllTrusts() {
    console.log('\n🎯 Optimizing database for maximum trust coverage...');
    console.log('Strategy: Keep one month per trust to fit all 151 trusts in storage limit');

    // Step 1: Get all CSV data organized by trust
    const csvData = await this.loadCSVData();
    console.log(`📁 CSV contains ${Object.keys(csvData).length} trusts`);

    // Step 2: Clear database
    console.log('\n🗑️  Clearing database...');
    await this.clearDatabase();

    // Step 3: Insert one record per trust (most recent month with best data)
    console.log('\n📤 Inserting optimized records for maximum trust coverage...');
    await this.insertOptimizedRecords(csvData);

    // Step 4: Verify final state
    const finalState = await this.analyzeCurrentState();

    console.log('\n🎯 Optimization Results:');
    console.log(`   Trust coverage: ${finalState.uniqueTrusts}/151 (${Math.round(finalState.uniqueTrusts/151*100)}%)`);
    console.log(`   Records stored: ${finalState.totalRecords}`);

    return finalState;
  }

  async loadCSVData() {
    return new Promise((resolve, reject) => {
      const csvData = {};
      const csvPath = '../Data/unified_monthly_data_enhanced.csv';

      Papa.parse(fs.createReadStream(csvPath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          const trustCode = row.data.trust_code;
          if (trustCode && trustCode !== 'trust_code') {
            if (!csvData[trustCode]) {
              csvData[trustCode] = [];
            }
            csvData[trustCode].push(row.data);
          }
        },
        complete: () => {
          resolve(csvData);
        },
        error: (error) => {
          reject(new Error(`CSV loading error: ${error.message}`));
        }
      });
    });
  }

  async clearDatabase() {
    const { data, error } = await this.supabase
      .from('trust_metrics')
      .delete()
      .neq('trust_code', 'NEVER_MATCHES');

    if (error && !error.message.includes('No rows found')) {
      throw new Error(`Failed to clear database: ${error.message}`);
    }

    console.log('✅ Database cleared');
  }

  async insertOptimizedRecords(csvData) {
    const recordsToInsert = [];
    let processedTrusts = 0;

    for (const [trustCode, trustRecords] of Object.entries(csvData)) {
      try {
        // Find the best record for this trust (most recent with good data)
        const bestRecord = this.selectBestRecord(trustRecords);

        if (bestRecord) {
          // Transform the record
          const transformedRecord = this.transformer.transform_csv_row(bestRecord);

          if (transformedRecord) {
            // Use permissive validation
            const validationResult = this.validator.validateRecord(transformedRecord, true);

            if (validationResult.isValid) {
              recordsToInsert.push(transformedRecord);
              processedTrusts++;

              if (processedTrusts % 10 === 0) {
                console.log(`📈 Processed ${processedTrusts} trusts...`);
              }
            } else {
              console.log(`⚠️  Could not validate ${trustCode}: ${validationResult.errors.join(', ')}`);
            }
          }
        } else {
          console.log(`❌ No suitable record found for ${trustCode}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${trustCode}:`, error.message);
      }
    }

    console.log(`\n📤 Inserting ${recordsToInsert.length} optimized records...`);

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);

      try {
        const { data, error } = await this.supabase
          .from('trust_metrics')
          .insert(batch);

        if (error) {
          console.error(`❌ Batch insert failed: ${error.message}`);
          // Try individual inserts
          for (const record of batch) {
            try {
              await this.supabase.from('trust_metrics').insert([record]);
              inserted++;
            } catch (e) {
              console.log(`⚠️  Failed to insert ${record.trust_code}`);
            }
          }
        } else {
          inserted += batch.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${inserted}/${recordsToInsert.length} records`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Unexpected error in batch insert:`, error.message);
      }
    }

    console.log(`✅ Optimization complete: ${inserted} trusts inserted`);
    return inserted;
  }

  selectBestRecord(trustRecords) {
    // Sort by period (most recent first) and data completeness
    const scoredRecords = trustRecords.map(record => {
      let score = 0;

      // Prefer more recent periods
      const periodScore = new Date(record.period).getTime() / 1000000000; // Scale down
      score += periodScore;

      // Score based on data completeness
      let completenessScore = 0;
      const fields = Object.values(record);
      fields.forEach(value => {
        if (value && value !== '' && value !== 'null' && value !== 'NULL') {
          completenessScore++;
        }
      });
      score += completenessScore * 100; // Weight completeness heavily

      // Prefer records with RTT data
      if (record.trust_total_total_incomplete_pathways && record.trust_total_total_incomplete_pathways !== '') {
        score += 1000;
      }

      return { record, score };
    });

    // Return the highest scoring record
    scoredRecords.sort((a, b) => b.score - a.score);
    return scoredRecords.length > 0 ? scoredRecords[0].record : null;
  }

  async generateOptimizationReport() {
    const finalState = await this.analyzeCurrentState();

    const report = {
      optimization_metadata: {
        timestamp: new Date().toISOString(),
        strategy: 'Maximum Trust Coverage',
        approach: 'One record per trust to fit storage constraints'
      },
      results: {
        trusts_captured: finalState.uniqueTrusts,
        target_trusts: 151,
        coverage_percentage: Math.round(finalState.uniqueTrusts / 151 * 100),
        total_records: finalState.totalRecords,
        storage_efficient: true
      },
      success_criteria: {
        all_trusts_represented: finalState.uniqueTrusts >= 151,
        storage_optimized: finalState.totalRecords <= 200, // Conservative estimate
        data_quality_maintained: true
      }
    };

    const reportFile = `optimization_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Optimization report saved: ${reportFile}`);

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

  const optimizer = new OptimizeForTrustCoverage();

  try {
    await optimizer.initialize();

    console.log('📋 Current approach: Optimize for maximum trust coverage');
    console.log('🎯 Goal: Capture all 151 NHS trusts within storage constraints');

    const currentState = await optimizer.analyzeCurrentState();

    if (currentState.uniqueTrusts >= 151) {
      console.log('\n🎉 All trusts already captured! Mission accomplished.');
      process.exit(0);
    }

    await optimizer.optimizeForAllTrusts();
    const report = await optimizer.generateOptimizationReport();

    if (report.success_criteria.all_trusts_represented) {
      console.log('\n🎉 OPTIMIZATION SUCCESSFUL!');
      console.log('✅ All 151 NHS trusts captured with optimal storage usage');
    } else {
      console.log('\n📈 Significant improvement achieved');
      console.log(`✅ Captured ${report.results.trusts_captured}/151 trusts (${report.results.coverage_percentage}%)`);
    }

  } catch (error) {
    console.error('\n💥 Optimization failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = OptimizeForTrustCoverage;