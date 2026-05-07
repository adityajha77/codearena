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
      challenges!fk_challenge (id, title, mode, creator_wallet, beneficiaries, created_at, registration_deadline),
      user_profiles!fk_user_profile (telegram_chat_id)
    `)
    .eq('is_claimed', false)
    .neq('status', 'Eliminated');

  if (error) {
    console.error('   DB Error:', error.message || error);
    return;
  }

  if (!participants || participants.length === 0) return;

  let slashCount = 0;
  for (const p of participants) {
    try {
      const profiles = p.user_profiles as any;
      const chatId = Array.isArray(profiles) ? profiles[0]?.telegram_chat_id : profiles?.telegram_chat_id;

      // FIXED WINDOW LOGIC: Check anniversaries since the challenge start time
      // For community challenges, this is the registration_deadline.
      const deadline = (p.challenges as any).registration_deadline;
      const baseStartTime = deadline ? new Date(deadline) : (p.joined_at ? new Date(p.joined_at) : new Date((p.challenges as any).created_at));
      
      const timeSinceBase = now.getTime() - baseStartTime.getTime();
      
      // Calculate how many 24h periods have passed
      const anniversaryCount = timeSinceBase >= 0 ? Math.floor(timeSinceBase / (24 * 60 * 60 * 1000)) : 0;
      
      // The current window ends at:
      const nextAnniversary = new Date(baseStartTime.getTime() + (anniversaryCount + 1) * 24 * 60 * 60 * 1000);
      const hoursRemaining = (nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If they have solved fewer days than anniversaries passed, they are late
      const totalSolved = p.total_days_solved || 0;
      const strikesOwed = Math.max(0, anniversaryCount - totalSolved);
      
      // If they owe more strikes than they have, and we haven't slashed today
      if (strikesOwed > (p.strike_count || 0) && p.last_slashed_date !== todayStr) {
        const beneficiary = (p.challenges as any).mode === 'Self' && (p.challenges as any).beneficiaries?.[0] 
          ? (p.challenges as any).beneficiaries[0] 
          : (p.challenges as any).creator_wallet;

        console.log(`🚀 [SLASH] Anniversary check failed for ${p.wallet_address}. Owed: ${strikesOwed}, Current Strikes: ${p.strike_count}`);
        
        let slashTxHash = null;
        try {
          // Apply first penalty
          slashTxHash = await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
          
          // If they missed multiple days (e.g. 2 days late), apply second penalty immediately
          if (strikesOwed >= 2 && p.strike_count === 0) {
            console.log(`   ⚠️ User missed 2+ anniversaries. Applying second slash...`);
            try {
              await applyPenaltyOnChain((p.challenges as any).id, p.wallet_address, beneficiary);
            } catch (e) {
              console.log("   Secondary slash skipped or failed");
            }
          }

          
        } catch (onChainErr: any) {
          const errMsg = onChainErr.message || "";
          if (errMsg.includes('overflow') || errMsg.includes('0x1') || errMsg.includes('already been slashed')) {
            console.log(`   ⚠️ On-chain already slashed or pool empty for ${p.wallet_address}. Updating local DB only.`);
          } else {
            console.error(`   ❌ On-chain slash failed for ${p.wallet_address}: ${errMsg}`);
          }
        }
        
        // Update database to reflect the strikes
        const newStrikes = Math.min(strikesOwed, 2); 
        const finalStatus = newStrikes >= 2 ? 'Eliminated' : 'Active';

        await supabase
          .from('challenge_participants')
          .update({ 
            strike_count: newStrikes, 
            status: finalStatus, 
            last_slashed_date: todayStr,
            last_slash_tx: slashTxHash 
          })
          .eq('id', p.id);
        
        slashCount++;
        if (chatId) {
          const msg = finalStatus === 'Eliminated' 
            ? `💀 Challenge Lost! You missed multiple days relative to your start time. Your stake has been slashed. See you next time!`
            : `🚨 Day missed! A 50% penalty has been applied for "${(p.challenges as any).title}". Strikes: ${newStrikes}/2. Solve now to protect the rest!`;
          await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
      } else if (hoursRemaining <= 3 && hoursRemaining > 0 && chatId) {
        // Silent Reminders
        const level = Math.ceil(hoursRemaining);
        // Add a simple throttling logic for reminders? (Optional)
        await bot.telegram.sendMessage(chatId, `⚠️ Less than ${level}h left for "${(p.challenges as any).title}"!`, { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      console.error(`   ❌ User ${p.wallet_address} loop failed: ${err.message}`);
    }
  }

  if (slashCount > 0) console.log(`   ✅ Cycle finished. Slashed ${slashCount} users.`);
};
