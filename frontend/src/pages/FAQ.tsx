import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  { q: "What is CodeArena?", a: "CodeArena is a Solana-powered coding challenge platform where you stake SOL, code daily, maintain streaks, and earn rewards for consistency." },
  { q: "How do challenges work?", a: "You create or join a challenge with a set duration (10/30/100 days) and entry stake. Code daily to maintain your streak. If you miss a day, you risk elimination. Survivors share the pool." },
  { q: "Which coding platforms are supported?", a: "GitHub (required), LeetCode, Codeforces, HackerRank, CodeChef, AtCoder, and more coming soon." },
  { q: "How is activity verified?", a: "We track commits on GitHub and submissions on connected coding platforms. Activity must happen within the challenge day window." },
  { q: "What happens if I miss a day?", a: "In self-challenge, your challenge fails. In community/friend challenges, you get an 'At Risk' status. Missing another day leads to elimination." },
  { q: "How are rewards distributed?", a: "The staked SOL pool is distributed among survivors at the end of the challenge period, proportional to their streak scores." },
  { q: "Is my wallet safe?", a: "Yes. We only request approval for the challenge entry stake. Your wallet remains fully under your control." },
  { q: "Can I create private challenges?", a: "Yes! Friend challenges generate a unique invite code that you can share privately." },
];

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold font-display mb-8 text-center">
              <span className="gradient-text-primary">FAQ</span>
            </h1>
          </ScrollReveal>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="glass-card rounded-xl overflow-hidden">
                  <button onClick={() => setOpen(open === i ? null : i)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-medium">
                    {f.q}
                    <span className={`transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
                  </button>
                  <AnimatePresence>
                    {open === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default FAQ;
