import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RefundRequest {
  id: string;
  booking_id: string;
  passenger_id: string;
  original_amount: number;
  refund_percentage: number;
  refund_amount: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  passenger_email?: string;
  passenger_name?: string;
  route_info?: string;
  seat_no?: number;
  travel_date?: string;
}

export default function ManageRefunds() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('refund_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    // Enrich with passenger + booking details
    const enriched = await Promise.all(
      data.map(async (r: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', r.passenger_id)
          .single();

        const { data: booking } = await supabase
          .from('bookings')
          .select('seat_no, travel_date, schedule_id')
          .eq('id', r.booking_id)
          .single();

        let routeInfo = '';
        if (booking?.schedule_id) {
          const { data: sched } = await supabase
            .from('schedules')
            .select('bus:buses(route:routes(departure, destination))')
            .eq('id', booking.schedule_id)
            .single();
          const route = (sched as any)?.bus?.route;
          if (route) routeInfo = `${route.departure} → ${route.destination}`;
        }

        return {
          ...r,
          passenger_email: profile?.email || '',
          passenger_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Unknown',
          route_info: routeInfo,
          seat_no: booking?.seat_no,
          travel_date: booking?.travel_date,
        };
      })
    );

    setRequests(enriched);
    setLoading(false);
  };

  const handleApprove = async (req: RefundRequest) => {
    if (!user) return;
    setProcessing(req.id);

    try {
      // 1. Update refund request status
      await supabase
        .from('refund_requests')
        .update({ status: 'approved', admin_note: adminNote || null, resolved_at: new Date().toISOString() })
        .eq('id', req.id);

      // 2. Credit wallet
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', req.passenger_id)
        .single();

      const newBalance = Number(profile?.wallet_balance || 0) + req.refund_amount;

      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', req.passenger_id);

      // 3. Create wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: req.passenger_id,
        amount: req.refund_amount,
        type: 'refund',
        description: `Refund for ${req.route_info || 'booking'} (Seat #${req.seat_no || '?'}) — ${req.refund_percentage}% policy`,
      });

      // 4. Notify passenger
      await supabase.from('notifications').insert({
        user_id: req.passenger_id,
        title: 'Refund Approved ✅',
        message: `Your refund of PKR ${req.refund_amount.toLocaleString()} has been credited to your SwiftBus Wallet.`,
      });

      toast.success(`Refund of PKR ${req.refund_amount.toLocaleString()} approved and credited!`);
      setAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: RefundRequest) => {
    if (!user) return;
    setProcessing(req.id);

    try {
      await supabase
        .from('refund_requests')
        .update({ status: 'rejected', admin_note: adminNote || 'Refund request rejected.', resolved_at: new Date().toISOString() })
        .eq('id', req.id);

      await supabase.from('notifications').insert({
        user_id: req.passenger_id,
        title: 'Refund Rejected ❌',
        message: `Your refund request for PKR ${req.refund_amount.toLocaleString()} was rejected. ${adminNote || ''}`.trim(),
      });

      toast.success('Refund rejected.');
      setAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const statusBadge: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-h1 text-3xl md:text-4xl text-white font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-400 text-[32px]">request_quote</span>
          Refund Requests
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-slate-900 text-xs font-bold rounded-full px-2.5 py-0.5 ml-2">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <p className="text-slate-400 mt-1">Review and process passenger cancellation refund requests.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? 'bg-electric-violet text-white shadow-[0_0_15px_rgba(138,117,240,0.3)]'
                : 'bg-surface-container/40 text-slate-400 border border-white/10 hover:bg-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-[40px] text-electric-violet">sync</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container/30 backdrop-blur-md rounded-xl border border-white/5">
          <span className="material-symbols-outlined text-[56px] text-slate-700 mb-3">inbox</span>
          <p className="text-slate-400 font-medium">No {filter !== 'all' ? filter : ''} refund requests</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(req => (
            <div
              key={req.id}
              className="bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge[req.status]}`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(req.created_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Passenger</p>
                      <p className="text-sm text-white font-semibold truncate">{req.passenger_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Route</p>
                      <p className="text-sm text-white">{req.route_info || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Travel Date</p>
                      <p className="text-sm text-white">{req.travel_date ? format(new Date(req.travel_date), 'MMM d, yyyy') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Seat</p>
                      <p className="text-sm text-white">#{req.seat_no || '?'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Original</p>
                      <p className="text-base text-white font-bold font-['Space_Grotesk']">PKR {req.original_amount.toLocaleString('en-PK')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Policy</p>
                      <p className="text-base text-amber-400 font-bold">{req.refund_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Refund</p>
                      <p className="text-base text-emerald-400 font-bold font-['Space_Grotesk']">PKR {req.refund_amount.toLocaleString('en-PK')}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions (only for pending) */}
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 md:min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Admin note (optional)"
                      value={processing === req.id ? adminNote : ''}
                      onChange={e => { setProcessing(req.id); setAdminNote(e.target.value); }}
                      onFocus={() => setProcessing(req.id)}
                      className="w-full bg-surface-container/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-electric-violet transition-colors"
                    />
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id && processing !== req.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Approve & Credit Wallet
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      className="w-full bg-surface-container border border-white/10 text-rose-400 font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95 hover:bg-rose-500/10 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      Reject
                    </button>
                  </div>
                )}

                {/* Resolved note */}
                {req.status !== 'pending' && req.admin_note && (
                  <div className="md:min-w-[200px] bg-surface-container/40 border border-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Note</p>
                    <p className="text-xs text-slate-300">{req.admin_note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
