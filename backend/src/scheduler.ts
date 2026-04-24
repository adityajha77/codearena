import cron from 'node-cron';
import { supabase } from './supabase';
import { sendMessage } from './telegram';

// Runs every 15 minutes
export function startScheduler() {
  console.log("⏰ Reminder scheduler started!");
  cron.schedule('*/15 * * * *', () => runReminderCheck());
}

export async function runReminderCheck(force: boolean = false) {
  console.log("🔍 Checking for upcoming challenge deadlines...");
  
  try {
    // 1. Get all users with telegram linked
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('wallet_address, telegram_chat_id')
      .not('telegram_chat_id', 'is', null);

    if (userError || !users) return;

    const now = new Date();
    // Use UTC Midnight for the deadline
    const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const diffMs = midnightUTC.getTime() - now.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    // We only care about 3h, 2h, 1h thresholds
    let level = 0;
    if (force) {
      level = 3; // Simulate 3h reminder for testing
    } else if (diffHrs <= 1.1 && diffHrs > 0.8) {
      level = 1;
    } else if (diffHrs <= 2.1 && diffHrs > 1.8) {
      level = 2;
    } else if (diffHrs <= 3.1 && diffHrs > 2.8) {
      level = 3;
    }

    if (level === 0) return; // Not in a reminder window

    for (const user of users) {
      const todayStr = now.toISOString().split('T')[0];
      
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, last_solved_date, last_reminder_sent_at, last_reminder_level, challenges(title, platform)')
        .eq('wallet_address', user.wallet_address);

      if (partError || !participations) continue;

      // Filter only challenges NOT solved today
      const unsolved = participations.filter(p => p.last_solved_date !== todayStr);

      for (const p of unsolved) {
        // Skip if already sent (unless forcing)
        if (!force && p.last_reminder_level === level && p.last_reminder_sent_at?.startsWith(todayStr)) {
          continue;
        }

        const challenge = (p as any).challenges;
        console.log(`📡 Sending reminder to ${user.wallet_address.substring(0,6)} for "${challenge.title}"...`);
        
        const message = `⚠️ *Reminder: ${level} ${level === 1 ? 'hour' : 'hours'} left!* ⚠️\n\nYou haven't completed your daily progress for *${challenge.title}* on *${challenge.platform}* yet.\n\nDon't lose your stake! Go to the dashboard and verify your progress now. 🛡️`;

        const sent = await sendMessage(user.telegram_chat_id, message);
        
        if (sent) {
          await supabase
            .from('challenge_participants')
            .update({
              last_reminder_level: level,
              last_reminder_sent_at: now.toISOString()
            })
            .eq('wallet_address', user.wallet_address)
            .eq('challenge_id', p.challenge_id);
        }
      }
    }
  } catch (err: any) {
    console.error("Scheduler error:", err.message);
  }
}

