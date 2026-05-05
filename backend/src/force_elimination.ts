import { supabase } from './supabase';
import { runReminderCheck } from './scheduler';

async function fix() {
    console.log("🛠️ Resetting last_slashed_date for target users...");
    await supabase
        .from('challenge_participants')
        .update({ last_slashed_date: null })
        .in('challenge_id', [
            'cfbba3f7-fc62-4695-b022-88cba40c6483', 
            'd6f48d99-525b-405b-91da-a652e53b5735'
        ]);
    
    console.log("🚀 Running scheduler with new 48h logic...");
    await runReminderCheck();
    console.log("✅ Users should now be eliminated.");
    process.exit(0);
}

fix();
