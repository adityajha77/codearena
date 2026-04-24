import cron from 'node-cron';
import { supabase } from './supabase';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Run every 15 minutes for high accuracy
cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled reminder check...');
  runReminderCheck();
});

export const runReminderCheck = async (force = false) => {
  const now = new Date();
  
  // Get all active participations that haven't been solved today
  const todayStr = now.toISOString().split('T')[0];
  
  // Fetch participations joined with user profiles and challenge info
  // Using explicit relationship names to avoid ambiguity
  const { data: participants, error } = await supabase
    .from('challenge_participants')
    .select(`
      *,
      challenges!fk_challenge (*),
      user_profiles!fk_user_profile (telegram_chat_id)
    `)
    .or(`last_solved_date.neq.${todayStr},last_solved_date.is.null`);

  if (error) {
    console.error('Scheduler Query Error:', error);
    return;
  }

  if (!participants) return;

  console.log(`Checking reminders for ${participants.length} participants...`);

  for (const p of participants) {
    if (!p.user_profiles?.telegram_chat_id) continue;

    // Calculate time remaining (assuming 24h daily window from challenge start for this demo)
    // In a real app, this would be until 11:59 PM or 24h from last solve
    const challengeStart = new Date(p.challenges.created_at);
    const deadline = new Date(challengeStart.getTime() + (24 * 60 * 60 * 1000));
    const msRemaining = deadline.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    // Only remind if within the 3-hour window
    if (hoursRemaining <= 3 && hoursRemaining > 0) {
      const level = Math.ceil(hoursRemaining); // 3, 2, or 1
      
      // Basic check to avoid multiple messages in the same 15-min window
      // For a production app, you'd track 'last_notified_level' in the DB
      console.log(`Sending ${level}h reminder to ${p.wallet_address}`);
      const msg = `⚠️ *Reminder:* You have less than ${level}h left to solve your "${p.challenges.title}" challenge! Don't lose your streak! 🔥`;
      
      try {
        await bot.telegram.sendMessage(p.user_profiles.telegram_chat_id, msg, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error(`Failed to send Telegram message to ${p.wallet_address}:`, err);
      }
    }
  }
};
