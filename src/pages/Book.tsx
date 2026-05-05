import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { PaymentGateway } from '@/components/PaymentGateway';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PassengerNav } from '@/components/PassengerNav';

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
  const [showPayment, setShowPayment] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
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
    fetchWalletBalance();
  }, [scheduleId, travelDate, user, authLoading, isAdmin, navigate]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setWalletBalance(Number(data?.wallet_balance || 0));
  };

  useEffect(() => {
    if (!scheduleId) return;

    const channel = supabase
      .channel(`realtime-bookings-${scheduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `schedule_id=eq.${scheduleId}`
        },
        () => {
          fetchBookedSeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleId]);

  const fetchBusDetails = async () => {
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, departure_time, arrival_time, travel_date, seat_price, bus_id, route_id')
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;

      let busData = null;
      if (scheduleData?.bus_id) {
        const { data: b, error: bErr } = await supabase.from('buses').select('id, bus_no, capacity').eq('id', scheduleData.bus_id).single();
        if (bErr) throw bErr;
        busData = b || null;
      }

      let routeData = null;
      if (scheduleData?.route_id) {
        const { data: r, error: rErr } = await supabase.from('routes').select('id, departure, destination, distance_km').eq('id', scheduleData.route_id).single();
        if (rErr) throw rErr;
        routeData = r || null;
      }

      if (scheduleData?.travel_date) {
        setTravelDate(scheduleData.travel_date);
      }

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

  const handlePaymentSuccess = async (txnId: string, provider: string) => {
    setPaymentTxnId(txnId);
    setPaymentProvider(provider);
    setShowPayment(false);
    await handleBooking(txnId, provider);
  };

  const handleWalletPayment = async () => {
    if (!user || walletBalance < totalPrice) return;
    setShowPayment(false);

    // Deduct from wallet
    const newBalance = walletBalance - totalPrice;
    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    // Log wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: totalPrice,
      type: 'payment',
      description: `Booking: ${bus?.route?.departure} → ${bus?.route?.destination} (${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''})`,
    });

    setWalletBalance(newBalance);
    const txnId = `WLT-${Math.floor(10000 + Math.random() * 90000)}`;
    setPaymentTxnId(txnId);
    setPaymentProvider('wallet');
    await handleBooking(txnId, 'wallet');
  };

  const handleBooking = async (txnId = '', provider = 'online') => {
    if (!user || selectedSeats.length === 0) return;

    setBooking(true);
    try {
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

      const payments = bookingData.map((booking) => ({
        booking_id: booking.id,
        amount: pricePerSeat,
        status: 'completed',
        mode: provider || 'online',
      }));

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentError) throw paymentError;

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

      try {
        await supabase.functions.invoke('send-booking-email', {
          body: confirmationData,
        });
      } catch (emailError) {
        console.log('Email service not configured, but booking saved:', emailError);
      }

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

  const renderSeat = (seatNo: number) => {
    if (seatNo > (bus?.capacity || 40)) return null;
    const isBooked = bookedSeats.includes(seatNo);
    const isSelected = selectedSeats.includes(seatNo);

    let btnClass = "w-12 h-12 rounded border flex items-center justify-center font-label-md text-label-md relative transition-all duration-200 ";

    if (isBooked) {
      btnClass += "bg-surface-variant border-surface-container-highest opacity-50 cursor-not-allowed text-on-surface-variant";
    } else if (isSelected) {
      btnClass += "border-electric-violet bg-electric-violet/20 seat-glow text-electric-violet";
    } else {
      btnClass += "border-outline-variant bg-surface-container hover:border-electric-violet hover:bg-electric-violet/10 text-on-surface cursor-pointer group relative";
    }

    return (
      <button
        key={seatNo}
        onClick={() => toggleSeat(seatNo)}
        disabled={isBooked}
        className={btnClass}
      >
        {seatNo}
      </button>
    );
  };

  const rows = Math.ceil((bus?.capacity || 40) / 4);

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-[64px] text-outline-variant">directions_bus</span>
        <p className="text-on-surface-variant text-xl">Bus not found</p>
        <Link to="/search" className="text-electric-violet hover:underline flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-deep-space text-on-surface min-h-screen font-body-md relative overflow-x-hidden selection:bg-electric-violet selection:text-white">
      {/* Decorative Background Glows */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-electric-violet rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-spark rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>

      <PassengerNav />

      {/* Main Content */}
      <main className="relative z-10 pt-xl px-gutter md:px-margin max-w-7xl mx-auto mt-16 pb-[160px] lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-margin">
          
          {/* Left Column: Seat Map */}
          <div className="lg:col-span-8 flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <h1 className="font-h2 text-h2 text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-[32px]">directions_bus</span> Select Your Seats
              </h1>
            </div>
            
            {/* Legend */}
            <div className="glass-panel rounded-lg p-sm flex flex-wrap gap-md items-center justify-center">
              <div className="flex items-center gap-xs">
                <div className="w-6 h-6 rounded border border-outline-variant bg-surface-container"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Available</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-6 h-6 rounded border border-electric-violet bg-electric-violet/20 seat-glow"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Selected</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-6 h-6 rounded bg-surface-variant border border-surface-container-highest opacity-50"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Booked</span>
              </div>
            </div>
            
            {/* Bus Layout Container */}
            <div className="glass-panel rounded-xl p-md flex flex-col items-center overflow-x-auto">
              {/* Bus Front Indicator */}
              <div className="w-full min-w-[300px] max-w-[400px] border-b-2 border-surface-container-high pb-4 mb-6 flex justify-center items-center relative">
                <span className="font-body-md text-on-surface-variant text-center w-full">Front of the bus</span>
              </div>
              
              {/* Seat Grid (2+2 Layout) */}
              <div className="flex gap-lg">
                {/* Left Pair */}
                <div className="flex flex-col gap-sm">
                  {Array.from({ length: rows }).map((_, r) => (
                    <div key={`left-${r}`} className="flex gap-sm">
                      {renderSeat(r * 4 + 1)}
                      {renderSeat(r * 4 + 2)}
                    </div>
                  ))}
                </div>
                
                {/* Aisle */}
                <div className="w-8 flex flex-col justify-between py-6 items-center">
                </div>
                
                {/* Right Pair */}
                <div className="flex flex-col gap-sm">
                  {Array.from({ length: rows }).map((_, r) => (
                    <div key={`right-${r}`} className="flex gap-sm">
                      {renderSeat(r * 4 + 3)}
                      {renderSeat(r * 4 + 4)}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bus Back Indicator */}
              <div className="w-full min-w-[300px] max-w-[400px] border-t-2 border-surface-container-high pt-4 mt-6 flex justify-center items-center relative">
                <span className="font-body-md text-on-surface-variant text-center w-full">Back of the bus</span>
              </div>
            </div>
          </div>
          
          {/* Right Column: Booking Summary — desktop only; mobile uses sticky bottom bar */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-md">
            <div className="glass-panel rounded-xl p-md flex flex-col gap-md sticky top-[88px]">
              <h2 className="font-h3 text-h3 text-on-surface mb-xs">Booking Summary</h2>
              
              {/* Route Details */}
              <div className="flex flex-col gap-sm border-b border-surface-container-highest pb-sm">
                <div className="flex items-center gap-3 text-on-surface font-label-md text-body-md">
                  <span className="material-symbols-outlined text-[20px] text-outline">directions_bus</span>
                  {bus?.bus_no}
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <span className="material-symbols-outlined text-[20px] text-outline">location_on</span>
                  {bus?.route?.departure} <span className="material-symbols-outlined text-[16px]">arrow_forward</span> {bus?.route?.destination}
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <span className="material-symbols-outlined text-[20px] text-outline">calendar_today</span>
                  {format(parseISO(travelDate), 'EEEE, dd-MM-yyyy')}
                </div>
              </div>
              
              {/* Selected Seats */}
              <div className="flex flex-col gap-sm border-b border-surface-container-highest pb-sm">
                <span className="font-body-md text-on-surface-variant mb-1">Selected Seats ({selectedSeats.length})</span>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.length > 0 ? selectedSeats.sort((a,b)=>a-b).map(seat => (
                    <div key={seat} className="w-10 h-10 rounded-full bg-electric-violet/20 border border-electric-violet flex items-center justify-center text-electric-violet font-label-md">{seat}</div>
                  )) : (
                    <span className="text-on-surface-variant text-sm font-label-sm italic">No seats selected</span>
                  )}
                </div>
              </div>
              
              {/* Pricing Breakdown */}
              <div className="flex flex-col gap-xs mb-sm">
                <div className="flex justify-between items-center text-on-surface-variant font-body-md">
                  <span>Price per seat</span>
                  <span className="text-on-surface font-label-md">PKR {pricePerSeat.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-h3 text-h3 text-on-surface">Total</span>
                  <span className="font-h3 text-h3 text-emerald-spark">PKR {totalPrice.toLocaleString('en-PK')}</span>
                </div>
              </div>
              
              {/* Primary CTA */}
              <button 
                disabled={selectedSeats.length === 0 || booking}
                onClick={() => setShowPayment(true)}
                className="w-full py-4 rounded-lg bg-emerald-spark text-midnight-indigo font-label-md text-label-md flex items-center justify-center gap-2 uppercase tracking-wider hover:bg-secondary-fixed transition-colors shadow-[0_0_20px_hsla(165,80%,50%,0.3)] hover:shadow-[0_0_30px_hsla(165,80%,50%,0.5)] active:scale-95 duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {booking ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">check</span>
                )}
                {booking ? 'Saving...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Sticky Bottom CTA (sits above the 68px PassengerNav bottom bar) ── */}
      <div className="fixed left-0 right-0 lg:hidden bg-[#0f0d15]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-3 z-[60]" style={{ bottom: '68px' }}>
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedSeats.length > 0 ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} selected` : 'No seats selected'}
            </p>
            <p className="text-xl font-bold text-emerald-400 font-['Space_Grotesk'] truncate">
              {selectedSeats.length > 0 ? `PKR ${totalPrice.toLocaleString('en-PK')}` : `PKR ${pricePerSeat.toLocaleString('en-PK')} / seat`}
            </p>
          </div>
          <button
            disabled={selectedSeats.length === 0 || !!booking}
            onClick={() => setShowPayment(true)}
            className="shrink-0 px-6 py-3 rounded-xl bg-emerald-500 text-slate-900 font-bold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_hsla(165,80%,50%,0.4)] disabled:opacity-40 disabled:pointer-events-none"
          >
            {booking ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : <span className="material-symbols-outlined text-[18px]">check</span>}
            {booking ? 'Saving…' : 'Book Seats'}
          </button>
        </div>
      </div>

      {/* Payment Gateway Dialog */}
      <Dialog open={showPayment} onOpenChange={(o) => { if (!o) setShowPayment(false); }}>
        <DialogContent className="max-w-sm bg-surface border-white/10 text-on-surface">
          <DialogHeader>
            <DialogTitle className="text-center text-lg text-white">Secure Checkout</DialogTitle>
            <DialogDescription className="text-center text-xs text-on-surface-variant">
              SwiftBus — Route: {bus?.route?.departure} → {bus?.route?.destination}
            </DialogDescription>
          </DialogHeader>
          <PaymentGateway
            amount={totalPrice}
            seats={selectedSeats}
            walletBalance={walletBalance}
            onWalletPay={handleWalletPayment}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md bg-surface border-white/10 text-on-surface">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-spark/20 border border-emerald-spark/30 shadow-[0_0_15px_hsla(165,80%,50%,0.2)]">
              <span className="material-symbols-outlined text-[32px] text-emerald-spark">check_circle</span>
            </div>
            <DialogHeader className="w-full">
              <DialogTitle className="text-2xl text-white">Booking Confirmed!</DialogTitle>
              <DialogDescription className="mt-2 text-on-surface-variant">
                Your seats have been successfully reserved.
              </DialogDescription>
            </DialogHeader>

            {bookingConfirmed && (
              <div className="mt-6 w-full space-y-4 rounded-lg bg-surface-container border border-white/5 p-4 text-left">
                <div>
                  <p className="text-sm text-on-surface-variant">Bus</p>
                  <p className="font-semibold text-white">{bookingConfirmed.bus?.bus_no}</p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Route</p>
                  <p className="font-semibold text-white">
                    {bookingConfirmed.bus?.route?.departure} → {bookingConfirmed.bus?.route?.destination}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Travel Date</p>
                  <p className="font-semibold text-white">{format(parseISO(bookingConfirmed.travel_date), 'EEEE, dd-MM-yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Seats</p>
                  <p className="font-semibold text-electric-violet">
                    {bookingConfirmed.bookings.map((b: any) => `#${b.seat_no}`).join(', ')}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-on-surface-variant">Total Amount</p>
                  <p className="text-xl font-bold text-emerald-spark">PKR {bookingConfirmed.total_price.toLocaleString('en-PK')}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex w-full flex-col gap-3">
              <button
                className="w-full py-3 rounded-lg bg-electric-violet text-white font-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-[0_0_15px_hsla(255,65%,60%,0.3)]"
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/my-bookings');
                }}
              >
                <span className="material-symbols-outlined">receipt_long</span>
                View My Bookings
              </button>
              <button
                className="w-full py-3 rounded-lg bg-surface-container border border-outline-variant text-on-surface font-label-md hover:bg-white/5 transition-colors"
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/search');
                }}
              >
                Search More Buses
              </button>
            </div>

            <p className="mt-4 text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">mail</span>
              A confirmation receipt has been sent to {bookingConfirmed?.passenger_email}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
