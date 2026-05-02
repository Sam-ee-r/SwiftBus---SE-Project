import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// routes are managed via schedules; no select import needed here
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Bus, Loader2 } from 'lucide-react';

interface Bus {
  id: string;
  bus_no: string;
  capacity: number;
  drivers?: { first_name: string; last_name: string }[];
}

export default function ManageBuses() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [allDrivers, setAllDrivers] = useState<{id: string, first_name: string, last_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formData, setFormData] = useState({ bus_no: '', capacity: 40, driver_id: 'unassigned' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, authLoading]);

  const fetchData = async () => {
    try {
      const { data: busesData, error: busesError } = await supabase.from('buses').select('id, bus_no, capacity, drivers(id, first_name, last_name)').order('bus_no');
      if (busesError) throw busesError;
      
      const { data: driversData, error: driversError } = await supabase.from('drivers').select('id, first_name, last_name').order('first_name');
      if (driversError) throw driversError;
      
      setBuses(busesData || []);
      setAllDrivers(driversData || []);
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
      let busId = '';
      if (editingBus) {
        const { error } = await supabase
          .from('buses')
          .update({
            bus_no: formData.bus_no,
            capacity: formData.capacity,
          })
          .eq('id', editingBus.id);

        if (error) throw error;
        busId = editingBus.id;
        toast.success('Bus updated successfully');
      } else {
        const { data: newBus, error } = await supabase.from('buses').insert({
          bus_no: formData.bus_no,
          capacity: formData.capacity,
        }).select('id').single();

        if (error) throw error;
        if (newBus) busId = newBus.id;
        toast.success('Bus added successfully');
      }

      // Handle driver assignment
      if (busId) {
        // First unassign any driver that currently has this bus
        await supabase.from('drivers').update({ bus_id: null }).eq('bus_id', busId);
        
        // Then assign the new driver if selected
        if (formData.driver_id !== 'unassigned') {
          await supabase.from('drivers').update({ bus_id: busId }).eq('id', formData.driver_id);
        }
      }

      setDialogOpen(false);
      setEditingBus(null);
      setFormData({ bus_no: '', capacity: 40, driver_id: 'unassigned' });
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

  const handleEdit = (bus: any) => {
    setEditingBus(bus);
    setFormData({
      bus_no: bus.bus_no,
      capacity: bus.capacity,
      driver_id: bus.drivers && bus.drivers.length > 0 ? bus.drivers[0].id : 'unassigned',
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
              <Bus className="h-5 w-5 text-primary" />
              <h1 className="font-bold text-foreground">Manage Buses</h1>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingBus(null);
              setFormData({ bus_no: '', capacity: 40, driver_id: 'unassigned' });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="mr-2 h-4 w-4" />
                Add Bus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bus_no">Bus Number</Label>
                  <Input
                    id="bus_no"
                    value={formData.bus_no}
                    onChange={(e) => setFormData({ ...formData, bus_no: e.target.value })}
                    placeholder="e.g., BUS-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })}
                    min={1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Assigned Driver</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  >
                    <SelectTrigger id="driver">
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" className="italic text-muted-foreground">Unassigned</SelectItem>
                      {allDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Assigning a driver here will automatically link their portal to this bus.</p>
                </div>
                {/* routes are assigned per-schedule now; no route on bus */}
                <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            {buses.length === 0 ? (
              <div className="py-16 text-center">
                <Bus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No buses added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus No.</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Assigned Driver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buses.map((bus) => (
                    <TableRow key={bus.id}>
                      <TableCell className="font-medium">{bus.bus_no}</TableCell>
                      <TableCell>{bus.capacity} seats</TableCell>
                      <TableCell>
                        {bus.drivers && bus.drivers.length > 0 ? (
                          <span className="text-sm text-foreground font-medium">
                            {bus.drivers[0].first_name} {bus.drivers[0].last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(bus)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(bus.id)}>
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
