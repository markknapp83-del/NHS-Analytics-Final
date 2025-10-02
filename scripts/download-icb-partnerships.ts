/**
 * Download and Process ICB Partnership Data
 *
 * Downloads the official NHS ICB partner organisations file and updates trust_metrics
 * Run: npx tsx scripts/download-icb-partnerships.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_URL = 'https://digital.nhs.uk/binaries/content/assets/website-assets/services/ods/data-downloads-other-nhs-organisations/icb-partners-master-december-2024.xlsx';
const OUTPUT_FILE = path.join(__dirname, 'icb-partners.xlsx');

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location!, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('🏥 ICB Partnership Data Download Tool\n');

  try {
    console.log('📥 Downloading ICB partnership file...');
    console.log(`URL: ${FILE_URL}\n`);

    await downloadFile(FILE_URL, OUTPUT_FILE);
    console.log(`✅ Downloaded to: ${OUTPUT_FILE}\n`);

    console.log('📋 Next steps:');
    console.log('1. Install xlsx package: npm install xlsx');
    console.log('2. The file has been downloaded as icb-partners.xlsx');
    console.log('3. Run: npx tsx scripts/process-icb-partnerships.ts');
    console.log('\nNote: You may need to manually download the file if the automated download fails:');
    console.log('Visit: https://digital.nhs.uk/services/organisation-data-service/data-search-and-export/csv-downloads/other-nhs-organisations');

  } catch (error) {
    console.error('❌ Error downloading file:', error);
    console.log('\n📋 Manual download instructions:');
    console.log('1. Visit: https://digital.nhs.uk/services/organisation-data-service/data-search-and-export/csv-downloads/other-nhs-organisations');
    console.log('2. Download "ICB partner organisations" Excel file');
    console.log(`3. Save to: ${OUTPUT_FILE}`);
    console.log('4. Run: npx tsx scripts/process-icb-partnerships.ts');
    process.exit(1);
  }
}

main();
