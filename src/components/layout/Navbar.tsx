import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Bus, User, LogOut, LayoutDashboard, Menu, X, Gauge } from 'lucide-react';
import { SwiftBusLogo } from '@/components/SwiftBusLogo';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  const { user, signOut, isAdmin, isDriver } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={isAdmin ? '/admin' : isDriver ? '/driver' : '/'} className="flex items-center gap-2">
          <SwiftBusLogo size="md" />
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
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
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
