import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Bus, MapPin, Calendar, Check, X, Loader2, ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface BusDetails {
  id: string;
  bus_no: string;
  capacity: number;
  route: {
    id: string;
    departure: string;
    destination: string;
    distance_km: number;
  } | null;
}

export default function BookPage() {
  const { scheduleId } = useParams();
  const [searchParams] = useSearchParams();
  const [travelDate, setTravelDate] = useState<string>(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [bus, setBus] = useState<BusDetails | null>(null);
  const [schedulePrice, setSchedulePrice] = useState<number | null>(null);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);

  useEffect(() => {
    // Wait for auth to finish loading before deciding to redirect.
    if (authLoading) return;
    if (!user) {
      toast.error('Please sign in to book tickets');
      navigate('/auth');
      return;
    }

    if (!authLoading && user && isAdmin) {
      navigate('/admin');
      return;
    }

    fetchBusDetails();
    fetchBookedSeats();
  }, [scheduleId, travelDate, user, authLoading]);

  const fetchBusDetails = async () => {
    try {
      // Fetch schedule (no nested selects) and then fetch related bus and route separately
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, departure_time, arrival_time, travel_date, seat_price, bus_id, route_id')
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;

      // fetch related bus
      let busData = null;
      if (scheduleData?.bus_id) {
        const { data: b, error: bErr } = await supabase.from('buses').select('id, bus_no, capacity').eq('id', scheduleData.bus_id).single();
        if (bErr) throw bErr;
        busData = b || null;
      }

      // fetch related route
      let routeData = null;
      if (scheduleData?.route_id) {
        const { data: r, error: rErr } = await supabase.from('routes').select('id, departure, destination, distance_km').eq('id', scheduleData.route_id).single();
        if (rErr) throw rErr;
        routeData = r || null;
      }
      // Prefer travel_date from schedule if available
      if (scheduleData?.travel_date) {
        setTravelDate(scheduleData.travel_date);
      }

      // Use seat_price from schedule if provided, otherwise fallback to distance-based pricing
      const seatPriceFromSchedule = typeof scheduleData?.seat_price === 'number' ? scheduleData.seat_price : null;
      const fallbackPrice = routeData ? ((routeData.distance_km || 10) * 0.5) : 0.0;
      setSchedulePrice(seatPriceFromSchedule ?? fallbackPrice);

      const busWithRoute = busData
        ? {
          id: busData.id,
          bus_no: busData.bus_no,
          capacity: busData.capacity,
          route: routeData || null,
        }
        : null;

      setBus(busWithRoute as BusDetails);
    } catch (error: any) {
      console.error('Error fetching bus:', error);
      toast.error(`Failed to load bus details: ${error.message}`);
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSeats = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('seat_no')
        .eq('schedule_id', scheduleId)
        .neq('status', 'cancelled');

      if (error) throw error;
      setBookedSeats(data?.map((b) => b.seat_no) || []);
    } catch (error) {
      console.error('Error fetching booked seats:', error);
    }
  };

  const toggleSeat = (seatNo: number) => {
    if (bookedSeats.includes(seatNo)) return;

    if (selectedSeats.includes(seatNo)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNo));
    } else {
      setSelectedSeats([...selectedSeats, seatNo]);
    }
  };

  const pricePerSeat = schedulePrice ?? ((bus?.route?.distance_km || 10) * 0.5);
  const totalPrice = selectedSeats.length * (pricePerSeat || 0);

  const handleBooking = async () => {
    if (!user || selectedSeats.length === 0) return;

    setBooking(true);
    try {
      // Create bookings for each seat
      const bookings = selectedSeats.map((seatNo) => ({
        passenger_id: user.id,
        bus_id: bus?.id || null,
        schedule_id: scheduleId,
        seat_no: seatNo,
        travel_date: travelDate,
        status: 'confirmed',
      }));

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookings)
        .select();

      if (bookingError) throw bookingError;

      // Create payments for each booking
      const payments = bookingData.map((booking) => ({
        booking_id: booking.id,
        amount: pricePerSeat,
        status: 'completed',
        mode: 'online',
      }));

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentError) throw paymentError;

      // Send email receipt via Supabase edge function or direct API call
      const confirmationData = {
        bookings: bookingData,
        bus: bus,
        passenger_email: user.email,
        passenger_name: user.user_metadata?.first_name || user.email,
        total_seats: selectedSeats.length,
        total_price: totalPrice,
        travel_date: travelDate,
        schedule_id: scheduleId,
      };

      // Call edge function to send email (if available)
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: confirmationData,
        });
      } catch (emailError) {
        console.log('Email service not configured, but booking saved:', emailError);
      }

      // Show confirmation dialog
      setBookingConfirmed(confirmationData);
      setShowConfirmation(true);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Some seats have already been booked. Please try again.');
        fetchBookedSeats();
      } else {
        toast.error('Failed to complete booking');
      }
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Bus not found</p>
          <Link to="/search" className="mt-4 inline-block text-accent hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/search"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Seat Selection */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-primary" />
                  Select Your Seats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="mb-6 flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border-2 border-border bg-card" />
                    <span className="text-muted-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-accent" />
                    <span className="text-muted-foreground">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                    <span className="text-muted-foreground">Booked</span>
                  </div>
                </div>

                {/* Seat Grid - bus layout (2 + aisle + 2 per row) */}
                <div className="rounded-xl border border-border bg-muted/30 p-6">
                  <div className="mb-4 text-center text-sm text-muted-foreground">
                    Front of the bus
                  </div>

                  <div className="flex flex-col gap-3">
                    {(() => {
                      const seatsPerRow = 4; // 2 seats each side
                      const rows = Math.ceil(bus.capacity / seatsPerRow);
                      return Array.from({ length: rows }).map((_, r) => {
                        const base = r * seatsPerRow;
                        const left1 = base + 1;
                        const left2 = base + 2;
                        const right1 = base + 3;
                        const right2 = base + 4;

                        const renderSeat = (seatNo: number) => {
                          if (seatNo > bus.capacity) return <div key={seatNo} className="w-12" />;
                          const isBooked = bookedSeats.includes(seatNo);
                          const isSelected = selectedSeats.includes(seatNo);
                          return (
                            <button
                              key={seatNo}
                              onClick={() => toggleSeat(seatNo)}
                              disabled={isBooked}
                              className={
                                `flex h-10 w-12 items-center justify-center rounded-lg font-medium text-sm transition-all duration-200 ` +
                                (isBooked
                                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-accent text-accent-foreground shadow-glow'
                                    : 'border-2 border-border bg-card text-foreground hover:border-accent/50 hover:bg-accent/10')
                              }
                            >
                              {seatNo}
                            </button>
                          );
                        };

                        return (
                          <div key={r} className="flex items-center justify-center">
                            <div className="flex gap-2">
                              {renderSeat(left1)}
                              {renderSeat(left2)}
                            </div>

                            {/* aisle */}
                            <div className="w-8" />

                            <div className="flex gap-2">
                              {renderSeat(right1)}
                              {renderSeat(right2)}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Back of the bus
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div>
            <Card className="sticky top-24 border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Bus className="h-4 w-4 text-primary" />
                    <span className="font-medium">{bus.bus_no}</span>
                  </div>
                  {bus.route && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{bus.route.departure} → {bus.route.destination}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(parseISO(travelDate), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-2 text-sm text-muted-foreground">
                    Selected Seats ({selectedSeats.length})
                  </div>
                  {selectedSeats.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSeats.sort((a, b) => a - b).map((seat) => (
                        <span
                          key={seat}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-sm font-medium text-accent"
                        >
                          {seat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No seats selected</p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price per seat</span>
                    <span className="font-medium">Rs. {pricePerSeat.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-accent">Rs. {totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="accent"
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={selectedSeats.length === 0 || booking}
                >
                  {booking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <DialogHeader className="w-full">
              <DialogTitle className="text-2xl">Booking Confirmed!</DialogTitle>
              <DialogDescription className="mt-2">
                Your seats have been successfully reserved.
              </DialogDescription>
            </DialogHeader>

            {bookingConfirmed && (
              <div className="mt-6 w-full space-y-4 rounded-lg bg-muted/50 p-4 text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Bus</p>
                  <p className="font-semibold">{bookingConfirmed.bus?.bus_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Route</p>
                  <p className="font-semibold">
                    {bookingConfirmed.bus?.route?.departure} → {bookingConfirmed.bus?.route?.destination}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Travel Date</p>
                  <p className="font-semibold">{format(parseISO(bookingConfirmed.travel_date), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seats</p>
                  <p className="font-semibold">
                    {bookingConfirmed.bookings.map((b: any) => `#${b.seat_no}`).join(', ')}
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold text-accent">Rs. {bookingConfirmed.total_price.toFixed(2)}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex w-full flex-col gap-3">
              <Button
                variant="accent"
                className="w-full"
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/my-bookings');
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                View My Bookings
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowConfirmation(false)}
              >
                Continue Shopping
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              <Mail className="inline mr-1 h-3 w-3" />
              A confirmation receipt has been sent to {bookingConfirmed?.passenger_email}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
