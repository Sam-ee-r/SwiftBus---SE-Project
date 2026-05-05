import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PassengerNav } from '@/components/PassengerNav';
import { format } from 'date-fns';

interface WalletTxn {
  id: string;
  amount: number;
  type: 'refund' | 'payment';
  description: string;
  created_at: string;
}

export default function Wallet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) fetchWallet();
  }, [user, authLoading]);

  const fetchWallet = async () => {
    if (!user) return;

    // Fetch balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setBalance(Number(profile?.wallet_balance || 0));

    // Fetch transactions
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (txns) setTransactions(txns as WalletTxn[]);

    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="bg-deep-space text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  return (
    <div className="bg-deep-space text-on-surface font-body-md antialiased min-h-screen relative overflow-x-hidden selection:bg-electric-violet selection:text-white">
      <PassengerNav />

      <main className="relative z-10 pt-[80px] pb-[84px] md:pb-8 px-4 md:px-margin max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-h1 text-3xl md:text-4xl font-bold text-on-surface flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-[32px]">account_balance_wallet</span>
            My Wallet
          </h1>
          <p className="font-body-lg text-sm text-on-surface-variant mt-1">Your refund credits for future bookings.</p>
        </header>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-electric-violet/20 to-emerald-500/10 border border-white/10 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Available Balance</p>
          <p className="text-4xl md:text-5xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
            <span className="text-xl text-slate-400 mr-1">PKR</span>
            {balance.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Use this balance to pay for your next SwiftBus booking
          </p>
        </div>

        {/* Transactions */}
        <div className="bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-bold text-white text-sm uppercase tracking-widest">Transaction History</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <span className="material-symbols-outlined text-[48px] text-slate-700 mb-3">receipt_long</span>
              <p className="text-sm text-slate-400 font-medium">No transactions yet</p>
              <p className="text-xs text-slate-600 mt-1">Refunded amounts will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {transactions.map(txn => (
                <div key={txn.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    txn.type === 'refund'
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-rose-500/20 border border-rose-500/30'
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] ${
                      txn.type === 'refund' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {txn.type === 'refund' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{txn.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(txn.created_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                  <p className={`text-lg font-bold font-['Space_Grotesk'] shrink-0 ${
                    txn.type === 'refund' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {txn.type === 'refund' ? '+' : '-'}PKR {Math.abs(txn.amount).toLocaleString('en-PK')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
