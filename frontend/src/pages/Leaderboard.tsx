import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const filters = ["All", "7d", "30d", "100d"];

const statusColor = (streak: number, lastSolvedDate: string | null) => {
  if (streak > 0 && lastSolvedDate === new Date().toISOString().split('T')[0]) return "bg-primary/20 text-primary"; // Completed Today
  if (streak > 0) return "bg-cyan/20 text-cyan"; // Active
  if (streak === 0) return "bg-destructive/20 text-destructive"; // Eliminated
  return "bg-muted/20 text-muted-foreground";
};

const Leaderboard = () => {
  const [filter, setFilter] = useState("All");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [allChallenges, setAllChallenges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all community challenges for the dropdown
      const { data: challengesData } = await supabase
        .from('challenges')
        .select('id, title')
        .eq('mode', 'Community');
      setAllChallenges(challengesData || []);

      // 2. Fetch participations
      let query = supabase
        .from('challenge_participants')
        .select(`
          current_streak,
          total_days_solved,
          last_solved_at,
          last_solved_date,
          wallet_address,
          user_profiles!fk_user_profile (
            display_name,
            github
          ),
          challenges!fk_challenge (
            id,
            title,
            platform,
            duration,
            stake
          )
        `);

      // Filter by specific challenge if selected
      if (selectedChallenge !== "all") {
        query = query.eq('challenge_id', selectedChallenge);
      }

      const { data, error } = await query
        .order('current_streak', { ascending: false })
        .order('total_days_solved', { ascending: false })
        .order('last_solved_at', { ascending: true });

      if (error) {
        console.error("Leaderboard Query Error:", error);
        throw error;
      }
      
      setRows(data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('leaderboard_changes')
      .on('postgres_changes', { event: '*', table: 'challenge_participants' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChallenge]);

  const filteredRows = rows.filter(r => {
    // Duration filter
    if (filter !== "All" && r.challenges.duration !== filter) return false;
    
    // Search filter
    if (searchTerm) {
      const name = (r.user_profiles?.display_name || r.user_profiles?.github || "Anonymous").toLowerCase();
      const wallet = r.wallet_address.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || wallet.includes(term);
    }
    
    return true;
  });

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
                🏆 <span className="gradient-text-secondary">Community Ranking</span>
              </h1>
              <p className="text-muted-foreground italic">Track your progress and beat the clock.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 mb-8">
              {/* Challenge Selector */}
              <div className="flex-1">
                <select 
                  value={selectedChallenge}
                  onChange={(e) => setSelectedChallenge(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                >
                  <option value="all" className="bg-black text-white">All Community Challenges</option>
                  {allChallenges.map(c => (
                    <option key={c.id} value={c.id} className="bg-black text-white">{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="flex-[2] relative">
                <input 
                  type="text"
                  placeholder="Search by Name or Wallet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 rounded-xl py-3 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex justify-center gap-2 mb-8">
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === f ? "bg-secondary text-secondary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}>{f}</button>
              ))}
            </div>
          </ScrollReveal>

          <div className="glass-card rounded-2xl overflow-hidden max-w-5xl mx-auto">
            {isLoading ? (
              <div className="p-20 text-center text-muted-foreground font-mono">Loading dynamic rankings...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Rank", "User", "🔥 Streak", "Total Days", "Challenge", "Platform"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => (
                      <motion.tr key={r.wallet_address + (r.challenges?.id || i)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`border-b border-border/20 hover:bg-muted/10 transition-colors ${r.current_streak === 0 ? "opacity-40" : ""}`}
                      >
                        <td className="px-4 py-4 font-bold font-mono">
                          <span className={i < 3 ? "text-primary text-lg" : "text-muted-foreground"}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground">{r.user_profiles?.display_name || r.user_profiles?.github || "Anonymous"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono opacity-50">{r.wallet_address.substring(0,6)}...{r.wallet_address.substring(r.wallet_address.length-4)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-accent font-bold text-base">{r.current_streak || 0}</span>
                            {r.last_solved_date === new Date().toISOString().split('T')[0] && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" title="Solved Today"></span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-muted-foreground">{r.total_days_solved || 0}</td>
                        <td className="px-4 py-4">
                          <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{r.challenges?.title}</div>
                          <div className="text-[10px] text-muted-foreground">{r.challenges?.duration}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-mono uppercase">
                            {r.challenges?.platform}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredRows.length === 0 && (
                       <tr>
                         <td colSpan={6} className="px-4 py-20 text-center text-muted-foreground italic">
                           No participants matching your search or filters.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};


export default Leaderboard;
