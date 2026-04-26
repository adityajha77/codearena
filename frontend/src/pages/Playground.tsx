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
  const [scheduleTime, setScheduleTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

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

    setIsCreating(true);

    try {
      // Create room in Supabase
      const { data, error } = await supabase
        .from('playground_rooms')
        .insert({
          host_address: publicKey.toBase58(),
          difficulty,
          question_title: "Pending Selection", // Placeholder, ideally fetch from GitHub here
          question_repo_url: "https://raw.githubusercontent.com/adityajha77/codearena/main/sample-question.json", // Sample
          question_tags: tags.split(",").map(t => t.trim()),
          start_time: startTime.toISOString(),
          duration_minutes: parseInt(duration),
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Room scheduled successfully!");
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
            <CardDescription>Schedule a coding competition and invite your friends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label>Schedule Time (Max 48 hours from now)</Label>
              <Input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full">
              {isCreating ? "Creating..." : "Create & Schedule Room"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Room</CardTitle>
            <CardDescription>Have an invite link? Enter the room ID here.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-4">
               If you received a WhatsApp link, simply click it to join the room directly.
             </p>
             {/* You can add a text input here for Room ID later if needed */}
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
