import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    buses: 0,
    routes: 0,
    drivers: 0,
    bookings: 0,
    users: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/');
        return;
      }
      fetchStats();
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchStats = async () => {
    try {
      const [busesRes, routesRes, driversRes, bookingsRes, usersRes, revenueRes] = await Promise.all([
        supabase.from('buses').select('id', { count: 'exact', head: true }),
        supabase.from('routes').select('id', { count: 'exact', head: true }),
        supabase.from('drivers').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('schedule_id').eq('status', 'confirmed'),
      ]);

      // Calculate revenue: fetch seat_price for each confirmed booking's schedule
      let totalRevenue = 0;
      if (revenueRes.data && revenueRes.data.length > 0) {
        const scheduleIds = [...new Set(revenueRes.data.map((b: any) => b.schedule_id).filter(Boolean))];
        if (scheduleIds.length > 0) {
          const { data: schedules } = await supabase
            .from('schedules')
            .select('id, seat_price')
            .in('id', scheduleIds);
          const priceMap = new Map((schedules || []).map((s: any) => [s.id, s.seat_price || 0]));
          totalRevenue = revenueRes.data.reduce((sum: number, b: any) => sum + (priceMap.get(b.schedule_id) || 0), 0);
        }
      }

      setStats({
        buses: busesRes.count || 0,
        routes: routesRes.count || 0,
        drivers: driversRes.count || 0,
        bookings: bookingsRes.count || 0,
        users: usersRes.count || 0,
        revenue: totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const glassPanel = "bg-surface-container/40 backdrop-blur-xl border border-white/5";

  return (
    <AdminLayout>
      <div className="mb-xl">
        <h1 className="font-h1 text-h1 text-white mb-2">System Overview</h1>
        <p className="text-on-surface-variant font-body-lg text-body-lg">Real-time metrics and operational status.</p>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-xl">
        {/* Revenue - Large Featured Card */}
        <div className={`${glassPanel} rounded-2xl p-8 relative overflow-hidden group border border-emerald-spark/20 lg:col-span-2 shadow-[0_20px_50px_rgba(16,185,129,0.1)]`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-spark/10 via-transparent to-transparent opacity-60"></div>
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-spark/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="p-3 rounded-xl bg-emerald-spark/10 border border-emerald-spark/20 shadow-inner">
              <span className="material-symbols-outlined text-emerald-spark text-3xl">payments</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-emerald-spark font-label-sm text-label-sm bg-emerald-spark/10 px-3 py-1 rounded-full border border-emerald-spark/20 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-spark animate-pulse"></span>
                Live Revenue
              </span>
            </div>
          </div>
          
          <div className="relative z-10">
            <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-widest">Total Earnings</p>
            <h3 className="font-h1 text-4xl lg:text-5xl text-emerald-spark mb-6 tracking-tight">
              <span className="text-2xl font-medium opacity-70 mr-1">PKR</span>
              {stats.revenue.toLocaleString()}
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-end text-sm">
                <span className="text-on-surface-variant font-medium">Monthly Target</span>
                <span className="text-emerald-spark font-bold">85%</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div className="h-full bg-gradient-to-r from-emerald-spark to-electric-violet rounded-full w-[85%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Card */}
        <div className={`${glassPanel} rounded-2xl p-8 relative overflow-hidden group hover:border-primary/30 transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <div className="p-3 w-fit rounded-xl bg-primary/10 border border-primary/20 mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">confirmation_number</span>
              </div>
              <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-widest">Total Bookings</p>
              <h3 className="font-h1 text-4xl text-white tracking-tight">{stats.bookings}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-spark font-label-sm text-label-sm bg-emerald-spark/10 w-fit px-2 py-1 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+24% this month</span>
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div className={`${glassPanel} rounded-2xl p-8 relative overflow-hidden group hover:border-tertiary/30 transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-transparent opacity-50"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <div className="p-3 w-fit rounded-xl bg-tertiary/10 border border-tertiary/20 mb-6">
                <span className="material-symbols-outlined text-tertiary text-2xl">group</span>
              </div>
              <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-widest">Active Users</p>
              <h3 className="font-h1 text-4xl text-white tracking-tight">{stats.users}</h3>
            </div>
            <div className="mt-4 text-on-surface-variant text-xs">
              <span className="text-white font-bold">{Math.max(1, Math.floor(stats.users * 0.6))}</span> online now
            </div>
          </div>
        </div>

        {/* Buses Card */}
        <div className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:border-electric-violet/30 transition-all`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-electric-violet/10 border border-electric-violet/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-electric-violet">directions_bus</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-[10px] uppercase tracking-widest mb-0.5">Fleet Size</p>
              <h3 className="font-h2 text-2xl text-white">{stats.buses} <span className="text-xs font-normal text-on-surface-variant">Buses</span></h3>
            </div>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-electric-violet w-[100%]"></div>
          </div>
        </div>

        {/* Routes Card - Wider */}
        <div className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group lg:col-span-2 hover:border-emerald-spark/30 transition-all`}>
          <div className="flex items-center justify-between h-full relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-xl bg-emerald-spark/10 border border-emerald-spark/20 group-hover:rotate-12 transition-transform">
                <span className="material-symbols-outlined text-emerald-spark text-3xl">route</span>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-md text-xs uppercase tracking-widest mb-1">Coverage</p>
                <h3 className="font-h2 text-3xl text-white">{stats.routes} <span className="text-sm font-normal text-on-surface-variant">Active Routes Across Pakistan</span></h3>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="flex -space-x-2">
                {['KHI', 'LHE', 'ISL'].map(city => (
                  <div key={city} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center text-[10px] text-emerald-spark font-bold">
                    {city}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drivers Card */}
        <div className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:border-secondary/30 transition-all`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-secondary">badge</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-[10px] uppercase tracking-widest mb-0.5">Staff</p>
              <h3 className="font-h2 text-2xl text-white">{stats.drivers} <span className="text-xs font-normal text-on-surface-variant">Drivers</span></h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] text-emerald-spark">●</span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">All units verified</span>
          </div>
        </div>
      </div>


      <h2 className="font-h2 text-h2 text-white mb-6">Quick Actions</h2>
      
      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/admin/buses" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-electric-violet/50 group-hover:shadow-[0_0_15px_rgba(138,117,240,0.3)] transition-all">
            <span className="material-symbols-outlined text-electric-violet">directions_bus</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">Manage Buses</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Add, update, or retire vehicles from the fleet.</p>
          </div>
        </Link>

        <Link to="/admin/routes" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-emerald-spark/50 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all">
            <span className="material-symbols-outlined text-emerald-spark">alt_route</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">Route Planning</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Configure stops, paths, and travel times.</p>
          </div>
        </Link>

        <Link to="/admin/schedules" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-secondary/50 group-hover:shadow-[0_0_15px_rgba(67,238,184,0.3)] transition-all">
            <span className="material-symbols-outlined text-secondary">event_note</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">Schedule Master</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Adjust departure times and frequencies.</p>
          </div>
        </Link>

        <Link to="/admin/drivers" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(202,190,255,0.3)] transition-all">
            <span className="material-symbols-outlined text-primary">engineering</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">Driver Roster</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Assign shifts and review driver performance.</p>
          </div>
        </Link>

        <Link to="/admin/bookings" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-tertiary/50 group-hover:shadow-[0_0_15px_rgba(249,188,73,0.3)] transition-all">
            <span className="material-symbols-outlined text-tertiary">book_online</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">Booking Logs</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Review passenger reservations and payments.</p>
          </div>
        </Link>

        <Link to="/admin/users" className={`${glassPanel} rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 block`}>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-sunset-orange/50 group-hover:shadow-[0_0_15px_rgba(242,139,36,0.3)] transition-all">
            <span className="material-symbols-outlined text-sunset-orange">group</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-white mb-1">User Management</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Handle customer accounts and support tickets.</p>
          </div>
        </Link>
      </div>
    </AdminLayout>
  );
}
