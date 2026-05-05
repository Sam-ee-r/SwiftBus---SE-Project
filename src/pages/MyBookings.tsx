import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO, isBefore, startOfDay, differenceInHours } from 'date-fns';
import { PassengerNav } from '@/components/PassengerNav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CITY_NAMES } from '@/lib/constants';
import { jsPDF } from 'jspdf';

interface SingleBooking {
  id: string;
  schedule_id: string;
  schedule_status?: string;
  status: string;
  travel_date: string;
  booking_date: string;
  departure_time: string | null;
  seat_no: number;
  seat_price: number;
  payment: any;
  refund_status?: string;
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

function getRefundTier(hoursUntilDeparture: number): { percentage: number; label: string; color: string } {
  if (hoursUntilDeparture >= 24) return { percentage: 100, label: 'Full Refund', color: 'text-emerald-400' };
  if (hoursUntilDeparture >= 12) return { percentage: 50, label: '50% Refund', color: 'text-amber-400' };
  if (hoursUntilDeparture >= 6) return { percentage: 25, label: '25% Refund', color: 'text-orange-400' };
  return { percentage: 0, label: 'No Refund', color: 'text-rose-400' };
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return 'N/A';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MyBookings() {
  const { user, loading: authLoading, isAdmin, isDriver } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<SingleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SingleBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketBooking, setTicketBooking] = useState<SingleBooking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!authLoading && user && isAdmin) {
      navigate('/admin');
      return;
    }
    if (!authLoading && user && isDriver) {
      navigate('/driver');
      return;
    }
    if (user) {
      fetchBookings();
    }
  }, [user, isAdmin, isDriver, authLoading, navigate]);

  // Realtime: update schedule_status live when driver completes a trip
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('passenger-schedules-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules' }, (payload) => {
        const updated = payload.new;
        setBookings(prev => prev.map(b =>
          b.schedule_id === updated.id ? { ...b, schedule_status: updated.status } : b
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          seat_no,
          status,
          travel_date,
          booking_date,
          schedule_id,
          payments(id, amount, status)
        `)
        .eq('passenger_id', user?.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setBookings([]);
        return;
      }

      const scheduleIds = [...new Set((data || []).map((b: any) => b.schedule_id).filter(Boolean))];
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, travel_date, departure_time, arrival_time, seat_price, status, bus:buses(id, bus_no), route:routes(id, departure, destination, distance_km)')
        .in('id', scheduleIds.length ? scheduleIds : ['']);

      // Fetch existing refund requests for these bookings
      const bookingIds = (data || []).map((b: any) => b.id);
      const { data: refundsData } = await supabase
        .from('refund_requests')
        .select('booking_id, status')
        .in('booking_id', bookingIds.length ? bookingIds : ['']);

      const bookingsWithDetails = (data || []).map((booking: any) => {
        const schedule = schedulesData?.find((s: any) => s.id === booking.schedule_id);
        const bus = schedule?.bus;
        const route = schedule?.route;
        const payment = booking.payments && booking.payments.length ? booking.payments[0] : null;
        const refund = refundsData?.find((r: any) => r.booking_id === booking.id);

        return {
          id: booking.id,
          schedule_id: booking.schedule_id,
          status: booking.status,
          travel_date: booking.travel_date || schedule?.travel_date,
          booking_date: booking.booking_date,
          departure_time: schedule?.departure_time ?? null,
          seat_no: booking.seat_no,
          seat_price: Number(schedule?.seat_price || 0),
          payment: payment,
          refund_status: refund?.status,
          schedule_status: schedule?.status,
          bus: {
            id: bus?.id,
            bus_no: bus?.bus_no || '',
            route: route ? { departure: route.departure, destination: route.destination, distance_km: route.distance_km } : null,
          },
        };
      });

      setBookings(bookingsWithDetails as SingleBooking[]);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openRefundDialog = (booking: SingleBooking) => {
    setSelectedBooking(booking);
    setShowRefundDialog(true);
  };

  const handleCancelWithRefund = async () => {
    if (!selectedBooking || !user) return;
    setCancelling(true);

    try {
      // Calculate hours until departure
      const depDate = parseISO(selectedBooking.travel_date);
      if (selectedBooking.departure_time) {
        const [h, m] = selectedBooking.departure_time.split(':').map(Number);
        depDate.setHours(h, m, 0);
      }
      const hoursLeft = differenceInHours(depDate, new Date());
      const tier = getRefundTier(hoursLeft);
      const refundAmount = Math.round(selectedBooking.seat_price * tier.percentage / 100);

      // Create refund request
      const { error: refundErr } = await supabase
        .from('refund_requests')
        .insert({
          booking_id: selectedBooking.id,
          passenger_id: user.id,
          original_amount: selectedBooking.seat_price,
          refund_percentage: tier.percentage,
          refund_amount: refundAmount,
        });
      if (refundErr) throw refundErr;

      // Mark booking as cancelled
      const { error: bookErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', selectedBooking.id);
      if (bookErr) throw bookErr;

      toast.success(
        tier.percentage > 0
          ? `Cancellation submitted! Refund of PKR ${refundAmount.toLocaleString()} (${tier.percentage}%) is pending admin approval.`
          : 'Booking cancelled. No refund is available due to late cancellation.'
      );
      setShowRefundDialog(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setCancelling(false);
    }
  };

  // ── PDF Ticket Generator ──────────────────────────────────
  const generateTicketPDF = (b: SingleBooking) => {
    const doc = new jsPDF({ unit: 'mm', format: [210, 110] });
    const dep = CITY_NAMES[b.bus.route?.departure || ''] || b.bus.route?.departure || '—';
    const dest = CITY_NAMES[b.bus.route?.destination || ''] || b.bus.route?.destination || '—';
    const depCode = b.bus.route?.departure || '';
    const destCode = b.bus.route?.destination || '';
    const date = b.travel_date ? format(parseISO(b.travel_date), 'dd MMM yyyy') : '—';
    const time = b.departure_time ? formatTime(b.departure_time) : 'N/A';
    const refId = b.id.slice(0, 8).toUpperCase();

    // Background
    doc.setFillColor(15, 13, 21);
    doc.rect(0, 0, 210, 110, 'F');

    // Purple accent bar
    doc.setFillColor(138, 117, 240);
    doc.rect(0, 0, 210, 4, 'F');

    // Brand
    doc.setTextColor(138, 117, 240);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SWIFTBUS', 12, 16);
    doc.setTextColor(120, 120, 140);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('E-TICKET', 12, 21);

    // Status badge
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(b.status.toUpperCase(), 198, 16, { align: 'right' });

    // Divider
    doc.setDrawColor(40, 38, 55);
    doc.setLineWidth(0.3);
    doc.line(12, 26, 198, 26);

    // Route section
    doc.setTextColor(120, 120, 140);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('FROM', 12, 34);
    doc.text('TO', 115, 34);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(depCode, 12, 43);
    doc.text(destCode, 115, 43);

    doc.setTextColor(180, 180, 195);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(dep, 12, 49);
    doc.text(dest, 115, 49);

    // Arrow
    doc.setTextColor(138, 117, 240);
    doc.setFontSize(14);
    doc.text('\u2192', 90, 43);

    // Divider
    doc.setDrawColor(40, 38, 55);
    doc.line(12, 54, 198, 54);

    // Details grid
    const details = [
      ['DATE', date],
      ['TIME', time],
      ['SEAT', `#${b.seat_no}`],
      ['BUS', b.bus.bus_no],
    ];
    details.forEach(([label, value], i) => {
      const x = 12 + i * 47;
      doc.setTextColor(120, 120, 140);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x, 62);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x, 68);
    });

    // Divider
    doc.line(12, 74, 198, 74);

    // Price & Reference
    doc.setTextColor(120, 120, 140);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('AMOUNT PAID', 12, 82);
    doc.text('BOOKING REF', 115, 82);

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PKR ${b.seat_price.toLocaleString()}`, 12, 90);

    doc.setTextColor(138, 117, 240);
    doc.setFontSize(12);
    doc.text(refId, 115, 90);

    // Footer
    doc.setTextColor(80, 80, 100);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Present this ticket at the boarding point. Powered by SwiftBus.', 12, 105);

    doc.save(`SwiftBus-Ticket-${refId}.pdf`);
    toast.success('Ticket PDF downloaded!');
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

      {/* Main Content */}
      <main className="relative z-10 pt-[80px] pb-[84px] md:pb-8 px-4 md:px-margin max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-lg">
          <h1 className="font-h1 text-4xl md:text-5xl font-bold text-on-surface mb-2">My Bookings</h1>
          <p className="font-body-lg text-lg text-on-surface-variant">View and manage your upcoming travel.</p>
        </header>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-80 bg-surface-container/30 backdrop-blur-md rounded-xl border border-white/5">
            <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">confirmation_number</span>
            <h2 className="text-xl font-medium text-white">No bookings yet</h2>
            <p className="text-on-surface-variant mt-2">Start your journey by searching for available routes.</p>
            <button 
              onClick={() => navigate('/search')}
              className="mt-6 px-6 py-3 rounded-lg font-label-md bg-electric-violet text-white hover:bg-electric-violet/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(138,117,240,0.3)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined">search</span>
              Search Buses
            </button>
          </div>
        ) : (
          /* Booking Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {bookings.map((booking) => {
              const isPast = isBefore(parseISO(booking.travel_date), startOfDay(new Date()));
              const isCancelled = booking.status === 'cancelled';
              const isPending = booking.status === 'pending';
              const isConfirmed = booking.status === 'confirmed';
              const isCompleted = booking.schedule_status === 'completed';

              return (
                <article 
                  key={booking.id}
                  className={`bg-surface-container/60 backdrop-blur-md rounded-xl border p-md flex flex-col gap-md relative overflow-hidden group transition-all duration-300 ${
                    isCancelled ? 'opacity-70 border-white/5 hover:opacity-100' : 'border-white/10 hover:border-electric-violet/30'
                  }`}
                >
                  {/* Subtle glow effect on hover */}
                  {!isCancelled && (
                    <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  )}
                  
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-xl ${isCancelled ? 'text-outline' : 'text-electric-violet'}`}>
                          directions_bus
                        </span>
                        <span className="font-label-md text-sm font-semibold tracking-wide text-on-surface-variant uppercase">
                          {booking.bus.bus_no}
                        </span>
                      </div>
                      <h2 className={`font-h3 text-xl md:text-2xl font-semibold text-on-surface ${isCancelled ? 'line-through text-on-surface-variant' : ''}`}>
                        {booking.bus.route?.departure} to {booking.bus.route?.destination}
                      </h2>
                    </div>
                    
                    {isConfirmed && !isCompleted && (
                      <span className="bg-emerald-spark/20 text-emerald-spark font-label-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-spark/30">
                        Confirmed
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-sky-500/20 text-sky-400 font-label-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-sky-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">task_alt</span>
                        Completed
                      </span>
                    )}
                    {isCancelled && (
                      <span className="bg-error/10 text-error font-label-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-error/20">
                        Cancelled
                      </span>
                    )}
                    {isPending && (
                      <span className="bg-tertiary/20 text-tertiary font-label-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-tertiary/30">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-sm z-10 bg-surface-container-lowest/50 rounded-lg p-sm border border-white/5">
                    <div>
                      <p className="font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Date</p>
                      <p className={`font-body-md text-base ${isCancelled ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                        {format(parseISO(booking.travel_date), 'dd-MM-yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Time</p>
                      <p className={`font-body-md text-base ${isCancelled ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                        {formatTime(booking.departure_time || '')}
                      </p>
                    </div>
                    <div>
                      <p className="font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Seat</p>
                      <p className={`font-body-md text-base font-semibold ${isCancelled ? 'text-on-surface-variant' : 'text-emerald-spark'}`}>
                        {booking.seat_no}
                      </p>
                    </div>
                    <div>
                      <p className="font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Terminal</p>
                      <p className={`font-body-md text-base ${isCancelled ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                        Main Hub
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 mt-auto z-10">
                    {!isCancelled && !isPast && !isCompleted && !booking.refund_status && (
                      <button 
                        onClick={() => openRefundDialog(booking)}
                        className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold text-on-surface-variant border border-outline-variant hover:bg-white/5 hover:text-white hover:border-white/20 active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    {booking.refund_status === 'pending' && (
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Refund Pending
                      </span>
                    )}
                    {(isPast || isCompleted) && !isCancelled && (
                      <span className="px-4 py-2 font-label-md text-sm text-sky-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Trip Completed
                      </span>
                    )}
                    {!isCancelled && (
                      <button
                        onClick={() => { setTicketBooking(booking); setShowTicket(true); }}
                        className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold bg-electric-violet text-white hover:bg-electric-violet/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(138,117,240,0.3)]"
                      >
                        View Ticket
                      </button>
                    )}
                    {isConfirmed && booking.schedule_status === 'in_transit' && (
                      <button 
                        onClick={() => navigate(`/track/${booking.schedule_id}`)}
                        className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold bg-emerald-spark text-surface-container-lowest hover:bg-emerald-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">radar</span>
                        Live Tracking
                      </button>
                    )}
                    {isCancelled && (
                      <button className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-bright active:scale-95 transition-all">
                        Details
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>


      {/* ── Refund Policy Dialog ── */}
      <Dialog open={showRefundDialog} onOpenChange={(o) => { if (!o) { setShowRefundDialog(false); setSelectedBooking(null); } }}>
        <DialogContent className="max-w-md bg-surface border-white/10 text-on-surface">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">policy</span>
              Cancellation & Refund Policy
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Please review our refund tiers before cancelling.
            </DialogDescription>
          </DialogHeader>

          {/* Policy Tiers */}
          <div className="space-y-2 my-4">
            {[
              { hours: '24+ hours', pct: '100%', color: 'emerald' },
              { hours: '12–24 hours', pct: '50%', color: 'amber' },
              { hours: '6–12 hours', pct: '25%', color: 'orange' },
              { hours: 'Under 6 hours', pct: '0%', color: 'rose' },
            ].map(tier => (
              <div key={tier.hours} className={`flex items-center justify-between rounded-lg px-4 py-2.5 bg-${tier.color}-500/10 border border-${tier.color}-500/20`}>
                <span className="text-sm text-slate-300">{tier.hours} before departure</span>
                <span className={`text-sm font-bold text-${tier.color}-400`}>{tier.pct} refund</span>
              </div>
            ))}
          </div>

          {/* Calculated refund for this booking */}
          {selectedBooking && (() => {
            const depDate = parseISO(selectedBooking.travel_date);
            if (selectedBooking.departure_time) {
              const [h, m] = selectedBooking.departure_time.split(':').map(Number);
              depDate.setHours(h, m, 0);
            }
            const hoursLeft = Math.max(0, differenceInHours(depDate, new Date()));
            const tier = getRefundTier(hoursLeft);
            const refundAmount = Math.round(selectedBooking.seat_price * tier.percentage / 100);

            return (
              <div className="bg-surface-container/60 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Route</span>
                  <span className="text-white font-semibold">{selectedBooking.bus.route?.departure} → {selectedBooking.bus.route?.destination}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Seat #{selectedBooking.seat_no}</span>
                  <span className="text-white">PKR {selectedBooking.seat_price.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time until departure</span>
                  <span className="text-white">{hoursLeft} hours</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-sm text-slate-400">Your refund</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-['Space_Grotesk'] ${tier.color}`}>
                      PKR {refundAmount.toLocaleString('en-PK')}
                    </span>
                    <span className={`text-xs ml-2 font-bold ${tier.color}`}>({tier.label})</span>
                  </div>
                </div>
                {tier.percentage > 0 && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    Refund will be credited to your SwiftBus Wallet after admin approval
                  </p>
                )}
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setShowRefundDialog(false); setSelectedBooking(null); }}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all active:scale-95"
            >
              Keep Booking
            </button>
            <button
              onClick={handleCancelWithRefund}
              disabled={cancelling}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              {cancelling ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              )}
              {cancelling ? 'Processing...' : 'Confirm Cancellation'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Ticket Dialog ── */}
      <Dialog open={showTicket} onOpenChange={(o) => { if (!o) { setShowTicket(false); setTicketBooking(null); } }}>
        <DialogContent className="max-w-md bg-[#0f0d15] border-white/10 text-on-surface p-0 overflow-hidden">
          {ticketBooking && (() => {
            const dep = CITY_NAMES[ticketBooking.bus.route?.departure || ''] || ticketBooking.bus.route?.departure || '—';
            const dest = CITY_NAMES[ticketBooking.bus.route?.destination || ''] || ticketBooking.bus.route?.destination || '—';
            const depCode = ticketBooking.bus.route?.departure || '';
            const destCode = ticketBooking.bus.route?.destination || '';
            const date = ticketBooking.travel_date ? format(parseISO(ticketBooking.travel_date), 'dd MMM yyyy') : '—';
            const time = ticketBooking.departure_time ? formatTime(ticketBooking.departure_time) : 'N/A';
            const refId = ticketBooking.id.slice(0, 8).toUpperCase();

            return (
              <div className="relative">
                {/* Purple top bar */}
                <div className="h-1.5 bg-gradient-to-r from-electric-violet to-emerald-spark"></div>

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-electric-violet tracking-wider">SWIFTBUS</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">E-Ticket</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {ticketBooking.status}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="border-t border-white/5 pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">From</p>
                        <p className="text-3xl font-bold text-white tracking-tight mt-1">{depCode}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{dep}</p>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-electric-violet"></div>
                          <div className="w-16 h-[1px] bg-gradient-to-r from-electric-violet to-emerald-spark"></div>
                          <span className="material-symbols-outlined text-emerald-400 text-[20px]">directions_bus</span>
                          <div className="w-16 h-[1px] bg-gradient-to-r from-emerald-spark to-electric-violet"></div>
                          <div className="w-2 h-2 rounded-full bg-electric-violet"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">To</p>
                        <p className="text-3xl font-bold text-white tracking-tight mt-1">{destCode}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{dest}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="border-t border-dashed border-white/10 pt-4 grid grid-cols-4 gap-3">
                    {[
                      { label: 'Date', value: date, icon: 'calendar_today' },
                      { label: 'Time', value: time, icon: 'schedule' },
                      { label: 'Seat', value: `#${ticketBooking.seat_no}`, icon: 'event_seat' },
                      { label: 'Bus', value: ticketBooking.bus.bus_no, icon: 'directions_bus' },
                    ].map(d => (
                      <div key={d.label} className="text-center">
                        <span className="material-symbols-outlined text-[16px] text-slate-600">{d.icon}</span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{d.label}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Price & Reference */}
                  <div className="border-t border-dashed border-white/10 mt-4 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Amount Paid</p>
                      <p className="text-xl font-bold text-emerald-400 font-['Space_Grotesk'] mt-0.5">
                        PKR {ticketBooking.seat_price.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Booking Ref</p>
                      <p className="text-xl font-bold text-electric-violet font-mono mt-0.5">{refId}</p>
                    </div>
                  </div>

                  {/* Barcode-style decoration */}
                  <div className="mt-4 flex items-center justify-center gap-[2px]">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="bg-slate-700" style={{ width: i % 3 === 0 ? 3 : 1.5, height: i % 5 === 0 ? 24 : 16 }}></div>
                    ))}
                  </div>
                  <p className="text-center text-[8px] text-slate-600 mt-1 font-mono tracking-[3px]">{ticketBooking.id.slice(0, 16).toUpperCase()}</p>

                  {/* Download Button */}
                  <button
                    onClick={() => generateTicketPDF(ticketBooking)}
                    className="w-full mt-5 bg-electric-violet hover:bg-[#7e6be0] text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(138,117,240,0.3)]"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download PDF Ticket
                  </button>

                  <p className="text-center text-[10px] text-slate-600 mt-3">Present this ticket at the boarding point</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
