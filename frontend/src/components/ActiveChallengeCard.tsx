import { motion } from "framer-motion";
import { CheckCircle2, Twitter } from "lucide-react";
import { SolChallenge } from "@/store/userStore";
import { useState, useEffect } from "react";
import { checkActivityToday } from "@/lib/api/platforms";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";
import ChallengeDetailsDialog from "./ChallengeDetailsDialog";

export default function ActiveChallengeCard({ challenge }: { challenge: SolChallenge }) {
  const { markChallengeSolvedToday, githubHandle, leetcodeHandle, codeforcesHandle } = useUserStore();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isSolvedToday = challenge.lastSolvedDate === new Date().toISOString().split('T')[0];

  const [dbStatus, setDbStatus] = useState({ 
    strikes: 0, 
    status: 'Active', 
    totalSolved: 0, 
    isClaimed: false,
    allClaimed: false 
  });

  useEffect(() => {
    const fetchStatus = async () => {
      if (!useUserStore.getState().walletAddress) return;
      
      // 1. Fetch current user status
      const { data: myData } = await supabase
        .from('challenge_participants')
        .select('strike_count, status, total_days_solved, is_claimed')
        .eq('challenge_id', challenge.id)
        .eq('wallet_address', useUserStore.getState().walletAddress)
        .single();
      
      // 2. Fetch global challenge status (have all friends claimed?)
      const { data: allParts } = await supabase
        .from('challenge_participants')
        .select('is_claimed')
        .eq('challenge_id', challenge.id);

      const allClaimed = allParts && allParts.length > 0 && allParts.every(p => p.is_claimed);

      if (myData) {
        setDbStatus({ 
          strikes: myData.strike_count || 0, 
          status: myData.status || 'Active',
          totalSolved: myData.total_days_solved || 0,
          isClaimed: myData.is_claimed || false,
          allClaimed: !!allClaimed
        });

        // 3. If everyone claimed, update global challenge status to Finished
        if (allClaimed) {
          await supabase.from('challenges').update({ status: 'Finished' }).eq('id', challenge.id);
        }
      }
    };
    fetchStatus();
  }, [challenge.id]);

  const isChallengeCompleted = dbStatus.totalSolved >= challenge.days;

  useEffect(() => {
    if (isChallengeCompleted || isSolvedToday) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      // Fair Timer: Countdown from (last solve OR start date) + 24 hours
      const lastAction = challenge.lastSolvedAt ? new Date(challenge.lastSolvedAt) : new Date(challenge.startDate);
      const deadline = new Date(lastAction.getTime() + (24 * 60 * 60 * 1000));

      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge.lastSolvedAt, challenge.startDate, isChallengeCompleted, isSolvedToday]);

  const getHandleForPlatform = () => {
    switch (challenge.platform) {
      case 'GitHub': return githubHandle;
      case 'LeetCode': return leetcodeHandle;
      case 'Codeforces': return codeforcesHandle;
      default: return null;
    }
  };

  const handleVerify = async () => {
    const handle = getHandleForPlatform();
    if (!handle) {
      toast.error(`You have not connected a ${challenge.platform} handle in your profile!`);
      return;
    }

    setIsVerifying(true);
    toast.info(`Verifying today's activity on ${challenge.platform}...`);

    try {
      const verified = await checkActivityToday(challenge.platform, handle);
      if (verified) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const { data: partData } = await supabase
          .from('challenge_participants')
          .select('current_streak, total_days_solved, last_solved_date')
          .eq('challenge_id', challenge.id)
          .eq('wallet_address', useUserStore.getState().walletAddress)
          .single();

        let newStreak = 1;
        if (partData) {
          if (partData.last_solved_date === yesterdayStr) {
            newStreak = (partData.current_streak || 0) + 1;
          } else if (partData.last_solved_date === todayStr) {
            newStreak = partData.current_streak || 1; 
          }
        }

        const { error: dbError } = await supabase
          .from('challenge_participants')
          .update({ 
            last_solved_date: todayStr,
            last_solved_at: now.toISOString(),
            current_streak: newStreak,
            total_days_solved: (partData?.total_days_solved || 0) + (partData?.last_solved_date === todayStr ? 0 : 1)
          })
          .eq('challenge_id', challenge.id)
          .eq('wallet_address', useUserStore.getState().walletAddress);

        if (dbError) console.error("Database update failed:", dbError);

        markChallengeSolvedToday(challenge.id, todayStr);
        toast.success(`Success! Activity validated on ${challenge.platform}.`);
      } else {
        toast.error(`No activity found today for ${handle} on ${challenge.platform}. Try again after making a submission.`);
      }
    } catch (e) {
      toast.error("An error occurred while checking activity.");
    } finally {
      setIsVerifying(false);
    }
  };

  const renderStatusCard = () => {
    if (dbStatus.allClaimed) {
      return (
        <div className="py-8 w-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/40 flex flex-col items-center shadow-[0_0_30px_rgba(34,197,94,0.15)] animate-in fade-in duration-700">
          <div className="text-5xl mb-3">🥳</div>
          <p className="text-2xl font-black text-green-400 mb-1 tracking-tighter">CHALLENGE OVER!</p>
          <p className="text-sm font-bold text-emerald-500 mb-2">EVERYONE IS A WINNER</p>
          <p className="text-xs text-white/60 px-8 text-center leading-relaxed">
            Total success! All participants have claimed their rewards. This challenge is now archived in your glory history.
          </p>
        </div>
      );
    }

    if (isChallengeCompleted) {
      return (
        <div className="py-8 w-full bg-yellow-500/10 rounded-xl border border-yellow-500/30 flex flex-col items-center animate-in zoom-in-95 duration-500">
          <div className="text-4xl mb-2">{dbStatus.isClaimed ? "💰" : "🏆"}</div>
          <p className="text-xl font-black text-yellow-500 mb-1">
            {dbStatus.isClaimed ? "REWARD CLAIMED!" : "CHALLENGE COMPLETED!"}
          </p>
          <p className="text-xs text-yellow-400/80 px-6 text-center leading-relaxed">
            {dbStatus.isClaimed 
              ? "The challenge is over and your SOL has been successfully transferred to your wallet. Great work!" 
              : `Congratulations! You've successfully finished all ${challenge.days} days. Your stake and rewards are ready to be claimed!`}
          </p>
        </div>
      );
    }

    if (dbStatus.strikes > 0 && dbStatus.status !== 'Eliminated') {
      return (
        <div className="w-full bg-orange-500/20 py-2 rounded-lg border border-orange-500/40 text-[11px] font-bold text-orange-400 uppercase tracking-widest animate-pulse">
          🚨 50% Penalty Applied (1/2 Strikes)
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -4 }} 
        className={`glass-card rounded-2xl p-6 border transition-all shadow-xl flex flex-col items-center text-center space-y-4 ${
          dbStatus.status === 'Eliminated' 
          ? "bg-red-950/40 border-red-500/50 shadow-red-500/10" 
          : dbStatus.strikes > 0 
          ? "bg-orange-950/20 border-orange-500/50 shadow-orange-500/10" 
          : "bg-primary/5 border-primary/20 shadow-primary/5"
        }`}
      >
        <div className="w-full flex justify-between items-center text-xs font-mono text-muted-foreground border-b border-border/50 pb-2">
          <span>Target: <span className="font-bold text-foreground">{challenge.platform}</span></span>
          <span className={dbStatus.strikes > 0 ? "text-orange-500 font-bold" : ""}>
            {dbStatus.status === 'Eliminated' ? "ELIMINATED" : dbStatus.strikes > 0 ? "⚠️ SLASHED" : "Active Challenge"}
          </span>
        </div>

        <h3 className={`text-xl font-bold font-display ${isChallengeCompleted ? "text-yellow-500" : dbStatus.status === 'Eliminated' ? "text-red-500" : "text-foreground"}`}>
          {challenge.title}
        </h3>

        {renderStatusCard()}

        {!isChallengeCompleted && !dbStatus.allClaimed && (
          <>
            {isSolvedToday ? (
              <div className="py-8 w-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)] flex flex-col items-center">
                <div className="bg-green-500/20 p-2 rounded-full mb-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xl font-black text-green-500 mb-2 tracking-tight">YOU ARE SAFE!</p>
                <p className="text-sm text-green-400/80 px-6 leading-relaxed mb-4">
                  Sit back, relax, and prepare well. Your SOL is protected for this cycle.
                </p>
                <div className="px-4 py-2 bg-black/30 rounded-lg border border-white/5 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Next Cycle Starts At</p>
                  <p className="text-sm font-mono font-bold text-foreground">
                    {(() => {
                      const joinedAt = new Date(challenge.startDate);
                      const now = new Date();
                      const anniversaryCount = Math.floor((now.getTime() - joinedAt.getTime()) / (24 * 60 * 60 * 1000));
                      const nextReset = new Date(joinedAt.getTime() + (anniversaryCount + 1) * 24 * 60 * 60 * 1000);
                      return nextReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </p>
                </div>
                
                <div className="flex gap-2 w-full px-6">
                  <button 
                    onClick={() => {
                      const text = `🔥 Just saved my SOL stake on @CodeArena! \n\nMy ${challenge.platform} streak is alive. Day ${dbStatus.totalSolved + 1} secured. 🚀\n\n#Solana #Web3 #BuildInPublic`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 transition-all text-sm font-bold"
                  >
                    <Twitter className="w-4 h-4" /> Share Progress on Twitter
                  </button>
                </div>
              </div>
            ) : dbStatus.status === 'Eliminated' ? (
              <div className="py-6 w-full bg-red-500/10 rounded-xl border border-red-500/20 px-4">
                <p className="text-lg font-bold text-red-500 mb-1">CHALLENGE LOST</p>
                <p className="text-sm text-red-400/80 leading-tight">See you again, you looses the challenge and SOL too.</p>
              </div>
            ) : (
              <>
                <div className={`py-4 w-full rounded-xl ${dbStatus.strikes > 0 ? "bg-orange-500/10" : "bg-black/20"}`}>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Time Left Today</p>
                  <p className={`text-3xl font-mono font-bold tracking-tight ${dbStatus.strikes > 0 ? "text-orange-500" : "text-accent"}`}>{timeLeft || "00:00:00"}</p>
                </div>

                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className={`w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
                    dbStatus.strikes > 0 ? "bg-orange-500 text-white" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isVerifying ? "Checking..." : `Verify Progress on ${challenge.platform}`}
                </button>
              </>
            )}
          </>
        )}

        <button
          onClick={() => setIsDetailsOpen(true)}
          className="w-full py-2 mt-2 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-all text-sm font-semibold"
        >
          View Friend Leaderboard & Status
        </button>

      </motion.div>

      <ChallengeDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        challenge={challenge}
      />
    </>
  );
}
