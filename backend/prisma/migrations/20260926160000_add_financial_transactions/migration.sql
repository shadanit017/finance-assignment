-- CreateTable
CREATE TABLE "financial_transactions" (
    "transaction_id" VARCHAR(64) NOT NULL,
    "account_id" VARCHAR(64) NOT NULL,
    "customer_id" VARCHAR(64) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "amount_ngn" DECIMAL(18,2) NOT NULL,
    "balance_before_ngn" DECIMAL(18,2) NOT NULL,
    "balance_after_ngn" DECIMAL(18,2) NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "merchant_category_code" VARCHAR(20),
    "merchant_name" VARCHAR(100),
    "location_lga" VARCHAR(100),
    "location_state" VARCHAR(100),
    "device_id" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL,
    "fraud_flag" BOOLEAN NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE INDEX "financial_transactions_timestamp_idx" ON "financial_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "financial_transactions_account_id_idx" ON "financial_transactions"("account_id");

-- CreateIndex
CREATE INDEX "financial_transactions_customer_id_idx" ON "financial_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "financial_transactions_transaction_type_idx" ON "financial_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "financial_transactions_channel_idx" ON "financial_transactions"("channel");

-- CreateIndex
CREATE INDEX "financial_transactions_location_state_idx" ON "financial_transactions"("location_state");

-- CreateIndex
CREATE INDEX "financial_transactions_fraud_flag_idx" ON "financial_transactions"("fraud_flag");
