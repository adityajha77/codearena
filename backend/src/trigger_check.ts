import { runReminderCheck } from './scheduler';
import { supabase } from './supabase';

async function trigger() {
    console.log("🚀 Manually triggering reminder check...");
    await runReminderCheck();
    console.log("✅ Manual check finished.");
    process.exit(0);
}

trigger().catch(err => {
    console.error(err);
    process.exit(1);
});
