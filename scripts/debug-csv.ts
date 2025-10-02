// /scripts/debug-csv.ts
// Debug script to test Contracts Finder CSV download

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function debugCSV() {
  console.log('=== Debugging Contracts Finder CSV Download ===\n');

  // Test 1: Try the exact URL from Task 1 documentation
  console.log('Test 1: Using published=90 parameter...');
  const url1 = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS+Trust&published=90';
  try {
    const response1 = await fetch(url1);
    const csv1 = await response1.text();
    console.log(`✓ Response status: ${response1.status}`);
    console.log(`✓ CSV length: ${csv1.length} characters`);
    console.log(`✓ First 500 chars:\n${csv1.substring(0, 500)}\n`);

    const lines = csv1.split('\n').filter(l => l.trim());
    console.log(`✓ Total lines: ${lines.length}`);
    if (lines.length > 1) {
      console.log(`✓ Estimated tenders: ${lines.length - 1} (excluding header)`);
    }
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }

  // Test 2: Try without date filter
  console.log('\nTest 2: Without date filter...');
  const url2 = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS+Trust';
  try {
    const response2 = await fetch(url2);
    const csv2 = await response2.text();
    console.log(`✓ Response status: ${response2.status}`);
    console.log(`✓ CSV length: ${csv2.length} characters`);

    const lines = csv2.split('\n').filter(l => l.trim());
    console.log(`✓ Total lines: ${lines.length}`);
    if (lines.length > 1) {
      console.log(`✓ Estimated tenders: ${lines.length - 1} (excluding header)`);
    }
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
  }

  // Test 3: Try with absolute dates (2024)
  console.log('\nTest 3: Using absolute dates (2024)...');
  const url3 = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS+Trust&publishedFrom=2024-01-01&publishedTo=2024-12-31';
  try {
    const response3 = await fetch(url3);
    const csv3 = await response3.text();
    console.log(`✓ Response status: ${response3.status}`);
    console.log(`✓ CSV length: ${csv3.length} characters`);

    const lines = csv3.split('\n').filter(l => l.trim());
    console.log(`✓ Total lines: ${lines.length}`);
    if (lines.length > 1) {
      console.log(`✓ Estimated tenders: ${lines.length - 1} (excluding header)`);
    }
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
  }

  // Test 4: Try just "NHS" keyword
  console.log('\nTest 4: Broader search with just "NHS"...');
  const url4 = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS&published=365';
  try {
    const response4 = await fetch(url4);
    const csv4 = await response4.text();
    console.log(`✓ Response status: ${response4.status}`);
    console.log(`✓ CSV length: ${csv4.length} characters`);

    const lines = csv4.split('\n').filter(l => l.trim());
    console.log(`✓ Total lines: ${lines.length}`);
    if (lines.length > 1) {
      console.log(`✓ Estimated tenders: ${lines.length - 1} (excluding header)`);
    }
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
  }

  // Test 5: No value filter
  console.log('\nTest 5: Without value filter...');
  const url5 = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS&published=30';
  try {
    const response5 = await fetch(url5);
    const csv5 = await response5.text();
    console.log(`✓ Response status: ${response5.status}`);
    console.log(`✓ CSV length: ${csv5.length} characters`);

    const lines = csv5.split('\n').filter(l => l.trim());
    console.log(`✓ Total lines: ${lines.length}`);
    if (lines.length > 1) {
      console.log(`✓ Estimated tenders: ${lines.length - 1} (excluding header)`);
      console.log(`\nFirst tender row:\n${lines[1]}`);
    }
  } catch (error) {
    console.error('✗ Test 5 failed:', error);
  }

  console.log('\n=== Debug Complete ===');
}

debugCSV()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
