import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    duration: "30d",
    stake: "0.1",
    mode: "Community",
    platform: "GitHub",
    tags: [] as string[]
  });
  
  const [friendsList, setFriendsList] = useState("");
  const [beneficiariesList, setBeneficiariesList] = useState("");

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
      // 1. Transaction to Treasury for Staking
      const destPubkey = new PublicKey(TREASURY_ADDRESS);
      const stakeLamports = Math.round(parseFloat(formData.stake) * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: destPubkey,
            lamports: stakeLamports,
        })
      );
      
      toast.info("Please approve the staking transfer in your wallet...");
      const signature = await sendTransaction(transaction, connection);
      toast.info("Waiting for network confirmation...");
      await connection.confirmTransaction(signature, 'processed');

      // 2. Insert challenge to Supabase
      const { data: challengeData, error: challengeError } = await supabase.from('challenges').insert([{
        title: formData.title,
        duration: formData.duration,
        stake: parseFloat(formData.stake),
        tags: formData.tags.length > 0 ? formData.tags : ["Beginner"],
        mode: formData.mode,
        creator_wallet: walletAddress,
        status: "Live",
        allowed_friends: friends,
        beneficiaries: beneficiaries,
        platform: formData.platform
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
        platform: formData.platform as any
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
      toast.error("Error formatting transaction (Check addresses): " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
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
