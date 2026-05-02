import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, BellOff, Loader2, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) fetchNotifications();
  }, [user, authLoading]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent" />
              <h1 className="font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BellOff className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-foreground">No notifications yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">You'll be notified about your bookings and trips here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card key={n.id} className={`border-border/50 transition-colors ${!n.read ? 'bg-accent/5 border-accent/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-accent' : 'bg-transparent'}`} />
                      <div>
                        <p className="font-medium text-foreground text-sm">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {format(new Date(n.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
