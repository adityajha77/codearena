import { motion } from "framer-motion";
import { SolChallenge } from "@/store/userStore";
import { useState, useEffect } from "react";
import { checkActivityToday } from "@/lib/api/platforms";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import ChallengeDetailsDialog from "./ChallengeDetailsDialog";

export default function ActiveChallengeCard({ challenge }: { challenge: SolChallenge }) {
  const { markChallengeSolvedToday, githubHandle, leetcodeHandle, codeforcesHandle, hackerrankHandle, codechefHandle, atcoderHandle } = useUserStore();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const isSolvedToday = challenge.lastSolvedDate === new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Calculate time until next midnight UTC or local. Let's use local midnight.
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next 12 AM
      
      const diff = midnight.getTime() - now.getTime();
      
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getHandleForPlatform = () => {
    switch (challenge.platform) {
      case 'GitHub': return githubHandle;
      case 'LeetCode': return leetcodeHandle;
      case 'Codeforces': return codeforcesHandle;
      case 'HackerRank': return hackerrankHandle;
      case 'CodeChef': return codechefHandle;
      case 'AtCoder': return atcoderHandle;
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
        const todayStr = new Date().toISOString().split('T')[0];
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

  return (
    <>
    <motion.div whileHover={{ y: -4 }} className="glass-card rounded-2xl p-6 border border-primary/20 shadow-xl shadow-primary/5 bg-primary/5 flex flex-col items-center text-center space-y-4">
      <div className="w-full flex justify-between items-center text-xs font-mono text-muted-foreground border-b border-border/50 pb-2">
        <span>Target: <span className="font-bold text-foreground">{challenge.platform}</span></span>
        <span>Active Challenge</span>
      </div>
      
      <h3 className="text-xl font-bold font-display text-foreground">{challenge.title}</h3>
      
      {isSolvedToday ? (
        <div className="py-6 w-full bg-green-500/10 rounded-xl border border-green-500/20">
          <p className="text-lg font-bold text-green-500 mb-1">Solved for today! 🎉</p>
          <p className="text-sm text-green-400/80">See you tomorrow, you saved your solana today.</p>
        </div>
      ) : (
        <>
          <div className="py-4 w-full bg-black/20 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Time Left Today</p>
            <p className="text-3xl font-mono text-accent font-bold tracking-tight">{timeLeft || "00:00:00"}</p>
          </div>
          
          <button 
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isVerifying ? "Checking..." : `Verify Progress on ${challenge.platform}`}
          </button>
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
