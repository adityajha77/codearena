import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import { useState } from "react";

const filters = ["All", "10d", "30d", "100d"];

const rows = [
  { rank: 1, name: "sol_dev.eth", streak: 98, days: 100, status: "Completed", sol: "2.4 SOL", platform: "GitHub + LeetCode" },
  { rank: 2, name: "crypto_coder", streak: 95, days: 100, status: "Completed", sol: "2.4 SOL", platform: "GitHub" },
  { rank: 3, name: "buildoor.sol", streak: 88, days: 92, status: "Active", sol: "—", platform: "Codeforces" },
  { rank: 4, name: "web3_ninja", streak: 72, days: 78, status: "Active", sol: "—", platform: "LeetCode" },
  { rank: 5, name: "code_warrior", streak: 65, days: 70, status: "At Risk", sol: "—", platform: "HackerRank" },
  { rank: 6, name: "h4ck3r_sol", streak: 44, days: 50, status: "Active", sol: "—", platform: "GitHub" },
  { rank: 7, name: "algo_queen", streak: 30, days: 33, status: "Active", sol: "—", platform: "AtCoder" },
  { rank: 8, name: "rust_dev", streak: 0, days: 25, status: "Eliminated", sol: "—", platform: "GitHub" },
  { rank: 9, name: "noob_coder", streak: 0, days: 12, status: "Eliminated", sol: "—", platform: "LeetCode" },
  { rank: 10, name: "quit_early", streak: 0, days: 3, status: "Eliminated", sol: "—", platform: "CodeChef" },
];

const statusColor = (s: string) => {
  switch (s) {
    case "Completed": return "bg-primary/20 text-primary";
    case "Active": return "bg-cyan/20 text-cyan";
    case "At Risk": return "bg-accent/20 text-accent";
    case "Eliminated": return "bg-destructive/20 text-destructive";
    default: return "bg-muted/20 text-muted-foreground";
  }
};

const Leaderboard = () => {
  const [filter, setFilter] = useState("All");

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
                🏆 <span className="gradient-text-secondary">Leaderboard</span>
              </h1>
              <p className="text-muted-foreground">Survival of the most consistent. Stay on or get eliminated.</p>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["#", "User", "🔥 Streak", "Days", "Status", "Earned", "Platform"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr key={r.rank}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${r.status === "Eliminated" ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-bold font-mono text-primary">{r.rank}</td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-accent">{r.streak || "—"}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{r.days}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3 font-mono text-primary">{r.sol}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.platform}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Leaderboard;
