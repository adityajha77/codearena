-- Run this in your Supabase SQL Editor to add Twitter support
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS twitter TEXT;

-- Optional: ensure unique twitter handles
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_twitter_key UNIQUE (twitter);
