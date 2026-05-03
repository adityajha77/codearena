import { Link } from "react-router-dom";
import mascotImg from "@/assets/mascot.png";
import { Github, Linkedin, Twitter, Globe } from "lucide-react";


const Footer = () => (
  <footer className="border-t border-border/50 bg-card/50 mt-20">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <img src={mascotImg} alt="CodeArena" className="w-8 h-8" />
            <span className="text-xl font-bold font-display">
              Code<span className="text-primary">Arena</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Build consistency. Compete with peers. Earn rewards on Solana.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Platform</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/challenges" className="block hover:text-foreground transition-colors">Challenges</Link>
            <Link to="/leaderboard" className="block hover:text-foreground transition-colors">Leaderboard</Link>
            <Link to="/how-it-works" className="block hover:text-foreground transition-colors">How It Works</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Community</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/about" className="block hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="block hover:text-foreground transition-colors">Contact</Link>
            <Link to="/faq" className="block hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Connect</h4>
          <div className="flex gap-4">
            <a href="https://github.com/adityajha77" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Github size={20} />
            </a>
            <a href="https://x.com/KumarAdity7093" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter size={20} />
            </a>
            <a href="https://www.linkedin.com/in/aditya-kumar-jha-72493a319/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin size={20} />
            </a>
            <a href="https://aditya-portfolio-tau.vercel.app/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Globe size={20} />
            </a>
          </div>
        </div>

      </div>
      <div className="border-t border-border/50 mt-8 pt-6 text-center text-sm text-muted-foreground">
        © 2026 CodeArena. Built on Solana. Code daily, earn forever.
      </div>
    </div>
  </footer>
);

export default Footer;
