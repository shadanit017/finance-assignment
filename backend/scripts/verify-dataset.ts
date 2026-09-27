import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function verifyDataset() {
  console.log('🔍 Running Database Verification & Analytical Integrity Checks...\n');

  const rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/financial_insights';
  const dbUrl = rawUrl.replace('postgres:5432', 'localhost:5432');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // 1. Total Row Count
    const countRes = await client.query('SELECT COUNT(*) FROM financial_transactions');
    const totalRows = parseInt(countRes.rows[0].count, 10);
    console.log(`📊 1. Total Rows in PostgreSQL: ${totalRows.toLocaleString()}`);

    // 2. Date Range
    const dateRes = await client.query(
      'SELECT MIN(timestamp) as min_date, MAX(timestamp) as max_date FROM financial_transactions',
    );
    console.log(`📅 2. Timestamp Range: ${dateRes.rows[0].min_date} to ${dateRes.rows[0].max_date}`);

    // 3. Unique Entity Counts
    const entityRes = await client.query(`
      SELECT 
        COUNT(DISTINCT transaction_id) as unique_txns,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT account_id) as unique_accounts
      FROM financial_transactions
    `);
    console.log(`🔑 3. Entity Uniqueness Metrics:`);
    console.log(`   - Unique transaction_id: ${parseInt(entityRes.rows[0].unique_txns, 10).toLocaleString()}`);
    console.log(`   - Unique customer_id: ${parseInt(entityRes.rows[0].unique_customers, 10).toLocaleString()}`);
    console.log(`   - Unique account_id: ${parseInt(entityRes.rows[0].unique_accounts, 10).toLocaleString()}`);

    // 4. Sample Analytical Query A: Total Transaction Amount
    const totalAmtRes = await client.query('SELECT SUM(amount_ngn) as total_ngn FROM financial_transactions');
    console.log(`\n💰 4. Total Financial Volume: ₦${Number(totalAmtRes.rows[0].total_ngn).toLocaleString()}`);

    // 5. Sample Analytical Query B: Volume by Transaction Type
    const typeRes = await client.query(`
      SELECT transaction_type, COUNT(*) as transaction_count, SUM(amount_ngn) as total_amount
      FROM financial_transactions
      GROUP BY transaction_type
      ORDER BY total_amount DESC
    `);
    console.log('\n💳 5. Financial Aggregation by Transaction Type:');
    console.table(typeRes.rows.map(r => ({
      Type: r.transaction_type,
      Count: Number(r.transaction_count).toLocaleString(),
      'Total NGN': `₦${Number(r.total_amount).toLocaleString()}`,
    })));

    // 6. Sample Analytical Query C: Top 5 States by Financial Volume
    const stateRes = await client.query(`
      SELECT location_state, COUNT(*) as transaction_count, SUM(amount_ngn) as total_amount
      FROM financial_transactions
      GROUP BY location_state
      ORDER BY total_amount DESC
      LIMIT 5
    `);
    console.log('\n📍 6. Top 5 Nigerian States by Financial Volume:');
    console.table(stateRes.rows.map(r => ({
      State: r.location_state,
      Count: Number(r.transaction_count).toLocaleString(),
      'Total NGN': `₦${Number(r.total_amount).toLocaleString()}`,
    })));

    // 7. Sample Analytical Query D: Fraud Risk Analysis
    const fraudRes = await client.query(`
      SELECT fraud_flag, COUNT(*) as transaction_count, SUM(amount_ngn) as total_amount
      FROM financial_transactions
      GROUP BY fraud_flag
    `);
    console.log('\n🛡️ 7. Fraud Flag Summary:');
    console.table(fraudRes.rows.map(r => ({
      'Is Fraud': r.fraud_flag,
      Count: Number(r.transaction_count).toLocaleString(),
      'Total NGN': `₦${Number(r.total_amount).toLocaleString()}`,
    })));

    // 8. Sample Analytical Query E: Channel Distribution
    const channelRes = await client.query(`
      SELECT channel, COUNT(*) as transaction_count, SUM(amount_ngn) as total_amount
      FROM financial_transactions
      GROUP BY channel
      ORDER BY total_amount DESC
    `);
    console.log('\n📱 8. Distribution by Access Channel:');
    console.table(channelRes.rows.map(r => ({
      Channel: r.channel,
      Count: Number(r.transaction_count).toLocaleString(),
      'Total NGN': `₦${Number(r.total_amount).toLocaleString()}`,
    })));

    console.log('\n✅ Database Verification & Sample Queries Passed Successfully!');
  } catch (error) {
    console.error('❌ Database Verification Failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyDataset();
