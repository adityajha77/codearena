import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { addHours, isAfter, isBefore } from "date-fns";

// Ensure you have configured supabaseClient properly in your project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Playground() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("30");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleCreateRoom = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (mode === "schedule") {
      if (!scheduleTime) {
        toast.error("Please select a schedule time.");
        return;
      }
      const startTime = new Date(scheduleTime);
      const now = new Date();
      const maxTime = addHours(now, 48);

      if (isBefore(startTime, now)) {
        toast.error("Schedule time cannot be in the past.");
        return;
      }
      if (isAfter(startTime, maxTime)) {
        toast.error("You can only schedule up to 48 hours in advance.");
        return;
      }
    }

    setIsCreating(true);

    try {
      // Create room in Supabase
      const { data, error } = await supabase
        .from('playground_rooms')
        .insert({
          host_address: publicKey.toBase58(),
          difficulty,
          question_title: "Pending Selection", // Placeholder, ideally fetch from GitHub here
          question_repo_url: "sample_challenge.json", // Filename in your 'challenges' bucket
          question_tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          start_time: mode === "schedule" ? new Date(scheduleTime).toISOString() : null,
          duration_minutes: parseInt(duration),
          status: mode === "schedule" ? 'scheduled' : 'waiting'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Room created successfully!");

      // Add host as participant
      await supabase
        .from('playground_participants')
        .insert({
          room_id: data.id,
          wallet_address: publicKey.toBase58(),
          score: 0
        });

      navigate(`/playground/${data.id}`);

    } catch (error: any) {
      toast.error(error.message || "Failed to create room.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-4xl font-bold mb-8">Multiplayer Playground</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create a Room</CardTitle>
            <CardDescription>Start a challenge now or schedule one for later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label>Duration (Minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="5" max="180" />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input placeholder="e.g. DP, Binary Search, Trees" value={tags} onChange={(e) => setTags(e.target.value)} />
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
