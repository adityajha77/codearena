import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PlaygroundLeaderboard() {
  const navigate = useNavigate();
  
  // Dummy data for now. Would fetch from playground_leaderboard
  const leaders = [
    { rank: 1, wallet: "4aXY...8b9k", score: 1500, wins: 12 },
    { rank: 2, wallet: "9zPK...2x1m", score: 1350, wins: 9 },
    { rank: 3, wallet: "7uTY...5n4q", score: 1200, wins: 7 },
  ];

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Playground Leaderboard</h1>
        <Button onClick={() => navigate('/playground')}>Back to Lobby</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Competitors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Rank</TableHead>
                <TableHead>Wallet Address</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaders.map((leader) => (
                <TableRow key={leader.rank}>
                  <TableCell className="font-medium">#{leader.rank}</TableCell>
                  <TableCell className="font-mono">{leader.wallet}</TableCell>
                  <TableCell className="text-right">{leader.wins}</TableCell>
                  <TableCell className="text-right text-primary font-bold">{leader.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
