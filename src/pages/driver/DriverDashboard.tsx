import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isToday, isTomorrow } from 'date-fns';

type TripStatus = 'scheduled' | 'in_transit' | 'completed';

interface Trip {
  id: string;
  departure_time: string;
  arrival_time: string;
  travel_date: string;
  status: TripStatus;
  seat_price: number;
  route: {
    departure: string;
    destination: string;
    distance_km: number;
  } | null;
  bus: {
    bus_no: string;
    capacity: number;
  } | null;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-surface-container/50 text-slate-300 border-white/10', icon: 'calendar_month' },
  in_transit: { label: 'In Transit', color: 'bg-emerald-spark/10 text-emerald-spark border-emerald-spark/20', icon: 'speed' },
  completed: { label: 'Completed', color: 'bg-primary/10 text-primary border-primary/20', icon: 'check_circle' },
};

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'dd-MM-yyyy');
}

export default function DriverDashboard() {
  const { user, isDriver, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [noBusAssigned, setNoBusAssigned] = useState(false);
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [busHealth, setBusHealth] = useState<{
    busId: string;
    busNo: string;
    totalKm: number;
    kmSinceService: number;
    lastServicedAt: string | null;
    alertDismissed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/auth'); return; }
      if (!isDriver) { navigate('/'); return; }
      fetchTrips();
    }
  }, [user, isDriver, authLoading]);

  // Realtime: update local trip status when schedule changes in DB
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('driver-schedules-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules' }, (payload) => {
        const updated = payload.new;
        setTrips(prev => prev.map(t =>
          t.id === updated.id ? { ...t, status: updated.status as TripStatus, trip_progress: updated.trip_progress } : t
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchTrips = async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);
    setNoBusAssigned(false);
    try {
      // 1. Find this driver's assigned bus
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('bus_id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      if (!driverData?.bus_id) {
        setNoBusAssigned(true);
        setTrips([]);
        setLoading(false);
        return;
      }

      setDriverName(`${driverData.first_name} ${driverData.last_name}`);

      // 2. Fetch all schedules for that bus
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, departure_time, arrival_time, travel_date, status, seat_price, route:routes(departure, destination, distance_km), bus:buses(bus_no, capacity)')
        .eq('bus_id', driverData.bus_id)
        .order('travel_date', { ascending: true })
        .order('departure_time', { ascending: true });

      if (schedulesError) throw schedulesError;
      setTrips((schedulesData || []) as Trip[]);

      // Fetch bus odometer data
      const { data: busData } = await supabase
        .from('buses')
        .select('id, bus_no, total_km_driven, km_since_service, last_serviced_at, maintenance_alert_dismissed')
        .eq('id', driverData.bus_id)
        .single();

      if (busData) {
        setBusHealth({
          busId: busData.id,
          busNo: busData.bus_no,
          totalKm: Number(busData.total_km_driven || 0),
          kmSinceService: Number(busData.km_since_service || 0),
          lastServicedAt: busData.last_serviced_at,
          alertDismissed: busData.maintenance_alert_dismissed,
        });
      }
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setFetchError(error.message || 'Unknown error');
      toast.error('Failed to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tripId: string, newStatus: TripStatus) => {
    setUpdatingId(tripId);
    try {
      if (newStatus === 'in_transit') {
        // Notify all confirmed passengers
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('passenger_id')
          .eq('schedule_id', tripId)
          .eq('status', 'confirmed');

        if (bookingsData && bookingsData.length > 0) {
          const tripDetails = trips.find(t => t.id === tripId);
          const routeName = tripDetails?.route
            ? `${tripDetails.route.departure} to ${tripDetails.route.destination}`
            : 'your route';

          await supabase.from('notifications').insert(
            bookingsData.map(b => ({
              user_id: b.passenger_id,
              title: 'Bus Departing Now',
              message: `Your bus for ${routeName} has started its journey!`,
            }))
          );
        }

        // Update status in DB then navigate to live ride page
        const { error: startError } = await supabase
          .from('schedules')
          .update({ status: 'in_transit', trip_progress: 0 })
          .eq('id', tripId);

        if (startError) {
          console.error('Failed to start trip:', startError);
          toast.error(`Could not start trip: ${startError.message}`);
          setUpdatingId(null);
          return;
        }

        navigate(`/track/${tripId}`);
        return;
      }

      const { error } = await supabase
        .from('schedules')
        .update({ status: newStatus })
        .eq('id', tripId);

      if (error) throw error;

      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: newStatus } : t))
      );
      toast.success('✅ Trip marked as completed!');
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDismissMaintenance = async () => {
    if (!busHealth) return;
    // Reset km_since_service, record last service time, log it
    const now = new Date().toISOString();
    await supabase.from('buses').update({
      km_since_service: 0,
      last_serviced_at: now,
      maintenance_alert_dismissed: true,
    }).eq('id', busHealth.busId);

    await supabase.from('bus_maintenance_logs').insert([{
      bus_id: busHealth.busId,
      serviced_by: user?.id,
      km_at_service: busHealth.totalKm,
      notes: 'Service confirmed by driver via dashboard',
    }]);

    setBusHealth(prev => prev ? { ...prev, kmSinceService: 0, alertDismissed: true, lastServicedAt: now } : null);
    toast.success('Maintenance recorded. Odometer reset. Safe driving!');
  };

  // Active = today, not completed
  const todayTrips = trips.filter((t) => isToday(new Date(t.travel_date + 'T00:00:00')) && t.status !== 'completed');
  // Upcoming = future date, not completed
  const upcomingTrips = trips.filter((t) => !isToday(new Date(t.travel_date + 'T00:00:00')) && t.status !== 'completed' && new Date(t.travel_date) > new Date());
  // Completed = any date, status completed
  const completedTrips = trips.filter((t) => t.status === 'completed');
  const activeTrips = [...todayTrips, ...upcomingTrips];

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,_rgba(30,27,46,1)_0%,_rgba(20,18,26,1)_100%)]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-electric-violet/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-spark/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5 shadow-lg">
        <div className="container mx-auto max-w-5xl flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-violet/20 border border-electric-violet/30 shadow-inner">
              <span className="material-symbols-outlined text-[20px] text-electric-violet">directions_bus</span>
            </div>
            <div>
              <p className="font-h3 text-white leading-tight">Driver Portal</p>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-400">{driverName || user?.email}</p>
            </div>
          </div>
          <button 
            onClick={async () => { await signOut(); navigate('/'); }}
            className="flex items-center gap-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-colors font-medium text-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 md:px-8 py-8 space-y-6 relative z-10">

        {/* Bus Maintenance Card */}
        {busHealth && (() => {
          const { kmSinceService, totalKm, lastServicedAt, alertDismissed, busNo } = busHealth;
          const isWarning = kmSinceService >= 8000;
          const isOverdue = kmSinceService >= 10000;
          const pct = Math.min((kmSinceService / 10000) * 100, 100);
          const color = isOverdue ? '#f87171' : isWarning ? '#fb923c' : '#34d399';

          if (!isWarning || alertDismissed) {
            // Compact info card
            return (
              <div className="bg-surface-container/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff08" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                  </svg>
                  <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[20px]" style={{color}}>build</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{busNo} — Maintenance Health</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {Math.round(kmSinceService).toLocaleString()} / 10,000 km since last service &bull; {Math.round(totalKm).toLocaleString()} km total
                  </p>
                  {lastServicedAt && (
                    <p className="text-xs text-slate-600 mt-0.5">Last serviced: {new Date(lastServicedAt).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-')}</p>
                  )}
                </div>
              </div>
            );
          }

          // Full-width alert banner
          return (
            <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-5 ${
              isOverdue
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-orange-500/10 border-orange-500/30'
            }`}>
              <div className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff08" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                </svg>
                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[20px] animate-pulse" style={{color}}>warning</span>
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                  {isOverdue ? '🚨 Maintenance Overdue!' : '⚠️ Maintenance Due Soon'}
                </p>
                <p className="text-sm text-white font-medium mt-0.5">{busNo} has driven {Math.round(kmSinceService).toLocaleString()} km since last service.</p>
                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400/70' : 'text-orange-400/70'}`}>
                  {isOverdue ? 'Service is overdue. Take the bus for maintenance immediately.' : `${Math.round(10000 - kmSinceService).toLocaleString()} km until service is required.`}
                </p>
              </div>
              <button
                onClick={handleDismissMaintenance}
                className={`self-start sm:self-auto shrink-0 font-bold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 ${
                  isOverdue
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-orange-500 hover:bg-orange-400 text-white'
                }`}
              >
                Mark as Serviced
              </button>
            </div>
          );
        })()}

        {activeTrips.length === 0 && !fetchError && !noBusAssigned ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-surface-container/30 backdrop-blur-md rounded-2xl border border-white/5">
            <span className="material-symbols-outlined text-[64px] text-slate-500/30 mb-4">directions_bus</span>
            {fetchError ? (
              <>
                <h2 className="text-xl font-semibold text-rose-400">Could not load trips</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-400">Database error: <span className="font-mono text-xs">{fetchError}</span></p>
              </>
            ) : noBusAssigned ? (
              <>
                <h2 className="text-2xl font-h2 text-white mb-2">No bus assigned</h2>
                <p className="text-slate-400">Please contact the administrator to be assigned a vehicle.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-h2 text-white mb-2">You're all caught up</h2>
                <p className="text-slate-400">There are no upcoming scheduled trips for your assigned bus.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Today's Trips */}
            {todayTrips.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-emerald-spark/10 border border-emerald-spark/20">
                    <span className="material-symbols-outlined text-emerald-spark text-[20px]">schedule</span>
                  </div>
                  <h2 className="font-h2 text-2xl text-white tracking-tight">Today's Trips</h2>
                  <span className="font-label-sm text-xs bg-surface-container px-2.5 py-1 rounded-full text-slate-300 border border-white/10">
                    {todayTrips.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {todayTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onUpdateStatus={updateStatus} updatingId={updatingId} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-electric-violet/10 border border-electric-violet/20">
                    <span className="material-symbols-outlined text-electric-violet text-[20px]">event</span>
                  </div>
                  <h2 className="font-h2 text-2xl text-white tracking-tight">Upcoming Trips</h2>
                </div>
                <div className="grid gap-4">
                  {upcomingTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onUpdateStatus={updateStatus} updatingId={updatingId} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Past / Completed Trips — collapsible */}
        {completedTrips.length > 0 && (
          <section>
            <button
              onClick={() => setShowPastTrips(p => !p)}
              className="w-full flex items-center justify-between gap-3 mb-4 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/10 border border-white/5">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">history</span>
                </div>
                <h2 className="font-h2 text-xl text-slate-400 group-hover:text-white transition-colors tracking-tight">Past Trips</h2>
                <span className="font-label-sm text-xs bg-surface-container px-2.5 py-1 rounded-full text-slate-400 border border-white/5">
                  {completedTrips.length}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-500 group-hover:text-white transition-all duration-300 ${showPastTrips ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showPastTrips && (
              <div className="grid gap-3">
                {completedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-surface-container/20 backdrop-blur-sm border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-70"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/10">
                        <span className="material-symbols-outlined text-emerald-500/60 text-[20px]">check_circle</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{trip.route?.departure} → {trip.route?.destination}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {format(new Date(trip.travel_date + 'T00:00:00'), 'dd-MM-yyyy')} &bull; {trip.bus?.bus_no}
                        </p>
                      </div>
                    </div>
                    <span className="self-start md:self-auto text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 bg-emerald-500/10 border border-emerald-500/10 px-3 py-1 rounded-full">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function TripCard({
  trip,
  onUpdateStatus,
  updatingId,
  navigate,
}: {
  trip: Trip;
  onUpdateStatus: (id: string, status: TripStatus) => void;
  updatingId: string | null;
  navigate: (path: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[trip.status];
  const isUpdating = updatingId === trip.id;
  const dateLabel = getDateLabel(trip.travel_date);

  return (
    <div className="bg-surface-container/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden group hover:border-electric-violet/30 transition-all shadow-lg flex flex-col md:flex-row relative">
      <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      {/* Trip Info */}
      <div className="flex-1 p-6 relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-electric-violet">directions_bus</span>
            <span className="font-label-md text-sm text-slate-300 font-semibold tracking-wide uppercase">{trip.bus?.bus_no ?? 'Unknown Bus'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${statusCfg.color}`}>
            <span className="material-symbols-outlined text-[14px]">{statusCfg.icon}</span>
            {statusCfg.label}
          </div>
        </div>

        {trip.route && (
          <div className="flex items-center gap-3 text-lg md:text-xl font-h2 text-white mb-4">
            <span>{trip.route.departure}</span>
            <span className="material-symbols-outlined text-slate-500 text-[20px]">arrow_forward</span>
            <span>{trip.route.destination}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 font-medium">
          <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md border border-white/5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
            {trip.departure_time} → {trip.arrival_time}
          </span>
          <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md border border-white/5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">event</span>
            {dateLabel}
          </span>
          {trip.route && (
            <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md border border-white/5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">route</span>
              {trip.route.distance_km} km
            </span>
          )}
        </div>
      </div>

      {/* Action Panel */}
      <div className="flex flex-col items-center justify-center p-6 bg-surface-container-high/30 border-t md:border-t-0 md:border-l border-white/5 md:w-56 relative z-10">
        {trip.status === 'scheduled' && (
          <button
            disabled={isUpdating}
            onClick={() => onUpdateStatus(trip.id, 'in_transit')}
            className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_hsla(255,65%,60%,0.2)] hover:shadow-[0_0_20px_hsla(255,65%,60%,0.4)] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isUpdating ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
            )}
            Start Trip
          </button>
        )}
        {trip.status === 'in_transit' && (
          <button
            onClick={() => navigate(`/track/${trip.id}`)}
            className="w-full bg-emerald-spark hover:bg-emerald-500 text-surface-container-lowest font-semibold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_hsla(160,100%,40%,0.2)] hover:shadow-[0_0_20px_hsla(160,100%,40%,0.4)] flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">speed</span>
            Live Map
          </button>
        )}
        {trip.status === 'completed' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-primary text-[24px]">task_alt</span>
            </div>
            <p className="text-sm font-medium text-slate-300">Trip Completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
