-- Run this in your Supabase SQL Editor

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Payout')),
    amount NUMERIC NOT NULL,
    tx_hash TEXT NOT NULL,
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    recipient_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone (or you can restrict to the specific user)
CREATE POLICY "Allow public read access"
ON transactions
FOR SELECT
USING (true);

-- Allow insert access for everyone
CREATE POLICY "Allow public insert access"
ON transactionsehla
FOR INSERT
WITH CHECK (true);
