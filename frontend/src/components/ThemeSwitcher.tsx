import { useState } from "react";
import { motion } from "framer-motion";

const themes = [
  { id: "default", label: "Solana Neon", icon: "◆" },
  { id: "theme-github-midnight", label: "GitHub Midnight", icon: "◉" },
  { id: "theme-light-edu", label: "Light Edu", icon: "○" },
];

const ThemeSwitcher = () => {
  const [current, setCurrent] = useState("default");
  const [open, setOpen] = useState(false);

  const applyTheme = (id: string) => {
    const root = document.documentElement;
    root.className = id === "default" ? "" : id;
    setCurrent(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm font-mono"
      >
        🎨
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 top-12 glass-card rounded-xl p-2 min-w-[180px] z-50"
        >
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                current === t.id ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
