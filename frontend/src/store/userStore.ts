import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SolChallenge {
  id: string;
  title: string;
  days: number;
  stakeAmount: number;
  isActive: boolean;
  startDate: Date;
  platform: 'GitHub' | 'LeetCode' | 'Codeforces';
  lastSolvedDate?: string;
  userWallet?: string;
}

interface UserState {
  walletAddress: string | null;
  githubHandle: string | null;
  leetcodeHandle: string | null;
  codeforcesHandle: string | null;
  
  activeChallenges: SolChallenge[];
  totalStake: number;
  streakDays: number;
  dailyActivity: Record<string, number>;
  
  setWalletAddress: (address: string | null) => void;
  setGithubHandle: (handle: string | null) => void;
  setLeetcodeHandle: (handle: string | null) => void;
  setCodeforcesHandle: (handle: string | null) => void;
  
  addChallenge: (challenge: SolChallenge) => void;
  markChallengeSolvedToday: (challengeId: string, dateStr: string) => void;
  clearUserData: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      walletAddress: null,
      githubHandle: null,
      leetcodeHandle: null,
      codeforcesHandle: null,
      activeChallenges: [],
      totalStake: 0,
      streakDays: 0,
      dailyActivity: {},

      clearUserData: () => set({
        githubHandle: null,
        leetcodeHandle: null,
        codeforcesHandle: null,
        activeChallenges: [],
        totalStake: 0,
        streakDays: 0,
        dailyActivity: {},
      }),

      setWalletAddress: (address) => set((state) => {
        // If the address is actually changing (including to null)
        if (address !== state.walletAddress) {
           return { 
             walletAddress: address,
             githubHandle: null,
             leetcodeHandle: null,
             codeforcesHandle: null,
             dailyActivity: {}
           };
        }
        return { walletAddress: address };
      }),
      setGithubHandle: (handle) => set({ githubHandle: handle }),
      setLeetcodeHandle: (handle) => set({ leetcodeHandle: handle }),
      setCodeforcesHandle: (handle) => set({ codeforcesHandle: handle }),
      
      addChallenge: (challenge) => set((state) => ({ 
        activeChallenges: [...state.activeChallenges, { ...challenge, userWallet: state.walletAddress || "unknown" }],
        totalStake: state.totalStake + challenge.stakeAmount
      })),
      
      markChallengeSolvedToday: (challengeId, dateStr) => set((state) => {
        const updatedChallenges = state.activeChallenges.map(c => 
          c.id === challengeId ? { ...c, lastSolvedDate: dateStr } : c
        );
        
        const updatedActivity = { ...state.dailyActivity };
        updatedActivity[dateStr] = (updatedActivity[dateStr] || 0) + 1;
        
        return {
          activeChallenges: updatedChallenges,
          dailyActivity: updatedActivity
        };
      }),
    }),
    {
      name: 'user-storage',
    }
  )
);
