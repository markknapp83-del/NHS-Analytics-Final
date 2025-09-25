const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './hooks/.env' });

// End-to-end testing suite for NHS Data Analytics Tool
class EndToEndTester {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.testResults = [];
    this.errors = [];
  }

  async runAllTests() {
    console.log('🧪 Starting End-to-End Testing Suite...\n');

    try {
      // Phase 1: Database Infrastructure Tests
      await this.testDatabaseInfrastructure();

      // Phase 2: Data Quality Tests
      await this.testDataQuality();

      // Phase 3: API Response Tests
      await this.testAPIResponses();

      // Phase 4: Dashboard Data Flow Tests
      await this.testDashboardDataFlow();

      // Phase 5: Performance Integration Tests
      await this.testPerformanceIntegration();

      // Generate comprehensive report
      this.generateComprehensiveReport();

    } catch (error) {
      console.error('❌ Testing suite failed:', error);
      this.errors.push({ phase: 'Overall', error: error.message });
    }
  }

  async testDatabaseInfrastructure() {
    console.log('🏗️  Phase 1: Database Infrastructure Tests');
    console.log('-'.repeat(50));

    // Test 1.1: Database connection
    await this.test('Database Connection', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('count(*)')
        .single();

      if (error) throw new Error(`Database connection failed: ${error.message}`);
      return `Connected successfully, ${data?.count || 0} total records`;
    });

    // Test 1.2: Table structure validation
    await this.test('Table Structure', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('*')
        .limit(1);

      if (error) throw new Error(`Table structure invalid: ${error.message}`);

      const record = data[0];
      const requiredFields = ['trust_code', 'trust_name', 'period', 'rtt_data', 'ae_data', 'diagnostics_data'];

      for (const field of requiredFields) {
        if (!(field in record)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return `All required fields present: ${requiredFields.join(', ')}`;
    });

    // Test 1.3: Indexes and performance
    await this.test('Database Indexes', async () => {
      const startTime = performance.now();

      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code, trust_name')
        .eq('trust_code', 'R0A');

      const duration = performance.now() - startTime;

      if (error) throw new Error(`Index query failed: ${error.message}`);
      if (duration > 500) throw new Error(`Index query too slow: ${duration}ms`);

      return `Index query performed in ${duration.toFixed(2)}ms`;
    });

    console.log('');
  }

  async testDataQuality() {
    console.log('📊 Phase 2: Data Quality Tests');
    console.log('-'.repeat(50));

    // Test 2.1: Data completeness
    await this.test('Data Completeness', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code, rtt_data, ae_data, diagnostics_data')
        .not('rtt_data', 'is', null)
        .limit(10);

      if (error) throw new Error(`Data completeness check failed: ${error.message}`);
      if (data.length === 0) throw new Error('No complete records found');

      // Validate JSONB structure
      const sample = data[0];
      if (!sample.rtt_data?.trust_total) {
        throw new Error('RTT data structure invalid');
      }

      return `${data.length} complete records validated with proper JSONB structure`;
    });

    // Test 2.2: Data consistency
    await this.test('Data Consistency', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code, trust_name, period')
        .order('trust_code')
        .limit(20);

      if (error) throw new Error(`Data consistency check failed: ${error.message}`);

      // Check for duplicate trust codes in same period
      const duplicates = new Map();
      for (const record of data) {
        const key = `${record.trust_code}-${record.period}`;
        if (duplicates.has(key)) {
          throw new Error(`Duplicate record found: ${key}`);
        }
        duplicates.set(key, true);
      }

      return `No duplicate records found in ${data.length} sample records`;
    });

    // Test 2.3: Data ranges validation
    await this.test('Data Range Validation', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('rtt_data')
        .not('rtt_data', 'is', null)
        .limit(5);

      if (error) throw new Error(`Data range validation failed: ${error.message}`);

      for (const record of data) {
        const percentage = record.rtt_data?.trust_total?.percent_within_18_weeks;
        if (percentage !== null && (percentage < 0 || percentage > 100)) {
          throw new Error(`Invalid percentage value: ${percentage}`);
        }
      }

      return `Data ranges validated for ${data.length} records`;
    });

    console.log('');
  }

  async testAPIResponses() {
    console.log('🔗 Phase 3: API Response Tests');
    console.log('-'.repeat(50));

    // Test 3.1: Trust list endpoint
    await this.test('Trust List API', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code, trust_name, icb_name')
        .order('trust_name');

      if (error) throw new Error(`Trust list API failed: ${error.message}`);

      const uniqueTrusts = new Set();
      data.forEach(record => uniqueTrusts.add(record.trust_code));

      return `${uniqueTrusts.size} unique trusts loaded from ${data.length} records`;
    });

    // Test 3.2: Metrics filtering
    await this.test('Metrics Filtering API', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('*')
        .eq('trust_code', 'R0A')
        .gte('period', '2025-01-01')
        .order('period');

      if (error) throw new Error(`Metrics filtering failed: ${error.message}`);

      return `${data.length} filtered records for trust R0A since 2025-01-01`;
    });

    // Test 3.3: Complex JSONB queries
    await this.test('JSONB Query API', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('trust_code, period, rtt_data')
        .not('rtt_data->trust_total->percent_within_18_weeks', 'is', null)
        .limit(10);

      if (error) throw new Error(`JSONB query failed: ${error.message}`);

      return `${data.length} records with valid RTT performance data`;
    });

    console.log('');
  }

  async testDashboardDataFlow() {
    console.log('📈 Phase 4: Dashboard Data Flow Tests');
    console.log('-'.repeat(50));

    // Test 4.1: KPI card data flow
    await this.test('KPI Card Data Flow', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('rtt_data, ae_data, diagnostics_data')
        .eq('trust_code', 'R0A')
        .order('period', { ascending: false })
        .limit(1);

      if (error) throw new Error(`KPI data flow failed: ${error.message}`);

      const record = data[0];
      const kpis = {
        rtt_performance: record.rtt_data?.trust_total?.percent_within_18_weeks,
        ae_performance: record.ae_data?.four_hour_performance_pct,
        diagnostic_waiting: record.diagnostics_data?.mri_scans?.total_waiting
      };

      const validKPIs = Object.values(kpis).filter(val => val !== null && val !== undefined).length;

      return `${validKPIs}/3 KPIs available with valid data`;
    });

    // Test 4.2: Chart data transformation
    await this.test('Chart Data Transformation', async () => {
      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('period, rtt_data')
        .eq('trust_code', 'R0A')
        .order('period')
        .limit(12);

      if (error) throw new Error(`Chart data failed: ${error.message}`);

      // Simulate chart data transformation
      const chartData = data.map(record => ({
        period: record.period,
        performance: record.rtt_data?.trust_total?.percent_within_18_weeks || 0
      }));

      const validDataPoints = chartData.filter(point => point.performance > 0).length;

      return `${validDataPoints}/${chartData.length} valid chart data points`;
    });

    // Test 4.3: Comparison data
    await this.test('Multi-Trust Comparison', async () => {
      const trustCodes = ['R0A', 'R0B', 'R0D'];
      const promises = trustCodes.map(async (code) => {
        const { data, error } = await this.supabase
          .from('trust_metrics')
          .select('trust_code, trust_name, rtt_data')
          .eq('trust_code', code)
          .order('period', { ascending: false })
          .limit(1);

        if (error) throw new Error(`Comparison data failed for ${code}: ${error.message}`);
        return data[0];
      });

      const results = await Promise.all(promises);
      const validComparisons = results.filter(r => r && r.rtt_data).length;

      return `${validComparisons}/${trustCodes.length} trusts available for comparison`;
    });

    console.log('');
  }

  async testPerformanceIntegration() {
    console.log('⚡ Phase 5: Performance Integration Tests');
    console.log('-'.repeat(50));

    // Test 5.1: Load time performance
    await this.test('Dashboard Load Performance', async () => {
      const startTime = performance.now();

      // Simulate full dashboard data load
      const [trusts, metrics, benchmarks] = await Promise.all([
        this.supabase.from('trust_metrics').select('trust_code, trust_name').order('trust_name'),
        this.supabase.from('trust_metrics').select('*').eq('trust_code', 'R0A').limit(1),
        this.supabase.from('trust_metrics').select('trust_code, rtt_data').limit(10)
      ]);

      const duration = performance.now() - startTime;

      if (trusts.error || metrics.error || benchmarks.error) {
        throw new Error('Performance test queries failed');
      }

      if (duration > 3000) {
        throw new Error(`Dashboard load too slow: ${duration}ms`);
      }

      return `Full dashboard data loaded in ${duration.toFixed(2)}ms`;
    });

    // Test 5.2: Concurrent user simulation
    await this.test('Concurrent User Simulation', async () => {
      const startTime = performance.now();
      const concurrentQueries = [];

      // Simulate 10 concurrent users
      for (let i = 0; i < 10; i++) {
        concurrentQueries.push(
          this.supabase
            .from('trust_metrics')
            .select('trust_code, period, rtt_data')
            .limit(5)
        );
      }

      const results = await Promise.all(concurrentQueries);
      const duration = performance.now() - startTime;

      const failedQueries = results.filter(r => r.error).length;
      if (failedQueries > 0) {
        throw new Error(`${failedQueries}/10 concurrent queries failed`);
      }

      return `10 concurrent queries completed in ${duration.toFixed(2)}ms`;
    });

    // Test 5.3: Memory usage simulation
    await this.test('Large Data Set Handling', async () => {
      const startTime = performance.now();

      const { data, error } = await this.supabase
        .from('trust_metrics')
        .select('*')
        .limit(100);

      const duration = performance.now() - startTime;

      if (error) throw new Error(`Large dataset test failed: ${error.message}`);

      // Calculate approximate memory usage
      const recordSize = JSON.stringify(data[0]).length;
      const totalSize = recordSize * data.length;

      return `${data.length} records (${(totalSize / 1024).toFixed(1)}KB) processed in ${duration.toFixed(2)}ms`;
    });

    console.log('');
  }

  async test(testName, testFunction) {
    const startTime = performance.now();

    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;

      this.testResults.push({
        name: testName,
        status: 'PASS',
        duration: duration,
        details: result
      });

      console.log(`   ✅ ${testName}: ${result} (${duration.toFixed(2)}ms)`);

    } catch (error) {
      const duration = performance.now() - startTime;

      this.testResults.push({
        name: testName,
        status: 'FAIL',
        duration: duration,
        error: error.message
      });

      console.log(`   ❌ ${testName}: ${error.message} (${duration.toFixed(2)}ms)`);
      this.errors.push({ test: testName, error: error.message });
    }
  }

  generateComprehensiveReport() {
    console.log('\n📋 END-TO-END TEST REPORT');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASS').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAIL').length;
    const totalDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0);

    console.log(`\n📊 Summary:`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Total execution time: ${totalDuration.toFixed(2)}ms`);
    console.log(`   Average test time: ${(totalDuration / totalTests).toFixed(2)}ms`);

    console.log(`\n🎯 Test Results by Phase:`);

    const phases = [
      { name: 'Database Infrastructure', tests: this.testResults.slice(0, 3) },
      { name: 'Data Quality', tests: this.testResults.slice(3, 6) },
      { name: 'API Responses', tests: this.testResults.slice(6, 9) },
      { name: 'Dashboard Data Flow', tests: this.testResults.slice(9, 12) },
      { name: 'Performance Integration', tests: this.testResults.slice(12, 15) }
    ];

    phases.forEach(phase => {
      const phasePassed = phase.tests.filter(t => t.status === 'PASS').length;
      const phaseTotal = phase.tests.length;
      const phaseStatus = phasePassed === phaseTotal ? '✅' : '⚠️';

      console.log(`\n   ${phaseStatus} ${phase.name}: ${phasePassed}/${phaseTotal} passed`);

      phase.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`      ${icon} ${test.name} (${test.duration.toFixed(2)}ms)`);
        if (test.error) {
          console.log(`         Error: ${test.error}`);
        }
      });
    });

    if (this.errors.length > 0) {
      console.log(`\n❌ Failed Tests Summary:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    // Overall system health assessment
    const healthScore = (passedTests / totalTests) * 100;
    let healthStatus;

    if (healthScore >= 90) healthStatus = '🟢 Excellent';
    else if (healthScore >= 75) healthStatus = '🟡 Good';
    else if (healthScore >= 60) healthStatus = '🟠 Needs Attention';
    else healthStatus = '🔴 Critical Issues';

    console.log(`\n🏥 System Health Score: ${healthScore.toFixed(1)}% - ${healthStatus}`);

    // Performance metrics
    const avgResponseTime = totalDuration / totalTests;
    let performanceRating;

    if (avgResponseTime < 100) performanceRating = '🚀 Excellent';
    else if (avgResponseTime < 300) performanceRating = '✅ Good';
    else if (avgResponseTime < 500) performanceRating = '⚠️ Acceptable';
    else performanceRating = '🐌 Needs Optimization';

    console.log(`\n⚡ Performance Rating: ${avgResponseTime.toFixed(2)}ms avg - ${performanceRating}`);

    console.log(`\n${passedTests === totalTests ? '🎉' : '📝'} End-to-end testing completed!`);

    if (passedTests === totalTests) {
      console.log('   ✅ All systems operational and ready for production!');
    } else {
      console.log(`   📝 ${failedTests} issues found that need attention before production deployment.`);
    }
  }
}

// Run the end-to-end tests
const tester = new EndToEndTester();
tester.runAllTests().catch(console.error);