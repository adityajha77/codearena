-- Run this in your Supabase SQL Editor to enforce 1-to-1 platform mapping and remove old platforms

-- First, clear the table so we don't hit conflicts when adding constraints (Optional but recommended if starting fresh)
TRUNCATE TABLE user_profiles CASCADE;

-- Drop obsolete columns for platforms we are deleting
ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS hackerrank,
DROP COLUMN IF EXISTS codechef,
DROP COLUMN IF EXISTS atcoder;

-- Ensure that nobody can have the same GitHub, LeetCode, or Codeforces handle
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_github_key UNIQUE (github),
ADD CONSTRAINT user_profiles_leetcode_key UNIQUE (leetcode),
ADD CONSTRAINT user_profiles_codeforces_key UNIQUE (codeforces);

-- Add database triggers or use these columns safely now!
-- Only 'wallet_address', 'github', 'leetcode', and 'codeforces' remain.
