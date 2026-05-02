import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Bus, MapPin, Calendar, Clock, Ticket, Loader2, AlertCircle } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

interface Booking {
  id: string;
  seat_no: number;
  status: string;
  travel_date: string;
  departure_time?: string | null;
  booking_date: string;
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

export default function MyBookings() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
    if (user) {
      fetchBookings();
    }
  }, [user, authLoading]);

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

      // If there are no bookings, set empty
      if (!data || data.length === 0) {
        setBookings([]);
        return;
      }

      // Fetch schedules referenced by bookings
      const scheduleIds = (data || []).map((b: any) => b.schedule_id).filter(Boolean);
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, travel_date, departure_time, arrival_time, seat_price, bus:buses(id, bus_no), route:routes(id, departure, destination, distance_km)')
        .in('id', scheduleIds.length ? scheduleIds : ['']);

      // Map data together on client
      const bookingsWithDetails = (data || []).map((booking: any) => {
        const schedule = schedulesData?.find((s: any) => s.id === booking.schedule_id);
        const bus = schedule?.bus;
        const route = schedule?.route;
        const payment = booking.payments && booking.payments.length ? booking.payments[0] : null;

        return {
          ...booking,
          travel_date: booking.travel_date || schedule?.travel_date,
          departure_time: schedule?.departure_time ?? null,
          payment: payment,
          seat_price: schedule?.seat_price ?? null,
          bus: {
            id: bus?.id,
            bus_no: bus?.bus_no || '',
            route: route ? { departure: route.departure, destination: route.destination, distance_km: route.distance_km } : null,
          },
        };
      });

      setBookings(bookingsWithDetails as unknown as Booking[]);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success text-success-foreground">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
              <p className="mt-2 text-sm text-muted-foreground/70">
                Start by searching for buses and booking your seats
              </p>
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

              return (
                <Card key={booking.id} className="border-border/50 shadow-soft overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="mb-2 flex items-center gap-3">
                              <Bus className="h-5 w-5 text-primary" />
                              <span className="font-semibold text-foreground">{booking.bus.bus_no}</span>
                              {getStatusBadge(booking.status)}
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
                              <span className="mx-2">•</span>
                            )}
                            {booking.departure_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{String(booking.departure_time).slice(0, 5)}</span>
                              </div>
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
                        <div className="mt-4 text-sm text-muted-foreground">
                          <div>Booking ID: <span className="font-medium text-foreground">{booking.id}</span></div>
                          {booking.payment && (
                            <div className="mt-1">Payment: <span className="font-medium text-foreground">Rs. {Number(booking.payment.amount).toFixed(2)}</span> (<span className="capitalize">{booking.payment.status}</span>)</div>
                          )}
                          {booking.seat_price != null && !booking.payment && (
                            <div className="mt-1">Price: <span className="font-medium text-foreground">Rs. {Number(booking.seat_price).toFixed(2)}</span></div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-center border-t border-border/50 bg-muted/30 p-6 md:border-l md:border-t-0">
                        {!isCancelled && !isPast && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel Booking
                          </Button>
                        )}
                        {isPast && !isCancelled && (
                          <span className="text-sm text-muted-foreground">Trip completed</span>
                        )}
                        {isCancelled && (
                          <span className="text-sm text-destructive">Cancelled</span>
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
