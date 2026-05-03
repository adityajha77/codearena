import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import mascotImg from "@/assets/mascot.png";
import { ExternalLink, Github, Linkedin, Twitter } from "lucide-react";


const About = () => (
  <div className="min-h-screen relative">
    <Particles />
    <Navbar />
    <section className="pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <img src={mascotImg} alt="CodeArena" className="w-20 h-20 mx-auto mb-4" loading="lazy" width={80} height={80} />
            <h1 className="text-4xl font-bold font-display mb-4">
              About <span className="gradient-text-primary">CodeArena</span>
            </h1>
            <p className="text-muted-foreground">
              CodeArena is a Solana-powered coding challenge platform that turns consistency into rewards.
              Connect your wallet, link your coding profiles, and compete in daily coding challenges.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-6">
          {[
            { title: "Mission", text: "Make coding consistency rewarding. We believe daily practice is the key to mastery — and now it can earn you real rewards on Solana." },
            { title: "Community", text: "Join thousands of coders who track their streaks, compete with friends, and push each other to code daily. Public pools, private rooms, and self-challenges for every level." },
            { title: "Integrations", text: "We connect with GitHub, LeetCode, Codeforces, HackerRank, CodeChef, AtCoder, and more — tracking your real coding activity automatically." },
            { title: "Built on Solana", text: "Fast, cheap, and decentralized. Your stakes, rewards, and identity live on-chain with full transparency." },
          ].map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.1}>
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-bold font-display mb-2">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.5}>
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-muted-foreground text-sm mb-4">Built with ❤️ for the global coding community.</p>
            <div className="inline-flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-sm font-medium">Developed by Aditya Kumar Jha</span>
              <div className="flex gap-4">
                <a href="https://aditya-portfolio-tau.vercel.app/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink size={18} />
                </a>
                <a href="https://github.com/adityajha77" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Github size={18} />
                </a>
                <a href="https://www.linkedin.com/in/aditya-kumar-jha-72493a319/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="https://x.com/KumarAdity7093" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter size={18} />
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;
