import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const TREASURY_ADDRESS = "6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam";

const typeColor = (t: string) => {
  switch (t) {
    case "warning": return "border-l-accent";
    case "success": return "border-l-primary";
    case "danger": return "border-l-destructive";
    case "live": return "border-l-cyan";
    default: return "border-l-secondary";
  }
};

const Notifications = () => {
  const { walletAddress, addChallenge } = useUserStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const fetchNotifications = async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*, challenges(*)')
      .or(`recipient_wallet.eq.${walletAddress},recipient_wallet.eq.global`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to fetch notifications");
    } else {
      setNotifications(notifs || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [walletAddress]);

  const handleJoinChallenge = async (challenge: any) => {
    if (!walletAddress || !publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('wallet_address', walletAddress)
        .single();
        
      if (existing) {
        toast.info("You have already joined this challenge!");
        return;
      }
      
      setIsProcessingTx(true);
      
      const destPubkey = new PublicKey(TREASURY_ADDRESS);
      const stakeLamports = Math.round(parseFloat(challenge.stake) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: publicKey!,
            toPubkey: destPubkey,
            lamports: stakeLamports,
        })
      );
      
      toast.info("Please approve the transaction in your wallet...");
      const signature = await sendTransaction(transaction, connection);
      toast.info("Transaction sent. Waiting for network confirmation...");
      await connection.confirmTransaction(signature, 'processed');

      // Save participant to Supabase
      const { error } = await supabase
        .from('challenge_participants')
        .insert([{
          challenge_id: challenge.id,
          wallet_address: walletAddress
        }]);

      if (error) throw error;

      toast.success(`Successfully staked ${challenge.stake} SOL and joined: ${challenge.title}`);
      
      addChallenge({
        id: challenge.id,
        title: challenge.title,
        days: parseInt(challenge.duration),
        stakeAmount: parseFloat(challenge.stake),
        isActive: true,
        startDate: new Date(),
        platform: "GitHub" 
      });
      
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
         toast.error("Failed to join challenge: " + (error.message || "Transaction rejected"));
      }
    } finally {
      setIsProcessingTx(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold font-display mb-8 text-center">
              <span className="gradient-text-primary">Notifications</span>
            </h1>
          </ScrollReveal>
          <div className="space-y-3">
            {!walletAddress ? (
              <div className="text-center p-12 text-muted-foreground border border-dashed rounded-2xl">
                Please connect your wallet to see notifications.
              </div>
            ) : isLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground border border-dashed rounded-2xl">
                You have no notifications yet.
              </div>
            ) : (
              notifications.map((n, i) => (
                <ScrollReveal key={n.id} delay={i * 0.08}>
                  <motion.div whileHover={{ x: 4 }}
                    className={`glass-card rounded-xl p-4 border-l-4 ${typeColor(n.type)} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                    <div>
                      <span className="text-sm">{n.message}</span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    {n.challenges && (
                      <button 
                         disabled={isProcessingTx}
                         onClick={() => handleJoinChallenge(n.challenges)}
                         className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        Join Stake ({n.challenges.stake} ◎)
                      </button>
                    )}
                  </motion.div>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Notifications;
