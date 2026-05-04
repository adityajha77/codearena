import cron from 'node-cron';
import { supabase } from './supabase';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { applyPenaltyOnChain } from './oracle';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

export const startScheduler = () => {
  console.log('⏰ [BOOT] Reminder scheduler started! (Checking every 15 mins)');
  
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const timestamp = new Date().toLocaleString();
    try {
      await runReminderCheck();
    } catch (criticalErr: any) {
      console.error(`❌ [CRITICAL] Scheduler loop crashed: ${criticalErr.message}`);
    }
  });
};

export const runReminderCheck = async (force = false) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const { data: participants, error } = await supabase
    .from('challenge_participants')
    .select(`
      id, wallet_address, last_slashed_date, strike_count, status,
      challenges!fk_challenge (id, title, mode, creator_wallet, beneficiaries, created_at),
      user_profiles!fk_user_profile (telegram_chat_id)
    `)
    .neq('status', 'Eliminated')
    .or(`last_solved_date.neq.${todayStr},last_solved_date.is.null`);

  if (error) {
    console.error('   DB Error:', error.message || error);
    return;
  }

  if (!participants || participants.length === 0) return;

  console.log(`⏰ [${new Date().toLocaleTimeString()}] Checking ${participants.length} users...`);

  let slashCount = 0;
  for (const p of participants) {
    try {
      const profiles = p.user_profiles as any;
      const chatId = Array.isArray(profiles) ? profiles[0]?.telegram_chat_id : profiles?.telegram_chat_id;

      const challengeStart = new Date((p.challenges as any).created_at);
      const deadline = new Date(challengeStart.getTime() + (24 * 60 * 60 * 1000));
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Silent Reminders
      if (hoursRemaining <= 3 && hoursRemaining > 0 && chatId) {
        const level = Math.ceil(hoursRemaining);
        await bot.telegram.sendMessage(chatId, `⚠️ Less than ${level}h left for "${(p.challenges as any).title}"!`, { parse_mode: 'Markdown' });
      }

      // Slashing
      if (hoursRemaining <= 0 && p.last_slashed_date !== todayStr) {
        const beneficiary = (p.challenges as any).mode === 'Self' && (p.challenges as any).beneficiaries?.[0] 
          ? (p.challenges as any).beneficiaries[0] 
          : (p.challenges as any).creator_wallet;

        await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
        
        const newStrikes = (p.strike_count || 0) + 1;
        await supabase
          .from('challenge_participants')
          .update({ strike_count: newStrikes, status: newStrikes >= 3 ? 'Eliminated' : 'Active', last_slashed_date: todayStr })
          .eq('id', p.id);
        
        slashCount++;
        if (chatId) {
          await bot.telegram.sendMessage(chatId, `🚨 Penalty applied for "${(p.challenges as any).title}".`, { parse_mode: 'Markdown' });
        }
      }
    } catch (err: any) {
      console.error(`   ❌ User ${p.wallet_address} failed: ${err.message}`);
    }
  }

  if (slashCount > 0) console.log(`   ✅ Cycle finished. Slashed ${slashCount} users.`);
};


