import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Bus, MapPin, Clock, Calendar, LogOut, Loader2,
  PlayCircle, CheckCircle2, ArrowRight, Gauge
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

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

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Scheduled', color: 'bg-muted text-muted-foreground border-border', icon: Calendar },
  in_transit: { label: 'In Transit', color: 'bg-accent/10 text-accent border-accent/30', icon: Gauge },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
};

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'PPP');
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

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/auth'); return; }
      if (!isDriver) { navigate('/'); return; }
      fetchTrips();
    }
  }, [user, isDriver, authLoading]);

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
        .gte('travel_date', format(new Date(), 'yyyy-MM-dd'))
        .order('travel_date', { ascending: true })
        .order('departure_time', { ascending: true });

      if (schedulesError) throw schedulesError;
      setTrips((schedulesData || []) as Trip[]);
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
              message: `Your bus for ${routeName} has started its journey! Track it live.`,
            }))
          );
        }

        // Update status in DB then navigate to live ride page
        await supabase.from('schedules').update({ status: 'in_transit', trip_progress: 0 }).eq('id', tripId);
        navigate(`/driver/ride/${tripId}`);
        return;
      }

      const { error } = await supabase
        .from('schedules')
        .update({ status: newStatus })
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.map(t => (t.id === tripId ? { ...t, status: newStatus } : t)));
      toast.success('✅ Trip marked as completed!');
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const todayTrips = trips.filter((t) => isToday(new Date(t.travel_date + 'T00:00:00')));
  const upcomingTrips = trips.filter((t) => !isToday(new Date(t.travel_date + 'T00:00:00')));

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Bus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground">Driver Portal</p>
              <p className="text-xs text-muted-foreground">{driverName || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/'); }}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <Bus className="mb-4 h-16 w-16 text-muted-foreground/40" />
            {fetchError ? (
              <>
                <h2 className="text-xl font-semibold text-destructive">Could not load trips</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">Database error: <span className="font-mono">{fetchError}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Make sure you have run the status column migration in Supabase SQL Editor.</p>
              </>
            ) : noBusAssigned ? (
              <>
                <h2 className="text-xl font-semibold text-foreground">No bus assigned</h2>
                <p className="mt-2 text-sm text-muted-foreground">Ask your admin to assign you a bus in the Manage Drivers panel.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground">No upcoming trips</h2>
                <p className="mt-2 text-sm text-muted-foreground">You have no scheduled trips for today or upcoming days.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Today's Trips */}
            {todayTrips.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Clock className="h-5 w-5 text-accent" />
                  Today's Trips
                  <Badge variant="outline" className="ml-1 text-accent border-accent/30">{todayTrips.length}</Badge>
                </h2>
                <div className="space-y-4">
                  {todayTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onUpdateStatus={updateStatus} updatingId={updatingId} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Trips
                </h2>
                <div className="space-y-4">
                  {upcomingTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onUpdateStatus={updateStatus} updatingId={updatingId} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TripCard({
  trip,
  onUpdateStatus,
  updatingId,
}: {
  trip: Trip;
  onUpdateStatus: (id: string, status: TripStatus) => void;
  updatingId: string | null;
}) {
  const statusCfg = STATUS_CONFIG[trip.status];
  const isUpdating = updatingId === trip.id;
  const dateLabel = getDateLabel(trip.travel_date);

  return (
    <Card className="border-border/50 shadow-soft overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Trip Info */}
          <div className="flex-1 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{trip.bus?.bus_no ?? 'Unknown Bus'}</span>
              </div>
              <Badge variant="outline" className={statusCfg.color}>
                <statusCfg.icon className="mr-1 h-3 w-3" />
                {statusCfg.label}
              </Badge>
            </div>

            {trip.route && (
              <div className="flex items-center gap-2 text-base font-medium text-foreground mb-2">
                <span>{trip.route.departure}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>{trip.route.destination}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {trip.departure_time} → {trip.arrival_time}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateLabel}
              </span>
              {trip.route && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.route.distance_km} km
                </span>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="flex flex-col items-center justify-center gap-3 border-t border-border/50 bg-muted/20 p-6 md:border-l md:border-t-0 md:w-48">
            {trip.status === 'scheduled' && (
              <Button
                variant="accent"
                className="w-full"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(trip.id, 'in_transit')}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Trip
              </Button>
            )}
            {trip.status === 'in_transit' && (
              <Button
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(trip.id, 'completed')}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                End Trip
              </Button>
            )}
            {trip.status === 'completed' && (
              <p className="text-sm text-muted-foreground text-center">Trip completed</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
