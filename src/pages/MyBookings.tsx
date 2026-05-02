import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Bus, MapPin, Calendar, Clock, Ticket, Loader2,
  RotateCcw, CheckCircle2, XCircle, RefreshCw, Navigation, Share2,
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  status: string;
  refund_flag: boolean;
}

interface Refund {
  id: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  amount: number;
  requested_at: string;
}

interface Booking {
  id: string;
  seat_no: number;
  status: string;
  travel_date: string;
  departure_time?: string | null;
  booking_date: string;
  payment?: Payment | null;
  seat_price?: number | null;
  refund?: Refund | null;
  schedule_id?: string | null;
  schedule_status?: string | null;
  bus: {
    id: string;
    bus_no: string;
    route: {
      departure: string;
      destination: string;
      distance_km: number;
    } | null;
  };
}

// ── Refund status badge ──────────────────────────────────────────────────────
function RefundBadge({ refund }: { refund: Refund | null | undefined }) {
  if (!refund) return null;
  const cfg: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending:   { label: 'Refund Pending',   className: 'bg-warning/10 text-warning border-warning/30',    icon: RefreshCw },
    approved:  { label: 'Refund Approved',  className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',  icon: CheckCircle2 },
    processed: { label: 'Refunded',         className: 'bg-success/10 text-success border-success/30',     icon: CheckCircle2 },
    rejected:  { label: 'Refund Rejected',  className: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  };
  const c = cfg[refund.status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${c.className}`}>
      <Icon className="h-3 w-3" /> {c.label}
    </Badge>
  );
}

export default function MyBookings() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancel + refund dialog state
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!authLoading && user && isAdmin) { navigate('/admin'); return; }
    if (user) fetchBookings();
  }, [user, authLoading]);

  // ── Fetch bookings + related data ─────────────────────────────────────────
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, seat_no, status, travel_date, booking_date, schedule_id, payments(id, amount, status, refund_flag)')
        .eq('passenger_id', user?.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) { setBookings([]); return; }

      // Fetch schedules
      const scheduleIds = data.map((b: any) => b.schedule_id).filter(Boolean);
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, travel_date, departure_time, seat_price, status, bus:buses(id, bus_no), route:routes(departure, destination, distance_km)')
        .in('id', scheduleIds.length ? scheduleIds : ['']);

      // Fetch refunds for all bookings
      const bookingIds = data.map((b: any) => b.id);
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('id, booking_id, status, amount, requested_at')
        .in('booking_id', bookingIds);

      const bookingsWithDetails: Booking[] = data.map((booking: any) => {
        const schedule = schedulesData?.find((s: any) => s.id === booking.schedule_id);
        const bus = schedule?.bus;
        const route = schedule?.route;
        const payment = booking.payments?.length ? booking.payments[0] : null;
        const refund = refundsData?.find((r: any) => r.booking_id === booking.id) ?? null;

        return {
          ...booking,
          travel_date: booking.travel_date || schedule?.travel_date,
          departure_time: schedule?.departure_time ?? null,
          payment,
          seat_price: schedule?.seat_price ?? null,
          refund,
          schedule_id: booking.schedule_id ?? null,
          schedule_status: schedule?.status ?? null,
          bus: {
            id: bus?.id,
            bus_no: bus?.bus_no || '',
            route: route ? { departure: route.departure, destination: route.destination, distance_km: route.distance_km } : null,
          },
        };
      });

      setBookings(bookingsWithDetails);
    } catch (error: any) {
      toast.error(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel booking + auto-create refund request ───────────────────────────
  const handleCancelAndRefund = async () => {
    if (!targetBooking) return;
    setProcessing(true);
    try {
      // 1. Mark booking as cancelled
      const { error: cancelErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', targetBooking.id);
      if (cancelErr) throw cancelErr;

      // 2. If a payment exists, raise a refund request automatically
      if (targetBooking.payment?.id) {
        const refundAmount = Number(targetBooking.payment.amount);
        const { error: refundErr } = await supabase
          .from('refunds')
          .insert({
            payment_id: targetBooking.payment.id,
            booking_id: targetBooking.id,
            amount: refundAmount,
            reason: 'Booking cancelled by passenger',
            status: 'pending',
          });
        if (refundErr) throw refundErr;
        toast.success('Booking cancelled! Refund request submitted.', {
          description: `Rs. ${refundAmount.toFixed(2)} refund is pending admin approval.`,
        });
      } else {
        toast.success('Booking cancelled successfully.');
      }

      setDialogOpen(false);
      fetchBookings();
    } catch (error: any) {
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openCancelDialog = (booking: Booking) => {
    setTargetBooking(booking);
    setDialogOpen(true);
  };

  // ── Status badge ──────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-success text-success-foreground">Confirmed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending':   return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:          return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Cancel / Refund Confirmation Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Cancel & Request Refund
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking?
            </DialogDescription>
          </DialogHeader>

          {targetBooking && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bus</span>
                <span className="font-medium">{targetBooking.bus.bus_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium">
                  {targetBooking.bus.route
                    ? `${targetBooking.bus.route.departure} → ${targetBooking.bus.route.destination}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seat</span>
                <span className="font-medium">#{targetBooking.seat_no}</span>
              </div>
              {targetBooking.payment && (
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Refund amount</span>
                  <span className="font-semibold text-success">
                    Rs. {Number(targetBooking.payment.amount).toFixed(2)}
                  </span>
                </div>
              )}
              {!targetBooking.payment && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  No payment recorded — booking will simply be cancelled.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {targetBooking?.payment
              ? 'Your refund request will be reviewed and processed by an admin within 3–5 business days.'
              : 'This action cannot be undone.'}
          </p>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancelAndRefund} disabled={processing}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {targetBooking?.payment ? 'Cancel & Request Refund' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">My Bookings</h1>
          <p className="mt-2 text-muted-foreground">View and manage your bus reservations</p>
        </div>

        {bookings.length === 0 ? (
          <Card className="border-border/50 shadow-soft">
            <CardContent className="py-16 text-center">
              <Ticket className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-medium text-muted-foreground">No bookings yet</h2>
              <p className="mt-2 text-sm text-muted-foreground/70">Start by searching for buses and booking your seats</p>
              <Button variant="accent" className="mt-6" onClick={() => navigate('/search')}>
                Search Buses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isPast = isBefore(parseISO(booking.travel_date), startOfDay(new Date()));
              const isCancelled = booking.status === 'cancelled';
              const hasRefund = !!booking.refund;

              return (
                <Card key={booking.id} className="border-border/50 shadow-soft overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* ── Booking Info ─────────────────────────────── */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Bus className="h-5 w-5 text-primary" />
                              <span className="font-semibold text-foreground">{booking.bus.bus_no}</span>
                              {getStatusBadge(booking.status)}
                              <RefundBadge refund={booking.refund} />
                            </div>
                            {booking.bus.route && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{booking.bus.route.departure} → {booking.bus.route.destination}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(parseISO(booking.travel_date), 'MMM d, yyyy')}</span>
                            {booking.departure_time && (
                              <>
                                <span className="mx-1">•</span>
                                <Clock className="h-4 w-4" />
                                <span>{String(booking.departure_time).slice(0, 5)}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4" />
                            <span>Seat #{booking.seat_no}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Booked {format(parseISO(booking.booking_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                        {/* ── Payment + refund info ──────────────────── */}
                        <div className="mt-4 text-sm text-muted-foreground space-y-1">
                          <div>Booking ID: <span className="font-medium text-foreground">{booking.id}</span></div>
                          {booking.payment && (
                            <div>
                              Payment: <span className="font-medium text-foreground">Rs. {Number(booking.payment.amount).toFixed(2)}</span>
                              {' '}(<span className="capitalize">{booking.payment.status}</span>)
                              {booking.payment.refund_flag && (
                                <span className="ml-2 inline-flex items-center gap-1 text-success font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Refunded
                                </span>
                              )}
                            </div>
                          )}
                          {booking.seat_price != null && !booking.payment && (
                            <div>Price: <span className="font-medium text-foreground">Rs. {Number(booking.seat_price).toFixed(2)}</span></div>
                          )}
                          {booking.refund && (
                            <div className="text-xs text-muted-foreground/70">
                              Refund requested: {format(parseISO(booking.refund.requested_at), 'MMM d, yyyy')}
                              {' · '}Rs. {Number(booking.refund.amount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Action Panel ──────────────────────────────── */}
                      <div className="flex flex-col items-center justify-center gap-3 border-t border-border/50 bg-muted/30 p-6 md:border-l md:border-t-0 md:w-52">
                        {/* Live tracking button */}
                        {booking.schedule_status === 'in_transit' && booking.schedule_id && !isCancelled && (
                          <>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> LIVE NOW
                            </div>
                            <Button
                              variant="accent"
                              size="sm"
                              className="w-full"
                              onClick={() => navigate(`/track/${booking.schedule_id}`)}
                            >
                              <Navigation className="mr-2 h-4 w-4" />
                              Track Ride
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/track/${booking.schedule_id}`);
                                toast.success('Tracking link copied!');
                              }}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Share Link
                            </Button>
                          </>
                        )}
                        {!isCancelled && !isPast && booking.schedule_status !== 'in_transit' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
                            onClick={() => openCancelDialog(booking)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {booking.payment ? 'Cancel & Refund' : 'Cancel Booking'}
                          </Button>
                        )}
                        {isPast && !isCancelled && booking.schedule_status !== 'in_transit' && (
                          <span className="text-sm text-muted-foreground text-center">Trip completed</span>
                        )}
                        {isCancelled && !hasRefund && (
                          <span className="text-sm text-destructive text-center">Cancelled</span>
                        )}
                        {isCancelled && hasRefund && (
                          <div className="text-center space-y-1">
                            <RefundBadge refund={booking.refund} />
                          </div>
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
    </div>
  );
}
