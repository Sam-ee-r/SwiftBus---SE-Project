import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, UserCog, Loader2, Phone, CreditCard } from 'lucide-react';

interface Bus {
  id: string;
  bus_no: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_no: string;
  phone_num: string | null;
  bus_id: string | null;
  bus: Bus | null;
}

export default function ManageDrivers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_no: '',
    phone_num: '',
    bus_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchData();
      fetchBuses();
    }
  }, [user, isAdmin, authLoading]);

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
      setFormData({ first_name: '', last_name: '', license_no: '', phone_num: '', bus_id: '' });
      fetchData();
      fetchBuses();
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-success" />
              <h1 className="font-bold text-foreground">Manage Drivers</h1>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingDriver(null);
              setFormData({ first_name: '', last_name: '', license_no: '', phone_num: '', bus_id: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="mr-2 h-4 w-4" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_no">License Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="license_no"
                      value={formData.license_no}
                      onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                      placeholder="DL-12345678"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_num">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone_num"
                      value={formData.phone_num}
                      onChange={(e) => setFormData({ ...formData, phone_num: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bus">Assigned Bus</Label>
                  <Select
                    value={formData.bus_id}
                    onValueChange={(value) => setFormData({ ...formData, bus_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bus (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {buses.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id}>
                          {bus.bus_no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            {drivers.length === 0 ? (
              <div className="py-16 text-center">
                <UserCog className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No drivers added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>License No.</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Assigned Bus</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.first_name} {driver.last_name}
                      </TableCell>
                      <TableCell>{driver.license_no}</TableCell>
                      <TableCell>{driver.phone_num || '-'}</TableCell>
                      <TableCell>
                        {driver.bus ? driver.bus.bus_no : <span className="text-muted-foreground">Not assigned</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(driver)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(driver.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
