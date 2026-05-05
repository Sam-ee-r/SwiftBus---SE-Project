import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Bus {
  id: string;
  bus_no: string;
  capacity: number;
}

export default function ManageBuses() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formData, setFormData] = useState({ bus_no: '', capacity: 40 });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const { data: busesData, error: busesError } = await supabase.from('buses').select('id, bus_no, capacity').order('bus_no');
      if (busesError) throw busesError;
      setBuses(busesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingBus) {
        const { error } = await supabase
          .from('buses')
          .update({
            bus_no: formData.bus_no,
            capacity: formData.capacity,
          })
          .eq('id', editingBus.id);

        if (error) throw error;
        toast.success('Bus updated successfully');
      } else {
        const { error } = await supabase.from('buses').insert({
          bus_no: formData.bus_no,
          capacity: formData.capacity,
        });

        if (error) throw error;
        toast.success('Bus added successfully');
      }

      setDialogOpen(false);
      setEditingBus(null);
      setFormData({ bus_no: '', capacity: 40 });
      fetchData();
    } catch (error: any) {
      console.error('Error saving bus:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Bus number already exists');
      } else {
        toast.error('Failed to save bus');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      bus_no: bus.bus_no,
      capacity: bus.capacity,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    try {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Bus deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting bus:', error);
      toast.error('Failed to delete bus');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const filteredBuses = buses.filter(b =>
    b.bus_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all placeholder:text-outline-variant";

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-md">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-lg">
          <div>
            <h2 className="font-h2 text-h2 text-white mb-xs">Manage Buses</h2>
            <p className="font-body-md text-body-md text-outline">View and organize fleet inventory</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingBus(null);
              setFormData({ bus_no: '', capacity: 40 });
            }
          }}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-spark text-midnight-indigo rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:bg-opacity-90 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto">
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                Add Bus
              </button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-h3 text-xl">{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label htmlFor="bus_no" className="font-label-sm text-outline uppercase tracking-wider">Bus Number</label>
                  <input
                    id="bus_no"
                    value={formData.bus_no}
                    onChange={(e) => setFormData({ ...formData, bus_no: e.target.value })}
                    placeholder="e.g., BUS-001"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="capacity" className="font-label-sm text-outline uppercase tracking-wider">Capacity</label>
                  <input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })}
                    min={1}
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
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Glassmorphic Data Table Container */}
        <div className="bg-surface/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          {/* Search bar */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full bg-deep-space/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 font-body-md text-body-md text-white placeholder-outline focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition-all"
                placeholder="Search by bus number..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {filteredBuses.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">directions_bus</span>
                <p className="text-outline">No buses found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Bus No.</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center border border-white/5">
                            <span className="material-symbols-outlined text-white/70">directions_bus</span>
                          </div>
                          <span className="font-label-md text-label-md text-white">{bus.bus_no}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-bright text-on-surface text-sm border border-white/10 font-body-md">
                          {bus.capacity} Seats
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEdit(bus)}
                          className="p-2 text-outline hover:text-electric-violet hover:bg-electric-violet/10 rounded-lg transition-all" 
                          title="Edit Bus"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(bus.id)}
                          className="p-2 text-outline hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all ml-2" 
                          title="Delete Bus"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination Footer (Static for now, as data is fetched all at once) */}
          {filteredBuses.length > 0 && (
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <p className="font-body-md text-sm text-outline">Showing {filteredBuses.length} of {buses.length} buses</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
