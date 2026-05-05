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
      id, 
      wallet_address, 
      last_slashed_date, 
      last_solved_date,
      strike_count, 
      status,
      is_claimed,
      challenges!fk_challenge (id, title, mode, creator_wallet, beneficiaries, created_at),
      user_profiles!fk_user_profile (telegram_chat_id)
    `)
    .eq('is_claimed', false)
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

      // FIX: Calculate deadline based on 24h since creation OR 24h since last solution
      const challengeStart = new Date((p.challenges as any).created_at);
      const lastSolved = p.last_solved_date ? new Date(p.last_solved_date) : challengeStart;
      
      // If today is more than 24h since the last check/solution, they are late
      const deadline = new Date(lastSolved.getTime() + (24 * 60 * 60 * 1000));
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Slashing Logic
      if (hoursRemaining <= 0 && p.last_slashed_date !== todayStr) {
        const beneficiary = (p.challenges as any).mode === 'Self' && (p.challenges as any).beneficiaries?.[0] 
          ? (p.challenges as any).beneficiaries[0] 
          : (p.challenges as any).creator_wallet;

        console.log(`🚀 [SLASH] Attempting on-chain penalty for ${p.wallet_address}...`);
        
        try {
          await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
          console.log(`   ✅ Successfully slashed ${p.wallet_address} on-chain!`);
        } catch (onChainErr: any) {
          // If the error is an overflow, it means the user has 0 balance left. 
          // We should still mark them as "Slashed" for today so we don't keep trying.
          if (onChainErr.message.includes('overflow') || onChainErr.message.includes('0x1')) {
            console.log(`   ⚠️ Pool empty or already slashed for ${p.wallet_address}. Marking as handled.`);
          } else {
            throw onChainErr; // Real network error, try again next cycle
          }
        }
        
        // Update database so we don't try again today
        const newStrikes = (p.strike_count || 0) + 1;
        await supabase
          .from('challenge_participants')
          .update({ 
            strike_count: newStrikes, 
            status: newStrikes >= 3 ? 'Eliminated' : 'Active', 
            last_slashed_date: todayStr 
          })
          .eq('id', p.id);
        
        slashCount++;
        if (chatId) {
          await bot.telegram.sendMessage(chatId, `🚨 Day missed! Penalty applied for "${(p.challenges as any).title}". Strikes: ${newStrikes}/3`, { parse_mode: 'Markdown' });
        }
      } else if (hoursRemaining <= 3 && hoursRemaining > 0 && chatId) {
        // Silent Reminders
        const level = Math.ceil(hoursRemaining);
        await bot.telegram.sendMessage(chatId, `⚠️ Less than ${level}h left for "${(p.challenges as any).title}"!`, { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      console.error(`   ❌ User ${p.wallet_address} failed: ${err.message}`);
    }
  }

  if (slashCount > 0) console.log(`   ✅ Cycle finished. Slashed ${slashCount} users.`);
};


