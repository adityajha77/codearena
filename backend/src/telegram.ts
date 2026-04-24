import { Telegraf } from 'telegraf';
import { supabase } from './supabase';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN is missing! Telegram bot will not start.");
}

export const bot = token ? new Telegraf(token) : null;

if (bot) {
  bot.start(async (ctx) => {
    const startPayload = (ctx as any).startPayload; // Deep link parameter
    const chatId = ctx.chat.id;

    if (startPayload) {
      // payload is expected to be the wallet address
      const walletAddress = startPayload;

      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ telegram_chat_id: chatId })
          .eq('wallet_address', walletAddress);

        if (error) throw error;

        await ctx.reply(`✅ Success! Your Telegram account has been linked to wallet: ${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}`);
        await ctx.reply("I will send you reminders when your challenge deadlines are approaching! 🚀");
      } catch (err: any) {
        console.error("Error linking telegram:", err.message);
        await ctx.reply("❌ Error linking your wallet. Please make sure you have created a profile on CodeArena first.");
      }
    } else {
      await ctx.reply("Welcome to CodeArena Bot! 🛡️");
      await ctx.reply("To receive reminders, please link your wallet from the CodeArena website profile page.");
    }
  });

  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id;
    
    try {
      // Find user by chat ID
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('wallet_address')
        .eq('telegram_chat_id', chatId)
        .single();

      if (userError || !user) {
        return ctx.reply("You haven't linked your wallet yet! Use the link on the CodeArena website.");
      }

      // Find active challenges for this user
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, challenges(*)')
        .eq('wallet_address', user.wallet_address);

      if (partError || !participations || participations.length === 0) {
        return ctx.reply("You have no active challenges at the moment. Go join some! 🏆");
      }

      let message = "🔥 *Your Active Challenges*:\n\n";
      participations.forEach((p: any) => {
        const c = p.challenges;
        message += `• *${c.title}* (${c.platform})\n`;
      });

      await ctx.replyWithMarkdown(message);
    } catch (err: any) {
      console.error("Status error:", err.message);
      await ctx.reply("An error occurred while fetching your status.");
    }
  });

  bot.launch()
    .then(() => console.log("🤖 Telegram Bot started!"))
    .catch((err) => console.error("❌ Failed to start Telegram bot:", err));

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

export async function sendMessage(chatId: string | number, message: string) {
  if (bot) {
    try {
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (err: any) {
      console.error(`Error sending message to ${chatId}:`, err.message);
      return false;
    }
  }
  return false;
}
