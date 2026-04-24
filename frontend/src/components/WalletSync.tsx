import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserStore } from '@/store/userStore';

export function WalletSync() {
  const { publicKey } = useWallet();
  const setWalletAddress = useUserStore((state) => state.setWalletAddress);

  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      setWalletAddress(null);
    }
  }, [publicKey, setWalletAddress]);

  return null;
}
