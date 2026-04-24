import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import CreateChallengeDialog from "@/components/CreateChallengeDialog";
import ActiveChallengeCard from "@/components/ActiveChallengeCard";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const tabs = ["Community", "Friends", "Private"];
const TREASURY_ADDRESS = "6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam";

const Challenges = () => {
  const [activeTab, setActiveTab] = useState("Community");
  const [challenges, setChallenges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  
  const { addChallenge, walletAddress, activeChallenges, githubHandle, leetcodeHandle, codeforcesHandle } = useUserStore();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const fetchChallenges = async () => {
    setIsLoading(true);
    const { data: challengesData, error: challengesError } = await supabase
      .from('challenges')
      .select(`
        *,
        challenge_participants (count)
      `)
      .order('created_at', { ascending: false });

    if (challengesError) {
      toast.error("Failed to fetch challenges");
    } else {
      setChallenges(challengesData || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const filtered = challenges.filter(c => {
    if (activeTab === "Community") {
      return c.mode === "Community";
    }
    if (activeTab === "Friends") {
      const allowed = c.allowed_friends || [];
      return c.mode === "Friend" && (c.creator_wallet === walletAddress || allowed.includes(walletAddress));
    }
    if (activeTab === "Private") {
      return c.mode === "Self" && c.creator_wallet === walletAddress;
    }
    return false;
  });

  const handleJoinClick = async (c: any) => {
    if (!walletAddress || !publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    // Gatekeeping: Check if user has required platform connected
    if (c.platform === 'GitHub' && !githubHandle) {
        toast.error("You must connect your GitHub profile to join this challenge!");
        return;
    }
    if (c.platform === 'LeetCode' && !leetcodeHandle) {
        toast.error("You must connect your LeetCode profile to join this challenge!");
        return;
    }
    if (c.platform === 'Codeforces' && !codeforcesHandle) {
        toast.error("You must connect your Codeforces profile to join this challenge!");
        return;
    }
    
    // For Private Self challenges, there is no joining, they are inherently joined upon creation
    if (c.mode === 'Self') return;

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', c.id)
        .eq('wallet_address', walletAddress)
        .single();
        
      if (existing) {
        toast.info("You have already joined this challenge!");
        return;
      }
      
      await executeStakingJoin(c);
      
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
         toast.error("Error checking participation: " + error.message);
      } else {
         // Proceed to join
         await executeStakingJoin(c);
      }
    }
  };

  const executeStakingJoin = async (c: any) => {
    setIsProcessingTx(true);
    try {
      // Staking always routes to treasury for community/friends
      const destPubkey = new PublicKey(TREASURY_ADDRESS);
      const stakeLamports = Math.round(parseFloat(c.stake) * LAMPORTS_PER_SOL);

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
          challenge_id: c.id,
          wallet_address: walletAddress
        }]);

      if (error) throw error;
      
      // Save transaction to history
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          wallet_address: walletAddress,
          type: 'Deposit',
          amount: parseFloat(c.stake),
          tx_hash: signature,
          challenge_id: c.id
        }]);
      
      if (txError) {
         console.error("Failed to record transaction history", txError);
      }

      toast.success(`Successfully staked ${c.stake} SOL and joined: ${c.title}`);
      
      addChallenge({
        id: c.id,
        title: c.title,
        days: parseInt(c.duration),
        stakeAmount: parseFloat(c.stake),
        isActive: true,
        startDate: new Date(),
        platform: "GitHub" 
      });
      
      fetchChallenges();
    } catch (error: any) {
      toast.error("Failed to join challenge: " + (error.message || "Transaction rejected"));
    } finally {
      setIsProcessingTx(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
                <span className="gradient-text-primary">Challenges</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">Browse, create, or join coding challenges.</p>
            </div>
          </ScrollReveal>

          {walletAddress && activeChallenges && activeChallenges.length > 0 && (
            <ScrollReveal>
              <div className="mb-12">
                <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Your Active Challenges
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeChallenges.filter(ac => ac.userWallet === walletAddress).map(ac => (
                    <ActiveChallengeCard key={ac.id} challenge={ac} />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal>
            <div className="flex flex-wrap justify-center gap-2 mb-8 bg-muted/20 p-2 rounded-2xl w-max mx-auto border border-white/5">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === t 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-16 text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-black/10">
              <div className="text-4xl mb-4 opacity-50">🎮</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Challenges Found</h3>
              <p className="mb-6">There are no {activeTab.toLowerCase()} challenges here yet.</p>
              <button 
                onClick={() => setIsDialogOpen(true)}
                className="px-6 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-all text-sm"
              >
                Be the first to create one
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((c, i) => (
                <ScrollReveal key={c.id} delay={i * 0.08}>
                  <motion.div whileHover={{ y: -4 }} className="glass-card rounded-2xl p-6 space-y-4 h-full flex flex-col border border-white/5 shadow-xl hover:shadow-primary/5 transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        c.status === "Live" ? "bg-primary/20 text-primary" : c.status === "Active" ? "bg-accent/20 text-accent" : "bg-secondary/20 text-secondary"
                      }`}>{c.status}</span>
                      <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{c.mode}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold font-display mb-2 text-foreground">{c.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        {c.tags?.map((t: string) => (
                          <span key={t} className="px-2.5 py-0.5 rounded-md bg-secondary/10 text-[11px] font-semibold text-secondary">{t}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 py-4 mt-auto border-t border-white/5 font-mono text-sm">
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20">
                        <span className="text-xs text-muted-foreground mb-1">Duration</span>
                        <span className="font-semibold text-foreground">{c.duration}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20">
                        <span className="text-xs text-muted-foreground mb-1">Stake</span>
                        <span className="font-semibold text-accent">{c.stake} ◎</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20">
                        <span className="text-xs text-muted-foreground mb-1">Users</span>
                        <span className="font-semibold text-foreground">{c.challenge_participants?.[0]?.count || 0}</span>
                      </div>
                    </div>
                    
                    {c.mode !== 'Self' && (
                      <div className="flex gap-2 pt-2">
                        <button 
                           onClick={() => handleJoinClick(c)} 
                           disabled={isProcessingTx}
                           className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          {isProcessingTx ? "Checking..." : "Stake to Join"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          )}

          <ScrollReveal>
            <div className="text-center mt-12">
              <button 
                onClick={() => setIsDialogOpen(true)}
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-secondary to-primary/80 text-white font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
              >
                + Create New Challenge
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>
      
      <CreateChallengeDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={fetchChallenges}
      />
      
      <Footer />
    </div>
  );
};

export default Challenges;
