import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, RotateCcw, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type RefundStatus = 'pending' | 'approved' | 'processed' | 'rejected';

interface RefundRow {
  id: string;
  booking_id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
  // joined from bookings → profiles
  passenger_email?: string;
  passenger_name?: string;
  seat_no?: number;
  route?: string;
}

const STATUS_CONFIG: Record<RefundStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   className: 'bg-warning/10 text-warning border-warning/30',              icon: RefreshCw },
  approved:  { label: 'Approved',  className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',           icon: CheckCircle2 },
  processed: { label: 'Processed', className: 'bg-success/10 text-success border-success/30',              icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  className: 'bg-destructive/10 text-destructive border-destructive/30',  icon: XCircle },
};

export default function ManageRefunds() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RefundStatus | 'all'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) { navigate('/'); return; }
      fetchRefunds();
    }
  }, [user, isAdmin, authLoading]);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      // Fetch all refunds
      const { data: refundData, error } = await supabase
        .from('refunds')
        .select('id, booking_id, payment_id, amount, reason, status, requested_at, processed_at, notes')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      if (!refundData?.length) { setRefunds([]); return; }

      // Enrich with booking + profile info
      const bookingIds = refundData.map((r) => r.booking_id);
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, seat_no, passenger_id, schedule_id')
        .in('id', bookingIds);

      const passengerIds = [...new Set((bookingsData || []).map((b: any) => b.passenger_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', passengerIds);

      const scheduleIds = [...new Set((bookingsData || []).map((b: any) => b.schedule_id).filter(Boolean))];
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, route:routes(departure, destination)')
        .in('id', scheduleIds.length ? scheduleIds : ['']);

      const enriched: RefundRow[] = refundData.map((r) => {
        const booking = bookingsData?.find((b: any) => b.id === r.booking_id);
        const profile = profilesData?.find((p: any) => p.id === booking?.passenger_id);
        const schedule = schedulesData?.find((s: any) => s.id === booking?.schedule_id);
        const route = (schedule?.route as any);

        return {
          ...r,
          status: r.status as RefundStatus,
          seat_no: booking?.seat_no,
          passenger_email: profile?.email ?? '—',
          passenger_name: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '—',
          route: route ? `${route.departure} → ${route.destination}` : '—',
        };
      });

      setRefunds(enriched);
    } catch (err: any) {
      toast.error(`Error loading refunds: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (refundId: string, newStatus: RefundStatus) => {
    setUpdatingId(refundId);
    try {
      const { error } = await supabase
        .from('refunds')
        .update({ status: newStatus })
        .eq('id', refundId);

      if (error) throw error;

      setRefunds((prev) =>
        prev.map((r) => r.id === refundId ? { ...r, status: newStatus } : r)
      );

      const labels: Record<RefundStatus, string> = {
        approved:  '✅ Refund approved',
        processed: '💸 Refund marked as processed. Payment flag updated.',
        rejected:  '❌ Refund rejected',
        pending:   'Refund set to pending',
      };
      toast.success(labels[newStatus]);
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const displayed = filter === 'all' ? refunds : refunds.filter((r) => r.status === filter);
  const counts = { all: refunds.length, ...Object.fromEntries(
    (['pending', 'approved', 'processed', 'rejected'] as RefundStatus[]).map(
      (s) => [s, refunds.filter((r) => r.status === s).length]
    )
  )};

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-accent" /> Manage Refunds
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and process passenger refund requests
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRefunds}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'approved', 'processed', 'rejected'] as RefundStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-xl border p-4 text-left transition-all hover:opacity-80 ${
                filter === s ? cfg.className + ' shadow-md' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <RotateCcw className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No refund requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayed.map((refund) => {
            const cfg = STATUS_CONFIG[refund.status];
            const Icon = cfg.icon;
            const isUpdating = updatingId === refund.id;

            return (
              <Card key={refund.id} className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Info */}
                    <div className="flex-1 p-5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{refund.id.slice(0, 8)}…</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Passenger</p>
                          <p className="font-medium">{refund.passenger_name}</p>
                          <p className="text-xs text-muted-foreground">{refund.passenger_email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Route</p>
                          <p className="font-medium">{refund.route}</p>
                          {refund.seat_no && <p className="text-xs text-muted-foreground">Seat #{refund.seat_no}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Refund Amount</p>
                          <p className="font-semibold text-success text-base">Rs. {Number(refund.amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Requested</p>
                          <p className="font-medium">{format(parseISO(refund.requested_at), 'MMM d, yyyy')}</p>
                          {refund.processed_at && (
                            <p className="text-xs text-muted-foreground">
                              Processed {format(parseISO(refund.processed_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>

                      {refund.reason && (
                        <p className="text-xs text-muted-foreground border-t border-border pt-2">
                          Reason: {refund.reason}
                        </p>
                      )}
                    </div>

                    {/* Action panel */}
                    <div className="flex flex-col items-stretch justify-center gap-2 border-t border-border/50 bg-muted/20 p-5 md:border-l md:border-t-0 md:w-48">
                      {refund.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                            disabled={isUpdating}
                            onClick={() => updateStatus(refund.id, 'approved')}
                          >
                            {isUpdating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white w-full"
                            disabled={isUpdating}
                            onClick={() => updateStatus(refund.id, 'rejected')}
                          >
                            <XCircle className="mr-2 h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}
                      {refund.status === 'approved' && (
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground w-full"
                          disabled={isUpdating}
                          onClick={() => updateStatus(refund.id, 'processed')}
                        >
                          {isUpdating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                          Mark Processed
                        </Button>
                      )}
                      {(refund.status === 'processed' || refund.status === 'rejected') && (
                        <p className="text-xs text-muted-foreground text-center capitalize">{refund.status}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
