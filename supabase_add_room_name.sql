-- Add room_name column to playground_rooms
ALTER TABLE playground_rooms ADD COLUMN IF NOT EXISTS room_name TEXT;

-- Update existing rooms to use question_title as room_name if null
UPDATE playground_rooms SET room_name = question_title WHERE room_name IS NULL;
