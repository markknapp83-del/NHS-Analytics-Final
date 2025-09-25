const { nhsDatabase } = require('./src/lib/supabase-client.ts');
require('dotenv').config({ path: './hooks/.env' });

// Performance monitoring and benchmarking suite
class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.startTime = null;
  }

  async runBenchmarks() {
    console.log('🏃‍♂️ Starting Performance Benchmarks...\n');

    // Test 1: Database Health Check
    await this.testHealthCheck();

    // Test 2: Trust List Loading
    await this.testTrustListLoading();

    // Test 3: Trust Metrics Loading
    await this.testTrustMetricsLoading();

    // Test 4: Cache Performance
    await this.testCachePerformance();

    // Test 5: Concurrent Query Performance
    await this.testConcurrentQueries();

    // Test 6: Large Data Set Processing
    await this.testLargeDataSetProcessing();

    // Generate Summary Report
    this.generateReport();
  }

  async testHealthCheck() {
    console.log('1️⃣  Testing Database Health Check...');
    const startTime = performance.now();

    try {
      const health = await nhsDatabase.healthCheck();
      const duration = performance.now() - startTime;

      this.results.push({
        test: 'Health Check',
        status: health.status === 'healthy' ? 'PASS' : 'FAIL',
        duration: duration,
        latency: health.latency,
        details: `Connection ${health.status}, DB latency: ${health.latency.toFixed(2)}ms`
      });

      console.log(`   ✅ ${health.status.toUpperCase()} - ${duration.toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        test: 'Health Check',
        status: 'ERROR',
        duration: performance.now() - startTime,
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  async testTrustListLoading() {
    console.log('\n2️⃣  Testing Trust List Loading...');
    const startTime = performance.now();

    try {
      const trusts = await nhsDatabase.getAllTrusts();
      const duration = performance.now() - startTime;

      this.results.push({
        test: 'Trust List Loading',
        status: trusts.length > 0 ? 'PASS' : 'FAIL',
        duration: duration,
        recordCount: trusts.length,
        details: `Loaded ${trusts.length} trusts`
      });

      console.log(`   ✅ PASS - ${duration.toFixed(2)}ms (${trusts.length} trusts)`);

      // Test caching on second load
      const secondStartTime = performance.now();
      await nhsDatabase.getAllTrusts();
      const secondDuration = performance.now() - secondStartTime;

      console.log(`   📋 Cache test - ${secondDuration.toFixed(2)}ms (should be much faster)`);

    } catch (error) {
      this.results.push({
        test: 'Trust List Loading',
        status: 'ERROR',
        duration: performance.now() - startTime,
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  async testTrustMetricsLoading() {
    console.log('\n3️⃣  Testing Trust Metrics Loading...');

    // Test with a known trust code
    const trustCode = 'R0A'; // From our earlier test
    const startTime = performance.now();

    try {
      const metrics = await nhsDatabase.getTrustMetrics(trustCode);
      const duration = performance.now() - startTime;

      this.results.push({
        test: 'Trust Metrics Loading',
        status: metrics.length > 0 ? 'PASS' : 'FAIL',
        duration: duration,
        recordCount: metrics.length,
        details: `Loaded ${metrics.length} metric records for trust ${trustCode}`
      });

      console.log(`   ✅ PASS - ${duration.toFixed(2)}ms (${metrics.length} records)`);

      // Test latest metrics loading
      const latestStartTime = performance.now();
      const latest = await nhsDatabase.getLatestTrustMetrics(trustCode);
      const latestDuration = performance.now() - latestStartTime;

      console.log(`   📊 Latest metrics - ${latestDuration.toFixed(2)}ms`);

      if (latest) {
        console.log(`   📅 Latest period: ${latest.period}`);
      }

    } catch (error) {
      this.results.push({
        test: 'Trust Metrics Loading',
        status: 'ERROR',
        duration: performance.now() - startTime,
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  async testCachePerformance() {
    console.log('\n4️⃣  Testing Cache Performance...');

    try {
      // Clear cache first
      nhsDatabase.clearCache();

      // First load (should be slow - cache miss)
      const missStartTime = performance.now();
      await nhsDatabase.getAllTrusts();
      const missDuration = performance.now() - missStartTime;

      // Second load (should be fast - cache hit)
      const hitStartTime = performance.now();
      await nhsDatabase.getAllTrusts();
      const hitDuration = performance.now() - hitStartTime;

      const improvement = ((missDuration - hitDuration) / missDuration) * 100;

      const cacheStats = nhsDatabase.getCacheStats();

      this.results.push({
        test: 'Cache Performance',
        status: improvement > 50 ? 'PASS' : 'WARN',
        cacheMiss: missDuration,
        cacheHit: hitDuration,
        improvement: improvement,
        hitRate: cacheStats.hitRate,
        details: `${improvement.toFixed(1)}% improvement with cache, ${cacheStats.hitRate.toFixed(1)}% hit rate`
      });

      console.log(`   📋 Cache miss: ${missDuration.toFixed(2)}ms`);
      console.log(`   ⚡ Cache hit: ${hitDuration.toFixed(2)}ms`);
      console.log(`   🚀 Improvement: ${improvement.toFixed(1)}%`);
      console.log(`   📊 Hit rate: ${cacheStats.hitRate.toFixed(1)}%`);

    } catch (error) {
      this.results.push({
        test: 'Cache Performance',
        status: 'ERROR',
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  async testConcurrentQueries() {
    console.log('\n5️⃣  Testing Concurrent Query Performance...');

    const startTime = performance.now();

    try {
      // Run multiple queries concurrently
      const promises = [
        nhsDatabase.getAllTrusts(),
        nhsDatabase.getTrustMetrics('R0A'),
        nhsDatabase.getTrustMetrics('R0B'),
        nhsDatabase.getLatestTrustMetrics('R1A'),
        nhsDatabase.getLatestTrustMetrics('R1D')
      ];

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      const totalRecords = results.reduce((sum, result) => {
        if (Array.isArray(result)) {
          return sum + result.length;
        }
        return sum + (result ? 1 : 0);
      }, 0);

      this.results.push({
        test: 'Concurrent Queries',
        status: 'PASS',
        duration: duration,
        queryCount: promises.length,
        totalRecords: totalRecords,
        details: `${promises.length} concurrent queries, ${totalRecords} total records`
      });

      console.log(`   ✅ PASS - ${duration.toFixed(2)}ms (${promises.length} queries, ${totalRecords} records)`);

    } catch (error) {
      this.results.push({
        test: 'Concurrent Queries',
        status: 'ERROR',
        duration: performance.now() - startTime,
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  async testLargeDataSetProcessing() {
    console.log('\n6️⃣  Testing Large Data Set Processing...');

    const startTime = performance.now();

    try {
      // Get benchmark data (which should return a large dataset)
      const benchmarkData = await nhsDatabase.getBenchmarkData();
      const duration = performance.now() - startTime;

      this.results.push({
        test: 'Large Data Set Processing',
        status: benchmarkData.length > 0 ? 'PASS' : 'FAIL',
        duration: duration,
        recordCount: benchmarkData.length,
        avgProcessingTime: duration / benchmarkData.length,
        details: `Processed ${benchmarkData.length} records in ${duration.toFixed(2)}ms`
      });

      console.log(`   ✅ PASS - ${duration.toFixed(2)}ms (${benchmarkData.length} records)`);
      console.log(`   ⚡ Avg per record: ${(duration / benchmarkData.length).toFixed(3)}ms`);

    } catch (error) {
      this.results.push({
        test: 'Large Data Set Processing',
        status: 'ERROR',
        duration: performance.now() - startTime,
        error: error.message
      });
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('='.repeat(50));

    const totalDuration = this.results.reduce((sum, result) => sum + (result.duration || 0), 0);
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const errorTests = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`\n📈 Overall Performance:`);
    console.log(`   Total execution time: ${totalDuration.toFixed(2)}ms`);
    console.log(`   Tests passed: ${passedTests}/${this.results.length}`);
    console.log(`   Tests failed: ${failedTests}`);
    console.log(`   Tests with errors: ${errorTests}`);

    console.log(`\n🏆 Performance Benchmarks:`);
    this.results.forEach((result, index) => {
      console.log(`\n   ${index + 1}. ${result.test}:`);
      console.log(`      Status: ${this.getStatusEmoji(result.status)} ${result.status}`);
      console.log(`      Duration: ${result.duration?.toFixed(2) || 'N/A'}ms`);

      if (result.recordCount) {
        console.log(`      Records: ${result.recordCount}`);
      }

      if (result.details) {
        console.log(`      Details: ${result.details}`);
      }

      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Performance ratings
    console.log(`\n⭐ Performance Ratings:`);
    this.results.forEach(result => {
      const rating = this.getPerformanceRating(result);
      console.log(`   ${result.test}: ${rating}`);
    });

    // Get final database performance metrics
    const perfMetrics = nhsDatabase.getPerformanceMetrics();
    const cacheStats = nhsDatabase.getCacheStats();

    console.log(`\n🔧 Database Client Metrics:`);
    console.log(`   Total queries: ${perfMetrics.queryCount}`);
    console.log(`   Average query time: ${perfMetrics.averageTime.toFixed(2)}ms`);
    console.log(`   Cache size: ${cacheStats.size} entries`);
    console.log(`   Cache hit rate: ${cacheStats.hitRate.toFixed(1)}%`);

    console.log(`\n✅ Performance benchmarks completed!`);
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'ERROR': return '💥';
      case 'WARN': return '⚠️';
      default: return '❓';
    }
  }

  getPerformanceRating(result) {
    if (result.status === 'ERROR') return '💥 Error';
    if (result.status === 'FAIL') return '❌ Failed';

    const duration = result.duration || 0;

    if (duration < 100) return '🚀 Excellent (<100ms)';
    if (duration < 500) return '✅ Good (<500ms)';
    if (duration < 1000) return '⚠️ Acceptable (<1s)';
    return '🐌 Slow (>1s)';
  }
}

// Run the benchmarks
const monitor = new PerformanceMonitor();
monitor.runBenchmarks().catch(console.error);