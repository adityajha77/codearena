import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram, getChallengePoolPDA, getParticipantRecordPDA } from "@/lib/anchorClient";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const availableTags = ["DSA", "CP", "Web Dev", "Daily Commit", "Solana Builders", "Beginner"];
const TREASURY_ADDRESS = "6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam";

export default function CreateChallengeDialog({ isOpen, onClose, onSuccess }: Props) {
  const { walletAddress, addChallenge, githubHandle, leetcodeHandle, codeforcesHandle } = useUserStore();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    duration: "30d",
    stake: "0.1",
    mode: "Community",
    platform: "GitHub",
    tags: [] as string[],
    registration_deadline: "" // New field
  });
  
  const [friendsList, setFriendsList] = useState("");
  const [beneficiariesList, setBeneficiariesList] = useState("");
  
  // Date & Time Picker State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedAmPm, setSelectedAmPm] = useState("PM");

  const updateDeadline = (date?: Date, hour?: string, minute?: string, ampm?: string) => {
    const d = date || selectedDate;
    const h = hour || selectedHour;
    const m = minute || selectedMinute;
    const ap = ampm || selectedAmPm;

    if (!d) return;

    const newDeadline = new Date(d);
    let hourNum = parseInt(h);
    if (ap === "PM" && hourNum < 12) hourNum += 12;
    if (ap === "AM" && hourNum === 12) hourNum = 0;
    
    newDeadline.setHours(hourNum);
    newDeadline.setMinutes(parseInt(m));
    
    setFormData(prev => ({ ...prev, registration_deadline: newDeadline.toISOString() }));
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    if (formData.platform === 'GitHub' && !githubHandle) {
        toast.error("You must connect your GitHub profile to create a GitHub challenge!");
        return;
    }
    if (formData.platform === 'LeetCode' && !leetcodeHandle) {
        toast.error("You must connect your LeetCode profile to create a LeetCode challenge!");
        return;
    }
    if (formData.platform === 'Codeforces' && !codeforcesHandle) {
        toast.error("You must connect your Codeforces profile to create a Codeforces challenge!");
        return;
    }

    const friends = formData.mode === 'Friend' ? friendsList.split(',').map(f => f.trim()).filter(Boolean) : [];
    const beneficiaries = formData.mode === 'Self' ? beneficiariesList.split(',').map(b => b.trim()).filter(Boolean) : [];

    if (formData.mode === 'Friend' && friends.length === 0) {
      toast.error("Please add at least one friend's address");
      return;
    }
    if (formData.mode === 'Self' && beneficiaries.length === 0) {
      toast.error("Please specify at least one beneficiary address");
      return;
    }

    if (formData.mode === 'Friend' && friends.includes(walletAddress)) {
      toast.error("You cannot add yourself to the allowed friends list!");
      return;
    }
    if (formData.mode === 'Self' && beneficiaries.includes(walletAddress)) {
      toast.error("You cannot add yourself as a beneficiary address!");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const challengeId = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString() + Math.random().toString().slice(2)).substring(0, 32);
      const stakeLamports = new BN(Math.round(parseFloat(formData.stake) * LAMPORTS_PER_SOL));
      const durationDays = parseInt(formData.duration) || 30;
      const isSolo = formData.mode === 'Self';

      // Use the hardcoded Master Server Wallet as the oracle for automation
      const oraclePubkey = new PublicKey("FoPaApFZEBThUFSn6kPkX8pe1bkxthsz2kUES7js3zoX"); 
      
      let beneficiaryPubkey = publicKey;
      if (isSolo && beneficiaries.length > 0) {
        beneficiaryPubkey = new PublicKey(beneficiaries[0]);
      } else if (formData.mode === 'Friend' && friends.length > 0) {
        beneficiaryPubkey = new PublicKey(friends[0]); // Just pick the first friend for dev
      }

      const walletToUse = anchorWallet || {
        publicKey,
        signTransaction: sendTransaction,
        signAllTransactions: async (txs: any) => txs,
      };
      
      const provider = new AnchorProvider(connection, walletToUse as any, { commitment: "processed" });
      const program = getProgram(provider);

      if (!challengeId) throw new Error("Challenge ID is undefined");
      const challengePoolPDA = getChallengePoolPDA(challengeId);
      const participantRecordPDA = getParticipantRecordPDA(challengePoolPDA, publicKey);

      toast.info("Please approve the staking transactions...");

      // Call initializePool AND joinChallenge in one transaction
      const tx = new Transaction();
      
      const initIx = await program.methods.initializePool(
        challengeId,
        stakeLamports,
        durationDays,
        isSolo
      )
      .accounts({
        challengePool: challengePoolPDA,
        creator: publicKey,
        oracle: oraclePubkey,
        beneficiary: beneficiaryPubkey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

      const joinIx = await program.methods.joinChallenge()
      .accounts({
        challengePool: challengePoolPDA,
        participantRecord: participantRecordPDA,
        user: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

      tx.add(initIx, joinIx);

      // --- DEV VERIFICATION: Simulate to see internal contract logs (Hidden in Production) ---
      if (import.meta.env.DEV) {
        try {
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey;
          const simulation = await connection.simulateTransaction(tx);
          
          console.log("------------------------------------------");
          console.log("🔍 [DEV-ONLY] ON-CHAIN SIMULATION VERIFICATION");
          if (simulation.value.err) {
            console.error("❌ CONTRACT ERROR:", simulation.value.err);
            console.log("📜 LOGS:", simulation.value.logs);
          } else {
            console.log("✅ CONTRACT SUCCESS");
            console.log("📜 LOGS:", simulation.value.logs?.join('\n'));
          }
          console.log("------------------------------------------");
        } catch (e) {
          console.warn("Simulation check skipped:", e);
        }
      }

      const signature = await sendTransaction(tx, connection);


      toast.info("Waiting for network confirmation...");
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error("Transaction failed on-chain: " + JSON.stringify(confirmation.value.err));
      }

      // 2. Insert challenge to Supabase
      const { data: challengeData, error: challengeError } = await supabase.from('challenges').insert([{
        id: challengeId,
        title: formData.title,
        duration: formData.duration,
        stake: parseFloat(formData.stake),
        tags: formData.tags.length > 0 ? formData.tags : ["Beginner"],
        mode: formData.mode,
        creator_wallet: walletAddress,
        status: "Live",
        allowed_friends: friends,
        beneficiaries: beneficiaries,
        platform: formData.platform,
        registration_deadline: formData.registration_deadline || null
      }]).select().single();

      if (challengeError) throw challengeError;
      
      // 3. Automatically join the creator to the participants
      const { error: partErr } = await supabase.from('challenge_participants').insert([{
        challenge_id: challengeData.id,
        wallet_address: walletAddress,
        current_streak: 0,
        total_days_solved: 0,
        joined_at: new Date().toISOString()
      }]);
      if (partErr) console.error("Could not add participant record:", partErr);

      // 3.5 Save transaction to history
      const { error: txError } = await supabase.from('transactions').insert([{
        wallet_address: walletAddress,
        type: 'Deposit',
        amount: parseFloat(formData.stake),
        tx_hash: signature,
        challenge_id: challengeData.id
      }]);
      
      if (txError) {
         console.error("Failed to record transaction history", txError);
      }

      // Updates user store tracking
      addChallenge({
        id: challengeData.id,
        title: formData.title,
        days: parseInt(formData.duration),
        stakeAmount: parseFloat(formData.stake),
        isActive: true,
        startDate: new Date(),
        platform: formData.platform as any,
        registrationDeadline: formData.registration_deadline
      });

      // 4. Send Notifications based on mode
      // 4. Send Notifications ONLY for Friend mode
      if (formData.mode === 'Friend' && friends.length > 0) {
         const notifications = friends.map((friendWallet: string) => ({
           recipient_wallet: friendWallet,
           type: "friend_invite",
           message: `You've been invited by ${walletAddress.substring(0,4)}... to join "${formData.title}"!`,
           challenge_id: challengeData.id,
         }));
         
         await supabase.from('notifications').insert(notifications);
      }

      toast.success("Challenge created successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Tx error:", error);
      toast.error("Transaction failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Challenge</DialogTitle>
          <DialogDescription>
            Stake your SOL up front. Failure to keep the streak forfeits the stake!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Challenge Title</Label>
            <Input 
              id="title" 
              placeholder="e.g. 100 Days of Web3" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input 
                id="duration" 
                placeholder="e.g. 30d" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stake">Entry Stake (SOL)</Label>
              <Input 
                id="stake" 
                type="number" 
                step="0.01" 
                placeholder="0.1" 
                value={formData.stake}
                onChange={(e) => setFormData({...formData, stake: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mode">Challenge Mode</Label>
              <select 
                id="mode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.mode}
                onChange={(e) => setFormData({...formData, mode: e.target.value})}
              >
                <option value="Community">Community (Open Pool)</option>
                <option value="Friend">Friends Only</option>
                <option value="Self">Private / Self</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Target Platform</Label>
              <select 
                id="platform"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
              >
                <option value="GitHub">GitHub</option>
                <option value="LeetCode">LeetCode</option>
                <option value="Codeforces">Codeforces</option>
              </select>
            </div>
          </div>

          {formData.mode !== 'Community' && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Start Immediately</Label>
                <p className="text-[10px] text-muted-foreground">Skip the registration window and start now</p>
              </div>
              <input 
                type="checkbox" 
                checked={!formData.registration_deadline} 
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, registration_deadline: "" }));
                    setSelectedDate(undefined);
                  } else {
                    // Set a default deadline (1h from now)
                    const d = new Date();
                    d.setHours(d.getHours() + 1);
                    setFormData(prev => ({ ...prev, registration_deadline: d.toISOString() }));
                  }
                }}
                className="w-5 h-5 accent-primary"
              />
            </div>
          )}

          {(formData.mode === 'Community' || formData.registration_deadline) && (
            <div className="space-y-3 p-4 bg-secondary/5 border border-secondary/20 rounded-xl">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> {formData.mode === 'Community' ? 'Registration Deadline' : 'Scheduled Start'} (IST)
              </Label>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {formData.mode === 'Community' 
                  ? "People cannot join after this time." 
                  : "The challenge will remain 'Pending' until this time."}
              </p>
              
              <div className="flex flex-col gap-3">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-white/10",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        updateDeadline(date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Time Pickers */}
                <div className="flex gap-2">
                  <Select value={selectedHour} onValueChange={(v) => { setSelectedHour(v); updateDeadline(undefined, v); }}>
                    <SelectTrigger className="w-full bg-background/50 border-white/10">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <SelectItem key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedMinute} onValueChange={(v) => { setSelectedMinute(v); updateDeadline(undefined, undefined, v); }}>
                    <SelectTrigger className="w-full bg-background/50 border-white/10">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {["00", "15", "30", "45"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedAmPm} onValueChange={(v) => { setSelectedAmPm(v); updateDeadline(undefined, undefined, undefined, v); }}>
                    <SelectTrigger className="w-64 bg-background/50 border-white/10">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {formData.mode === 'Friend' && (
            <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
              <Label htmlFor="friends">Allowed Friend Addresses</Label>
              <p className="text-xs text-muted-foreground mb-2">Comma separated Solana wallet addresses of friends allowed to view and join this challenge.</p>
              <Input 
                id="friends" 
                placeholder="wallet1, wallet2..." 
                value={friendsList}
                onChange={(e) => setFriendsList(e.target.value)}
              />
            </div>
          )}

          {formData.mode === 'Self' && (
            <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
              <Label htmlFor="beneficiaries">Beneficiary Addresses</Label>
              <p className="text-xs text-muted-foreground mb-2">Who receives your staked SOL if you fail the challenge? (Comma separated addresses)</p>
              <Input 
                id="beneficiaries" 
                placeholder="destination1, destination2..." 
                value={beneficiariesList}
                onChange={(e) => setBeneficiariesList(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    formData.tags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : `Stake ${formData.stake || 0} SOL & Create`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
