import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlaygroundAnimation() {
  const [phase, setPhase] = useState<'3'|'2'|'1'|'GO'|'CPP'|'PY'|'JAVA'>('3');

  useEffect(() => {
    let current = 0;
    const sequence = [
      { id: '3', duration: 1000 },
      { id: '2', duration: 1000 },
      { id: '1', duration: 1000 },
      { id: 'GO', duration: 1000 },
      { id: 'CPP', duration: 2500 },
      { id: 'PY', duration: 2500 },
      { id: 'JAVA', duration: 2500 },
    ] as const;

    let timeout: NodeJS.Timeout;

    const nextStep = () => {
      setPhase(sequence[current].id);
      timeout = setTimeout(() => {
        current = (current + 1) % sequence.length;
        nextStep();
      }, sequence[current].duration);
    };

    nextStep();

    return () => clearTimeout(timeout);
  }, []);

  const isTimer = phase === '3' || phase === '2' || phase === '1' || phase === 'GO';

  return (
    <div className="relative w-full aspect-square md:aspect-auto md:h-[420px] glass-card rounded-[2rem] border border-border/50 shadow-2xl overflow-hidden bg-[#0F0F0F] flex flex-col">
      {/* Mac OS Window header */}
      <div className="h-8 bg-[#1A1A1A] border-b border-zinc-800 flex items-center px-4 gap-2 z-20 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        <div className="ml-auto text-[10px] text-zinc-500 font-mono">arena.room</div>
      </div>

      <div className="relative flex-1 p-4">
        <AnimatePresence mode="wait">
          {isTimer ? (
            <motion.div 
              key="timer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0F0F0F]"
            >
              <p className="text-muted-foreground text-sm font-mono mb-4 uppercase tracking-widest">Match Starts In</p>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-red-500/20" />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="377"
                    initial={{ strokeDashoffset: 377 }}
                    animate={{ strokeDashoffset: phase === 'GO' ? 0 : (parseInt(phase) / 3) * 377 }}
                    className="text-red-500"
                  />
                </svg>
                <span className={`font-mono font-bold ${phase === 'GO' ? 'text-2xl' : 'text-5xl'} text-red-500`}>
                  {phase === 'GO' ? 'BEGIN' : phase}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-3 flex gap-3 h-full bg-[#0F0F0F]"
            >
              {/* Left: Question Pane */}
              <div className="w-[40%] bg-[#1A1A1A] rounded-xl border border-zinc-800 p-4 flex flex-col gap-3">
                <div className="h-4 w-3/4 bg-zinc-700 rounded" />
                <div className="space-y-2 mt-2">
                  <div className="h-2 w-full bg-zinc-800 rounded" />
                  <div className="h-2 w-5/6 bg-zinc-800 rounded" />
                  <div className="h-2 w-full bg-zinc-800 rounded" />
                  <div className="h-2 w-4/5 bg-zinc-800 rounded" />
                </div>
                <div className="mt-auto flex gap-2">
                  <span className="px-2 py-1 rounded bg-[#9945FF]/10 text-[#9945FF] text-[8px] font-mono">HELLO_WORLD</span>
                </div>
              </div>

              {/* Right: Code Editor Pane */}
              <div className="w-[60%] bg-[#1A1A1A] rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
                <div className="h-6 bg-zinc-900 border-b border-zinc-800 flex items-center px-3">
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {phase === 'CPP' ? 'main.cpp' : phase === 'PY' ? 'main.py' : 'Main.java'}
                  </span>
                </div>
                <div className="p-3 flex-1 text-[10px] sm:text-xs font-mono leading-relaxed overflow-hidden">
                  {phase === 'CPP' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="text-blue-400">#include</span> &lt;iostream&gt;<br/><br/>
                      <span className="text-blue-400">int</span> <span className="text-yellow-200">main</span>() {"{"}<br/>
                      &nbsp;&nbsp;std::cout &lt;&lt; <span className="text-orange-300">"Hello"</span> &lt;&lt; std::endl;<br/>
                      &nbsp;&nbsp;<span className="text-blue-400">return</span> <span className="text-purple-400">0</span>;<br/>
                      {"}"}
                    </motion.div>
                  )}
                  {phase === 'PY' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="text-blue-400">def</span> <span className="text-yellow-200">main</span>():<br/>
                      &nbsp;&nbsp;<span className="text-yellow-200">print</span>(<span className="text-orange-300">"Namaste"</span>)<br/><br/>
                      <span className="text-blue-400">if</span> __name__ == <span className="text-orange-300">"__main__"</span>:<br/>
                      &nbsp;&nbsp;<span className="text-yellow-200">main</span>()
                    </motion.div>
                  )}
                  {phase === 'JAVA' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="text-blue-400">public class</span> <span className="text-yellow-200">Main</span> {"{"}<br/>
                      &nbsp;&nbsp;<span className="text-blue-400">public static void</span> <span className="text-yellow-200">main</span>(String[] args) {"{"}<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;System.out.<span className="text-yellow-200">println</span>(<span className="text-orange-300">"Hola"</span>);<br/>
                      &nbsp;&nbsp;{"}"}<br/>
                      {"}"}
                    </motion.div>
                  )}
                </div>
                <div className="h-20 bg-[#090909] border-t border-zinc-800 p-3 flex flex-col justify-center relative overflow-hidden">
                  <span className="absolute top-1 left-2 text-[8px] text-zinc-600 font-mono">Output</span>
                  <div className="flex items-center justify-center h-full">
                    <motion.div 
                      key={phase}
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.1 }
                        }
                      }}
                      className={`text-4xl md:text-5xl font-light tracking-wide ${
                        phase === 'CPP' ? 'text-blue-400' : 
                        phase === 'PY' ? 'text-yellow-400' : 
                        'text-orange-500'
                      }`}
                    >
                      {(phase === 'CPP' ? 'Hello' : phase === 'PY' ? 'Namaste' : 'Hola').split("").map((char, index) => (
                        <motion.span 
                          key={index} 
                          variants={{
                            hidden: { opacity: 0, y: 5 },
                            show: { opacity: 1, y: 0 }
                          }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
