import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const platforms = [
  { name: "GitHub", color: "#f0f0f0", icon: "GH" },
  { name: "LeetCode", color: "#FFA116", icon: "LC" },
  { name: "Codeforces", color: "#1890FF", icon: "CF" },
  { name: "CodeChef", color: "#5B4638", icon: "CC" },
  { name: "HackerRank", color: "#00EA64", icon: "HR" },
  { name: "AtCoder", color: "#222", icon: "AC" },
];

const ConnectedPlatforms = () => {
  return (
    <section className="py-16 border-t border-border/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <p className="text-center text-sm text-muted-foreground mb-10 font-mono tracking-wider">
            YOUR FAVOURITE CODING PLATFORMS — CONNECTED
          </p>
        </ScrollReveal>

        <div className="relative flex items-center justify-center">
          {/* Connection line */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 120"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
          >
            <motion.path
              d="M 80 60 Q 200 30 320 55 Q 440 80 560 50 Q 680 20 800 55 Q 860 70 920 60"
              stroke="hsl(var(--muted-foreground) / 0.25)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>

          {/* Platform icons */}
          <div className="relative flex items-center justify-center gap-6 md:gap-10 flex-wrap">
            {platforms.map((p, i) => (
              <ScrollReveal key={p.name} delay={i * 0.12}>
                <motion.div
                  whileHover={{ scale: 1.15, y: -6 }}
                  className="relative group cursor-pointer"
                >
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-card border border-border/50 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
                    style={{
                      boxShadow: `0 4px 20px ${p.color}22`,
                    }}
                  >
                    <span
                      className="text-sm md:text-base font-bold font-mono"
                      style={{ color: p.color === "#222" ? "hsl(var(--foreground))" : p.color }}
                    >
                      {p.icon}
                    </span>
                  </div>
                  {/* Label on hover */}
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground whitespace-nowrap">
                    {p.name}
                  </div>
                  {/* Glow dot */}
                  <div
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse-glow"
                    style={{ backgroundColor: p.color === "#222" ? "hsl(var(--primary))" : p.color }}
                  />
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConnectedPlatforms;
