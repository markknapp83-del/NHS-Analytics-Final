const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

/**
 * Database State Investigation Script
 *
 * This script will connect to Supabase and analyze the current state
 * of the trust_metrics table to understand why only 150 records exist
 * instead of the expected 1,816 records.
 */

class DatabaseStateChecker {
  constructor() {
    this.supabaseConfig = this.loadSupabaseConfig();
    this.supabase = null;
  }

  loadSupabaseConfig() {
    // Try multiple config sources
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      return {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY
      };
    }

    // Try to load from .env files
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

    // Try config file
    if (fs.existsSync('../supabase-config.json')) {
      try {
        const config = JSON.parse(fs.readFileSync('../supabase-config.json', 'utf8'));
        if (config.supabase_url && config.supabase_key) {
          return {
            url: config.supabase_url,
            key: config.supabase_key
          };
        }
      } catch (error) {
        console.warn('Could not load supabase-config.json:', error.message);
      }
    }

    throw new Error(`
Supabase configuration required. Please provide credentials via:
1. Environment variables: SUPABASE_URL and SUPABASE_ANON_KEY
2. Command line: node check_database_state.js <url> <key>
3. Config file: supabase-config.json
    `);
  }

  async initialize() {
    console.log('🔍 Initializing database connection...');
    this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.key);
    console.log('✅ Supabase client initialized');
  }

  async checkDatabaseState() {
    console.log('\n📊 Analyzing database state...');
    console.log('===============================\n');

    try {
      // 1. Get total record count
      const { data: allRecords, error: countError } = await this.supabase
        .from('trust_metrics')
        .select('*');

      if (countError) {
        throw new Error(`Database query failed: ${countError.message}`);
      }

      console.log(`📈 Total records in database: ${allRecords.length}`);

      if (allRecords.length === 0) {
        console.log('❌ No records found in database - table appears to be empty');
        return;
      }

      // 2. Analyze trust distribution
      const trustAnalysis = this.analyzeTrustDistribution(allRecords);

      // 3. Analyze time periods
      const periodAnalysis = this.analyzePeriodDistribution(allRecords);

      // 4. Check for specific trusts mentioned in the issue
      const specificTrustCheck = this.checkSpecificTrusts(allRecords);

      // 5. Analyze data completeness
      const completenessAnalysis = this.analyzeDataCompleteness(allRecords);

      // Generate summary report
      const report = {
        database_state: {
          total_records: allRecords.length,
          expected_records: 1816,
          record_shortfall: 1816 - allRecords.length
        },
        trust_analysis: trustAnalysis,
        period_analysis: periodAnalysis,
        specific_trust_check: specificTrustCheck,
        completeness_analysis: completenessAnalysis,
        assessment: this.assessDatabaseIssue(allRecords.length, trustAnalysis, specificTrustCheck)
      };

      console.log('\n📄 Generating database state report...');
      const reportFile = `database_state_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`✅ Report saved: ${reportFile}`);

      return report;

    } catch (error) {
      console.error('❌ Database state check failed:', error.message);
      throw error;
    }
  }

  analyzeTrustDistribution(records) {
    const trustCount = {};
    const uniqueTrusts = new Set();

    records.forEach(record => {
      const trustCode = record.trust_code;
      uniqueTrusts.add(trustCode);
      trustCount[trustCode] = (trustCount[trustCode] || 0) + 1;
    });

    // Categorize trusts by type (rough analysis based on trust code patterns)
    const trustTypes = {
      foundation_trusts: 0,
      nhs_trusts: 0,
      teaching_hospitals: 0,
      specialist_trusts: 0
    };

    Array.from(uniqueTrusts).forEach(trustCode => {
      // This is a simplified categorization - actual trust types require lookup
      if (trustCode.startsWith('R')) {
        if (trustCode.match(/^R[A-Z]{2}$/)) {
          trustTypes.foundation_trusts++;
        } else {
          trustTypes.nhs_trusts++;
        }
      } else {
        trustTypes.specialist_trusts++;
      }
    });

    console.log(`🏥 Trust Analysis:`);
    console.log(`   Unique trusts: ${uniqueTrusts.size}`);
    console.log(`   Expected trusts: 151`);
    console.log(`   Missing trusts: ${151 - uniqueTrusts.size}`);
    console.log(`   Records per trust (avg): ${Math.round(records.length / uniqueTrusts.size)}`);

    // Show sample of trusts
    const sampleTrusts = Array.from(uniqueTrusts).slice(0, 10);
    console.log(`   Sample trusts: ${sampleTrusts.join(', ')}`);

    return {
      unique_trusts: uniqueTrusts.size,
      expected_trusts: 151,
      missing_trusts: 151 - uniqueTrusts.size,
      trust_list: Array.from(uniqueTrusts).sort(),
      records_per_trust: trustCount,
      trust_type_estimate: trustTypes
    };
  }

  analyzePeriodDistribution(records) {
    const periodCount = {};
    const uniquePeriods = new Set();

    records.forEach(record => {
      const period = record.period;
      uniquePeriods.add(period);
      periodCount[period] = (periodCount[period] || 0) + 1;
    });

    console.log(`📅 Period Analysis:`);
    console.log(`   Unique periods: ${uniquePeriods.size}`);
    console.log(`   Expected periods: 12 (months)`);
    console.log(`   Period range: ${Math.min(...uniquePeriods)} to ${Math.max(...uniquePeriods)}`);

    return {
      unique_periods: uniquePeriods.size,
      expected_periods: 12,
      period_list: Array.from(uniquePeriods).sort(),
      records_per_period: periodCount
    };
  }

  checkSpecificTrusts(records) {
    const targetTrusts = ['R0A', 'RGT', 'RWD', 'RJE', 'RAL']; // Mentioned acute trusts
    const foundTrusts = {};
    const missingTrusts = [];

    records.forEach(record => {
      if (targetTrusts.includes(record.trust_code)) {
        foundTrusts[record.trust_code] = (foundTrusts[record.trust_code] || 0) + 1;
      }
    });

    targetTrusts.forEach(trust => {
      if (!foundTrusts[trust]) {
        missingTrusts.push(trust);
      }
    });

    console.log(`🎯 Specific Trust Check:`);
    console.log(`   Target trusts checked: ${targetTrusts.join(', ')}`);
    console.log(`   Found trusts: ${Object.keys(foundTrusts).join(', ')}`);
    console.log(`   Missing trusts: ${missingTrusts.join(', ')}`);

    return {
      target_trusts: targetTrusts,
      found_trusts: foundTrusts,
      missing_trusts: missingTrusts,
      acute_trust_present: Object.keys(foundTrusts).length > 0
    };
  }

  analyzeDataCompleteness(records) {
    const analysis = {
      records_with_rtt_data: 0,
      records_with_ae_data: 0,
      records_with_diagnostics_data: 0,
      records_with_capacity_data: 0,
      records_with_empty_jsonb: 0
    };

    records.forEach(record => {
      if (this.hasValidJSONB(record.rtt_data)) analysis.records_with_rtt_data++;
      if (this.hasValidJSONB(record.ae_data)) analysis.records_with_ae_data++;
      if (this.hasValidJSONB(record.diagnostics_data)) analysis.records_with_diagnostics_data++;
      if (this.hasValidJSONB(record.capacity_data)) analysis.records_with_capacity_data++;

      if (record.rtt_data === "EMPTY" || record.ae_data === "EMPTY") {
        analysis.records_with_empty_jsonb++;
      }
    });

    console.log(`📊 Data Completeness Analysis:`);
    console.log(`   RTT data populated: ${analysis.records_with_rtt_data}/${records.length}`);
    console.log(`   A&E data populated: ${analysis.records_with_ae_data}/${records.length}`);
    console.log(`   Diagnostics populated: ${analysis.records_with_diagnostics_data}/${records.length}`);
    console.log(`   "EMPTY" JSONB fields: ${analysis.records_with_empty_jsonb}`);

    return analysis;
  }

  hasValidJSONB(field) {
    return field &&
           typeof field === 'object' &&
           field !== "EMPTY" &&
           Object.keys(field).length > 0;
  }

  assessDatabaseIssue(recordCount, trustAnalysis, specificTrustCheck) {
    const issues = [];
    const recommendations = [];

    if (recordCount < 1000) {
      issues.push('Severely low record count - major data population failure');
      recommendations.push('Complete database repopulation required');
    }

    if (trustAnalysis.missing_trusts > 100) {
      issues.push('Most NHS trusts missing from database');
      recommendations.push('Investigate CSV processing pipeline for filtering issues');
    }

    if (specificTrustCheck.missing_trusts.length > 0) {
      issues.push(`Specific acute trusts missing: ${specificTrustCheck.missing_trusts.join(', ')}`);
      recommendations.push('Verify no acute hospital filtering in transformation logic');
    }

    if (!specificTrustCheck.acute_trust_present) {
      issues.push('No acute trusts found in database');
      recommendations.push('Check for trust type filtering in validation or transformation');
    }

    return {
      severity: issues.length > 2 ? 'CRITICAL' : issues.length > 0 ? 'HIGH' : 'LOW',
      issues,
      recommendations,
      next_action: issues.length > 0 ? 'Clear database and re-run complete transformation' : 'Database state appears normal'
    };
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

  const checker = new DatabaseStateChecker();

  try {
    await checker.initialize();
    const report = await checker.checkDatabaseState();

    console.log('\n🎯 Summary Assessment:');
    console.log('======================');
    console.log(`Severity: ${report.assessment.severity}`);
    console.log(`Issues found: ${report.assessment.issues.length}`);

    if (report.assessment.issues.length > 0) {
      console.log('\n❌ Issues:');
      report.assessment.issues.forEach(issue => console.log(`  - ${issue}`));

      console.log('\n💡 Recommendations:');
      report.assessment.recommendations.forEach(rec => console.log(`  - ${rec}`));

      console.log(`\n🎬 Next Action: ${report.assessment.next_action}`);
    } else {
      console.log('\n✅ Database state appears normal');
    }

  } catch (error) {
    console.error('\n💥 Database state check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseStateChecker;