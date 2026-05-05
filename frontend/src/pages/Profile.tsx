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
import { verifyGitHub, verifyLeetCode, verifyCodeforces, PlatformStats, fetchAggregatedActivity } from "@/lib/api/platforms";

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
  { platform: "Twitter", handle: "", connected: false, valid: false, stats: "Connect to share" },
];

const badges = ["🔥 10-Day Streak", "💎 100 Problems", "🏆 Challenge Winner", "⭐ First Challenge", "🎯 Perfect Week", "🌟 Top 10"];

const Profile = () => {
  const { 
    walletAddress, githubHandle, leetcodeHandle, codeforcesHandle, twitterHandle,
    setGithubHandle, setLeetcodeHandle, setCodeforcesHandle, setTwitterHandle,
    dailyActivity 
  } = useUserStore();
  
  const [displayName, setDisplayName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [platformData, setPlatformData] = useState<PlatformStats[]>(defaultPlatforms);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [totalSolved, setTotalSolved] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [liveTotalStake, setLiveTotalStake] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [totalStrikes, setTotalStrikes] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<any[]>([]);

  const [platformActivity, setPlatformActivity] = useState<Record<string, number>>({});

  // Consolidated data fetcher
  useEffect(() => {
    if (!walletAddress) return;

    // 1. Fetch User Profile
    supabase.from('user_profiles').select('*').eq('wallet_address', walletAddress).single()
      .then(({data}) => {
         if (data) {
            setDisplayName(data.display_name || "");
            setIsNameLocked(data.name_updated || false);
            if (data.github) setGithubHandle(data.github);
            if (data.leetcode) setLeetcodeHandle(data.leetcode);
            if (data.codeforces) setCodeforcesHandle(data.codeforces);
            if (data.twitter) setTwitterHandle(data.twitter);

            // Fetch true historical heatmap data from connected platforms
            fetchAggregatedActivity(data.github || null, data.leetcode || null, data.codeforces || null)
              .then(activityMap => {
                setPlatformActivity(activityMap);
              });
         }
      });
    
    // 2. Fetch & Calculate Stats
    const fetchStats = async () => {
      const { data, error } = await supabase.from('challenge_participants')
        .select(`
          current_streak, 
          total_days_solved,
          strike_count,
          status,
          is_claimed,
          challenges!fk_challenge (id, title, duration, stake, platform)
        `)
        .ilike('wallet_address', walletAddress);

      if (error) {
        console.error("Stats Fetch Error:", error);
        return;
      }
      
      if (data && data.length > 0) {
        const streak = Math.max(...data.map(p => p.current_streak || 0));
        const solved = data.reduce((acc, p) => acc + (p.total_days_solved || 0), 0);
        const strikes = data.reduce((acc, p) => acc + (p.strike_count || 0), 0);
        
        const stake = data.reduce((acc, p) => {
          const challengeStake = (p.challenges as any)?.stake || 0;
          return acc + Number(challengeStake);
        }, 0);
        
        const wins = data.filter(p => {
          const challenges = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
          const duration = challenges?.duration || 0;
          return p.total_days_solved >= duration && duration > 0;
        });

        const saved = data.reduce((acc, p) => {
          const challenges = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
          const duration = challenges?.duration || 0;
          const isFinished = (p.total_days_solved || 0) >= duration && duration > 0;
          if (isFinished || p.is_claimed) {
            return acc + Number(challenges?.stake || 0);
          }
          return acc;
        }, 0);

        setMaxStreak(streak);
        setTotalSolved(solved);
        setTotalWins(wins.length);
        setLiveTotalStake(stake);
        setTotalSaved(saved);
        setJoinedCount(data.length);
        setTotalStrikes(strikes);
        setCompletedChallenges(wins.map(w => Array.isArray(w.challenges) ? w.challenges[0] : w.challenges));
      } else {
        setJoinedCount(0);
        setLiveTotalStake(0);
        setTotalSaved(0);
        setTotalSolved(0);
        setMaxStreak(0);
        setTotalWins(0);
        setTotalStrikes(0);
        setCompletedChallenges([]);
      }
    };

    fetchStats();

    // 3. Real-time Subscription
    const channel = supabase
      .channel(`profile_stats_${walletAddress}`)
      .on('postgres_changes' as any, { 
        event: '*', 
        table: 'challenge_participants', 
        filter: `wallet_address=eq.${walletAddress}` 
      }, () => {
        fetchStats();
      })
      .subscribe();

    // 4. Check for OAuth callbacks
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'github') {
        toast.success("GitHub account successfully linked!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'github_claimed') {
        toast.error("This GitHub account is already linked to another wallet!");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress, setGithubHandle, setLeetcodeHandle, setCodeforcesHandle, setTwitterHandle]);

  // Handle Platform Loading
  useEffect(() => {
    const loadPlatformStats = async () => {
      const promises = [
        githubHandle ? verifyGitHub(githubHandle) : Promise.resolve({ ...defaultPlatforms[0] }),
        leetcodeHandle ? verifyLeetCode(leetcodeHandle) : Promise.resolve({ ...defaultPlatforms[1] }),
        codeforcesHandle ? verifyCodeforces(codeforcesHandle) : Promise.resolve({ ...defaultPlatforms[2] }),
        twitterHandle ? Promise.resolve({ platform: "Twitter", handle: twitterHandle, connected: true, valid: true, stats: "Ready to share" }) : Promise.resolve({ ...defaultPlatforms[3] })
      ];
      
      const results = await Promise.all(promises);
      setPlatformData(results);
    };
    loadPlatformStats();
  }, [githubHandle, leetcodeHandle, codeforcesHandle, twitterHandle]);

  const handleConnect = async (platformName: string) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (platformName === 'GitHub') {
      window.location.href = `${import.meta.env.VITE_BACKEND_URL}/api/auth/github?wallet=${walletAddress}`;
      return;
    }

    const handle = prompt(`Enter your ${platformName} username:`);
    if (!handle) return;

    setIsConnecting(platformName);
    let result;
    if (platformName === 'LeetCode') result = await verifyLeetCode(handle);
    else if (platformName === 'Codeforces') result = await verifyCodeforces(handle);
    else if (platformName === 'Twitter') result = { connected: true, valid: true };

    setIsConnecting(null);

    if (result?.valid) {
      const dbColMap: Record<string, string> = {
        'LeetCode': 'leetcode',
        'Codeforces': 'codeforces',
        'Twitter': 'twitter'
      };
      const colName = dbColMap[platformName];

      const { error } = await supabase.from('user_profiles').update({
         [colName]: handle
      }).eq('wallet_address', walletAddress);

      if (error) {
          toast.error("Failed to save handle to profile.");
          return;
      }

      switch (platformName) {
        case 'LeetCode': setLeetcodeHandle(handle); break;
        case 'Codeforces': setCodeforcesHandle(handle); break;
        case 'Twitter': setTwitterHandle(handle); break;
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
      'Codeforces': 'codeforces',
      'Twitter': 'twitter'
    };
    const colName = dbColMap[platformName];

    await supabase.from('user_profiles').update({
       [colName]: null
    }).eq('wallet_address', walletAddress);

    switch (platformName) {
      case 'GitHub': setGithubHandle(null); break;
      case 'LeetCode': setLeetcodeHandle(null); break;
      case 'Codeforces': setCodeforcesHandle(null); break;
      case 'Twitter': setTwitterHandle(null); break;
    }
  };

  const updateDisplayName = async () => {
    if (!walletAddress || isNameLocked) return;
    if (!displayName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsUpdatingName(true);
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ 
        wallet_address: walletAddress,
        display_name: displayName,
        name_updated: true 
      });
    
    if (error) {
      if (error.code === '23505') {
        toast.error("This name is already taken. Please choose a unique one!");
      } else {
        toast.error("Failed to update name: " + error.message);
      }
    } else {
      toast.success("Username locked and saved!");
      setIsNameLocked(true);
    }
    setIsUpdatingName(false);
  };
  
  const shareToTwitter = () => {
    const solvedCount = totalSolved || 0;
    const streak = maxStreak || 0;
    const websiteUrl = "https://codearena-iota.vercel.app/"; 
    const text = `Just hit a major milestone on CodeArena! 🔥\n\n🎯 Problems Solved: ${solvedCount}\n⚡ Best Streak: ${streak} Days\n\nJoin me and stake your SOL to stay consistent! 🚀\n\nLink: ${websiteUrl}\n\n#codearena #solana #web3 #coding #100DaysOfCode @codearena`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareWinToTwitter = (challengeTitle: string, platform: string, duration: number) => {
    const websiteUrl = "https://codearena-iota.vercel.app/"; 
    const text = `I just SURVIVED the "${challengeTitle}" challenge on CodeArena! 🏆\n\n✅ ${duration} Days of consistent ${platform} activity.\n💰 My stake is safe and my glory is eternal!\n\nJoin the arena and test your discipline: ${websiteUrl}\n\n#codearena #solana #100DaysOfCode #web3 @codearena`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const displayAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected";

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 mb-8">
              <motion.img src={mascotImg} alt="Avatar" className="w-24 h-24 rounded-2xl" whileHover={{ rotate: 5 }} />
              <div className="text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {isNameLocked ? (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold font-display text-foreground">{displayName || "Anonymous Builder"}</h1>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-tighter border border-primary/20">
                        Identity Locked
                      </span>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Choose Username..."
                        className="text-2xl font-bold bg-transparent border-b border-dashed border-white/20 focus:border-primary focus:outline-none"
                      />
                      <button 
                        onClick={updateDisplayName} 
                        disabled={isUpdatingName}
                        className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-all"
                      >
                        {isUpdatingName ? "Saving..." : "Lock & Save"}
                      </button>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-mono mt-1">{displayAddress}</p>
                <p className="text-sm text-primary mt-2 italic">"{msg}"</p>
              </div>
              <div className="flex flex-col items-center gap-3">
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
                <button 
                  onClick={shareToTwitter}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/30 transition-all font-bold text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg>
                  Share My Streak
                </button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <AnimatedCounter value={totalSolved} label="Problems Solved" />
              <AnimatedCounter value={maxStreak} label="Best Streak" />
              <AnimatedCounter value={joinedCount} label="Challenges Joined" />
              <AnimatedCounter value={totalWins} label="Challenges Won" />
              <AnimatedCounter value={totalSaved} label="Total SOL Saved" duration={2} />
              <AnimatedCounter value={liveTotalStake} label="Live Stake" duration={1.5} />
              <div className={`p-4 rounded-2xl border transition-all ${totalStrikes > 0 ? "bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "glass-card border-white/5"}`}>
                 <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Active Strikes</div>
                 <div className={`text-2xl font-bold font-display ${totalStrikes > 0 ? "text-orange-500" : "text-foreground"}`}>
                    {totalStrikes}
                 </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 mb-8 overflow-x-auto">
              <h2 className="text-lg font-bold font-display mb-4">Streak Calendar</h2>
              <StreakHeatmap weeks={52} activityMap={{ ...platformActivity, ...dailyActivity }} />
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold font-display">The Hall of Glory</h2>
                  <p className="text-xs text-muted-foreground mt-1 text-primary italic">"Victory belongs to the most persevering."</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-widest">
                  {completedChallenges.length} Victories
                </div>
              </div>

              {completedChallenges.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                  <div className="text-4xl mb-3 opacity-20">🛡️</div>
                  <p className="text-sm text-muted-foreground">No completed challenges yet. Time to stake and prove your worth!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedChallenges.map((c, idx) => (
                    <motion.div 
                      key={c.id || idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono text-yellow-500/70">{c.platform}</span>
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">WINNER</span>
                        </div>
                        <h3 className="font-bold text-sm mb-1 line-clamp-1">{c.title}</h3>
                        <p className="text-[10px] text-muted-foreground mb-4">{c.duration} Day Discipline</p>
                      </div>
                      <button 
                        onClick={() => shareWinToTwitter(c.title, c.platform, c.duration)}
                        className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg>
                        Brag on Twitter
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
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
                        const BOT_USERNAME = "Code_arenaBot";
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
