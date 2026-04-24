import { supabase } from './supabase';

async function debugData() {
  console.log("--- Debugging User Profiles ---");
  const { data: users, error: userError } = await supabase.from('user_profiles').select('*');
  console.log(JSON.stringify(users, null, 2));

  console.log("\n--- Debugging Challenge Participants ---");
  const { data: participations, error: partError } = await supabase.from('challenge_participants').select('*, challenges(*)');
  console.log(JSON.stringify(participations, null, 2));
}

debugData();
