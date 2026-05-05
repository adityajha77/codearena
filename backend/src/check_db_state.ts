import { supabase } from './supabase';

async function check() {
    const { data, error } = await supabase
        .from('challenge_participants')
        .select('id, wallet_address, last_slashed_date, strike_count, status')
        .in('challenge_id', [
            'cfbba3f7-fc62-4695-b022-88cba40c6483', 
            'd6f48d99-525b-405b-91da-a652e53b5735'
        ]);
    
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

check();
