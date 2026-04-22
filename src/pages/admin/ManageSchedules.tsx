import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';

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
        setForm({ bus_id: s.bus_id, route_id: s.route_id, travel_date: s.travel_date, departure_time: s.departure_time, arrival_time: s.arrival_time, seat_price: String((s as any).seat_price ?? '0.00') });
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
                            <Calendar className="h-5 w-5 text-primary" />
                            <h1 className="font-bold text-foreground">Manage Schedules</h1>
                        </div>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                            setEditing(null);
                            setForm({ bus_id: '', route_id: '', travel_date: '', departure_time: '09:00', arrival_time: '18:00', seat_price: '0.00' });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="accent">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Schedule
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl w-full">
                            <DialogHeader>
                                <DialogTitle>{editing ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Bus</Label>
                                        <Select value={form.bus_id} onValueChange={(v) => setForm({ ...form, bus_id: v })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select bus" />
                                            </SelectTrigger>
                                            <SelectContent className="w-full">
                                                {buses.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>{b.bus_no}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Route</Label>
                                        <Select value={form.route_id} onValueChange={(v) => setForm({ ...form, route_id: v })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select route" />
                                            </SelectTrigger>
                                            <SelectContent className="w-full">
                                                {routes.map((r) => (
                                                    <SelectItem key={r.id} value={r.id}>{r.departure} → {r.destination}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Travel Date</Label>
                                        <Input type="date" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} className="w-full" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Departure Time</Label>
                                        <Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className="w-full" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Arrival Time</Label>
                                        <Input type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} className="w-full" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Seat Price</Label>
                                        <Input type="number" step="0.01" value={form.seat_price} onChange={(e) => setForm({ ...form, seat_price: e.target.value })} className="w-full" required />
                                    </div>
                                </div>

                                <Button type="submit" variant="accent" className="w-full" disabled={submitting}>{submitting ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <Card className="border-border/50 shadow-soft">
                    <CardContent className="p-0">
                        {schedules.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-muted-foreground">No schedules found</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bus</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Times</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schedules.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.bus?.bus_no || '—'}</TableCell>
                                            <TableCell>{s.route ? `${s.route.departure} → ${s.route.destination}` : '—'}</TableCell>
                                            <TableCell>{s.travel_date}</TableCell>
                                            <TableCell>{s.departure_time} → {s.arrival_time}</TableCell>
                                            <TableCell>Rs. {(s as any).seat_price?.toFixed ? (s as any).seat_price.toFixed(2) : String((s as any).seat_price || '0')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
