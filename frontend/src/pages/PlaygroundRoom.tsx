import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { executeCode, validateTestCases } from "@/lib/piston";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Clock, Users, Play, Upload, User, Copy, Trash2, Home, RefreshCw, ArrowLeft } from "lucide-react";
import { usePlaygroundTimer } from "@/hooks/usePlaygroundTimer";
import { useUserStore } from "@/store/userStore";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


export default function PlaygroundRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [language, setLanguage] = useState("javascript");

  const CODE_TEMPLATES: Record<string, string> = {
    javascript: "// Write your JavaScript code here",
    python: "# Write your Python code here",
    cpp: "// Write your C++ code here",
    java: "// Write your Java code here",
    c: "// Write your C code here",
  };
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

  const [questionDataList, setQuestionDataList] = useState<any[]>([]);
  const [testResultsMap, setTestResultsMap] = useState<Record<number, any>>({});
  const [isStandingsOpen, setIsStandingsOpen] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState(0);

  useEffect(() => {
    // 1. Initial Data Fetching (Room details, participants, existing submission)
    const fetchData = async () => {
      if (!roomId) return;
      
      // Fetch Room
      const { data: room } = await supabase.from('playground_rooms').select('*').eq('id', roomId).single();
      if (room) {
        setRoomData(room);
        
        // Fetch Questions
        const questions = room.questions_list || (room.question_repo_url ? [{ id: room.question_repo_url, title: room.question_title }] : []);
        const loadedQuestions = [];
        for (const q of questions) {
          try {
            const res = await fetch(`/challenges/${q.id}`);
            if (res.ok) loadedQuestions.push(await res.json());
          } catch (e) { console.error(e); }
        }
        setQuestionDataList(loadedQuestions);
      }

      // Fetch Participants & Profiles
      const { data: parts } = await supabase.from('playground_participants').select('*').eq('room_id', roomId);
      if (parts) {
        const wallets = parts.map(p => p.wallet_address);
        const { data: profiles } = await supabase.from('user_profiles').select('wallet_address, display_name').in('wallet_address', wallets);
        const profileMap = new Map(profiles?.map(p => [p.wallet_address, p.display_name]) || []);
        
        setParticipants(parts.map((p: any) => ({
          wallet: p.wallet_address,
          name: profileMap.get(p.wallet_address) || p.wallet_address.slice(0, 6) + "...",
          score: p.score,
          passed: p.test_cases_passed,
          total: p.total_test_cases,
          online: false
        })));
      }

      // Fetch User's specific submission
      if (publicKey) {
        const { data: myPart } = await supabase.from('playground_participants').select('*').eq('room_id', roomId).eq('wallet_address', publicKey.toBase58()).single();
        if (myPart) {
          if (myPart.submissions) setCodes(myPart.submissions);
          if (myPart.multi_test_results) setTestResultsMap(myPart.multi_test_results);
        } else {
          // Join if not joined
          await supabase.from('playground_participants').insert({ room_id: roomId, wallet_address: publicKey.toBase58(), score: 0 });
        }
      }
    };

    fetchData();

    // 2. Realtime Subscriptions (Presence, Broadcast, Postgres Changes)
    if (!roomId || !publicKey) return;

    const channel = supabase.channel(`playground_room:${roomId}`, {
      config: { presence: { key: publicKey.toBase58() } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeWallets = Object.values(state).flat().map((p: any) => p.wallet);
        setParticipants(prev => prev.map(p => ({ ...p, online: activeWallets.includes(p.wallet) })));
      })
      .on('broadcast', { event: 'start_challenge' }, (payload) => {
        setRoomData((prev: any) => prev ? { ...prev, status: 'active', start_time: payload.payload.start_time } : prev);
        toast.success("Challenge Started!");
      })
      .on('broadcast', { event: 'room_deleted' }, () => {
        toast.error("Challenge deleted by host.");
        setTimeout(() => window.location.href = '/playground', 1500);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'playground_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoomData(payload.new);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playground_participants', filter: `room_id=eq.${roomId}` }, () => {
        fetchData(); // Refresh participant list on any DB change
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ wallet: publicKey.toBase58(), name: displayName });
          // Notify others of new joiner
          channel.send({ type: 'broadcast', event: 'new_participant', payload: {} });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, publicKey]);

  useEffect(() => {
    // Automatically finish challenge when timer ends
    const autoFinish = async () => {
      if (currentPhase === 'active' && timeRemaining === 0 && roomData?.status === 'active') {
        // Only host updates the room status to avoid race conditions
        if (publicKey?.toBase58() === roomData.host_address) {
          const { error } = await supabase
            .from('playground_rooms')
            .update({ status: 'finished' })
            .eq('id', roomId);
        }
        toast.info("Time is up! Challenge has ended.");
      }
    };
    autoFinish();
  }, [timeRemaining, currentPhase, roomData?.status, roomId, publicKey, roomData?.host_address]);

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
    const currentQuestion = questionDataList[activeQuestionIndex];
    const currentCode = codes[activeQuestionIndex] || CODE_TEMPLATES[language] || "// Write your code here";

    if (!currentQuestion?.testCases) {
      toast.error("Question data not loaded yet.");
      return;
    }
    setIsRunning(true);
    try {
      const results = await validateTestCases(language, currentCode, currentQuestion.testCases);
      setTestResultsMap(prev => ({ ...prev, [activeQuestionIndex]: results }));
      
      if (results.error) {
        toast.error(`${results.error}: ${results.details || ""}`);
      } else {
        toast.success(`Passed ${results.passed}/${results.total} test cases!`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsRunning(true);
    try {
      if (publicKey && roomId) {
        // Run validation on submit
        const currentQuestion = questionDataList[activeQuestionIndex];
        const currentCode = codes[activeQuestionIndex] || CODE_TEMPLATES[language] || "// Write your code here";

        if (!currentQuestion?.testCases) {
          toast.error("Question data not loaded yet.");
          setIsRunning(false);
          return;
        }

        const results = await validateTestCases(language, currentCode, currentQuestion.testCases);
        const newResultsMap = { ...testResultsMap, [activeQuestionIndex]: results };
        setTestResultsMap(newResultsMap);

        // Calculate total score across all questions (10 points per passed test case, -2 points per failed test case)
        const totalScore = Object.values(newResultsMap).reduce((acc: number, res: any) => {
          return acc + (res.passed * 10 - (res.total - res.passed) * 2);
        }, 0);

        const { error } = await supabase
          .from('playground_participants')
          .update({
            submissions: codes,
            multi_test_results: newResultsMap,
            score: totalScore
          })
          .eq('room_id', roomId)
          .eq('wallet_address', publicKey.toBase58());
        
        if (error) throw error;
        setIsSubmitted(true);
        toast.success("Code submitted successfully!");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartChallenge = async () => {
    if (!roomId) return;
    try {
      const startTime = new Date().toISOString();
      const { error } = await supabase
        .from('playground_rooms')
        .update({ status: 'active', start_time: startTime })
        .eq('id', roomId);
      if (error) throw error;
      
      await supabase.channel(`playground_presence:${roomId}`).send({
        type: 'broadcast',
        event: 'start_challenge',
        payload: { start_time: startTime }
      });

      setRoomData((prev: any) => prev ? { ...prev, status: 'active', start_time: startTime } : prev);
      toast.success("Challenge Started!");
    } catch (e: any) {
      toast.error(e.message || "Failed to start challenge");
    }
  };

  const handleDeleteChallenge = async () => {
    if (!roomId || !window.confirm("Are you sure you want to delete this challenge? This will remove all participants.")) return;
    
    try {
      // 1. Notify all participants before deleting
      await supabase.channel(`playground_presence:${roomId}`).send({
        type: 'broadcast',
        event: 'room_deleted',
      });

      // 2. Delete all participants first (FK constraint safety)
      const { error: pErr } = await supabase
        .from('playground_participants')
        .delete()
        .eq('room_id', roomId);
      
      if (pErr) throw pErr;

      // 3. Delete the room itself
      const { error } = await supabase
        .from('playground_rooms')
        .delete()
        .eq('id', roomId);
      
      if (error) throw error;

      toast.success("Challenge deleted successfully.");
      setTimeout(() => navigate('/playground'), 500);
    } catch (e: any) {
      console.error("Delete failed:", e);
      toast.error(e.message || "Failed to delete challenge");
    }
  };

  if (!roomData) return <div className="p-8 text-center">Loading Room...</div>;

  if (roomData.status === 'waiting') {
    const isHost = publicKey?.toBase58() === roomData.host_address;
    
    if (!publicKey) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
          <Card className="w-full max-w-md shadow-2xl border-primary/20 text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-display">Connect Your Wallet</CardTitle>
              <CardDescription>
                You need to connect your Solana wallet to join this coding challenge.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              {/* The wallet button is usually in the layout, but we can put a prompt here */}
              <div className="p-4 bg-muted rounded-lg border border-dashed border-primary/40 animate-pulse">
                Click the "Connect Wallet" button in the top right to enter the arena.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

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
                <div className="flex gap-2">
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
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  {isHost && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={handleDeleteChallenge}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete Room
                    </Button>
                  )}
                </div>
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

  // STRICT LOCK: If status is finished OR timer phase is finished, show final results
  if (roomData.status === 'finished' || currentPhase === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <Card className="w-full max-w-lg shadow-2xl border-primary/20 animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Users className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-display">{roomData.room_name || roomData.question_title}</CardTitle>
            <CardDescription className="text-md mt-1">Waiting for the host to start the "fight"...</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {participants.sort((a,b) => (b.score || 0) - (a.score || 0)).map((p, i) => (
                <div key={i} className={`flex items-center gap-4 p-6 ${p.wallet === publicKey?.toBase58() ? "bg-primary/5" : ""}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl ${
                    i === 0 ? "bg-yellow-500 text-white shadow-lg" : 
                    i === 1 ? "bg-slate-300 text-slate-700" : 
                    i === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{p.wallet === publicKey?.toBase58() ? "You" : p.name}</p>
                    <p className="text-sm text-muted-foreground font-mono truncate">{p.wallet}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">{p.score || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground italic">Verification complete. Great job everyone!</p>
            <Button onClick={() => window.location.href = '/playground'}>Return to Hub</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = '/playground'} className="hover:bg-primary/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl tracking-tight">{roomData.room_name || roomData.question_title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{roomData.question_title}</p>
          </div>
          <div className="flex gap-2">
             {roomData.question_tags?.map((tag: string) => (
               <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                 {tag}
               </span>
             ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {publicKey?.toBase58() === roomData.host_address && (
            <Button variant="ghost" size="sm" onClick={handleDeleteChallenge} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
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

      <div className="flex-1 overflow-hidden relative">
        {isSubmitted && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <Card className="max-w-md shadow-2xl border-primary/20">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Submission Received!</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Thank you for joining. Sit tight! We are verifying the codes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Final results will be declared once the timer ends. You cannot modify your submission now.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/playground'}>
                  Back to Playground
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <ResizablePanelGroup direction="horizontal">
          
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="flex flex-col h-full bg-card/30">
              <div className="flex gap-1 p-2 bg-muted/50 border-b overflow-x-auto">
                {questionDataList.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveQuestionIndex(i);
                      setActiveTestTab(0);
                    }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      activeQuestionIndex === i 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Problem {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-2xl font-bold mb-4">{questionDataList[activeQuestionIndex]?.title || "Loading Problem..."}</h2>
                <div className="prose dark:prose-invert max-w-none">
                  {questionDataList[activeQuestionIndex]?.description ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                    >
                      {questionDataList[activeQuestionIndex].description.replace(/\\n/g, '\n')}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Problem description is being fetched...</p>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={65}>
            <div className="flex flex-col h-full border-l">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <Select value={language} onValueChange={(val) => {
                  setLanguage(val);
                  setCodes(prev => ({ 
                    ...prev, 
                    [activeQuestionIndex]: CODE_TEMPLATES[val] || "// Write your code here" 
                  }));
                }}>
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
                  <Button variant="secondary" size="sm" onClick={handleRun} disabled={isRunning || isSubmitted || (currentPhase as string) === 'finished'}>
                    <Play className="w-4 h-4 mr-2" />
                    Run
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={isRunning || isSubmitted || (currentPhase as string) === 'finished'}>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={60} minSize={30}>
                    <Editor
                      height="100%"
                      language={language}
                      theme="vs-dark"
                      value={codes[activeQuestionIndex] || CODE_TEMPLATES[language] || "// Write your code here"}
                      onChange={(val) => setCodes(prev => ({ ...prev, [activeQuestionIndex]: val || "" }))}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: isSubmitted || (currentPhase as string) === 'finished'
                      }}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40} minSize={10}>
                    <div className="h-full bg-background flex flex-col overflow-hidden">
                      <div className="px-4 py-2 bg-muted/30 border-b flex items-center justify-between">
                         <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Results</span>
                         {testResultsMap[activeQuestionIndex] && (
                           <div className="flex gap-3 items-center">
                             <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight">Passed: {testResultsMap[activeQuestionIndex].passed}</span>
                             <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">Failed: {testResultsMap[activeQuestionIndex].total - testResultsMap[activeQuestionIndex].passed}</span>
                           </div>
                         )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {!testResultsMap[activeQuestionIndex] ? (
                          <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                            Run your code for Problem {activeQuestionIndex + 1} to see results.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {testResultsMap[activeQuestionIndex].error && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-red-500 mb-1 flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                   {testResultsMap[activeQuestionIndex].error}
                                </p>
                                <pre className="text-[10px] font-mono text-red-400/80 break-all whitespace-pre-wrap">{testResultsMap[activeQuestionIndex].details}</pre>
                              </div>
                            )}

                            <div className="flex gap-2 border-b pb-2 overflow-x-auto">
                              {testResultsMap[activeQuestionIndex].results?.map((_: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setActiveTestTab(i)}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                                    activeTestTab === i 
                                    ? "bg-primary text-primary-foreground shadow-md" 
                                    : _.passed ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${_.passed ? "bg-green-500" : "bg-red-500"}`} />
                                  Case {i + 1}
                                </button>
                              ))}
                            </div>
                            
                            {testResultsMap[activeQuestionIndex].results?.[activeTestTab] && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                    testResultsMap[activeQuestionIndex].results[activeTestTab].passed ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                  }`}>
                                    {testResultsMap[activeQuestionIndex].results[activeTestTab].passed ? "Accepted" : "Wrong Answer"}
                                  </span>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Input</label>
                                  <pre className="mt-1 p-2 bg-muted/50 rounded text-xs font-mono border">{testResultsMap[activeQuestionIndex].results[activeTestTab].input}</pre>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected</label>
                                    <pre className="mt-1 p-2 bg-muted/50 rounded text-xs font-mono border">{testResultsMap[activeQuestionIndex].results[activeTestTab].expected}</pre>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Actual</label>
                                    <pre className={`mt-1 p-2 rounded text-xs font-mono border ${testResultsMap[activeQuestionIndex].results[activeTestTab].passed ? "bg-green-500/5 text-green-500 border-green-500/20" : "bg-red-500/5 text-red-500 border-red-500/20"}`}>
                                      {testResultsMap[activeQuestionIndex].results[activeTestTab].actual || <span className="italic opacity-50">Empty Output</span>}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>

      {/* Live Standings Sidebar Overlay */}
      <div className={`fixed top-20 right-0 h-[calc(100vh-120px)] transition-all duration-300 z-40 flex ${isStandingsOpen ? "w-72" : "w-10"}`}>
        <button 
          onClick={() => setIsStandingsOpen(!isStandingsOpen)}
          className="w-10 h-10 bg-card border border-r-0 flex items-center justify-center rounded-l-xl self-center shadow-lg hover:bg-muted transition-colors"
        >
          <Users className={`w-4 h-4 transition-transform ${isStandingsOpen ? "" : "rotate-180"}`} />
        </button>
        
        <div className={`flex-1 bg-card/95 backdrop-blur-sm border shadow-2xl overflow-hidden flex flex-col ${isStandingsOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="bg-primary/10 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
              Live Standings
            </h3>
            <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border font-mono font-bold">
              {participants.length} LIVE
            </span>
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-y-auto">
            {participants.sort((a,b) => (b.passed || 0) - (a.passed || 0)).map((p, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${p.wallet === publicKey?.toBase58() ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  p.online ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium truncate">{p.wallet === publicKey?.toBase58() ? "You" : p.name}</p>
                    {p.online && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {p.wallet.slice(0, 4) + "..." + p.wallet.slice(-4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
