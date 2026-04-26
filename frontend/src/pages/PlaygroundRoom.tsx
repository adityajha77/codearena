import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { executeCode, validateTestCases } from "@/lib/piston";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Clock, Users, Play, Upload } from "lucide-react";
import { usePlaygroundTimer } from "@/hooks/usePlaygroundTimer";

// Ensure you have configured supabaseClient properly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PlaygroundRoom() {
  const { roomId } = useParams();
  const { publicKey } = useWallet();
  const [code, setCode] = useState("// Write your code here");
  const [language, setLanguage] = useState("javascript");
  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { timeRemaining, formattedTime, currentPhase, isNearEnd } = usePlaygroundTimer(
    roomData?.status || 'scheduled',
    roomData?.start_time,
    roomData?.duration_minutes
  );

  useEffect(() => {
    // Fetch room details
    const fetchRoom = async () => {
      if (!roomId) return;
      const { data, error } = await supabase
        .from('playground_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (data) {
        setRoomData(data);
      }
    };
    fetchRoom();

    // Setup Supabase Presence
    if (!roomId || !publicKey) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: publicKey.toBase58(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = Object.keys(state).map((key) => ({
          wallet: key,
          ...state[key][0],
        }));
        setParticipants(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, publicKey]);

  useEffect(() => {
    // Play beep sound when near end
    if (isNearEnd && timeRemaining <= 10 && timeRemaining > 0) {
      const playBeep = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      };
      playBeep();
    }
  }, [isNearEnd, timeRemaining]);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await executeCode(language, code);
      if (result.compile && result.compile.code !== 0) {
        toast.error("Compilation Error: " + result.compile.stderr);
      } else {
        toast.success("Output: " + result.run.stdout);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    // Implement submission to test against test cases
    toast.info("Submitting code to run against hidden test cases...");
    // Update participant score/penalty logic here
  };

  if (!roomData) return <div className="p-8 text-center">Loading Room...</div>;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl">{roomData.question_title}</h1>
          <div className="flex gap-2">
             {roomData.question_tags?.map((tag: string) => (
               <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                 {tag}
               </span>
             ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-lg">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className={isNearEnd ? "text-red-500 font-bold" : ""}>
                {formattedTime}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{currentPhase}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Users className="w-5 h-5 text-muted-foreground" />
             <span className="text-sm font-medium">{participants.length} Online</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-4">Problem Description</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p>Problem description will be fetched from GitHub URL: {roomData.question_repo_url}</p>
                {/* Render Markdown here */}
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60}>
            <div className="flex flex-col h-full border-l">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python 3</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleRun} disabled={isRunning}>
                    <Play className="w-4 h-4 mr-2" />
                    Run
                  </Button>
                  <Button size="sm" onClick={handleSubmit}>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
              
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}
