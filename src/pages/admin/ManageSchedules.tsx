import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Route {
    id: string;
    departure: string;
    destination: string;
}

interface Bus {
    id: string;
    bus_no: string;
    capacity: number;
}

interface Schedule {
    id: string;
    bus_id?: string;
    route_id?: string;
    departure_time: string;
    arrival_time: string;
    travel_date: string;
    seat_price: number;
    bus?: Bus | null;
    route?: Route | null;
}

export default function ManageSchedules() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Schedule | null>(null);
    const [form, setForm] = useState({ bus_id: '', route_id: '', travel_date: '', departure_time: '09:00', arrival_time: '18:00', seat_price: '0.00' });
    const [submitting, setSubmitting] = useState(false);
    const [filterBusId, setFilterBusId] = useState('');
    const [filterRouteId, setFilterRouteId] = useState('');

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            navigate('/');
            return;
        }
        if (user && isAdmin) {
            fetchData();
        }
    }, [user, isAdmin, authLoading, navigate]);

    const fetchData = async () => {
        try {
            const [schedulesRes, busesRes, routesRes] = await Promise.all([
                supabase.from('schedules').select('id, travel_date, departure_time, arrival_time, seat_price, bus:buses(id, bus_no, capacity), route:routes(id, departure, destination)').order('travel_date', { ascending: true }),
                supabase.from('buses').select('id, bus_no, capacity').order('bus_no'),
                supabase.from('routes').select('id, departure, destination').order('departure'),
            ]);

            if (schedulesRes.error) throw schedulesRes.error;
            if (busesRes.error) throw busesRes.error;
            if (routesRes.error) throw routesRes.error;

            setSchedules((schedulesRes.data || []) as unknown as Schedule[]);
            setBuses(busesRes.data || []);
            setRoutes(routesRes.data || []);
        } catch (error: any) {
            console.error('Error fetching schedules:', error);
            toast.error('Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                bus_id: form.bus_id,
                route_id: form.route_id,
                travel_date: form.travel_date,
                departure_time: form.departure_time,
                arrival_time: form.arrival_time,
                seat_price: parseFloat(form.seat_price || '0'),
            };

            if (editing) {
                const { error } = await supabase.from('schedules').update(payload).eq('id', editing.id);
                if (error) throw error;
                toast.success('Schedule updated');
            } else {
                const { error } = await supabase.from('schedules').insert(payload);
                if (error) throw error;
                toast.success('Schedule created');
            }

            setDialogOpen(false);
            setEditing(null);
            setForm({ bus_id: '', route_id: '', travel_date: '', departure_time: '09:00', arrival_time: '18:00', seat_price: '0.00' });
            fetchData();
        } catch (error: any) {
            console.error('Error saving schedule:', error);
            toast.error('Failed to save schedule');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (s: Schedule) => {
        setEditing(s);
        setForm({ 
            bus_id: (s as any).bus?.id || (s as any).bus_id || '', 
            route_id: (s as any).route?.id || (s as any).route_id || '', 
            travel_date: s.travel_date, 
            departure_time: s.departure_time, 
            arrival_time: s.arrival_time, 
            seat_price: String(s.seat_price ?? '0.00') 
        });
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this schedule?')) return;
        try {
            const { error } = await supabase.from('schedules').delete().eq('id', id);
            if (error) throw error;
            toast.success('Schedule deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            toast.error('Failed to delete schedule');
        }
    };

    if (authLoading || loading) {
        return (
            <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
            </div>
        );
    }

    const filteredSchedules = schedules.filter(s =>
        (filterBusId === '' || (s.bus as any)?.id === filterBusId) &&
        (filterRouteId === '' || (s.route as any)?.id === filterRouteId)
    );

    const inputCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all placeholder:text-outline-variant";
    const selectCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all appearance-none cursor-pointer";

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-md">
                {/* Header section */}
                <div className="mb-lg flex justify-between items-end">
                    <div>
                        <h1 className="font-h2 text-h2 text-on-surface mb-xs">Schedules</h1>
                        <p className="font-body-md text-body-md text-on-surface-variant">Manage and monitor all active bus routes and times.</p>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                            setEditing(null);
                            setForm({ bus_id: '', route_id: '', travel_date: '', departure_time: '09:00', arrival_time: '18:00', seat_price: '0.00' });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <button className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-midnight-indigo px-6 py-3 rounded-lg font-label-md text-label-md hover:from-emerald-400 hover:to-emerald-300 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center gap-2 active:scale-95">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                                Add Schedule
                            </button>
                        </DialogTrigger>
                        <DialogContent className="bg-surface border-white/10 text-white max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-h3 text-xl">{editing ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 relative">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Bus</label>
                                        <select
                                            value={form.bus_id}
                                            onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
                                            className={selectCls}
                                            required
                                        >
                                            <option value="" disabled>Select bus</option>
                                            {buses.map((b) => (
                                                <option key={b.id} value={b.id}>{b.bus_no}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Route</label>
                                        <select
                                            value={form.route_id}
                                            onChange={(e) => setForm({ ...form, route_id: e.target.value })}
                                            className={selectCls}
                                            required
                                        >
                                            <option value="" disabled>Select route</option>
                                            {routes.map((r) => (
                                                <option key={r.id} value={r.id}>{r.departure} → {r.destination}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Travel Date</label>
                                        <input type="date" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} className={inputCls} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Seat Price (PKR)</label>
                                        <input type="number" step="0.01" value={form.seat_price} onChange={(e) => setForm({ ...form, seat_price: e.target.value })} className={inputCls} required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Departure Time</label>
                                        <input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className={inputCls} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-label-sm text-outline uppercase tracking-wider">Arrival Time</label>
                                        <input type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} className={inputCls} required />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-electric-violet text-white rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(138,117,240,0.3)] hover:bg-opacity-90 transition-all active:scale-95 mt-4"
                                >
                                    {submitting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
                                    {editing ? 'Update Schedule' : 'Create Schedule'}
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Glassmorphic Table Container */}
                <div className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant rounded-xl overflow-hidden shadow-2xl">
                    {/* Toolbar */}
                    <div className="p-md border-b border-outline-variant/50 flex flex-col sm:flex-row flex-wrap gap-3 items-center bg-surface-container-low/30">
                        {/* Bus filter */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">directions_bus</span>
                            <select
                                value={filterBusId}
                                onChange={(e) => setFilterBusId(e.target.value)}
                                className="bg-surface-dim border border-outline-variant rounded-lg py-2 pl-9 pr-8 font-label-md text-label-md text-on-surface focus:outline-none focus:border-electric-violet transition-all cursor-pointer appearance-none"
                            >
                                <option value="">All Buses</option>
                                {buses.map(b => <option key={b.id} value={b.id}>{b.bus_no}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                        </div>
                        {/* Route filter */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">map</span>
                            <select
                                value={filterRouteId}
                                onChange={(e) => setFilterRouteId(e.target.value)}
                                className="bg-surface-dim border border-outline-variant rounded-lg py-2 pl-9 pr-8 font-label-md text-label-md text-on-surface focus:outline-none focus:border-electric-violet transition-all cursor-pointer appearance-none"
                            >
                                <option value="">All Routes</option>
                                {routes.map(r => <option key={r.id} value={r.id}>{r.departure} → {r.destination}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                        </div>
                        {(filterBusId || filterRouteId) && (
                            <button
                                onClick={() => { setFilterBusId(''); setFilterRouteId(''); }}
                                className="flex items-center gap-1 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-label-sm text-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span> Clear
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {filteredSchedules.length === 0 ? (
                            <div className="py-16 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">calendar_month</span>
                                <p className="text-outline">No schedules found</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-container-high/40 text-on-surface-variant font-label-md text-label-md border-b border-outline-variant/80">
                                        <th className="px-6 py-4 font-semibold">Bus No</th>
                                        <th className="px-6 py-4 font-semibold">Route</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Departure - Arrival</th>
                                        <th className="px-6 py-4 font-semibold">Price</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/40">
                                    {filteredSchedules.map((s) => (
                                        <tr key={s.id} className="hover:bg-surface-container/60 transition-colors group">
                                            <td className="px-6 py-4 font-h3 text-[16px] text-white font-medium">{s.bus?.bus_no || '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-body-md text-body-md text-white">{s.route?.departure || '—'}</span>
                                                    <span className="material-symbols-outlined text-on-surface-variant text-sm">arrow_forward</span>
                                                    <span className="font-body-md text-body-md text-white">{s.route?.destination || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-body-md text-body-md text-on-surface-variant">{s.travel_date}</td>
                                            <td className="px-6 py-4 font-body-md text-body-md text-on-surface-variant">{s.departure_time} - {s.arrival_time}</td>
                                            <td className="px-6 py-4 font-body-md text-body-md text-emerald-spark font-medium">PKR {s.seat_price?.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleEdit(s)}
                                                        className="p-2 rounded-lg hover:bg-white/10 text-electric-violet transition-colors" 
                                                        title="Edit"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(s.id)}
                                                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors" 
                                                        title="Delete"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {filteredSchedules.length > 0 && (
                        <div className="p-4 border-t border-outline-variant/50 flex items-center justify-between bg-surface-container-low/30">
                            <div className="text-sm text-on-surface-variant">
                                Showing <span className="font-medium text-on-surface">{filteredSchedules.length}</span> schedules
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
