import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, MapPin, Calendar, Bus, Clock, ArrowRight, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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

interface Route {
  id: string;
  departure: string;
  destination: string;
  distance_km: number;
}

interface Schedule {
  id: string;
  departure_time: string;
  arrival_time: string;
  travel_date: string;
  seat_price?: number;
  bus: {
    id: string;
    bus_no: string;
    capacity: number;
  } | null;
  route: Route | null;
}

export default function SearchPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      // Find matching routes first
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('id, departure, destination');

      if (routesError) throw routesError;

      const matchedRoutes = (routesData || []).filter((r: any) => {
        const matchesFrom = !from || r.departure === from;
        const matchesTo = !to || r.destination === to;
        return matchesFrom && matchesTo;
      });

      if (!matchedRoutes.length) {
        setSchedules([]);
        return;
      }

      const routeIds = matchedRoutes.map((r: any) => r.id);

      // Fetch schedules for the matched routes on selected date
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, departure_time, arrival_time, travel_date, seat_price, bus:buses(id, bus_no, capacity), route:routes(id, departure, destination, distance_km)')
        .in('route_id', routeIds)
        .eq('travel_date', date);

      if (schedulesError) throw schedulesError;

      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error searching buses:', error);
      toast.error('Failed to search buses');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (schedule: Schedule) => {
    navigate(`/book/schedule/${schedule.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Header */}
      <section className="border-b border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
            Find Your Bus
          </h1>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Select value={from} onValueChange={setFrom}>
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
                <Label htmlFor="to">To</Label>
                <Select value={to} onValueChange={setTo}>
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
                <Label htmlFor="date">Travel Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="accent" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {!searched ? (
            <div className="py-16 text-center">
              <Bus className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-medium text-muted-foreground">
                Search for buses to get started
              </h2>
              <p className="mt-2 text-sm text-muted-foreground/70">
                Enter your departure and destination to find available buses
              </p>
            </div>
          ) : loading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
              <p className="text-muted-foreground">Searching for buses...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-16 text-center">
              <Bus className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-medium text-muted-foreground">No buses found</h2>
              <p className="mt-2 text-sm text-muted-foreground/70">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {schedules.length} departure{schedules.length !== 1 ? 's' : ''}
              </p>

              {schedules.map((schedule) => (
                <Card key={schedule.id} className="overflow-hidden border-border/50 shadow-soft transition-all duration-200 hover:shadow-medium">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Bus Info */}
                      <div className="flex-1 p-6 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <Bus className="h-5 w-5 text-primary flex-shrink-0" />
                              <span className="font-semibold text-foreground line-clamp-1">{schedule.bus?.bus_no}</span>
                            </div>
                            {schedule.route && (
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-foreground">{schedule.route.departure}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-foreground">{schedule.route.destination}</span>
                              </div>
                            )}
                            <div className="mt-2 text-sm text-muted-foreground">
                              {schedule.departure_time} → {schedule.arrival_time} • {format(new Date(schedule.travel_date), 'PPP')}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{schedule.bus?.capacity ?? 'N/A'} seats</span>
                          </div>
                          {schedule.route && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.route.distance_km} km</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price & Book */}
                      <div className="flex flex-col items-center justify-center border-t border-border/50 bg-muted/30 p-6 md:border-l md:border-t-0 md:w-56 flex-none">
                        <div className="mb-2 text-sm text-muted-foreground">Starting from</div>
                        <div className="mb-4 text-2xl font-bold text-foreground break-all text-center">Rs. {((schedule.seat_price ?? ((schedule.route?.distance_km || 10) * 0.5))).toFixed(2)}</div>
                        <Button variant="accent" onClick={() => handleBookNow(schedule)}>
                          Select Seats
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
