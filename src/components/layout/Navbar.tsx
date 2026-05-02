import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Bus, User, LogOut, LayoutDashboard, Menu, X, Gauge, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, signOut, isAdmin, isDriver } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Simple real-time subscription for notifications
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => fetchUnreadCount()
        )
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
      
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={isAdmin ? '/admin' : isDriver ? '/driver' : '/'} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Bus className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">SwiftBus</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          {!isAdmin && !isDriver && (
            <>
              <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Home
              </Link>
              <Link to="/search" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Book Tickets
              </Link>
              {user && (
                <Link to="/my-bookings" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  My Bookings
                </Link>
              )}
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
          )}
          {isDriver && (
            <Link to="/driver" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Gauge className="inline-block mr-1 h-4 w-4" />
              Driver Portal
            </Link>
          )}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link to="/notifications" className="relative text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-l border-border/50 pl-4">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button variant="accent" size="sm" onClick={() => navigate('/auth?mode=signup')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          {user && (
            <Link to="/notifications" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <button
            className="flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-md md:hidden">
          <div className="container mx-auto space-y-4 px-4 py-4">
            {!isAdmin && !isDriver && (
              <>
                <Link to="/" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link to="/search" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Book Tickets</Link>
                {user && (
                  <Link to="/my-bookings" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>My Bookings</Link>
                )}
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            )}
            {isDriver && (
              <Link to="/driver" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Driver Portal</Link>
            )}
            <div className="border-t border-border/50 pt-4">
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="w-full">
                    Sign In
                  </Button>
                  <Button variant="accent" size="sm" onClick={() => navigate('/auth?mode=signup')} className="w-full">
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
