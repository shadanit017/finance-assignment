import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const DATASET_URL =
  'https://huggingface.co/datasets/electricsheepafrica/nigerian-banking-retail-transactions/resolve/main/nigerian_retail_transactions_full.parquet';

const TARGET_DIR = path.resolve(__dirname, '../../data/raw');
const TARGET_FILE = path.join(TARGET_DIR, 'nigerian_retail_transactions_full.parquet');

async function downloadDataset() {
  console.log('📦 Checking Financial Dataset Download Status...');

  // Ensure directory exists
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`📁 Created target directory: ${TARGET_DIR}`);
  }

  // Check if file already exists
  if (fs.existsSync(TARGET_FILE)) {
    const stats = fs.statSync(TARGET_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    if (stats.size > 400 * 1024 * 1024) {
      console.log(`✅ Dataset file already exists: ${TARGET_FILE} (${sizeMB} MB). Skipping download.`);
      return;
    } else {
      console.log(`⚠️ Existing file appears incomplete (${sizeMB} MB). Re-downloading...`);
    }
  }

  console.log(`⬇️ Downloading Parquet dataset from Hugging Face:`);
  console.log(`   URL: ${DATASET_URL}`);
  console.log(`   Destination: ${TARGET_FILE}`);

  const response = await fetch(DATASET_URL, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`HTTP Error response during download: ${response.status} ${response.statusText}`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  const totalMB = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(2) : 'Unknown';

  console.log(`📊 Total dataset size: ${totalMB} MB`);

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const fileStream = fs.createWriteStream(TARGET_FILE);
  let downloadedBytes = 0;
  let lastLoggedMB = 0;

  // Convert Web ReadableStream to Node.js Readable
  const reader = response.body.getReader();
  const nodeStream = new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        downloadedBytes += value.length;
        const currentMB = Math.floor(downloadedBytes / (10 * 1024 * 1024)) * 10;
        if (currentMB > lastLoggedMB) {
          lastLoggedMB = currentMB;
          const pct = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
          console.log(`  ⏳ Downloaded: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB / ${totalMB} MB (${pct}%)`);
        }
        this.push(Buffer.from(value));
      }
    },
  });

  await finished(nodeStream.pipe(fileStream));

  const finalStats = fs.statSync(TARGET_FILE);
  console.log(
    `✅ Dataset Download Completed Successfully! File size: ${(finalStats.size / (1024 * 1024)).toFixed(2)} MB`,
  );
}

downloadDataset().catch((err) => {
  console.error('❌ Dataset Download Failed:', err);
  process.exit(1);
});
