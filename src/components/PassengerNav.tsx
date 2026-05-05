import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { SwiftBusLogo } from '@/components/SwiftBusLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function PassengerNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10); // get recent 10

    if (!error && data) {
      setNotifications(data);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }
    
    setShowDropdown(false);
    
    const title = notification.title.toLowerCase();
    const msg = notification.message.toLowerCase();
    
    if (title.includes('booking') || msg.includes('booking')) {
      navigate('/my-bookings');
    } else if (title.includes('profile') || msg.includes('profile')) {
      navigate('/profile');
    } else if (title.includes('trip') || msg.includes('trip') || title.includes('bus') || msg.includes('bus')) {
      navigate('/search');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const linkCls = (path: string) =>
    `font-['Space_Grotesk'] text-sm font-medium tracking-wide transition-all duration-200 px-3 py-2 rounded-lg hover:bg-white/5 active:scale-95 cursor-pointer ${
      isActive(path)
        ? 'text-electric-violet border-b-2 border-electric-violet pb-1'
        : 'text-slate-400 hover:text-white'
    }`;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Desktop Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hidden md:flex">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 w-full max-w-[1440px] mx-auto">
          {/* Logo */}
          <SwiftBusLogo size="md" clickable />

          {/* Center Nav Links */}
          <div className="flex items-center gap-1">
            <a className={linkCls('/')} onClick={() => navigate('/')}>Home</a>
            <a className={linkCls('/search')} onClick={() => navigate('/search')}>Find Buses</a>
            {user && (
              <a className={linkCls('/my-bookings')} onClick={() => navigate('/my-bookings')}>My Bookings</a>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="Alerts"
                    className={`relative p-2 rounded-full transition-colors hover:bg-white/5 ${showDropdown ? 'text-electric-violet' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: showDropdown ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-950 animate-pulse"></span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 transform origin-top-right transition-all">
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl">
                        <h3 className="font-['Space_Grotesk'] text-white font-bold">Alerts</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllRead}
                            className="text-xs text-electric-violet hover:text-violet-400 font-semibold transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-sm">
                            <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">notifications_paused</span>
                            <p>No new alerts</p>
                          </div>
                        ) : (
                          <div className="flex flex-col divide-y divide-white/5">
                            {notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`p-4 hover:bg-white/5 transition-colors cursor-pointer flex flex-col gap-1 ${!n.read ? 'bg-electric-violet/5' : ''}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                                    {n.title}
                                  </h4>
                                  <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5 font-medium">
                                    {format(new Date(n.created_at), 'MMM d')}
                                  </span>
                                </div>
                                <p className={`text-xs leading-relaxed ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {n.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/profile')}
                  title="Profile"
                  className={`p-2 rounded-full transition-colors hover:bg-white/5 ${isActive('/profile') ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}
                >
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                </button>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="bg-electric-violet hover:bg-[#7e6be0] text-white font-['Space_Grotesk'] font-semibold text-sm px-5 py-2 rounded-full transition-all shadow-[0_0_15px_hsla(255,65%,60%,0.3)] hover:shadow-[0_0_25px_hsla(255,65%,60%,0.5)] active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-white/10 flex md:hidden items-center justify-between px-4 h-14">
        <div
          className="font-['Space_Grotesk'] text-xl font-bold bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent cursor-pointer"
          onClick={() => navigate('/')}
        >
            <SwiftBusLogo size="lg" clickable />
        </div>
        {!user && (
          <button
            onClick={() => navigate('/auth')}
            className="bg-electric-violet text-white text-xs font-semibold px-4 py-2 rounded-full"
          >
            Sign In
          </button>
        )}
      </nav>

      {/* Mobile Bottom Nav (only when user is logged in) */}
      {user && (
        <nav className="fixed bottom-0 left-0 w-full h-[68px] z-50 flex justify-around items-center px-2 bg-surface-container-high/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden rounded-t-2xl">
          <MobileNavBtn icon="home" label="Home" active={isActive('/')} onClick={() => navigate('/')} />
          <MobileNavBtn icon="search" label="Find Buses" active={isActive('/search')} onClick={() => navigate('/search')} />
          <MobileNavBtn icon="confirmation_number" label="Bookings" active={isActive('/my-bookings')} onClick={() => navigate('/my-bookings')} />
          
          <div className="relative">
            <MobileNavBtn icon="notifications" label="Alerts" active={showDropdown} onClick={() => setShowDropdown(!showDropdown)} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full border border-slate-950 animate-pulse pointer-events-none"></span>
            )}
            
            {/* Mobile Dropdown Popover */}
            {showDropdown && (
              <div className="absolute bottom-[75px] left-1/2 -translate-x-1/2 w-[90vw] max-w-[340px] bg-surface-container border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 origin-bottom">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface-container/90 backdrop-blur-xl">
                  <h3 className="font-['Space_Grotesk'] text-white font-bold text-base">Alerts</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllRead}
                      className="text-xs text-electric-violet hover:text-violet-400 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto overscroll-contain pb-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">notifications_paused</span>
                      <p>No new alerts</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 hover:bg-white/5 transition-colors cursor-pointer flex flex-col gap-1 ${!n.read ? 'bg-electric-violet/5' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5 font-medium">
                              {format(new Date(n.created_at), 'MMM d')}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <MobileNavBtn icon="account_circle" label="Profile" active={isActive('/profile')} onClick={() => navigate('/profile')} fill />
        </nav>
      )}
    </>
  );
}

function MobileNavBtn({
  icon, label, active, onClick, fill = false
}: {
  icon: string; label: string; active: boolean; onClick: () => void; fill?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 active:scale-90 ${
        active
          ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      <span
        className="material-symbols-outlined text-[22px]"
        style={{ fontVariationSettings: active && fill ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      <span className="text-[9px] font-semibold font-['Space_Grotesk'] uppercase tracking-wider leading-none">
        {label}
      </span>
    </button>
  );
}
