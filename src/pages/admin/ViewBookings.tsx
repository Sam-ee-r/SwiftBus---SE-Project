import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Ticket, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  seat_no: number;
  status: string;
  travel_date: string;
  booking_date: string;
  bus: {
    bus_no: string;
    route: {
      departure: string;
      destination: string;
    } | null;
  };
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  passenger_id: string;
}

export default function ViewBookings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchBookings();
    }
  }, [user, isAdmin, authLoading]);

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
          passenger_id,
          schedule_id
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;

      const { data: profilesData } = await supabase.from('profiles').select('id, first_name, last_name, email');

      // Fetch schedules referenced by bookings
      const scheduleIds = (data || []).map((b: any) => b.schedule_id).filter(Boolean);
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, travel_date, bus:buses(id, bus_no), route:routes(id, departure, destination)')
        .in('id', scheduleIds.length ? scheduleIds : ['']);

      // Map data together on client
      const bookingsWithDetails = (data || []).map((booking: any) => {
        const schedule = schedulesData?.find((s: any) => s.id === booking.schedule_id);
        const bus = schedule?.bus;
        const route = schedule?.route;
        const profile = profilesData?.find((p: any) => p.id === booking.passenger_id);

        return {
          ...booking,
          bus: {
            bus_no: bus?.bus_no || '',
            route: route ? { departure: route.departure, destination: route.destination } : null,
          },
          profile,
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

  const deleteBooking = async (bookingId: string, passengerId: string, routeName: string, date: string) => {
    if (!window.confirm('Are you sure you want to delete this booking? The passenger will be notified.')) return;
    
    try {
      // 1. Notify the passenger
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: passengerId,
        title: 'Booking Cancelled',
        message: `Your booking for ${routeName} on ${date} has been cancelled by an administrator.`
      });
      
      if (notifError) throw notifError;

      // 2. Delete the booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);
        
      if (deleteError) throw deleteError;
      
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      toast.success('Booking deleted and passenger notified.');
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast.error(`Failed to delete booking: ${error.message}`);
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-warning" />
              <h1 className="font-bold text-foreground">All Bookings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="py-16 text-center">
                <Ticket className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No bookings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Bus</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Seat</TableHead>
                      <TableHead>Travel Date</TableHead>
                      <TableHead>Booked On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {booking.profile?.first_name || ''} {booking.profile?.last_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.profile?.email || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{booking.bus.bus_no}</TableCell>
                        <TableCell>
                          {booking.bus.route ? (
                            <span className="text-sm">
                              {booking.bus.route.departure} → {booking.bus.route.destination}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>#{booking.seat_no}</TableCell>
                        <TableCell>{format(parseISO(booking.travel_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteBooking(
                              booking.id, 
                              booking.passenger_id, 
                              booking.bus.route ? `${booking.bus.route.departure} to ${booking.bus.route.destination}` : 'Unknown Route',
                              format(parseISO(booking.travel_date), 'MMM d, yyyy')
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
