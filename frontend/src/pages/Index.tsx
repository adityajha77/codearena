import { motion } from "framer-motion";
import TypingAnimation from "@/components/TypingAnimation";
import ScrollReveal from "@/components/ScrollReveal";
import StreakHeatmap from "@/components/StreakHeatmap";
import AnimatedCounter from "@/components/AnimatedCounter";
import ConnectedPlatforms from "@/components/ConnectedPlatforms";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import mascotImg from "@/assets/mascot.png";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";

const challengeModes = [
  { title: "Self Challenge", desc: "Test your own discipline. Code daily or lose your stake.", icon: "🧘", color: "primary" },
  { title: "Friend Challenge", desc: "Challenge your friends. Compete head-to-head on coding streaks.", icon: "🤝", color: "secondary" },
  { title: "Community Pool", desc: "Join public pools. Last ones standing share the rewards.", icon: "🏟️", color: "accent" },
];

const leaderboardData = [
  { rank: 1, name: "sol_dev.eth", streak: 47, status: "Active", days: 47, platform: "LeetCode" },
  { rank: 2, name: "crypto_coder", streak: 45, status: "Active", days: 45, platform: "GitHub" },
  { rank: 3, name: "buildoor.sol", streak: 42, status: "Active", days: 43, platform: "Codeforces" },
  { rank: 4, name: "web3_ninja", streak: 38, status: "At Risk", days: 40, platform: "LeetCode" },
  { rank: 5, name: "hack_master", streak: 35, status: "Active", days: 36, platform: "HackerRank" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Particles />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                <span className="text-muted-foreground">Powered by Solana</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
                Code .{" "}
                <span className="gradient-text-secondary">Compete.</span>{" "}
                <span className="gradient-text-primary">Earn.</span>
              </h1>
              <div className="text-lg md:text-xl text-muted-foreground min-h-[2em]">
                <TypingAnimation />
              </div>
              <p className="text-muted-foreground max-w-lg">
                CodeArena is a Solana-powered coding challenge platform. Stake SOL, build streaks,
                compete with friends, and earn rewards for staying consistent.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition-all">
                  Connect Wallet
                </button>
                <button onClick={() => navigate("/challenges")} className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold glow-secondary hover:opacity-90 transition-all">
                  Create Challenge
                </button>
                <button onClick={() => navigate("/challenges")} className="px-6 py-3 rounded-xl glass-card text-foreground font-semibold hover:bg-muted/50 transition-all">
                  Join Challenge
                </button>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <AnimatedCounter value={12400} label="Active Coders" />
                <AnimatedCounter value={2800} label="Challenges" />
                <AnimatedCounter value={45000} label="SOL Earned" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative w-full aspect-video md:aspect-auto md:h-[450px]"
            >
              <div className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-[3rem]" />

              {/* Main Dashboard Window */}
              <div className="absolute inset-0 md:inset-y-4 md:right-12 md:left-0 rounded-2xl border border-zinc-800 bg-[#0F0F0F] shadow-2xl flex flex-col overflow-hidden animate-float z-10">
                {/* Window Controls */}
                <div className="h-8 bg-[#1A1A1A] border-b border-zinc-800 flex items-center px-4 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <div className="ml-4 text-[10px] text-zinc-500 font-mono">codolio-dashboard</div>
                </div>

                {/* Dashboard Grid */}
                <div className="p-4 grid grid-cols-12 gap-3 h-full">
                  {/* Left Sidebar */}
                  <div className="col-span-4 flex flex-col gap-3">
                    <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E15A2B] to-[#F1B132] p-0.5 mb-2 relative">
                        <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                          <img src={mascotImg} alt="Avatar" className="w-12 h-12 object-contain" />
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-white">sol_dev</h3>
                      <p className="text-[10px] text-[#E15A2B]">@sol_builder</p>
                      <div className="mt-3 flex gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-800" />
                        <div className="w-6 h-6 rounded bg-zinc-800" />
                      </div>
                    </div>
                    {/* Solana Stats & Crypto Info */}
                    <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-zinc-400">Total Staked</span>
                          <span className="text-xs font-bold text-[#14F195]">12.5 SOL</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-zinc-400">Total Earned</span>
                          <span className="text-xs font-bold text-[#9945FF]">+4.2 SOL</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-zinc-400">Win Rate</span>
                          <span className="text-xs font-bold text-white">84%</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-auto">
                        <span className="px-1.5 py-0.5 rounded bg-[#14F195]/10 text-[#14F195] text-[8px] font-mono border border-[#14F195]/20">CODE</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-mono border border-blue-500/20">CONSISTENT</span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[8px] font-mono border border-orange-500/20">COMPETE</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#9945FF]/10 text-[#9945FF] text-[8px] font-mono border border-[#9945FF]/20">EARN</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Content */}
                  <div className="col-span-8 flex flex-col gap-3">
                    {/* Top Stats */}
                    <div className="flex gap-2 h-16">
                      <div className="flex-1 bg-[#1A1A1A] border border-zinc-800 rounded-xl p-2 flex justify-center items-center flex-col relative overflow-hidden">
                        <p className="text-[9px] text-zinc-400">Problems Solved</p>
                        <p className="text-lg font-bold text-white leading-tight">1010</p>
                      </div>
                      <div className="flex-1 bg-[#1A1A1A] border border-zinc-800 rounded-xl p-2 flex justify-center items-center flex-col relative overflow-hidden">
                        <p className="text-[9px] text-zinc-400">Active Days</p>
                        <p className="text-lg font-bold text-white leading-tight">348</p>
                      </div>
                      <div className="flex-1 bg-[#1A1A1A] border border-zinc-800 rounded-xl p-2 flex justify-center items-center flex-col relative overflow-hidden shadow-[inset_0_0_20px_rgba(20,241,149,0.05)]">
                        <p className="text-[9px] text-zinc-400">Rewards (SOL)</p>
                        <p className="text-lg font-bold font-mono text-[#14F195] leading-tight flex items-center gap-1">
                          14.5
                          <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
                        </p>
                      </div>
                    </div>
                    {/* Heatmap Area */}
                    <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-3 flex-1 flex flex-col relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                        <div className="w-32 h-32 rounded-full bg-[#9945FF] blur-3xl -mr-10 -mt-10" />
                      </div>
                      <div className="flex justify-between items-center mb-1 z-10">
                        <p className="text-[10px] text-zinc-400">152 submissions in past 6 months</p>
                        <div className="flex gap-2">
                          <p className="text-[10px] text-zinc-500">Max Streak: <span className="text-white">72</span></p>
                          <p className="text-[10px] text-zinc-500">Current: <span className="text-[#39D353]">13</span></p>
                        </div>
                      </div>

                      {/* Filler inside big square: Detailed activity list instead of just empty space above heatmap */}
                      <div className="flex gap-2 mb-2 z-10 flex-1">
                        <div className="flex-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50 p-2 flex flex-col justify-center">
                          <p className="text-[9px] text-zinc-500 mb-0.5">Recent Match</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-orange-400">vs cryptogod</span>
                            <span className="text-[10px] text-[#14F195] font-mono">+1.5 SOL</span>
                          </div>
                        </div>
                        <div className="flex-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50 p-2 flex flex-col justify-center">
                          <p className="text-[9px] text-zinc-500 mb-0.5">Active Pool</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-blue-400">30-Day Hard Mode</span>
                            <span className="text-[10px] text-white">45 Players</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-0.5 justify-between mt-auto h-12 items-end overflow-hidden z-10">
                        {Array.from({ length: 26 }).map((_, col) => (
                          <div key={col} className="flex flex-col gap-0.5">
                            {Array.from({ length: 3 }).map((_, row) => {
                              const intensity = Math.random();
                              let colorClass = "bg-zinc-800";
                              if (intensity > 0.8) colorClass = "bg-[#39D353]";
                              else if (intensity > 0.6) colorClass = "bg-[#26A641]";
                              else if (intensity > 0.4) colorClass = "bg-[#006D32]";
                              return <div key={`${col}-${row}`} className={`w-3 h-3 rounded-[2px] ${colorClass}`} />;
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile View Overylay */}
              <motion.div
                initial={{ opacity: 0, y: 50, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 w-[200px] h-[380px] -right-2 bottom-[-20px] rounded-[2rem] border-4 border-zinc-900 bg-[#0F0F0F] overflow-hidden hidden md:flex flex-col"
              >
                <div className="bg-[#1A1A1A] flex-1 m-2 rounded-2xl flex flex-col p-4 relative border border-zinc-800">
                  <div className="w-16 h-1 rounded-full bg-zinc-800 mx-auto mb-4" />

                  <div className="flex flex-col items-center mt-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E15A2B] to-[#F1B132] p-0.5 mb-2">
                      <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                        <img src={mascotImg} alt="Avatar" className="w-10 h-10 object-contain" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white text-center">sol_dev</h3>
                    <p className="text-[10px] text-[#E15A2B] text-center mb-4">@sol_builder</p>

                    <div className="w-full flex gap-1 mb-4">
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 flex flex-col items-center justify-center">
                        <p className="text-[8px] text-zinc-500">Solved</p>
                        <p className="text-xs font-bold text-white">1010</p>
                      </div>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 flex flex-col items-center justify-center">
                        <p className="text-[8px] text-zinc-500">Days</p>
                        <p className="text-xs font-bold text-white">348</p>
                      </div>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 flex flex-col items-center justify-center shadow-[inset_0_0_10px_rgba(153,69,255,0.1)]">
                        <p className="text-[8px] text-zinc-500">Earned</p>
                        <p className="text-xs font-bold font-mono text-[#9945FF]">14.5<span className="text-[8px]">S</span></p>
                      </div>
                    </div>

                    <div className="w-full">
                      <p className="text-[10px] text-zinc-500 text-center mb-2">You can find me on...</p>
                      <div className="flex justify-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded bg-zinc-800 inline-block" />
                        <span className="w-5 h-5 rounded bg-zinc-800 inline-block" />
                        <span className="w-5 h-5 rounded bg-zinc-800 inline-block" />
                        <span className="w-5 h-5 rounded bg-zinc-800 inline-block" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Connected Platforms */}
      <ConnectedPlatforms />

      {/* Challenge Modes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
                Choose Your <span className="gradient-text-primary">Challenge</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Three modes. One goal: stay consistent and earn.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6">
            {challengeModes.map((mode, i) => (
              <ScrollReveal key={mode.title} delay={i * 0.15}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="glass-card rounded-2xl p-6 space-y-4 cursor-pointer hover:border-primary/20 transition-all h-full"
                >
                  <span className="text-4xl">{mode.icon}</span>
                  <h3 className="text-xl font-bold font-display">{mode.title}</h3>
                  <p className="text-muted-foreground text-sm">{mode.desc}</p>
                  <div className="flex gap-2">
                    {["10d", "30d", "100d"].map((d) => (
                      <span key={d} className="px-2 py-1 rounded-md bg-muted/50 text-xs font-mono text-muted-foreground">{d}</span>
                    ))}
                  </div>
                  <button onClick={() => navigate("/challenges")} className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                    Start Challenge →
                  </button>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap & Stats */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
                Track Your <span className="gradient-text-accent">Streak</span>
              </h2>
              <p className="text-muted-foreground">GitHub-style activity tracking across all platforms</p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono text-muted-foreground">contributions in the last 20 weeks</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Less
                  <span className="w-3 h-3 rounded-sm bg-muted/30" />
                  <span className="w-3 h-3 rounded-sm bg-primary/30" />
                  <span className="w-3 h-3 rounded-sm bg-primary/60" />
                  <span className="w-3 h-3 rounded-sm bg-primary/90" />
                  More
                </div>
              </div>
              <StreakHeatmap weeks={20} isRandom />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
                Live <span className="gradient-text-secondary">Leaderboard</span>
              </h2>
              <p className="text-muted-foreground">Survival of the most consistent</p>
            </div>
          </ScrollReveal>
          <div className="glass-card rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">#</th>
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">User</th>
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">🔥 Streak</th>
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">Days</th>
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">Status</th>
                    <th className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((row, i) => (
                    <motion.tr
                      key={row.rank}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-primary font-mono">{row.rank}</td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-accent">{row.streak}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{row.days}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Active" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                          }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.platform}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="glass-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-50" />
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold font-display">
                  Ready to <span className="gradient-text-primary">Code</span> and <span className="gradient-text-accent">Earn</span>?
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Connect your wallet, join a challenge, and start your journey today.
                  One commit at a time.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="wallet-adapter-button-override-lg">
                    <WalletMultiButton />
                  </div>
                  <button onClick={() => navigate("/about")} className="px-8 py-3 rounded-xl glass-card font-semibold hover:bg-muted/50 transition-all">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
