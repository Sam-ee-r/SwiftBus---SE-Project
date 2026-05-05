import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { format, parseISO } from 'date-fns';

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
}

export default function ViewBookings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchBookings();
    }
  }, [user, isAdmin, authLoading, navigate]);

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

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(`Failed to cancel booking: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Booking ID', 'Passenger Name', 'Passenger Email', 'Bus No', 'Departure', 'Destination', 'Seat No', 'Travel Date', 'Booking Date', 'Status'];
    const csvData = filteredBookings.map(b => [
      b.id,
      `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`,
      b.profile?.email || '',
      b.bus.bus_no,
      b.bus.route?.departure || '',
      b.bus.route?.destination || '',
      b.seat_no,
      b.travel_date,
      b.booking_date,
      b.status
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      `${b.profile?.first_name ?? ''} ${b.profile?.last_name ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bus.bus_no.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-electric-violet/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-spark/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-300/60 font-label-sm text-label-sm mb-2">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Management</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-emerald-400">Bookings</span>
            </div>
            <h2 className="font-h2 text-h2 text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-electric-violet">confirmation_number</span>
              View Bookings
            </h2>
            <p className="font-body-md text-body-md text-indigo-200/70 mt-1 max-w-2xl">Manage and monitor all passenger reservations across the network.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="bg-surface-container-high hover:bg-surface-bright text-on-surface border border-white/10 hover:border-white/20 font-label-md text-label-md px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters & Controls (Glassmorphic Bar) */}
        <div className="bg-surface-container-high/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input Integrated in the layout bar */}
            <div className="relative group w-full md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/50 group-focus-within:text-electric-violet transition-colors">search</span>
              <input 
                className="w-full bg-surface/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-on-surface font-body-md text-body-md focus:outline-none focus:border-electric-violet transition-all" 
                placeholder="Search bookings..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative group flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/50 text-[18px]">filter_list</span>
              <select 
                className="w-full md:w-40 appearance-none bg-surface/50 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-on-surface font-label-md text-label-md focus:outline-none focus:border-electric-violet transition-colors cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-indigo-300/50 pointer-events-none">arrow_drop_down</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-indigo-300/60 font-label-sm text-label-sm mr-2 hidden sm:block">Results: <span className="text-white font-bold">{filteredBookings.length}</span></span>
          </div>
        </div>

        {/* Glassmorphic Data Table */}
        <div className="bg-surface-container-low/60 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-violet/50 to-transparent opacity-50"></div>
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">confirmation_number</span>
                <p className="text-outline">No bookings found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/80 border-b border-white/10">
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap">Passenger / ID</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap">Bus & Route</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap">Seat</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap">Travel Date</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap">Booked On</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                    <th className="py-4 px-6 font-label-sm text-label-sm text-indigo-200/60 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-body-md text-body-md">
                  {filteredBookings.map((booking) => {
                    const initials = `${booking.profile?.first_name?.[0] ?? ''}${booking.profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?';
                    return (
                      <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-label-sm text-label-sm shadow-inner">
                              {initials}
                            </div>
                            <div>
                              <p className="text-on-surface font-medium group-hover:text-electric-violet transition-colors">
                                {booking.profile?.first_name || ''} {booking.profile?.last_name || 'Unknown'}
                              </p>
                              <p className="text-[12px] text-indigo-300/50 mt-0.5">{booking.id.slice(0, 8)} • {booking.profile?.email || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-on-surface font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-electric-violet">directions_bus</span>
                            {booking.bus.bus_no}
                          </p>
                          <p className="text-[13px] text-indigo-300/70 mt-0.5">
                            {booking.bus.route?.departure || '-'} 
                            <span className="material-symbols-outlined text-[12px] align-middle mx-0.5 opacity-50">arrow_forward</span> 
                            {booking.bus.route?.destination || '-'}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface border border-white/10 text-white font-label-md text-label-md">
                            {booking.seat_no}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-on-surface">{format(parseISO(booking.travel_date), 'MMM d, yyyy')}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-on-surface">{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {booking.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/10 border border-secondary-container/20 text-secondary-fixed text-[12px] font-bold tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse"></span>
                              CONFIRMED
                            </span>
                          )}
                          {booking.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 text-tertiary-fixed-dim text-[12px] font-bold tracking-wide">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              PENDING
                            </span>
                          )}
                          {booking.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/10 border border-error-container/20 text-error text-[12px] font-bold tracking-wide">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              CANCELLED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="View Details">
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Edit Booking">
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            {booking.status !== 'cancelled' && (
                              <button 
                                onClick={() => handleCancelBooking(booking.id)}
                                className="p-1.5 text-indigo-300 hover:text-error hover:bg-error/10 rounded-md transition-colors" 
                                title="Cancel"
                              >
                                <span className="material-symbols-outlined text-[20px]">cancel</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredBookings.length > 0 && (
            <div className="bg-surface-container-high/50 border-t border-white/5 p-4 flex items-center justify-between">
              <p className="text-[13px] text-indigo-300/60">Showing <span className="text-white font-medium">{filteredBookings.length}</span> entries</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
