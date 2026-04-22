import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Bus, MapPin, Users, Ticket, LogOut, LayoutDashboard, Route, UserCog, Loader2, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    buses: 0,
    routes: 0,
    drivers: 0,
    bookings: 0,
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
  }, [user, isAdmin, authLoading]);

  const fetchStats = async () => {
    try {
      const [busesRes, routesRes, driversRes, bookingsRes] = await Promise.all([
        supabase.from('buses').select('id', { count: 'exact', head: true }),
        supabase.from('routes').select('id', { count: 'exact', head: true }),
        supabase.from('drivers').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
      ]);

      if (busesRes.error) console.error('Buses error:', busesRes.error);
      if (routesRes.error) console.error('Routes error:', routesRes.error);
      if (driversRes.error) console.error('Drivers error:', driversRes.error);
      if (bookingsRes.error) console.error('Bookings error:', bookingsRes.error);

      setStats({
        buses: busesRes.count || 0,
        routes: routesRes.count || 0,
        drivers: driversRes.count || 0,
        bookings: bookingsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Buses', value: stats.buses, icon: Bus, color: 'text-primary' },
    { title: 'Active Routes', value: stats.routes, icon: Route, color: 'text-accent' },
    { title: 'Drivers', value: stats.drivers, icon: UserCog, color: 'text-success' },
    { title: 'Total Bookings', value: stats.bookings, icon: Ticket, color: 'text-warning' },
  ];

  const menuItems = [
    { title: 'Manage Buses', description: 'Add, edit, and remove buses', icon: Bus, href: '/admin/buses' },
    { title: 'Manage Routes', description: 'Configure routes', icon: Route, href: '/admin/routes' },
    { title: 'Manage Schedules', description: 'Create bus schedules (bus + route + time)', icon: Calendar, href: '/admin/schedules' },
    { title: 'Manage Drivers', description: 'Driver assignments and details', icon: UserCog, href: '/admin/drivers' },
    { title: 'View Bookings', description: 'All passenger bookings', icon: Ticket, href: '/admin/bookings' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">SwiftBus Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border/50 shadow-soft">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-xl bg-muted p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item) => (
            <Link key={item.title} to={item.href}>
              <Card className="h-full border-border/50 shadow-soft transition-all duration-200 hover:shadow-medium hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
