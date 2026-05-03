import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';

export function WalletSync() {
  const { publicKey } = useWallet();
  const { 
    setWalletAddress, 
    setGithubHandle, 
    setLeetcodeHandle, 
    setCodeforcesHandle, 
    setTwitterHandle 
  } = useUserStore();

  useEffect(() => {
    if (publicKey) {
      const address = publicKey.toBase58();
      setWalletAddress(address);
      
      // Fetch handles from Supabase DB to ensure lifetime connectivity
      supabase.from('user_profiles').select('*').eq('wallet_address', address).single()
        .then(({data}) => {
           if (data) {
              if (data.github) setGithubHandle(data.github);
              if (data.leetcode) setLeetcodeHandle(data.leetcode);
              if (data.codeforces) setCodeforcesHandle(data.codeforces);
              if (data.twitter) setTwitterHandle(data.twitter);
           }
        });
    } else {
      setWalletAddress(null);
    }
  }, [publicKey, setWalletAddress, setGithubHandle, setLeetcodeHandle, setCodeforcesHandle, setTwitterHandle]);

  return null;
}
