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
}

interface DriverUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_no: string;
  phone_num: string | null;
  bus_id: string | null;
  user_id: string | null;
  bus: Bus | null;
}

export default function ManageDrivers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [driverUsers, setDriverUsers] = useState<DriverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_no: '',
    phone_num: '',
    bus_id: '',
    user_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchData();
      fetchBuses();
      fetchDriverUsers();
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, first_name, last_name, license_no, phone_num, bus_id')
        .order('first_name');

      if (error) throw error;

      // Fetch buses separately to avoid join issues
      const busesData = await supabase.from('buses').select('id, bus_no').order('bus_no');
      if (busesData.error) throw busesData.error;

      // Map drivers with bus info
      const driversWithBus = (data || []).map((driver: any) => ({
        ...driver,
        bus: busesData.data?.find((b: any) => b.id === driver.bus_id) || null,
      }));

      setDrivers(driversWithBus as Driver[]);
      setBuses(busesData.data || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error(`Failed to load drivers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase.from('buses').select('id, bus_no').order('bus_no');
      if (error) throw error;
      setBuses(data);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDriverUsers = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'driver');
      if (roleError) throw roleError;

      if (!roleData?.length) { setDriverUsers([]); return; }

      const userIds = roleData.map((r: any) => r.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      if (profileError) throw profileError;
      setDriverUsers(profileData || []);
    } catch (error) {
      console.error('Error fetching driver users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        license_no: formData.license_no,
        phone_num: formData.phone_num || null,
        bus_id: formData.bus_id || null,
        user_id: formData.user_id || null,
      };

      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update(data)
          .eq('id', editingDriver.id);

        if (error) throw error;
        toast.success('Driver updated successfully');
      } else {
        const { error } = await supabase.from('drivers').insert(data);
        if (error) throw error;
        toast.success('Driver added successfully');
      }

      setDialogOpen(false);
      setEditingDriver(null);
      setFormData({ first_name: '', last_name: '', license_no: '', phone_num: '', bus_id: '', user_id: '' });
      fetchData();
      fetchBuses();
      fetchDriverUsers();
    } catch (error: any) {
      console.error('Error saving driver:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('License number already exists');
      } else {
        toast.error('Failed to save driver');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      first_name: driver.first_name,
      last_name: driver.last_name,
      license_no: driver.license_no,
      phone_num: driver.phone_num || '',
      bus_id: driver.bus_id || '',
      user_id: driver.user_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Driver deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Failed to delete driver');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const inputCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all placeholder:text-outline-variant";
  const selectCls = "w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 px-4 font-body-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all appearance-none cursor-pointer";

  const filteredDrivers = drivers.filter(d => 
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.license_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-electric-violet/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-spark/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="max-w-6xl mx-auto space-y-md">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-margin gap-md">
          <div>
            <h1 className="font-h1 text-h2 text-white mb-2">Manage Drivers</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">View and manage the fleet's active driving personnel.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-sm">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                className="bg-surface-container/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition-all w-full md:w-64 placeholder:text-on-surface-variant font-body-md text-body-md" 
                placeholder="Search drivers..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingDriver(null);
                setFormData({ first_name: '', last_name: '', license_no: '', phone_num: '', bus_id: '', user_id: '' });
              }
            }}>
              <DialogTrigger asChild>
                <button className="bg-emerald-spark text-midnight-indigo font-label-md text-label-md px-6 py-2 rounded-lg hover:bg-emerald-spark/90 transition-all shadow-[0_0_20px_hsla(165,80%,50%,0.2)] flex items-center justify-center gap-xs whitespace-nowrap active:scale-95">
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  Add Driver
                </button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-h3 text-xl">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="first_name" className="font-label-sm text-outline uppercase tracking-wider">First Name</label>
                      <input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last_name" className="font-label-sm text-outline uppercase tracking-wider">Last Name</label>
                      <input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe"
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="license_no" className="font-label-sm text-outline uppercase tracking-wider">License Number</label>
                    <input
                      id="license_no"
                      value={formData.license_no}
                      onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                      placeholder="DL-12345678"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone_num" className="font-label-sm text-outline uppercase tracking-wider">Phone Number</label>
                    <input
                      id="phone_num"
                      value={formData.phone_num}
                      onChange={(e) => setFormData({ ...formData, phone_num: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="bus_id" className="font-label-sm text-outline uppercase tracking-wider">Assigned Bus (Optional)</label>
                    <select
                      id="bus_id"
                      value={formData.bus_id}
                      onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">Unassigned</option>
                      {buses.map((bus) => (
                        <option key={bus.id} value={bus.id}>
                          {bus.bus_no}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="user_id" className="font-label-sm text-outline uppercase tracking-wider">Link to User Account (Optional)</label>
                    <select
                      id="user_id"
                      value={formData.user_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        const selected = driverUsers.find((u) => u.id === value);
                        setFormData({
                          ...formData,
                          user_id: value,
                          first_name: selected?.first_name || formData.first_name,
                          last_name: selected?.last_name || formData.last_name,
                        });
                      }}
                      className={selectCls}
                    >
                      <option value="">No linked account</option>
                      {driverUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} — {u.email}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-[38px] text-outline pointer-events-none">expand_more</span>
                    <p className="text-xs text-on-surface-variant">Only users with 'driver' role appear here.</p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-electric-violet text-white rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(138,117,240,0.3)] hover:bg-opacity-90 transition-all active:scale-95 mt-4"
                  >
                    {submitting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
                    {editingDriver ? 'Update Driver' : 'Add Driver'}
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Glassmorphic Data Table */}
        <div className="bg-surface/40 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto">
            {filteredDrivers.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">badge</span>
                <p className="text-outline">No drivers found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Driver Name</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">License No.</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Phone</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Assigned Bus</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-sm">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${driver.bus ? 'bg-electric-violet/20 border-electric-violet/30' : 'bg-surface-container border-white/10'}`}>
                            <span className={`material-symbols-outlined ${driver.bus ? 'text-electric-violet' : 'text-on-surface-variant'}`}>person</span>
                          </div>
                          <div>
                            <div className="font-label-md text-label-md text-white">{driver.first_name} {driver.last_name}</div>
                            <div className={`font-label-sm text-label-sm flex items-center gap-1 ${driver.bus ? 'text-emerald-spark' : 'text-tertiary'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${driver.bus ? 'bg-emerald-spark' : 'bg-tertiary'}`}></span> 
                              {driver.bus ? 'Assigned' : 'Unassigned'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-body-md text-body-md text-on-surface">{driver.license_no}</td>
                      <td className="py-4 px-6 font-body-md text-body-md text-on-surface">{driver.phone_num || '-'}</td>
                      <td className="py-4 px-6">
                        {driver.bus ? (
                          <span className="px-3 py-1 bg-surface-container rounded-lg border border-white/5 font-label-sm text-label-sm text-on-surface whitespace-nowrap">
                            Bus {driver.bus.bus_no}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-surface-container rounded-lg border border-white/5 font-label-sm text-label-sm text-on-surface-variant italic whitespace-nowrap">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(driver)}
                            className="p-2 rounded-lg hover:bg-white/10 text-electric-violet transition-colors"
                            title="Edit Driver"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(driver.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-error transition-colors"
                            title="Delete Driver"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
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
          {filteredDrivers.length > 0 && (
            <div className="border-t border-white/5 px-6 py-4 flex items-center justify-between bg-white/5">
              <span className="font-body-md text-body-md text-on-surface-variant">Showing {filteredDrivers.length} drivers</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
