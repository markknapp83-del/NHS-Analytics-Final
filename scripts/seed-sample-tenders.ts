// /scripts/seed-sample-tenders.ts
// Seed database with sample tender data from documentation

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import { supabase } from '../src/lib/supabase-client';

async function seedSampleTenders() {
  console.log('=== Seeding Sample Tender Data ===\n');

  // Sample tenders from the documentation
  const sampleTenders = [
    {
      contracts_finder_id: '23f2f473-8e8d-4a38-b8ba-8535ee7cb1de',
      title: 'LTHW Constant & Variable Temperature Plant/Equipment Refurbishment Works',
      description: 'Tender for LTHW Constant & Variable Temperature Centre Plant/Equipment Refurbishment Works at St George\'s Hospital',
      status: 'open',
      buyer_organisation_name: 'St George\'s University Hospitals NHS Foundation Trust',
      trust_code: 'RJ7', // St George's trust code
      icb_code: 'QWE',
      contract_value_min: 1000000,
      contract_value_max: 1000000,
      currency: 'GBP',
      contract_type: 'Works',
      service_category: 'Medical Equipment',
      published_date: '2025-09-30T00:00:00Z',
      deadline_date: '2025-10-15T12:00:00Z',
      tender_url: 'https://www.contractsfinder.service.gov.uk/notice/23f2f473-8e8d-4a38-b8ba-8535ee7cb1de',
      source: 'contracts_finder_csv',
      data_source_url: 'https://www.contractsfinder.service.gov.uk/notice/23f2f473-8e8d-4a38-b8ba-8535ee7cb1de',
      last_fetched_at: new Date().toISOString()
    },
    {
      contracts_finder_id: 'ee03a0d2-bffc-4fe2-b4ed-1fdf9f27061b',
      title: 'Maintenance of Cone Beam Dental CT Scanning System',
      description: 'Swansea Bay UHB is renewing a contract for Cone Beam CT Scanning System maintenance services',
      status: 'open',
      buyer_organisation_name: 'Hywel Dda University Health Board',
      trust_code: null, // Welsh health board - not in our English NHS trust database
      icb_code: null,
      contract_value_min: null,
      contract_value_max: null,
      currency: 'GBP',
      contract_type: 'Services',
      service_category: 'Diagnostic Services',
      published_date: '2025-09-30T00:00:00Z',
      deadline_date: '2025-10-31T17:00:00Z',
      tender_url: 'https://www.contractsfinder.service.gov.uk/notice/ee03a0d2-bffc-4fe2-b4ed-1fdf9f27061b',
      source: 'contracts_finder_csv',
      data_source_url: 'https://www.contractsfinder.service.gov.uk/notice/ee03a0d2-bffc-4fe2-b4ed-1fdf9f27061b',
      last_fetched_at: new Date().toISOString()
    },
    {
      contracts_finder_id: 'sample-001-manchester',
      title: 'Surgical Equipment Supply and Maintenance',
      description: 'Supply and 5-year maintenance contract for advanced surgical equipment including robotic surgery systems',
      status: 'open',
      buyer_organisation_name: 'Manchester University NHS Foundation Trust',
      trust_code: 'R0A', // Manchester trust code
      icb_code: 'QOP',
      contract_value_min: 500000,
      contract_value_max: 750000,
      currency: 'GBP',
      contract_type: 'Goods',
      service_category: 'Surgery & Theatre Services',
      published_date: '2025-09-25T00:00:00Z',
      deadline_date: '2025-10-20T12:00:00Z',
      tender_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-001-manchester',
      source: 'contracts_finder_csv',
      data_source_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-001-manchester',
      last_fetched_at: new Date().toISOString()
    },
    {
      contracts_finder_id: 'sample-002-cambridge',
      title: 'MRI Scanner Lease and Service Agreement',
      description: '5-year lease agreement for 3T MRI scanner with full service and maintenance package',
      status: 'open',
      buyer_organisation_name: 'Cambridge University Hospitals NHS Foundation Trust',
      trust_code: 'RGT', // Cambridge trust code
      icb_code: 'QUE',
      contract_value_min: 2500000,
      contract_value_max: 3000000,
      currency: 'GBP',
      contract_type: 'Services',
      service_category: 'Diagnostic Services',
      published_date: '2025-09-28T00:00:00Z',
      deadline_date: '2025-10-25T17:00:00Z',
      tender_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-002-cambridge',
      source: 'contracts_finder_csv',
      data_source_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-002-cambridge',
      last_fetched_at: new Date().toISOString()
    },
    {
      contracts_finder_id: 'sample-003-oxford',
      title: 'Outpatient Clinic Staffing Services',
      description: 'Framework agreement for provision of locum doctors and nurses for outpatient clinics',
      status: 'open',
      buyer_organisation_name: 'Oxford University Hospitals NHS Foundation Trust',
      trust_code: 'RTH', // Oxford trust code
      icb_code: 'QU9',
      contract_value_min: 1500000,
      contract_value_max: 2000000,
      currency: 'GBP',
      contract_type: 'Services',
      service_category: 'Clinical Staffing',
      published_date: '2025-09-20T00:00:00Z',
      deadline_date: '2025-10-10T12:00:00Z',
      tender_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-003-oxford',
      source: 'contracts_finder_csv',
      data_source_url: 'https://www.contractsfinder.service.gov.uk/notice/sample-003-oxford',
      last_fetched_at: new Date().toISOString()
    }
  ];

  let inserted = 0;
  let errors = 0;

  for (const tender of sampleTenders) {
    // @ts-expect-error - Supabase type inference issue
    const { error } = await supabase.from('tenders').upsert(tender, { onConflict: 'contracts_finder_id' });

    if (error) {
      console.error(`✗ Failed to insert tender: ${tender.title}`);
      console.error(`  Error: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ Inserted: ${tender.title}`);
      inserted++;
    }
  }

  console.log(`\n=== Seeding Complete ===`);
  console.log(`✓ Successfully inserted: ${inserted} tenders`);
  console.log(`✗ Errors: ${errors}`);

  // Verify data
  const { data: allTenders, error: queryError } = await supabase
    .from('tenders')
    .select('*')
    .order('published_date', { ascending: false });

  if (queryError) {
    console.error('\n✗ Failed to verify data:', queryError);
  } else {
    console.log(`\n✓ Total tenders in database: ${allTenders?.length || 0}`);
    if (allTenders && allTenders.length > 0) {
      const sample: any = allTenders[0];
      console.log('\nSample tender:');
      console.log(`  Title: ${sample.title}`);
      console.log(`  Buyer: ${sample.buyer_organisation_name}`);
      console.log(`  Trust Code: ${sample.trust_code || 'Not mapped'}`);
      console.log(`  Value: £${sample.contract_value_max?.toLocaleString() || 'TBC'}`);
    }
  }
}

seedSampleTenders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
