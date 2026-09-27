import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PARQUET_PATH = path.resolve(__dirname, '../../data/raw/nigerian_retail_transactions_full.parquet');

function runQuery(db: any, query: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function importDataset() {
  console.log('🚀 Starting High-Performance 5-Million Row Dataset Bulk Import...');

  const isReset = process.argv.includes('--reset');

  if (!fs.existsSync(PARQUET_PATH)) {
    console.error(`❌ Parquet dataset file not found at: ${PARQUET_PATH}`);
    console.error('Please run `npm run dataset:download` first.');
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/financial_insights';
  const dbUrl = rawUrl;
  const pgClient = new Client({ connectionString: dbUrl });
  await pgClient.connect();

  try {
    // 1. Check existing count
    const countRes = await pgClient.query('SELECT COUNT(*) FROM financial_transactions');
    const existingRows = parseInt(countRes.rows[0].count, 10);

    if (existingRows > 0 && !isReset) {
      console.log(`ℹ️  financial_transactions table already contains ${existingRows.toLocaleString()} rows.`);
      console.log('   Skipping import. To re-import, run `npm run dataset:reset` or pass `--reset`.');
      await pgClient.end();
      return;
    }

    let duckdb: any = null;
    try {
      duckdb = require('duckdb');
    } catch (e: any) {
      console.log('ℹ️  DuckDB native addon not loaded, using DuckDB CLI fallback');
    }

    if (existingRows > 0 || isReset) {
      console.log(`🧹 Truncating existing rows from financial_transactions...`);
      await pgClient.query('TRUNCATE TABLE financial_transactions');
    }

    const startTime = Date.now();

    // 2. Temporarily drop PK constraint & indexes to maximize COPY throughput
    console.log('⚡ Temporarily dropping indexes for maximum bulk COPY throughput...');
    await pgClient.query(`
      ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_pkey;
      DROP INDEX IF EXISTS financial_transactions_timestamp_idx;
      DROP INDEX IF EXISTS financial_transactions_account_id_idx;
      DROP INDEX IF EXISTS financial_transactions_customer_id_idx;
      DROP INDEX IF EXISTS financial_transactions_transaction_type_idx;
      DROP INDEX IF EXISTS financial_transactions_channel_idx;
      DROP INDEX IF EXISTS financial_transactions_location_state_idx;
      DROP INDEX IF EXISTS financial_transactions_fraud_flag_idx;
    `);

    // 3. Export Parquet to optimized CSV using DuckDB (NPM addon or CLI fallback)
    const safePath = PARQUET_PATH.replace(/\\/g, '/');
    const tempCsvPath = path.resolve(__dirname, '../../data/processed/import_temp.csv');
    const processedDir = path.dirname(tempCsvPath);

    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const safeCsvPath = tempCsvPath.replace(/\\/g, '/');

    console.log('  ⌛ Converting Parquet to streaming CSV format via DuckDB engine...');
    const exportQuery = `
      COPY (
        SELECT 
          transaction_id,
          account_id,
          customer_id,
          strftime(timestamp, '%Y-%m-%d %H:%M:%S%z') as timestamp,
          ROUND(amount_ngn, 2) as amount_ngn,
          ROUND(balance_before_ngn, 2) as balance_before_ngn,
          ROUND(balance_after_ngn, 2) as balance_after_ngn,
          transaction_type,
          channel,
          COALESCE(merchant_category_code, '') as merchant_category_code,
          COALESCE(merchant_name, '') as merchant_name,
          COALESCE(location_lga, '') as location_lga,
          COALESCE(location_state, '') as location_state,
          COALESCE(device_id, '') as device_id,
          status,
          fraud_flag
        FROM read_parquet('${safePath}')
      ) TO '${safeCsvPath}' (FORMAT CSV, HEADER true, DELIMITER ',');
    `;

    let exportSuccess = false;
    if (duckdb) {
      try {
        const duck = new duckdb.Database(':memory:');
        await runQuery(duck, exportQuery);
        exportSuccess = true;
      } catch (err: any) {
        console.log('ℹ️  NPM DuckDB addon error, trying DuckDB CLI fallback...', err.message);
      }
    }

    if (!exportSuccess) {
      const { execSync } = require('child_process');
      const singleLineQuery = exportQuery.replace(/\s+/g, ' ').trim();
      execSync(`duckdb :memory: "${singleLineQuery}"`, { stdio: 'inherit' });
    }

    console.log('  ✓ DuckDB CSV export complete. Ingesting via PostgreSQL COPY stream...');

    // 4. Ingest CSV using PostgreSQL COPY protocol
    const copyQuery = `
      COPY financial_transactions (
        transaction_id, account_id, customer_id, timestamp, amount_ngn,
        balance_before_ngn, balance_after_ngn, transaction_type, channel,
        merchant_category_code, merchant_name, location_lga, location_state,
        device_id, status, fraud_flag
      ) FROM STDIN WITH (FORMAT CSV, HEADER true, NULL '')
    `;

    const copyStream = pgClient.query(copyFrom(copyQuery));
    const readStream = fs.createReadStream(tempCsvPath);

    const csvStats = fs.statSync(tempCsvPath);
    const totalBytes = csvStats.size;
    let transferredBytes = 0;

    readStream.on('data', (chunk) => {
      transferredBytes += chunk.length;
      if (Math.random() < 0.05) {
        const pct = ((transferredBytes / totalBytes) * 100).toFixed(1);
        console.log(`  ⏳ Streaming to PostgreSQL COPY: ${(transferredBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB (${pct}%)`);
      }
    });

    await new Promise((resolve, reject) => {
      readStream.pipe(copyStream).on('finish', resolve).on('error', reject);
    });

    // Cleanup temporary CSV file
    if (fs.existsSync(tempCsvPath)) {
      fs.unlinkSync(tempCsvPath);
    }

    // 5. Re-create PK constraint and indexes
    console.log('\n🔧 Re-building Primary Key constraint and PostgreSQL indexes...');
    const indexStartTime = Date.now();

    await pgClient.query(`
      ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (transaction_id);
      CREATE INDEX financial_transactions_timestamp_idx ON financial_transactions(timestamp);
      CREATE INDEX financial_transactions_account_id_idx ON financial_transactions(account_id);
      CREATE INDEX financial_transactions_customer_id_idx ON financial_transactions(customer_id);
      CREATE INDEX financial_transactions_transaction_type_idx ON financial_transactions(transaction_type);
      CREATE INDEX financial_transactions_channel_idx ON financial_transactions(channel);
      CREATE INDEX financial_transactions_location_state_idx ON financial_transactions(location_state);
      CREATE INDEX financial_transactions_fraud_flag_idx ON financial_transactions(fraud_flag);
    `);

    console.log(`  ✓ Primary Key and 7 Indexes created in ${((Date.now() - indexStartTime) / 1000).toFixed(2)} seconds.`);

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Verify count after import
    const finalCountRes = await pgClient.query('SELECT COUNT(*) FROM financial_transactions');
    const finalCount = parseInt(finalCountRes.rows[0].count, 10);

    console.log(`\n🎉 5-Million Row Dataset Import Completed Successfully in ${durationSec} seconds!`);
    console.log(`📊 Verified Total Rows in Database: ${finalCount.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Import Failed:', error);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

importDataset();
