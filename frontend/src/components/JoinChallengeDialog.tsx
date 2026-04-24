import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destinationAddress: string) => void;
  challengeTitle: string;
}

export default function JoinChallengeDialog({ isOpen, onClose, onConfirm, challengeTitle }: Props) {
  const [address, setAddress] = useState("");

  const handleConfirm = () => {
    if (!address.trim()) {
      toast.error("Please enter a destination address");
      return;
    }
    
    try {
      // Validate the public key
      new PublicKey(address);
    } catch (e) {
      toast.error("Invalid Solana wallet address");
      return;
    }

    onConfirm(address.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Challenge</DialogTitle>
          <DialogDescription>
            You are joining: <b>{challengeTitle}</b>.
            Please enter the Solana address you wish to send your staked SOL to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="address">Destination Wallet Address</Label>
            <Input 
              id="address" 
              placeholder="e.g. 6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm}>
              Confirm Destination
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
