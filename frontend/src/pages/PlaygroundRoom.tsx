import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { executeCode, validateTestCases } from "@/lib/piston";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Clock, Users, Play, Upload, User, Copy } from "lucide-react";
import { usePlaygroundTimer } from "@/hooks/usePlaygroundTimer";
import { useUserStore } from "@/store/userStore";

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
  const { githubHandle, leetcodeHandle } = useUserStore();
  
  const displayName = githubHandle || leetcodeHandle || "Anonymous Coder";
  
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
            name: displayName,
          });
        }
      });

    // Setup Supabase Postgres listener for room updates
    const roomChannel = supabase.channel(`room_updates:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'playground_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoomData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(roomChannel);
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

  const handleStartChallenge = async () => {
    if (!roomId) return;
    try {
      const { error } = await supabase
        .from('playground_rooms')
        .update({ status: 'active', start_time: new Date().toISOString() })
        .eq('id', roomId);
      if (error) throw error;
      toast.success("Challenge Started!");
    } catch (e: any) {
      toast.error(e.message || "Failed to start challenge");
    }
  };

  if (!roomData) return <div className="p-8 text-center">Loading Room...</div>;

  if (roomData.status === 'waiting') {
    const isHost = publicKey?.toBase58() === roomData.host_address;
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
        <Card className="w-full max-w-lg shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-display">Waiting Room</CardTitle>
            <CardDescription className="text-base">
              {isHost ? "Waiting for players to join. Start when you're ready!" : "Waiting for the host to start the challenge..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Players Joined ({participants.length})
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Invite link copied to clipboard!");
                  }}
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Invite Link
                </Button>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No one else is here yet.</p>
                ) : (
                  participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{p.name || "Anonymous Coder"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{p.wallet}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.wallet === roomData.host_address && (
                          <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold uppercase">Host</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {isHost && (
              <Button onClick={handleStartChallenge} className="w-full h-12 text-lg font-bold glow-primary" size="lg">
                <Play className="w-5 h-5 mr-2" />
                Start Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
