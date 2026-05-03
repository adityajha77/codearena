-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS playground_participants CASCADE;
DROP TABLE IF EXISTS playground_rooms CASCADE;
-- 1. Create playground_rooms table
CREATE TABLE IF NOT EXISTS playground_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_address TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    question_title TEXT NOT NULL,
    question_tags TEXT[] DEFAULT '{}',
    question_repo_url TEXT NOT NULL, -- URL to the raw JSON of the problem & test cases
    start_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'scheduled', 'active', 'review', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create playground_participants table
CREATE TABLE IF NOT EXISTS playground_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES playground_rooms(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    penalties INTEGER DEFAULT 0,
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    test_results JSONB DEFAULT '[]',
    code_submission TEXT, -- Final code submitted
    language TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, wallet_address)
);

-- Enable RLS
ALTER TABLE playground_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE playground_participants ENABLE ROW LEVEL SECURITY;

-- Policies for playground_rooms
CREATE POLICY "Allow public read access on playground_rooms"
ON playground_rooms FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on playground_rooms"
ON playground_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow host to update their room"
ON playground_rooms FOR UPDATE USING (true); -- In a real prod environment, restrict to host_address

-- Policies for playground_participants
CREATE POLICY "Allow public read access on playground_participants"
ON playground_participants FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on playground_participants"
ON playground_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow participants to update their own submission"
ON playground_participants FOR UPDATE USING (true); 

-- Note: In production, UPDATE policies should be restricted using auth.uid() or matching the wallet_address.
