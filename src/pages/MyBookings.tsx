import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { PassengerNav } from '@/components/PassengerNav';

interface SingleBooking {
  id: string;
  schedule_id: string;
  schedule_status?: string;
  status: string;
  travel_date: string;
  booking_date: string;
  departure_time: string | null;
  seat_no: number;
  payment: any;
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

      const bookingsWithDetails = (data || []).map((booking: any) => {
        const schedule = schedulesData?.find((s: any) => s.id === booking.schedule_id);
        const bus = schedule?.bus;
        const route = schedule?.route;
        const payment = booking.payments && booking.payments.length ? booking.payments[0] : null;

        return {
          id: booking.id,
          schedule_id: booking.schedule_id,
          status: booking.status,
          travel_date: booking.travel_date || schedule?.travel_date,
          booking_date: booking.booking_date,
          departure_time: schedule?.departure_time ?? null,
          seat_no: booking.seat_no,
          payment: payment,
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

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
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
                    {!isCancelled && !isPast && !isCompleted && (
                      <button 
                        onClick={() => handleCancelBooking(booking.id)}
                        className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold text-on-surface-variant border border-outline-variant hover:bg-white/5 hover:text-white hover:border-white/20 active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    {(isPast || isCompleted) && !isCancelled && (
                      <span className="px-4 py-2 font-label-md text-sm text-sky-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Trip Completed
                      </span>
                    )}
                    {!isCancelled && (
                      <button className="px-4 py-2 rounded-lg font-label-md text-sm font-semibold bg-electric-violet text-white hover:bg-electric-violet/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(138,117,240,0.3)]">
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


    </div>
  );
}
