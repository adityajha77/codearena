import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Connect Wallet", desc: "Link your Solana wallet to create your identity.", icon: "💳" },
  { num: "02", title: "Connect Platforms", desc: "Link GitHub (required) + LeetCode, Codeforces, HackerRank, and more.", icon: "🔗" },
  { num: "03", title: "Create or Join", desc: "Pick self, friend, or community challenge. Set duration & stake.", icon: "🎯" },
  { num: "04", title: "Code Daily", desc: "Make commits, solve problems, stay active across platforms.", icon: "⌨️" },
  { num: "05", title: "Keep Your Streak", desc: "Miss a day? You're at risk. Miss two? You're out.", icon: "🔥" },
  { num: "06", title: "Earn Rewards", desc: "Survivors split the pool. Consistency pays.", icon: "💰" },
];

const HowItWorks = () => (
  <div className="min-h-screen relative">
    <Particles />
    <Navbar />
    <section className="pt-28 pb-20">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
              How <span className="gradient-text-primary">CodeArena</span> Works
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Six simple steps from wallet to rewards.</p>
          </div>
        </ScrollReveal>

        <div className="max-w-2xl mx-auto space-y-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.1}>
              <motion.div
                whileHover={{ x: 8 }}
                className="glass-card rounded-2xl p-6 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary">{step.num}</span>
                    <h3 className="text-lg font-bold font-display">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default HowItWorks;
