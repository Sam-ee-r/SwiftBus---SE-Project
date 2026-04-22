import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Route, Loader2, MapPin } from 'lucide-react';

const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Hyderabad',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Jhang',
  'Sargodha',
  'Bahawalpur',
  'Gilgit',
  'Skardu',
  'Abbottabad',
  'Mardan',
  'Swat',
  'Muzaffarabad',
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

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchRoutes();
    }
  }, [user, isAdmin, authLoading]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('departure');

      if (error) throw error;
      setRoutes(data);
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
      toast.error('Failed to delete route. It may be assigned to buses.');
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
              <Route className="h-5 w-5 text-accent" />
              <h1 className="font-bold text-foreground">Manage Routes</h1>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingRoute(null);
              setFormData({ departure: '', destination: '', distance_km: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="mr-2 h-4 w-4" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="departure">Departure City</Label>
                  <Select
                    value={formData.departure}
                    onValueChange={(value) => setFormData({ ...formData, departure: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select departure city" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAKISTAN_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination City</Label>
                  <Select
                    value={formData.destination}
                    onValueChange={(value) => setFormData({ ...formData, destination: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination city" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAKISTAN_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance_km">Distance (km)</Label>
                  <Input
                    id="distance_km"
                    type="number"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 350"
                    min={0}
                    step={0.1}
                    required
                  />
                </div>
                <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingRoute ? 'Update Route' : 'Add Route'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            {routes.length === 0 ? (
              <div className="py-16 text-center">
                <Route className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No routes added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departure</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.departure}</TableCell>
                      <TableCell>{route.destination}</TableCell>
                      <TableCell>{route.distance_km} km</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(route)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(route.id)}>
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
