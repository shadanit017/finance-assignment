import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'duckdb';

const PARQUET_PATH = path.resolve(__dirname, '../../data/raw/nigerian_retail_transactions_full.parquet');

function runQuery(db: Database, query: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function inspectDataset() {
  console.log('🔍 Starting Parquet Dataset Inspection...');

  if (!fs.existsSync(PARQUET_PATH)) {
    console.error(`❌ Parquet file not found at: ${PARQUET_PATH}`);
    console.error('Please run `npm run dataset:download` first.');
    process.exit(1);
  }

  const stats = fs.statSync(PARQUET_PATH);
  console.log(`📁 File Path: ${PARQUET_PATH}`);
  console.log(`📏 File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  const db = new Database(':memory:');
  // Normalize path for DuckDB Windows query syntax (use forward slashes)
  const safePath = PARQUET_PATH.replace(/\\/g, '/');

  try {
    // 1. Column Names & Types
    console.log('\n📋 1. Schema & Column Specifications:');
    const columns = await runQuery(db, `DESCRIBE SELECT * FROM read_parquet('${safePath}')`);
    console.table(
      columns.map((c) => ({
        Column: c.column_name,
        Type: c.column_type,
        Nullable: c.null,
      })),
    );

    // 2. Total Row Count
    console.log('\n📊 2. General Metrics:');
    const countRes = await runQuery(db, `SELECT COUNT(*) as total_rows FROM read_parquet('${safePath}')`);
    const totalRows = Number(countRes[0].total_rows);
    console.log(`  - Total Rows: ${totalRows.toLocaleString()}`);

    // 3. Transaction ID Uniqueness Check
    const uniqueTxnRes = await runQuery(
      db,
      `SELECT COUNT(DISTINCT transaction_id) as unique_txns FROM read_parquet('${safePath}')`,
    );
    const uniqueTxns = Number(uniqueTxnRes[0].unique_txns);
    console.log(`  - Unique transaction_id count: ${uniqueTxns.toLocaleString()}`);
    console.log(`  - Unique Primary Key Integrity: ${totalRows === uniqueTxns ? '✅ PASSED (100% Unique)' : '❌ DUPLICATES DETECTED'}`);

    // 4. Unique Accounts & Customers
    const entityRes = await runQuery(
      db,
      `SELECT COUNT(DISTINCT account_id) as unique_accounts, COUNT(DISTINCT customer_id) as unique_customers FROM read_parquet('${safePath}')`,
    );
    console.log(`  - Unique account_id count: ${Number(entityRes[0].unique_accounts).toLocaleString()}`);
    console.log(`  - Unique customer_id count: ${Number(entityRes[0].unique_customers).toLocaleString()}`);

    // 5. Min / Max Timestamps & Amounts
    const rangeRes = await runQuery(
      db,
      `SELECT MIN(timestamp) as min_time, MAX(timestamp) as max_time, MIN(amount_ngn) as min_amt, MAX(amount_ngn) as max_amt, AVG(amount_ngn) as avg_amt FROM read_parquet('${safePath}')`,
    );
    console.log(`  - Date Range: ${rangeRes[0].min_time} to ${rangeRes[0].max_time}`);
    console.log(`  - Min Amount NGN: ₦${Number(rangeRes[0].min_amt).toLocaleString()}`);
    console.log(`  - Max Amount NGN: ₦${Number(rangeRes[0].max_amt).toLocaleString()}`);
    console.log(`  - Avg Amount NGN: ₦${Number(rangeRes[0].avg_amt).toFixed(2)}`);

    // 6. Categorical Distributions
    console.log('\n💳 3. Transaction Type Breakdown:');
    const typeRes = await runQuery(
      db,
      `SELECT transaction_type, COUNT(*) as count, SUM(amount_ngn) as total_amount FROM read_parquet('${safePath}') GROUP BY transaction_type ORDER BY count DESC`,
    );
    console.table(typeRes);

    console.log('\n📱 4. Channel Breakdown:');
    const channelRes = await runQuery(
      db,
      `SELECT channel, COUNT(*) as count, SUM(amount_ngn) as total_amount FROM read_parquet('${safePath}') GROUP BY channel ORDER BY count DESC`,
    );
    console.table(channelRes);

    console.log('\n🛡️ 5. Fraud Flag Distribution:');
    const fraudRes = await runQuery(
      db,
      `SELECT fraud_flag, COUNT(*) as count, SUM(amount_ngn) as total_amount FROM read_parquet('${safePath}') GROUP BY fraud_flag`,
    );
    console.table(fraudRes);

    console.log('\n✅ Parquet Dataset Inspection Completed Successfully.');
  } catch (error) {
    console.error('❌ Parquet Inspection Error:', error);
    process.exit(1);
  }
}

inspectDataset();
