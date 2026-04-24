import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import StreakHeatmap from "@/components/StreakHeatmap";
import AnimatedCounter from "@/components/AnimatedCounter";
import { motion } from "framer-motion";
import mascotImg from "@/assets/mascot.png";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { verifyGitHub, verifyLeetCode, verifyCodeforces, PlatformStats } from "@/lib/api/platforms";

const motivationalMessages = [
  "Welcome back, builder.",
  "Your streak is your power.",
  "One day at a time, one commit at a time.",
  "Stay consistent. Stay on the board.",
];

const defaultPlatforms: PlatformStats[] = [
  { platform: "GitHub", handle: "", connected: false, valid: false, stats: "—" },
  { platform: "LeetCode", handle: "", connected: false, valid: false, stats: "—" },
  { platform: "Codeforces", handle: "", connected: false, valid: false, stats: "—" },
];

const badges = ["🔥 10-Day Streak", "💎 100 Problems", "🏆 Challenge Winner", "⭐ First Challenge", "🎯 Perfect Week", "🌟 Top 10"];

const Profile = () => {
  const { 
    walletAddress, githubHandle, leetcodeHandle, codeforcesHandle, 
    activeChallenges, totalStake,
    setGithubHandle, setLeetcodeHandle, setCodeforcesHandle, 
    dailyActivity 
  } = useUserStore();
  
  const [platformData, setPlatformData] = useState<PlatformStats[]>(defaultPlatforms);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Sync handles from database on load
  useEffect(() => {
    if (walletAddress) {
      supabase.from('user_profiles').select('*').eq('wallet_address', walletAddress).single()
      .then(({data, error}) => {
         if (data) {
            if (data.github) setGithubHandle(data.github);
            if (data.leetcode) setLeetcodeHandle(data.leetcode);
            if (data.codeforces) setCodeforcesHandle(data.codeforces);
         }
      });
    }

    // Check for OAuth callbacks
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'github') {
        toast.success("GitHub account successfully linked!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'github_claimed') {
        toast.error("This GitHub account is already linked to another wallet!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'github_auth_failed') {
        toast.error("GitHub authorization failed.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [walletAddress]);

  useEffect(() => {
    const loadStats = async () => {
      const promises = [
        githubHandle ? verifyGitHub(githubHandle) : Promise.resolve({ ...defaultPlatforms[0] }),
        leetcodeHandle ? verifyLeetCode(leetcodeHandle) : Promise.resolve({ ...defaultPlatforms[1] }),
        codeforcesHandle ? verifyCodeforces(codeforcesHandle) : Promise.resolve({ ...defaultPlatforms[2] })
      ];
      
      const results = await Promise.all(promises);
      setPlatformData(results);
    };
    loadStats();
  }, [githubHandle, leetcodeHandle, codeforcesHandle]);

  const handleConnect = async (platformName: string) => {
    if (!walletAddress) {
        toast.error("Please connect your wallet first!");
        return;
    }

    if (platformName === 'GitHub') {
        window.location.href = `http://localhost:3000/api/auth/github?wallet=${walletAddress}`;
        return;
    }

    const handle = prompt(`Enter your ${platformName} username:`);
    if (!handle) return;
    setIsConnecting(platformName);
    
    let result;
    switch (platformName) {
      case 'LeetCode': result = await verifyLeetCode(handle); break;
      case 'Codeforces': result = await verifyCodeforces(handle); break;
    }
    
    setIsConnecting(null);
    
    if (result && result.valid) {
      const dbColMap: Record<string, string> = {
        'LeetCode': 'leetcode',
        'Codeforces': 'codeforces'
      };
      
      const colName = dbColMap[platformName];
      
      // Save it to database to lock uniqueness
      const { error: upsertError } = await supabase.from('user_profiles').upsert({
         wallet_address: walletAddress,
         [colName]: handle
      }, { onConflict: 'wallet_address' });
      
      if (upsertError) {
         if (upsertError.code === '23505') {
            toast.error(`This ${platformName} handle is already claimed by another wallet!`);
         } else {
            toast.error("Database error connecting handle.");
         }
         return;
      }

      switch (platformName) {
        case 'LeetCode': setLeetcodeHandle(handle); break;
        case 'Codeforces': setCodeforcesHandle(handle); break;
      }
      toast.success(`${platformName} successfully secured!`);
    } else {
      alert(`Failed to verify ${platformName} account dynamically.`);
    }
  };

  const handleDisconnect = async (platformName: string) => {
    const dbColMap: Record<string, string> = {
      'GitHub': 'github',
      'LeetCode': 'leetcode',
      'Codeforces': 'codeforces'
    };
    const colName = dbColMap[platformName];

    await supabase.from('user_profiles').update({
       [colName]: null
    }).eq('wallet_address', walletAddress);

    switch (platformName) {
      case 'GitHub': setGithubHandle(null); break;
      case 'LeetCode': setLeetcodeHandle(null); break;
      case 'Codeforces': setCodeforcesHandle(null); break;
    }
  };

  const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const displayAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected";

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 mb-8">
              <motion.img src={mascotImg} alt="Avatar" className="w-24 h-24 rounded-2xl" whileHover={{ rotate: 5 }} />
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-bold font-display">{githubHandle || "Anonymous Builder"}</h1>
                <p className="text-sm text-muted-foreground font-mono mt-1">{displayAddress}</p>
                <p className="text-sm text-primary mt-2 italic">"{msg}"</p>
              </div>
              <div className="flex items-center gap-2">
                {walletAddress ? (
                  <>
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">Wallet Connected</span>
                    <span className="px-3 py-1 rounded-full bg-cyan/20 text-cyan text-sm font-medium">Active</span>
                  </>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-sm font-medium">Please Connect Wallet</span>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <AnimatedCounter value={485} label="Problems Solved" />
              <AnimatedCounter value={127} label="Active Days" />
              <AnimatedCounter value={activeChallenges.length} label="Challenges Joined" />
              <AnimatedCounter value={8} label="Challenges Won" />
              <AnimatedCounter value={totalStake} label="SOL Staked" duration={1.5} />
            </div>
          </ScrollReveal>

          {/* Heatmap */}
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 mb-8 overflow-x-auto">
              <h2 className="text-lg font-bold font-display mb-4">Streak Calendar</h2>
              <StreakHeatmap weeks={52} activityMap={dailyActivity} />
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Connected Platforms */}
            <ScrollReveal>
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold font-display mb-4">Connected Platforms</h2>
                <div className="space-y-3">
                  {platformData.map(p => (
                    <div key={p.platform} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                      <div>
                        <span className="font-medium text-sm">{p.platform}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.connected ? p.handle : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{isConnecting === p.platform ? "Verifying..." : p.stats}</span>
                        {p.connected ? (
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full bg-primary mx-2`} title="Connected" />
                            <button 
                              onClick={() => handleDisconnect(p.platform)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleConnect(p.platform)}
                            disabled={isConnecting === p.platform}
                            className="bg-primary/10 hover:bg-primary/20 text-primary text-xs px-2 py-1 rounded transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-border/20">
                  <h3 className="text-sm font-bold font-display mb-2 uppercase tracking-tight text-muted-foreground">Notification Settings</h3>
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Telegram Reminders</p>
                        <p className="text-xs text-muted-foreground">Get notified 3h, 2h, and 1h before deadlines.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const BOT_USERNAME = "Code_arenaBot"; // Real bot username
                        window.open(`https://t.me/${BOT_USERNAME}?start=${walletAddress}`, '_blank');
                      }}
                      className="bg-[#0088cc] hover:bg-[#0088cc]/90 text-white text-xs px-3 py-2 rounded-lg font-bold transition-all"
                    >
                      Connect Bot
                    </button>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Badges */}
            <ScrollReveal delay={0.1}>
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold font-display mb-4">Badges & Achievements</h2>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map(b => (
                    <motion.div key={b} whileHover={{ scale: 1.05 }}
                      className="bg-muted/30 rounded-xl p-3 text-sm text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      {b}
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Profile;
