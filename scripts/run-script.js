#!/usr/bin/env node

/**
 * NHS Data Analytics Tool - Script Runner
 * Usage: node run-script.js <script-name> [args...]
 */

const { spawn } = require('child_process');
const path = require('path');

const scripts = {
  'demo': 'demo_transformation.js',
  'populate': 'populate_database.js',
  'check-database': 'check_database_state.js',
  'optimize-coverage': 'optimize_for_trust_coverage.js',
  'missing-analysis': 'missing_trusts_analysis.js',
  'complete-missing': 'complete_missing_trusts.js',
  'test': 'test_transformation.js'
};

function showUsage() {
  console.log('NHS Data Analytics Tool - Script Runner');
  console.log('=======================================\n');
  console.log('Usage: node run-script.js <script-name> [args...]\n');
  console.log('Available scripts:');
  console.log('  demo                 - Run transformation demo (no database required)');
  console.log('  populate             - Populate database with NHS data');
  console.log('  check-database       - Check current database state');
  console.log('  optimize-coverage    - Optimize database for maximum trust coverage');
  console.log('  missing-analysis     - Analyze missing trusts');
  console.log('  complete-missing     - Complete missing trust processing');
  console.log('  test                 - Test transformation logic\n');
  console.log('Examples:');
  console.log('  node run-script.js demo');
  console.log('  node run-script.js populate --clear');
  console.log('  node run-script.js check-database');
}

const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptName) {
  showUsage();
  process.exit(1);
}

const scriptFile = scripts[scriptName];
if (!scriptFile) {
  console.error(`Unknown script: ${scriptName}`);
  console.error('Run "node run-script.js" for available options');
  process.exit(1);
}

const scriptPath = path.join(__dirname, 'scripts', scriptFile);

console.log(`🚀 Running: ${scriptName}`);
console.log(`📁 Script: scripts/${scriptFile}\n`);

// Change to scripts directory and run the script
process.chdir(path.join(__dirname, 'scripts'));

const child = spawn('node', [scriptFile, ...scriptArgs], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'scripts')
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error(`Failed to run script: ${err.message}`);
  process.exit(1);
});