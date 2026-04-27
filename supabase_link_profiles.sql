-- Link playground_participants to user_profiles for easy name fetching
ALTER TABLE playground_participants 
ADD CONSTRAINT fk_participant_profile 
FOREIGN KEY (wallet_address) 
REFERENCES user_profiles(wallet_address) 
ON DELETE CASCADE;
