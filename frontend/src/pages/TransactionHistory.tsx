import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";

export default function TransactionHistory() {
  const { walletAddress } = useUserStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          challenges(title)
        `)
        .ilike('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        // Suppress error if table doesn't exist yet for dev
        if (error.code !== '42P01') {
           toast.error("Failed to load transactions.");
        }
      } else {
        setTransactions(data || []);
      }
      setIsLoading(false);
    };

    fetchTransactions();
  }, [walletAddress]);

  return (
    <div className="min-h-screen relative flex flex-col">
      <Particles />
      <Navbar />
      
      <main className="flex-1 pt-28 pb-20 container mx-auto px-4 z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
              <span className="gradient-text-primary">Transaction History</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Track your stakes and payouts.</p>
          </div>
        </ScrollReveal>

        {!walletAddress ? (
            <div className="text-center p-16 text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-black/10 max-w-3xl mx-auto">
              <div className="text-4xl mb-4 opacity-50">🔒</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
              <p>Please connect your wallet to view your transaction history.</p>
            </div>
        ) : isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : transactions.length === 0 ? (
            <div className="text-center p-16 text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-black/10 max-w-3xl mx-auto">
              <div className="text-4xl mb-4 opacity-50">🧾</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Transactions Found</h3>
              <p>You haven't made any deposits or received any payouts yet.</p>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {transactions.map((tx) => (
                <ScrollReveal key={tx.id}>
                    <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                tx.type === 'Deposit' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                            }`}>
                                {tx.type === 'Deposit' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-foreground">
                                    {tx.type === 'Deposit' ? 'Staked on Challenge' : 'Payout Received'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {tx.challenges?.title ? `Challenge: ${tx.challenges.title}` : (tx.recipient_address ? `To: ${tx.recipient_address.substring(0,8)}...` : 'Unknown Subject')}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 w-full md:w-auto text-right">
                            <div className={`text-xl font-mono font-bold ${
                                tx.type === 'Deposit' ? 'text-red-400' : 'text-green-400'
                            }`}>
                                {tx.type === 'Deposit' ? '-' : '+'}{tx.amount} SOL
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{new Date(tx.created_at).toLocaleString()}</span>
                                <a 
                                  href={`https://explorer.solana.com/tx/${tx.tx_hash}?cluster=devnet`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-1 hover:text-primary transition-colors bg-white/5 px-2 py-1 rounded"
                                >
                                    Solscan <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                    </div>
                </ScrollReveal>
              ))}
            </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
