// Quick security validation test runner
const { SecurityValidationTests } = require('./src/lib/security-validation.ts')

async function runSecurityTests() {
  console.log('🔒 Running Security Validation Tests...')

  try {
    const results = await SecurityValidationTests.runAllTests()

    console.log('\n📊 Test Results:')
    console.log('- Database Connection:', results.databaseConnection.passed ? '✅' : '❌', results.databaseConnection.message)
    console.log('- Read-Only Access:', results.readOnlyAccess.passed ? '✅' : '❌')
    console.log('- RLS Policies:', results.rlsPolicies.passed ? '✅' : '❌', results.rlsPolicies.message)
    console.log('- Environment Security:', results.environmentSecurity.passed ? '✅' : '❌', results.environmentSecurity.message)
    console.log('- No Sensitive Data:', results.noSensitiveData.passed ? '✅' : '❌', results.noSensitiveData.message)

    const allPassed = Object.values(results).every(result => result.passed)
    console.log('\n🎯 Overall Status:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')

  } catch (error) {
    console.error('❌ Test execution failed:', error)
  }
}

runSecurityTests()