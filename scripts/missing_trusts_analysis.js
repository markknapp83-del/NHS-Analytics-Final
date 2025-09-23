const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');

/**
 * Missing Trusts Analysis Script
 *
 * Identifies the 23 missing trusts and analyzes why they failed validation
 * to implement more permissive validation rules
 */

class MissingTrustsAnalyzer {
  constructor() {
    this.supabaseConfig = this.loadSupabaseConfig();
    this.supabase = null;
    this.csvTrusts = new Set();
    this.dbTrusts = new Set();
    this.missingTrusts = [];
    this.trustDataQuality = {};
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
    console.log('🔍 Initializing missing trusts analysis...');
    this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.key);
    console.log('✅ Supabase client initialized');
  }

  async analyzeMissingTrusts() {
    console.log('\n📊 Analyzing missing trusts...');
    console.log('=====================================\n');

    // Step 1: Get CSV trust codes
    console.log('📁 Loading CSV trust codes...');
    await this.loadCSVTrusts();
    console.log(`✅ Found ${this.csvTrusts.size} unique trusts in CSV`);

    // Step 2: Get database trust codes
    console.log('💾 Loading database trust codes...');
    await this.loadDatabaseTrusts();
    console.log(`✅ Found ${this.dbTrusts.size} unique trusts in database`);

    // Step 3: Identify missing trusts
    console.log('🔍 Identifying missing trusts...');
    this.identifyMissingTrusts();
    console.log(`❌ Found ${this.missingTrusts.length} missing trusts`);

    // Step 4: Analyze data quality for missing trusts
    console.log('📈 Analyzing data quality for missing trusts...');
    await this.analyzeDataQuality();

    // Step 5: Generate comprehensive report
    console.log('📄 Generating analysis report...');
    const report = this.generateReport();

    return report;
  }

  async loadCSVTrusts() {
    return new Promise((resolve, reject) => {
      const csvPath = '../Data/unified_monthly_data_enhanced.csv';

      Papa.parse(fs.createReadStream(csvPath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          if (row.data.trust_code && row.data.trust_code !== 'trust_code') {
            this.csvTrusts.add(row.data.trust_code);
          }
        },
        complete: () => {
          console.log(`   CSV trust codes sample: ${Array.from(this.csvTrusts).slice(0, 10).join(', ')}`);
          resolve();
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  async loadDatabaseTrusts() {
    try {
      const { data: records, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code');

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Use Set to automatically handle uniqueness
      records.forEach(record => {
        if (record.trust_code) {
          this.dbTrusts.add(record.trust_code);
        }
      });

      console.log(`   Database trust codes sample: ${Array.from(this.dbTrusts).slice(0, 10).join(', ')}`);
    } catch (error) {
      throw new Error(`Failed to load database trusts: ${error.message}`);
    }
  }

  identifyMissingTrusts() {
    this.missingTrusts = Array.from(this.csvTrusts).filter(trust => !this.dbTrusts.has(trust));
    this.missingTrusts.sort();

    console.log(`\n❌ Missing trusts (${this.missingTrusts.length}):`);
    this.missingTrusts.forEach((trust, idx) => {
      console.log(`   ${idx + 1}. ${trust}`);
    });

    console.log(`\n📊 Trust Coverage Summary:`);
    console.log(`   CSV trusts: ${this.csvTrusts.size}`);
    console.log(`   Database trusts: ${this.dbTrusts.size}`);
    console.log(`   Missing trusts: ${this.missingTrusts.length}`);
    console.log(`   Coverage: ${Math.round(this.dbTrusts.size / this.csvTrusts.size * 100)}%`);
  }

  async analyzeDataQuality() {
    console.log('\n🔍 Analyzing data quality for missing trusts...');

    return new Promise((resolve, reject) => {
      const csvPath = '../Data/unified_monthly_data_enhanced.csv';
      let rowCount = 0;

      Papa.parse(fs.createReadStream(csvPath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          rowCount++;
          const trustCode = row.data.trust_code;

          if (this.missingTrusts.includes(trustCode)) {
            if (!this.trustDataQuality[trustCode]) {
              this.trustDataQuality[trustCode] = {
                records: 0,
                trust_name: row.data.trust_name || 'Unknown',
                data_quality: {
                  total_fields: 0,
                  populated_fields: 0,
                  empty_fields: 0,
                  null_fields: 0
                },
                sample_issues: [],
                validation_issues: []
              };
            }

            const quality = this.trustDataQuality[trustCode];
            quality.records++;

            // Analyze data quality
            const fieldAnalysis = this.analyzeRowDataQuality(row.data);
            quality.data_quality.total_fields += fieldAnalysis.total;
            quality.data_quality.populated_fields += fieldAnalysis.populated;
            quality.data_quality.empty_fields += fieldAnalysis.empty;
            quality.data_quality.null_fields += fieldAnalysis.null;

            // Check for specific validation issues
            const validationIssues = this.checkValidationIssues(row.data);
            quality.validation_issues.push(...validationIssues);

            // Store first few rows as samples
            if (quality.sample_issues.length < 3) {
              quality.sample_issues.push({
                period: row.data.period,
                completeness: Math.round(fieldAnalysis.populated / fieldAnalysis.total * 100),
                issues: validationIssues
              });
            }
          }

          // Progress indicator
          if (rowCount % 500 === 0) {
            console.log(`   Analyzed ${rowCount} rows...`);
          }
        },
        complete: () => {
          console.log(`✅ Completed analysis of ${rowCount} CSV rows`);
          this.summarizeDataQuality();
          resolve();
        },
        error: (error) => {
          reject(new Error(`CSV analysis error: ${error.message}`));
        }
      });
    });
  }

  analyzeRowDataQuality(rowData) {
    let total = 0;
    let populated = 0;
    let empty = 0;
    let nullFields = 0;

    Object.entries(rowData).forEach(([key, value]) => {
      total++;

      if (value === null || value === undefined) {
        nullFields++;
      } else if (value === '' || value === 'null' || value === 'NULL') {
        empty++;
      } else {
        populated++;
      }
    });

    return { total, populated, empty, null: nullFields };
  }

  checkValidationIssues(rowData) {
    const issues = [];

    // Check trust code format
    if (!rowData.trust_code || !/^[A-Z0-9]{3}$/.test(rowData.trust_code)) {
      issues.push('Invalid trust code format');
    }

    // Check period format
    if (!rowData.period || !/^\d{4}-\d{2}-\d{2}$/.test(rowData.period)) {
      issues.push('Invalid period format');
    }

    // Check for missing core RTT data
    const coreRTTFields = [
      'trust_total_total_incomplete_pathways',
      'trust_total_percent_within_18_weeks'
    ];

    const missingCoreRTT = coreRTTFields.filter(field =>
      !rowData[field] || rowData[field] === '' || rowData[field] === 'null'
    );

    if (missingCoreRTT.length > 0) {
      issues.push(`Missing core RTT data: ${missingCoreRTT.join(', ')}`);
    }

    // Check for missing core A&E data
    const coreAEFields = [
      'ae_attendances_total',
      'ae_4hr_performance_pct'
    ];

    const missingCoreAE = coreAEFields.filter(field =>
      !rowData[field] || rowData[field] === '' || rowData[field] === 'null'
    );

    if (missingCoreAE.length > 0) {
      issues.push(`Missing core A&E data: ${missingCoreAE.join(', ')}`);
    }

    // Check percentage ranges
    if (rowData.trust_total_percent_within_18_weeks) {
      const pct = parseFloat(rowData.trust_total_percent_within_18_weeks);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        issues.push('Invalid RTT percentage value');
      }
    }

    if (rowData.ae_4hr_performance_pct) {
      const pct = parseFloat(rowData.ae_4hr_performance_pct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        issues.push('Invalid A&E percentage value');
      }
    }

    return issues;
  }

  summarizeDataQuality() {
    console.log('\n📈 Data Quality Summary for Missing Trusts:');
    console.log('===========================================');

    const sortedTrusts = Object.entries(this.trustDataQuality)
      .sort(([,a], [,b]) => a.records - b.records);

    sortedTrusts.forEach(([trustCode, quality]) => {
      const completeness = Math.round(
        quality.data_quality.populated_fields / quality.data_quality.total_fields * 100
      );

      const commonIssues = this.getCommonIssues(quality.validation_issues);

      console.log(`\n${trustCode} - ${quality.trust_name}:`);
      console.log(`   Records: ${quality.records}`);
      console.log(`   Data completeness: ${completeness}%`);
      console.log(`   Common issues: ${commonIssues.slice(0, 3).join(', ') || 'None'}`);
    });
  }

  getCommonIssues(validationIssues) {
    const issueCounts = {};
    validationIssues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });

    return Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([issue]) => issue);
  }

  generateReport() {
    const report = {
      analysis_metadata: {
        timestamp: new Date().toISOString(),
        analysis_type: 'Missing Trusts Analysis',
        csv_trusts: this.csvTrusts.size,
        database_trusts: this.dbTrusts.size,
        missing_trusts_count: this.missingTrusts.length
      },
      coverage_summary: {
        expected_trusts: 151,
        actual_trusts: this.dbTrusts.size,
        missing_trusts: this.missingTrusts.length,
        coverage_percentage: Math.round(this.dbTrusts.size / this.csvTrusts.size * 100)
      },
      missing_trusts_list: this.missingTrusts,
      data_quality_analysis: this.trustDataQuality,
      recommendations: this.generateRecommendations(),
      permissive_validation_strategy: this.generatePermissiveValidationStrategy()
    };

    const reportFile = `missing_trusts_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Analysis report saved: ${reportFile}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Analyze common issues across missing trusts
    const allIssues = [];
    Object.values(this.trustDataQuality).forEach(quality => {
      allIssues.push(...quality.validation_issues);
    });

    const commonIssues = this.getCommonIssues(allIssues);

    if (commonIssues.includes('Missing core RTT data')) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Validation Rules',
        issue: 'Missing core RTT data blocking trust inclusion',
        solution: 'Allow trusts with partial RTT data - populate available fields, set missing to null'
      });
    }

    if (commonIssues.includes('Missing core A&E data')) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Validation Rules',
        issue: 'Missing core A&E data blocking trust inclusion',
        solution: 'Allow trusts with partial A&E data - some trusts may not provide A&E services'
      });
    }

    if (commonIssues.includes('Invalid RTT percentage value') || commonIssues.includes('Invalid A&E percentage value')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Data Cleaning',
        issue: 'Invalid percentage values causing validation failures',
        solution: 'Convert invalid percentages to null rather than rejecting entire record'
      });
    }

    recommendations.push({
      priority: 'HIGH',
      category: 'General Strategy',
      issue: '23 trusts completely missing from database',
      solution: 'Implement permissive validation: accept partial data rather than rejecting entire trusts'
    });

    return recommendations;
  }

  generatePermissiveValidationStrategy() {
    return {
      core_principle: 'Accept partial data rather than reject entire trusts',
      validation_changes: [
        {
          rule: 'Required Fields',
          current: 'Reject if missing trust_code, period, core RTT/AE data',
          proposed: 'Only require trust_code and period - allow missing data fields'
        },
        {
          rule: 'Data Completeness',
          current: 'Require 50% data completeness',
          proposed: 'Accept any level of completeness - capture available data'
        },
        {
          rule: 'Percentage Validation',
          current: 'Reject invalid percentage values',
          proposed: 'Convert invalid percentages to null, continue processing'
        },
        {
          rule: 'JSONB Structure',
          current: 'Require fully populated JSONB objects',
          proposed: 'Create JSONB with available data, null for missing fields'
        }
      ],
      implementation_strategy: [
        'Create permissive validation mode for missing trusts',
        'Process missing trusts with relaxed rules',
        'Ensure all 151 trusts have at least basic records',
        'Mark partial records for data quality monitoring'
      ]
    };
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    process.env.SUPABASE_URL = args[0];
    process.env.SUPABASE_ANON_KEY = args[1];
  }

  const analyzer = new MissingTrustsAnalyzer();

  try {
    await analyzer.initialize();
    const report = await analyzer.analyzeMissingTrusts();

    console.log('\n🎯 Key Findings:');
    console.log('================');
    console.log(`Missing trusts: ${report.missing_trusts_list.length}`);
    console.log(`Coverage: ${report.coverage_summary.coverage_percentage}%`);
    console.log(`Recommendations: ${report.recommendations.length}`);

    console.log('\n💡 Next Steps:');
    console.log('==============');
    console.log('1. Implement permissive validation for missing trusts');
    console.log('2. Process missing trusts with relaxed data requirements');
    console.log('3. Verify final result: 151 trusts, 1,816 records');

    return report;

  } catch (error) {
    console.error('\n💥 Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MissingTrustsAnalyzer;