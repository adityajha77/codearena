import { supabase } from './supabase';

async function check() {
    const { data, error } = await supabase
        .from('challenge_participants')
        .select('*')
        .limit(1);
    
    if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
    } else {
        console.log("No data found.");
    }
    process.exit(0);
}

check();
