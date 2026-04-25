import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/CODE_ARENA/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { error } = await supabase.from('notifications').insert([{ recipient_wallet: 'test', type: 'test', message: 'test' }]);
  console.log('Error:', error);
  process.exit(0);
}
checkDb();
