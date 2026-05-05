import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import { Trophy, Clock, ArrowRight, Lock } from "lucide-react";

export default function PlaygroundLeaderboard() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyContests = async () => {
      if (!publicKey) return;
      
      // 1. Fetch my participations and the associated rooms
      const { data, error } = await supabase
        .from('playground_participants')
        .select(`
          room_id,
          score,
          playground_rooms (
            id,
            question_title,
            difficulty,
            status,
            created_at,
            host_address,
            room_name
          )
        `)
        .eq('wallet_address', publicKey.toBase58())
        .order('joined_at', { ascending: false });

      if (data) {
        // 2. Fetch host profiles to get their names
        const hostWallets = data.map(d => d.playground_rooms?.host_address).filter(Boolean);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('wallet_address, display_name')
          .in('wallet_address', hostWallets);
        
        const profileMap = new Map(profiles?.map(p => [p.wallet_address, p.display_name]) || []);

        // 3. Combine the data
        const combined = data.map(d => ({
          ...d,
          playground_rooms: {
            ...d.playground_rooms,
            host_name: profileMap.get(d.playground_rooms?.host_address) || d.playground_rooms?.host_address?.slice(0, 6) + "..."
          }
        }));
        
        setContests(combined);
      }

      setLoading(false);
    };

    fetchMyContests();
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="container max-w-4xl py-20 text-center">
        <Card className="border-dashed border-2 p-10">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">You need to connect your wallet to see your contest history and rankings.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Your Arena History</h1>
          <p className="text-muted-foreground mt-1">Review your performance and rankings from past "fights".</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/playground')}>Back to Lobby</Button>
      </div>
      
      {loading ? (
        <div className="text-center py-20">Loading your history...</div>
      ) : contests.length === 0 ? (
        <Card className="border-dashed border-2 p-20 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">You haven't participated in any contests yet.</p>
          <Button className="mt-4" onClick={() => navigate('/playground')}>Join a Contest</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contests.map((c) => {
            const room = c.playground_rooms;
            const isFinished = room.status === 'finished';
            
            return (
              <Card key={room.id} className={`overflow-hidden transition-all hover:border-primary/50 ${!isFinished ? "bg-muted/30" : ""}`}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isFinished ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {isFinished ? <Trophy className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{room.room_name || room.question_title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary/70">
                          {room.question_title}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            room.difficulty === 'Easy' ? "bg-green-500" : room.difficulty === 'Medium' ? "bg-yellow-500" : "bg-red-500"
                          }`} />
                          {room.difficulty}
                        </span>
                        <span>•</span>
                        <span>By {room.host_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      {isFinished ? (
                        <>
                          <p className="text-2xl font-black text-primary leading-none">{c.score || 0}</p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Final Score</p>
                        </>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                             <Lock className="w-3 h-3" />
                             Hidden
                           </div>
                           <p className="text-[10px] text-muted-foreground italic">Ends after timer</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => navigate(`/playground/${room.id}`)}
                      variant={isFinished ? "default" : "secondary"}
                      size="sm"
                    >
                      {isFinished ? "View Ranking" : "Back to Match"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
