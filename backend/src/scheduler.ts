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
      last_solved_at,
      joined_at,
      strike_count, 
      total_days_solved,
      status,
      is_claimed,
      challenges!fk_challenge (id, title, mode, creator_wallet, beneficiaries, created_at),
      user_profiles!fk_user_profile (telegram_chat_id)
    `)
    .eq('is_claimed', false)
    .neq('status', 'Eliminated');

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

      // FIXED WINDOW LOGIC: Check anniversaries since join time
      const joinedAt = p.joined_at ? new Date(p.joined_at) : new Date((p.challenges as any).created_at);
      const timeSinceJoin = now.getTime() - joinedAt.getTime();
      const anniversaryCount = Math.floor(timeSinceJoin / (24 * 60 * 60 * 1000));
      
      // The current window ends at:
      const nextAnniversary = new Date(joinedAt.getTime() + (anniversaryCount + 1) * 24 * 60 * 60 * 1000);
      const hoursRemaining = (nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If they have solved fewer days than anniversaries passed, they are late
      const totalSolved = p.total_days_solved || 0;
      const strikesOwed = anniversaryCount - totalSolved;
      
      if (strikesOwed > (p.strike_count || 0) && p.last_slashed_date !== todayStr) {
        const beneficiary = (p.challenges as any).mode === 'Self' && (p.challenges as any).beneficiaries?.[0] 
          ? (p.challenges as any).beneficiaries[0] 
          : (p.challenges as any).creator_wallet;

        console.log(`🚀 [SLASH] Anniversary check failed for ${p.wallet_address}. Owed: ${strikesOwed}, Current: ${p.strike_count}`);
        
        try {
          const isSeverelyLate = strikesOwed >= 2; 
          
          await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
          
          if (isSeverelyLate) {
            console.log(`   ⚠️ User missed multiple anniversaries. Applying second slash...`);
            try {
              await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
            } catch (e) {
              console.log("   Secondary slash skipped");
            }
          }

          console.log(`   ✅ Successfully slashed ${p.wallet_address} on-chain!`);
        } catch (onChainErr: any) {
          if (onChainErr.message.includes('overflow') || onChainErr.message.includes('0x1')) {
            console.log(`   ⚠️ Pool empty or already slashed for ${p.wallet_address}. Marking as handled.`);
          } else {
            throw onChainErr;
          }
        }
        
        // Update database
        const newStrikes = Math.min(strikesOwed, 2); // 2 strikes max
        const finalStatus = newStrikes >= 2 ? 'Eliminated' : 'Active';

        await supabase
          .from('challenge_participants')
          .update({ 
            strike_count: newStrikes, 
            status: finalStatus, 
            last_slashed_date: todayStr 
          })
          .eq('id', p.id);
        
        slashCount++;
        if (chatId) {
          const msg = finalStatus === 'Eliminated' 
            ? `💀 Challenge Lost! You missed 2 days relative to your start time. See you again, you lost the challenge and SOL too.`
            : `🚨 Day missed! Penalty applied for "${(p.challenges as any).title}". Strikes: ${newStrikes}/2`;
          await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
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


