import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  getGitHubActivity, 
  getLeetCodeActivity, 
  getCodeforcesActivity, 
  toDateString 
} from "@/lib/api/platforms";
import { calculatePenalty } from "@/lib/utils/penalty";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function ChallengeDetailsDialog({ isOpen, onClose, challenge }: any) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [mockBots, setMockBots] = useState<any[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [simulationDaysOffset, setSimulationDaysOffset] = useState(0);
  const [payoutTargetAddress, setPayoutTargetAddress] = useState("");
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    if (!isOpen || !challenge) return;
    
    const fetchParticipants = async () => {
      setLoading(true);
      // Fetch participants
      const { data: pData, error } = await supabase
        .from('challenge_participants')
        .select(`
          wallet_address
        `)
        .eq('challenge_id', challenge.id);
        
      if (error) {
        toast.error("Failed to load participants");
        setLoading(false);
        return;
      }

      const today = new Date();
      // Assume challenge started from created_at
      const startDate = new Date(challenge.created_at || new Date());
      let daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      
      // Apply simulation offset
      daysElapsed += simulationDaysOffset;
      if (daysElapsed < 0) daysElapsed = 0;

      const processed = await Promise.all((pData || []).map(async (p: any) => {
        // Fetch handle for this user
        const { data: uData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('wallet_address', p.wallet_address)
          .single();
          
        let platformMap: string = "github";
        if (challenge.platform === 'LeetCode') platformMap = 'leetcode';
        if (challenge.platform === 'Codeforces') platformMap = 'codeforces';
        if (challenge.platform === 'HackerRank') platformMap = 'hackerrank';
        if (challenge.platform === 'CodeChef') platformMap = 'codechef';
        if (challenge.platform === 'AtCoder') platformMap = 'atcoder';

        const handle = uData?.[platformMap];
        
        let history: any = {};
        if (handle) {
           if (platformMap === 'github') history = await getGitHubActivity(handle);
           else if (platformMap === 'leetcode') history = await getLeetCodeActivity(handle);
           else if (platformMap === 'codeforces') history = await getCodeforcesActivity(handle);
           // For others, mock history for UI
           else history = { [toDateString(new Date())]: 1 };
        }

        const penaltyResult = calculatePenalty(startDate, daysElapsed, history, !!handle);

        return {
          wallet: p.wallet_address,
          handle: handle || "Not Linked",
          ...penaltyResult
        };
      }));

      setParticipants(processed);
      setLoading(false);
    };

    fetchParticipants();
    fetchParticipants();
  }, [isOpen, challenge, simulationDaysOffset]);

  const addBot = () => {
    const randomId = Math.random().toString(36).substring(7, 11);
    const newBot = {
      wallet: `bot_${randomId}_Vault`,
      handle: `bot_${randomId}`,
      status: "Protected",
      todayVal: 1,
      missedDays: 0,
      isBot: true
    };
    setMockBots(prev => [...prev, newBot]);
  };

  const toggleStatus = (wallet: string, currentStatus: string) => {
     let next = "Protected";
     if (currentStatus === "Protected") next = "Strike 1";
     else if (currentStatus === "Strike 1") next = "Eliminated";
     
     setStatusOverrides(prev => ({
       ...prev,
       [wallet]: next
    }));
  };

  const combinedParticipants = [...participants, ...mockBots].map(p => ({
     ...p,
     status: statusOverrides[p.wallet] || p.status
  }));

  if (!isOpen || !challenge) return null;

  const validCount = combinedParticipants.filter(p => p.status !== "Eliminated").length;
  const stakeValue = challenge.stake || challenge.stakeAmount || 0;
  const currentPool = stakeValue * combinedParticipants.length;
  // If participants get eliminated, or get strikes, their stake gets redistributed
  // For UI mockup: just total pool / surviving
  const poolPerSurvivor = validCount > 0 ? (currentPool / validCount).toFixed(2) : "0";

  const handlePayout = async () => {
    if (!payoutTargetAddress) {
      toast.error("Please enter a target address");
      return;
    }
    if (!publicKey) {
      toast.error("Please connect your wallet to act as the treasury");
      return;
    }
    setIsProcessingTx(true);
    try {
      const destPubkey = new PublicKey(payoutTargetAddress);
      // Simulating payout of 1 share of the pool per survivor
      const amountToSend = parseFloat(poolPerSurvivor);
      if (amountToSend <= 0) throw new Error("No funds to payout");

      const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: destPubkey,
            lamports: Math.round(amountToSend * LAMPORTS_PER_SOL),
        })
      );
      
      toast.info("Please approve the payout transaction...");
      const signature = await sendTransaction(transaction, connection);
      toast.info("Transaction sent. Waiting for confirmation...");
      await connection.confirmTransaction(signature, 'processed');

      // Record payout to DB
      await supabase.from('transactions').insert([{
         wallet_address: publicKey.toBase58(),
         type: 'Payout',
         amount: amountToSend,
         tx_hash: signature,
         challenge_id: challenge.id,
         recipient_address: payoutTargetAddress
      }]);

      toast.success(`Successfully paid out ${amountToSend} SOL! Check History tab.`);
      setPayoutTargetAddress("");
    } catch (err: any) {
      toast.error("Payout failed: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessingTx(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold font-display text-white mb-2">{challenge.title} - Live Pool Tracker</h2>
                  
                  {import.meta.env.DEV && (
                    <div className="flex flex-col gap-2 items-end">
                        <div className="bg-primary/20 border border-primary/50 text-primary rounded-lg p-2 flex items-center gap-3">
                        <button 
                            onClick={addBot}
                            className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 font-bold border border-blue-500/50 rounded px-2 py-1 text-[10px] uppercase tracking-wider transition-colors mr-2"
                        >
                            + Add Bot
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider">Sim Mode: Days</span>
                        <button 
                            onClick={() => setSimulationDaysOffset(prev => prev - 1)}
                            className="bg-black/40 hover:bg-black/60 w-6 h-6 rounded flex items-center justify-center font-bold"
                        >-</button>
                        <span className="font-mono text-sm">{simulationDaysOffset >= 0 ? `+${simulationDaysOffset}` : simulationDaysOffset}</span>
                        <button 
                            onClick={() => setSimulationDaysOffset(prev => prev + 1)}
                            className="bg-black/40 hover:bg-black/60 w-6 h-6 rounded flex items-center justify-center font-bold"
                        >+</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                placeholder="Payout Address..." 
                                value={payoutTargetAddress}
                                onChange={(e) => setPayoutTargetAddress(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:border-primary text-white"
                            />
                            <button 
                                onClick={handlePayout}
                                disabled={isProcessingTx}
                                className="bg-green-500/20 text-green-500 hover:bg-green-500/30 font-bold border border-green-500/50 rounded px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-50 transition-colors"
                            >
                                {isProcessingTx ? "..." : "Sim Payout"}
                            </button>
                        </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                  <div>Base Pool: <span className="font-mono text-white">{currentPool.toFixed(2)} SOL</span></div>
                  <div>Current Survivors: <span className="text-primary font-bold">{validCount}</span> / {combinedParticipants.length}</div>
                  <div>Prize per Survivor (Extrapolated): <span className="text-accent font-mono font-bold">~{poolPerSurvivor} SOL</span></div>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-y-auto pr-2 flex-1 space-y-3">
                  {combinedParticipants.map((p, i) => (
                    <div 
                      key={p.wallet}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                        p.status === "Eliminated" 
                          ? "bg-red-500/10 border-red-500/20 opacity-50" 
                          : p.status === "Strike 1"
                          ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-mono text-xs overflow-hidden border border-white/5">
                             {p.wallet.slice(0, 4)}
                          </div>
                          <div>
                            <div className="font-mono text-sm font-semibold">{p.wallet.slice(0, 6)}...{p.wallet.slice(-4)}</div>
                            <div className="text-xs text-muted-foreground">Handle: {p.handle}</div>
                          </div>
                       </div>

                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <div className="text-xs text-muted-foreground mb-1">Today's Commits</div>
                             <div className="font-mono">{p.todayVal > 0 ? <span className="text-green-500">+{p.todayVal} Success</span> : <span className="text-red-400 font-bold">0 (Pending)</span>}</div>
                          </div>

                          <div className={`px-4 py-2 rounded-lg flex flex-col items-center justify-center min-w-[120px] font-bold text-sm ${
                             p.status === "Eliminated" 
                             ? "bg-red-500/20 text-red-500" 
                             : p.status === "Strike 1"
                             ? "bg-yellow-500/20 text-yellow-500"
                             : "bg-green-500/20 text-green-500"
                          }`}>
                             {p.status === "Eliminated" && <><X className="w-4 h-4 mb-1"/> 100% Loss</>}
                             {p.status === "Strike 1" && <><ShieldAlert className="w-4 h-4 mb-1"/> 50% Penalty</>}
                             {p.status === "Protected" && <><CheckCircle2 className="w-4 h-4 mb-1"/> Protected</>}

                             {import.meta.env.DEV && (
                               <button 
                                  onClick={(e) => { e.stopPropagation(); toggleStatus(p.wallet, p.status); }}
                                  className="mt-2 text-[10px] bg-black/40 hover:bg-black/80 px-2 py-1 rounded w-full border border-white/5 active:scale-95 transition-all text-white font-mono"
                               >
                                  Cycle Status
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
