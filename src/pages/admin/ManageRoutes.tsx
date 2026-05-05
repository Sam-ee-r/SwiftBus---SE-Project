import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Hyderabad', 'Peshawar', 'Quetta', 'Sialkot',
  'Gujranwala', 'Jhang', 'Sargodha', 'Bahawalpur', 'Gilgit',
  'Skardu', 'Abbottabad', 'Mardan', 'Swat', 'Muzaffarabad',
];

interface RouteData {
  id: string;
  departure: string;
  destination: string;
  distance_km: number;
}

export default function ManageRoutes() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [formData, setFormData] = useState({ departure: '', destination: '', distance_km: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [filterDeparture, setFilterDeparture] = useState('');
  const [filterDestination, setFilterDestination] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchRoutes();
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('departure');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(formData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        toast.success('Route updated successfully');
      } else {
        const { error } = await supabase.from('routes').insert(formData);
        if (error) throw error;
        toast.success('Route added successfully');
      }

      setDialogOpen(false);
      setEditingRoute(null);
      setFormData({ departure: '', destination: '', distance_km: 0 });
      fetchRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (route: RouteData) => {
    setEditingRoute(route);
    setFormData({
      departure: route.departure,
      destination: route.destination,
      distance_km: route.distance_km,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Route deleted successfully');
      fetchRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route. It may be assigned to schedules.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const filteredRoutes = routes.filter(route =>
    (filterDeparture === '' || route.departure === filterDeparture) &&
    (filterDestination === '' || route.destination === filterDestination)
  );

  const inputCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all placeholder:text-outline-variant";
  const selectCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all appearance-none cursor-pointer";

  return (
    <AdminLayout>
      {/* Ambient Background Glows handled by AdminLayout, but can add more if needed */}
      
      <div className="max-w-screen-2xl mx-auto space-y-md">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-h2 text-h2 text-white mb-2">Manage Routes</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">Configure and monitor the active transit network. Add new connections or adjust existing logistics.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingRoute(null);
              setFormData({ departure: '', destination: '', distance_km: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <button className="bg-emerald-spark text-deep-space font-label-md text-label-md px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity self-start md:self-auto shadow-[0_0_15px_rgba(52,211,153,0.4)] border border-emerald-spark active:scale-95">
                <span className="material-symbols-outlined font-bold text-[20px]">add</span>
                Add Route
              </button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-h3 text-xl">{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2 relative">
                  <label htmlFor="departure" className="font-label-sm text-outline uppercase tracking-wider">Departure City</label>
                  <select
                    id="departure"
                    value={formData.departure}
                    onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                    className={selectCls}
                    required
                  >
                    <option value="" disabled>Select departure city</option>
                    {PAKISTAN_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                </div>
                <div className="space-y-2 relative">
                  <label htmlFor="destination" className="font-label-sm text-outline uppercase tracking-wider">Destination City</label>
                  <select
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className={selectCls}
                    required
                  >
                    <option value="" disabled>Select destination city</option>
                    {PAKISTAN_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                </div>
                <div className="space-y-2">
                  <label htmlFor="distance_km" className="font-label-sm text-outline uppercase tracking-wider">Distance (km)</label>
                  <input
                    id="distance_km"
                    type="number"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 350"
                    min={0}
                    step={0.1}
                    className={inputCls}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-electric-violet text-white rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(138,117,240,0.3)] hover:bg-opacity-90 transition-all active:scale-95 mt-4"
                >
                  {submitting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
                  {editingRoute ? 'Update Route' : 'Add Route'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Glassmorphic Table Container */}
        <div className="bg-surface/40 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden shadow-2xl">
          {/* Table Header / Controls */}
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container/50">
            <div className="flex flex-wrap gap-3 w-full">
              {/* Departure filter */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">location_on</span>
                <select
                  value={filterDeparture}
                  onChange={(e) => setFilterDeparture(e.target.value)}
                  className="bg-deep-space/50 border border-white/10 rounded-lg py-2 pl-9 pr-8 font-body-md text-body-md text-white focus:outline-none focus:border-electric-violet transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Departures</option>
                  {PAKISTAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
              </div>
              {/* Destination filter */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">pin_drop</span>
                <select
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  className="bg-deep-space/50 border border-white/10 rounded-lg py-2 pl-9 pr-8 font-body-md text-body-md text-white focus:outline-none focus:border-electric-violet transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Destinations</option>
                  {PAKISTAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
              </div>
              {(filterDeparture || filterDestination) && (
                <button
                  onClick={() => { setFilterDeparture(''); setFilterDestination(''); }}
                  className="flex items-center gap-1 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-label-sm text-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span> Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredRoutes.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">map</span>
                <p className="text-outline">No routes found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-surface-container-high/30">
                    <th className="py-4 px-6 font-label-md text-label-md text-electric-violet uppercase tracking-wider">Departure</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-electric-violet uppercase tracking-wider">Destination</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-electric-violet uppercase tracking-wider">Distance (km)</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-electric-violet uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 text-electric-violet">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                          </div>
                          <span className="font-body-md text-body-md text-white font-medium">{route.departure}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 text-emerald-spark">
                            <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                          </div>
                          <span className="font-body-md text-body-md text-white font-medium">{route.destination}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-body-md text-body-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full text-sm border border-white/5">
                          {route.distance_km} km
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(route)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors" 
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(route.id)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors" 
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
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
          {filteredRoutes.length > 0 && (
            <div className="p-4 border-t border-white/5 flex items-center justify-between bg-surface-container-low/30">
              <span className="font-body-md text-sm text-on-surface-variant">Showing {filteredRoutes.length} routes</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
