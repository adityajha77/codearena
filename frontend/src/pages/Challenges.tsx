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
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram, getChallengePoolPDA, getParticipantRecordPDA } from "@/lib/anchorClient";
import ChallengeDetailsDialog from "@/components/ChallengeDetailsDialog";


const tabs = ["Community", "Friends", "Private"];
const TREASURY_ADDRESS = "6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam";

const Challenges = () => {
  const [activeTab, setActiveTab] = useState("Community");
  const [challenges, setChallenges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);

  
  const { addChallenge, setActiveChallenges, walletAddress, activeChallenges, githubHandle, leetcodeHandle, codeforcesHandle } = useUserStore();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_participants!fk_challenge (count)
        `)
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      let userParticipations: any[] = [];
      if (walletAddress) {
        const { data: pData } = await supabase
          .from('challenge_participants')
          .select('*')
          .ilike('wallet_address', walletAddress);
        userParticipations = pData || [];
      }

      const merged = (challengesData || []).map(c => {
        const myPart = userParticipations.find(p => p.challenge_id === c.id);
        return {
          ...c,
          myStatus: myPart?.status || 'Not Joined',
          myStrikes: myPart?.strike_count || 0
        };
      });

      setChallenges(merged);
    } catch (error) {
      toast.error("Failed to fetch challenges");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
    
    // Fetch active challenges for this user for the store
    const fetchActive = async () => {
      if (walletAddress) {
        const { data: participantData } = await supabase
          .from('challenge_participants')
          .select(`
            last_solved_date,
            last_solved_at,
            joined_at,
            total_days_solved,
            is_claimed,
            status,
            challenges!fk_challenge (
              id, title, duration, stake, platform, created_at, registration_deadline
            )
          `)
          .ilike('wallet_address', walletAddress);
          
        if (participantData) {
          const myChallenges = participantData
            .filter(p => {
              const c = p.challenges as any;
              const isFinished = (p.total_days_solved || 0) >= parseInt(c.duration);
              return !p.is_claimed && !isFinished && p.status !== 'Eliminated';
            })
            .map(p => {
            const c = p.challenges as any;
            return {
              id: c.id,
              title: c.title,
              days: parseInt(c.duration),
              stakeAmount: parseFloat(c.stake),
              isActive: true,
              startDate: new Date(p.joined_at || c.created_at), 
              platform: c.platform,
              lastSolvedDate: p.last_solved_date || undefined,
              lastSolvedAt: p.last_solved_at || undefined,
              userWallet: walletAddress,
              registrationDeadline: (p.challenges as any).registration_deadline
            };
          });
          setActiveChallenges(myChallenges);
        }
      }
    };
    fetchActive();
  }, [walletAddress]);



  const filtered = challenges.filter(c => {
    // 1. Search filter
    if (searchTerm && !c.title.toLowerCase().includes(searchTerm) && !c.id.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // 2. Tab filter
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
    
    // Check registration deadline for Community mode
    if (c.mode === 'Community' && c.registration_deadline) {
      const deadline = new Date(c.registration_deadline);
      if (new Date() > deadline) {
        toast.error("Registration for this challenge has closed!");
        return;
      }
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
      const provider = new AnchorProvider(connection, anchorWallet as any, { commitment: "processed" });
      const program = getProgram(provider);

      const challengePoolPDA = getChallengePoolPDA(c.id);
      const participantRecordPDA = getParticipantRecordPDA(challengePoolPDA, publicKey!);

      const tx = new Transaction();
      const joinIx = await program.methods.joinChallenge()
      .accounts({
        challengePool: challengePoolPDA,
        participantRecord: participantRecordPDA,
        user: publicKey!,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

      tx.add(joinIx);

      toast.info("Please approve the transaction in your wallet...");
      const signature = await sendTransaction(tx, connection);
      toast.info("Transaction sent. Waiting for network confirmation...");
      await connection.confirmTransaction(signature, 'processed');

      // 1. Join the challenge in the database
      const { error: joinError } = await supabase
        .from('challenge_participants')
        .insert([{
          challenge_id: c.id,
          wallet_address: walletAddress,
          current_streak: 0,
          total_days_solved: 0,
          joined_at: new Date().toISOString()
        }]);

      if (joinError) throw joinError;

      // 2. Save transaction to history
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

          {/* Global Community Challenges - Visible to Everyone */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  Global Community Challenges
                </h2>
                <div className="text-sm font-mono text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-white/5">
                  Live Activity
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.filter(c => c.mode === "Community").slice(0, 3).map((c, i) => (
                  <motion.div 
                    key={`global-${c.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative glass-card rounded-2xl p-6 space-y-4 border border-white/10 shadow-2xl h-full flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Trending</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-mono text-muted-foreground">{c.challenge_participants?.[0]?.count || 0} participants</span>
                          <span className="text-[10px] font-bold text-accent">Total Pool: {(c.challenge_participants?.[0]?.count || 0) * c.stake} SOL</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">{c.title}</h3>
                          <div className="flex gap-2 mt-2">
                             <span className="px-2 py-0.5 rounded bg-secondary/20 text-[10px] font-bold text-secondary uppercase">{c.platform}</span>
                             <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-muted-foreground uppercase">{c.duration}</span>
                          </div>
                          {c.registration_deadline && (
                            <div className="mt-2 text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20 w-fit">
                              ⏰ Deadline: {new Date(c.registration_deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">Join this global coding challenge and stake {c.stake} SOL to prove your consistency.</p>
                      
                      <div className="pt-4 mt-auto">
                        <button 
                          onClick={() => handleJoinClick(c)}
                          disabled={c.registration_deadline && new Date() > new Date(c.registration_deadline)}
                          className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${
                            c.registration_deadline && new Date() > new Date(c.registration_deadline)
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                          }`}
                        >
                          {c.registration_deadline && new Date() > new Date(c.registration_deadline) ? "Registration Closed" : "Join Community"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-16"></div>
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
            <div className="max-w-md mx-auto mb-8">
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Search by Title or Challenge ID..."
                  className="w-full bg-muted/10 border border-white/10 rounded-2xl py-3 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    setSearchTerm(term);
                  }}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>

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
                  <motion.div 
                    whileHover={c.myStatus === "Eliminated" ? {} : { y: -4 }} 
                    onClick={() => setSelectedChallenge(c)}
                    className={`rounded-3xl p-8 space-y-6 h-full flex flex-col border transition-all relative overflow-hidden ${
                      c.myStatus === "Eliminated" 
                        ? "bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/5" 
                        : "glass-card border-white/10 shadow-xl hover:shadow-primary/10 hover:border-white/20"
                    }`}
                  >
                    {c.myStatus === "Eliminated" && (
                      <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-[11px] font-black text-center py-1.5 uppercase tracking-[0.2em] z-10 animate-pulse">
                        Challenge Lost
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        c.myStatus === "Eliminated" ? "bg-red-500 text-white" :
                        c.status === "Live" ? "bg-primary/20 text-primary" : c.status === "Active" ? "bg-accent/20 text-accent" : "bg-secondary/20 text-secondary"
                      }`}>{c.myStatus === "Eliminated" ? "ELIMINATED" : c.status}</span>
                      <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{c.mode}</span>
                    </div>
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-xl font-bold font-display mb-2 ${c.myStatus === "Eliminated" ? "text-red-400" : "text-foreground"}`}>{c.title}</h3>
                        <div className="flex gap-2 flex-wrap">
                          {c.tags?.map((t: string) => (
                            <span key={t} className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${c.myStatus === "Eliminated" ? "bg-red-500/10 text-red-400" : "bg-secondary/10 text-secondary"}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(c.id);
                          toast.success("Challenge ID copied! Send this to your friends.");
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-all"
                        title="Copy Challenge ID to share"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1-0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                    
                    {c.myStatus === "Eliminated" ? (
                      <div className="flex flex-col items-center justify-center py-6 mt-4 border-t border-red-500/20 bg-red-500/10 rounded-xl space-y-2">
                         <div className="text-red-500 font-black text-2xl tracking-tighter italic">YOU LOST</div>
                         <div className="text-red-400/80 text-[11px] text-center px-4 leading-tight">See you again, you looses the challenge and SOL too.</div>
                      </div>
                    ) : (
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
                          <span className="text-xs text-muted-foreground mb-1">Total Pool</span>
                          <span className="font-semibold text-foreground">{(c.challenge_participants?.[0]?.count || 0) * c.stake} ◎</span>
                        </div>
                      </div>
                    )}

                    {c.registration_deadline && c.myStatus === 'Not Joined' && (
                      <div className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20 w-fit">
                        ⏰ Registration Closes: {new Date(c.registration_deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    )}
                    
                    {!['Self', 'Joined'].includes(c.myStatus) && c.myStatus !== 'Eliminated' && (
                      <div className="flex gap-2 pt-2">
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleJoinClick(c); }} 
                           disabled={isProcessingTx || (c.registration_deadline && new Date() > new Date(c.registration_deadline))}
                           className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                             c.registration_deadline && new Date() > new Date(c.registration_deadline)
                             ? "bg-muted text-muted-foreground"
                             : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                           }`}
                        >
                          {isProcessingTx ? "Checking..." : (c.registration_deadline && new Date() > new Date(c.registration_deadline) ? "Registration Closed" : "Stake to Join")}
                        </button>
                      </div>
                    )}

                    {c.myStatus === 'Joined' && (
                      <div className="flex gap-2 pt-2">
                        <div className="flex-1 py-3 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/20 text-center text-sm">
                          Joined & Active
                        </div>
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
      
      {selectedChallenge && (
        <ChallengeDetailsDialog
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          challenge={selectedChallenge}
          onStatusChange={fetchChallenges}
        />
      )}
      
      <Footer />

    </div>
  );
};

export default Challenges;
