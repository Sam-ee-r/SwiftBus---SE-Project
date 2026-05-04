import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PassengerNav } from '@/components/PassengerNav';

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Hyderabad', 'Peshawar', 'Quetta', 'Sialkot',
  'Gujranwala', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan',
  'Swat', 'Muzaffarabad', 'Gilgit', 'Sukkur', 'Larkana',
];

interface Schedule {
  id: string;
  departure_time: string;
  arrival_time: string;
  travel_date: string;
  seat_price?: number;
  bus: { id: string; bus_no: string; capacity: number } | null;
  route: { id: string; departure: string; destination: string; distance_km: number } | null;
}

const calculateDuration = (depTime: string, arrTime: string) => {
  if (!depTime || !arrTime) return 'N/A';
  const [h1, m1] = depTime.split(':').map(Number);
  const [h2, m2] = arrTime.split(':').map(Number);
  let d1 = new Date(); d1.setHours(h1, m1, 0);
  let d2 = new Date(); d2.setHours(h2, m2, 0);
  if (d2 < d1) d2.setDate(d2.getDate() + 1);
  const diff = d2.getTime() - d1.getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
};

const formatTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const selectCls =
  'w-full bg-[#1c1a24] border border-white/10 rounded-lg py-3 pl-10 pr-8 font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all appearance-none cursor-pointer';

export default function SearchPage() {
  const { user, isAdmin, isDriver, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const qp = new URLSearchParams(location.search);

  const [from, setFrom] = useState(qp.get('from') || '');
  const [to, setTo] = useState(qp.get('to') || '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user && isAdmin) navigate('/admin');
    if (!authLoading && user && isDriver) navigate('/driver');
  }, [user, isAdmin, isDriver, authLoading, navigate]);

  // Auto-search if URL params present
  useEffect(() => {
    if (qp.get('from') || qp.get('to')) doSearch(qp.get('from') || '', qp.get('to') || '', date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (f: string, t: string, d: string) => {
    setLoading(true);
    setSearched(true);
    setIsMobileFiltersOpen(false);
    try {
      const { data: routesData, error: routesError } = await supabase.from('routes').select('id, departure, destination');
      if (routesError) throw routesError;

      const matched = (routesData || []).filter((r: any) => {
        const mFrom = !f || r.departure.toLowerCase() === f.toLowerCase();
        const mTo = !t || r.destination.toLowerCase() === t.toLowerCase();
        return mFrom && mTo;
      });

      if (!matched.length) { setSchedules([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from('schedules')
        .select('id, departure_time, arrival_time, travel_date, seat_price, bus:buses(id, bus_no, capacity), route:routes(id, departure, destination, distance_km)')
        .in('route_id', matched.map((r: any) => r.id))
        .eq('travel_date', d);

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      toast.error('Failed to search buses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(from, to, date);
  };

  return (
    <div className="bg-deep-space text-on-surface antialiased min-h-screen overflow-x-hidden selection:bg-electric-violet selection:text-white">
      <PassengerNav />

      <div className="pt-[64px] flex min-h-screen max-w-[1440px] mx-auto">
        {/* ── Side Filter Panel ── */}
        <aside
          className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} md:flex flex-col bg-slate-900/60 backdrop-blur-2xl font-['Space_Grotesk'] text-sm antialiased h-[calc(100vh-64px)] w-full md:w-72 border-r border-white/5 divide-y divide-white/5 fixed md:left-0 top-16 overflow-y-auto z-40 transition-all duration-300`}
        >
          <div className="p-6 pb-4">
            <h2 className="text-2xl font-bold text-white mb-1">Find Buses</h2>
            <p className="text-slate-400 text-sm">Search inter-city routes</p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col p-6 flex-1 gap-5">
            {/* From */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">my_location</span>
                <select className={selectCls} value={from} onChange={e => setFrom(e.target.value)}>
                  <option value="" className="bg-slate-900">Any Origin</option>
                  {PAKISTAN_CITIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* To */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">location_on</span>
                <select className={selectCls} value={to} onChange={e => setTo(e.target.value)}>
                  <option value="" className="bg-slate-900">Any Destination</option>
                  {PAKISTAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travel Date</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">calendar_month</span>
                <input
                  type="date"
                  className="w-full bg-[#1c1a24] border border-white/10 rounded-lg py-3 pl-10 pr-3 font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_hsla(255,65%,60%,0.2)] hover:shadow-[0_0_20px_hsla(255,65%,60%,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {loading
                  ? <span className="material-symbols-outlined animate-spin">sync</span>
                  : <span className="material-symbols-outlined">search</span>
                }
                Search Buses
              </button>
            </div>
          </form>
        </aside>

        {/* ── Results ── */}
        <main className="flex-1 md:ml-72 p-6 md:p-8 pb-24 md:pb-8">
          {/* Header row */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold text-white flex items-center flex-wrap gap-2">
                {from || 'All Origins'}
                <span className="material-symbols-outlined text-[24px] text-slate-500 mx-1">arrow_right_alt</span>
                {to || 'All Destinations'}
              </h1>
              <p className="text-slate-400 mt-1.5 text-sm">
                {format(new Date(date + 'T12:00:00'), 'EEEE, MMM d, yyyy')} &bull; {schedules.length} {schedules.length === 1 ? 'Trip' : 'Trips'} Available
              </p>
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="md:hidden self-start flex items-center gap-2 border border-white/10 rounded-lg px-4 py-2 text-slate-300 hover:bg-white/5 transition-colors font-['Space_Grotesk'] text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
              {isMobileFiltersOpen ? 'Close Filters' : 'Change Search'}
            </button>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-5">
            {!searched && schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-60">
                <span className="material-symbols-outlined text-[64px] text-slate-500 mb-4">directions_bus</span>
                <h2 className="text-xl font-semibold text-white">Ready to explore?</h2>
                <p className="text-slate-400 mt-2 text-sm">Select your origin, destination and date to find available buses.</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-24">
                <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-80">
                <span className="material-symbols-outlined text-[64px] text-slate-500 mb-4">search_off</span>
                <h2 className="text-xl font-semibold text-white">No buses found</h2>
                <p className="text-slate-400 mt-2 text-sm">Try a different date or route — new schedules are added regularly.</p>
              </div>
            ) : (
              schedules.map(s => (
                <div
                  key={s.id}
                  className="bg-[#14121a]/90 border border-white/10 rounded-2xl p-6 hover:shadow-[0_0_24px_hsla(255,65%,60%,0.12)] hover:border-violet-500/30 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    {/* Route info */}
                    <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-5">
                      <div className="flex flex-col">
                        <span className="font-['Space_Grotesk'] text-2xl font-black text-white">{formatTime(s.departure_time)}</span>
                        <span className="text-slate-400 text-sm mt-0.5">{s.route?.departure}</span>
                      </div>

                      <div className="hidden md:flex flex-1 items-center px-6 relative">
                        <div className="h-[1px] bg-slate-700 flex-1 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#14121a] px-3">
                            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                              {calculateDuration(s.departure_time, s.arrival_time)} &bull; Direct
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 my-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {calculateDuration(s.departure_time, s.arrival_time)} &bull; Direct
                      </div>

                      <div className="flex flex-col md:text-right">
                        <span className="font-['Space_Grotesk'] text-2xl font-black text-white">{formatTime(s.arrival_time)}</span>
                        <span className="text-slate-400 text-sm mt-0.5">{s.route?.destination}</span>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-5 md:pt-0 md:pl-6 gap-4 md:min-w-[160px]">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">from</span>
                        <span className="font-['Space_Grotesk'] text-2xl font-black text-emerald-400">
                          PKR {(s.seat_price ?? 1500).toLocaleString('en-PK')}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/book/schedule/${s.id}`)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-7 py-3 rounded-xl transition-all shadow-[0_0_15px_hsla(165,80%,50%,0.3)] hover:shadow-[0_0_25px_hsla(165,80%,50%,0.5)] flex items-center gap-2 active:scale-95"
                      >
                        Select <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <span className="bg-surface-container border border-white/10 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px] text-violet-400">directions_bus</span>
                      {s.bus?.bus_no || 'Coach'}
                    </span>
                    <span className="bg-surface-container border border-white/10 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      {s.route?.distance_km ? `${s.route.distance_km} km` : 'Inter-City'}
                    </span>
                    <div className="flex items-center gap-2 text-slate-600 ml-auto">
                      <span className="material-symbols-outlined text-[18px]" title="Air Conditioning">ac_unit</span>
                      <span className="material-symbols-outlined text-[18px]" title="Reclining Seats">airline_seat_recline_extra</span>
                      <span className="material-symbols-outlined text-[18px]" title="Luggage Space">luggage</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
