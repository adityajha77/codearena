import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { addHours, isAfter, isBefore } from "date-fns";
import { ArrowLeft, Home, Trophy, BookOpen, Code2, Check, Dice5 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import challengesMetadata from "../data/challenges_metadata.json";

export default function Playground() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("30");
  const [roomName, setRoomName] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState("1");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [activeChallenge, setActiveChallenge] = useState<any>(null);

  useEffect(() => {
    const checkActiveChallenge = async () => {
      if (!publicKey) return;
      
      // Get all rooms where user is a participant and room is not finished
      const { data, error } = await supabase
        .from('playground_participants')
        .select('room_id, playground_rooms(*)')
        .eq('wallet_address', publicKey.toBase58());
      
      if (data) {
        const ongoing = data.find((p: any) => 
          ['waiting', 'active'].includes(p.playground_rooms.status)
        );
        if (ongoing) {
          setActiveChallenge(ongoing.playground_rooms);
        }
      }
    };
    checkActiveChallenge();
  }, [publicKey]);

  const handleCreateRoom = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!roomName.trim()) {
      toast.error("Please enter a contest name");
      return;
    }

    // Randomization Logic
    const count = parseInt(questionCount);
    let finalQuestions: any[] = [];
    
    if (selectedTopics.length > 0) {
      const uniqueIds = new Set();
      
      for (const topic of selectedTopics) {
        let topicPool = challengesMetadata.filter(q => q.difficulty === difficulty && q.tags.includes(topic));
        const shuffled = [...topicPool].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, Math.min(count, topicPool.length));
        
        for (const q of picked) {
          if (!uniqueIds.has(q.id)) {
            uniqueIds.add(q.id);
            finalQuestions.push(q);
          }
        }
      }
    } else {
      let pool = challengesMetadata.filter(q => q.difficulty === difficulty);
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      finalQuestions = shuffled.slice(0, Math.min(count, pool.length));
    }

    if (finalQuestions.length === 0) {
      toast.error(`No ${difficulty} questions found for the selected criteria.`);
      return;
    }

    setIsCreating(true);

    try {
      // Create room in Supabase
      const { data, error } = await supabase
        .from('playground_rooms')
        .insert({
          host_address: publicKey.toBase58(),
          room_name: roomName,
          difficulty,
          question_title: finalQuestions.length === 1 ? finalQuestions[0].title : `${finalQuestions.length} Problems Challenge`,
          question_repo_url: finalQuestions[0].id, // Backward compatibility for single question logic
          question_tags: Array.from(new Set(finalQuestions.flatMap(q => q.tags))),
          questions_list: finalQuestions, // New multi-question support
          start_time: mode === "schedule" ? new Date(scheduleTime).toISOString() : null,
          duration_minutes: parseInt(duration),
          status: mode === "schedule" ? 'scheduled' : 'waiting'
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase
        .from('playground_participants')
        .insert({
          room_id: data.id,
          wallet_address: publicKey.toBase58(),
          joined_at: new Date().toISOString()
        });

      toast.success("Room created successfully!");
      navigate(`/playground/${data.id}`);

    } catch (error: any) {
      toast.error(error.message || "Failed to create room.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Multiplayer Playground</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/playground/leaderboard')} className="gap-2">
            <Trophy className="w-4 h-4" />
            Previous Results
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <Home className="w-4 h-4" />
            Back Home
          </Button>
        </div>
      </div>
      
      {activeChallenge && (
        <Card className="mb-8 border-primary bg-primary/5 animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Ongoing Challenge
                </CardTitle>
                <CardDescription>You are currently participating in: {activeChallenge.question_title}</CardDescription>
              </div>
              <Button onClick={() => navigate(`/playground/${activeChallenge.id}`)} className="glow-primary">
                Resume Challenge
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Challenge</CardTitle>
            <CardDescription>Set up a coding room for your friends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contest Name</Label>
              <Input 
                placeholder="e.g. Weekly Python Sprint" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button
                onClick={() => setMode("now")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "now" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Play Now
              </button>
              <button
                onClick={() => setMode("schedule")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "schedule" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Schedule
              </button>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Topics (Select multiple)</Label>
              <div className="grid grid-cols-2 gap-3">
                {["Math", "Binary Search", "DP", "Algorithms", "Data Structures"].map((t) => (
                  <div key={t} className="flex items-center space-x-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => {
                    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                  }}>
                    <Checkbox checked={selectedTopics.includes(t)} onCheckedChange={() => {}} />
                    <span className="text-sm font-medium">{t === "DP" ? "Dynamic Programming" : t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={questionCount} 
                    onChange={(e) => setQuestionCount(e.target.value)} 
                    min="1" 
                    max="5" 
                    className="pl-9"
                  />
                  <Dice5 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duration (Min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="5" max="180" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Challenge Mode</p>
                  <p className="text-sm font-bold">Randomized {difficulty} Arena</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The arena will automatically select {questionCount} random {difficulty} questions 
                {selectedTopics.length > 0 ? ` from EACH selected topic: ${selectedTopics.join(", ")}` : " from all topics"}.
              </p>
            </div>

            {mode === "schedule" && (
              <div className="space-y-2">
                <Label>Schedule Time (Max 48 hours from now)</Label>
                <Input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full">
              {isCreating ? "Creating..." : mode === "now" ? "Create Room & Wait for Players" : "Schedule Room"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Room</CardTitle>
            <CardDescription>Have an invite link or code? Enter the room ID here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">
               If you received a WhatsApp link, simply click it to join the room directly. Or, paste the Room ID below:
             </p>
             <div className="space-y-2">
               <Label>Room ID</Label>
               <Input 
                 placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" 
                 value={joinRoomId} 
                 onChange={(e) => setJoinRoomId(e.target.value)} 
               />
             </div>
             <Button 
               className="w-full" 
               variant="secondary"
               onClick={() => {
                 if(!joinRoomId) {
                   toast.error("Please enter a room ID");
                   return;
                 }
                 // Handle full URL pasting vs just ID
                 let finalId = joinRoomId.trim();
                 if(finalId.includes("/playground/")) {
                   finalId = finalId.split("/playground/")[1];
                 }
                 navigate(`/playground/${finalId}`);
               }}
             >
               Join Room
             </Button>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate('/leaderboard')}>
              View Playground Leaderboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
