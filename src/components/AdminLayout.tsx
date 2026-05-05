import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SwiftBusLogo } from '@/components/SwiftBusLogo';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AdminLayoutProps {
  children: ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [supportUnread, setSupportUnread] = useState(0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname !== '/admin') return false;
    return location.pathname.startsWith(path);
  };

  const linkClass = (path: string) => `flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium ${
    isActive(path)
      ? 'bg-primary-container/10 text-primary border-r-4 border-primary'
      : 'text-slate-400 hover:text-white hover:bg-white/5'
  }`;

  useEffect(() => {
    if (user) fetchNotifications();
    fetchSupportUnread();
  }, [user]);

  const fetchSupportUnread = async () => {
    const { count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('unread_by_admin', true);
    setSupportUnread(count || 0);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) setNotifications(data);
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
    setShowNotifDropdown(false);
    navigate('/admin');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,_rgba(30,27,46,1)_0%,_rgba(20,18,26,1)_100%)]">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl fixed top-0 right-0 left-0 md:left-64 h-16 z-50 flex justify-between items-center px-4 md:px-8 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-4">
          <span className="text-lg md:text-xl font-bold tracking-tight text-white font-h2">SWIFTBUS ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowProfileDropdown(false); }}
              className={`relative p-2 rounded-full transition-colors hover:bg-white/5 ${showNotifDropdown ? 'text-electric-violet' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: showNotifDropdown ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-surface animate-pulse"></span>
              )}
            </button>
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col z-[100]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface-container/50">
                  <h3 className="font-h3 text-base text-white font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-electric-violet hover:text-violet-400 font-semibold transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50 block">notifications_paused</span>
                      <p>No new notifications</p>
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
                            <h4 className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.title}</h4>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{format(new Date(n.created_at), 'MMM d')}</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfileDropdown(!showProfileDropdown); setShowNotifDropdown(false); }}
              className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group active:scale-95"
            >
              <div className="h-8 w-8 rounded-full bg-surface-container overflow-hidden border border-white/10">
                <img alt="Admin profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAwbZ8Or-yEsgX7UurlBJn-Njp-l9Rlxw6rl3_yWtfXd4WQldTsspI4CJ0CLzQNHCGBqfS168WiS29efSq_J5sDYi2LEn9NiRpc1FhiaI5ulSY7fH0pLL_wBNYk35CliTDO1bOxPgJY1LAO53AIljKM-qqtYXNw5tMXoIwPVgD66tcyGOzBDEOPjRDVd0XdtpYwGxQULCdDXxClCjCqSWj7hgod9ucMeWeBuxNqwVRu615E1JJpwCoW7BBi_sPLXEEfsBCxDzCPC0" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-label-sm text-label-sm text-on-surface leading-none">Admin</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Superadmin</p>
              </div>
              <span className="material-symbols-outlined text-slate-500 text-sm hidden sm:block">expand_more</span>
            </button>
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
                <div className="p-3 border-b border-white/10">
                  <p className="text-sm text-white font-semibold">Admin Account</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="p-1 border-b border-white/10">
                  <button
                    onClick={() => { navigate('/profile'); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    My Profile
                  </button>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <nav className="hidden md:flex bg-midnight-indigo fixed left-0 top-0 h-full w-64 flex-col z-[60] border-r border-white/5 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center border border-primary-container/30">
              <span className="material-symbols-outlined text-primary">directions_bus</span>
            </div>
            <div>
              <SwiftBusLogo size="md" />
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-500">Management Portal</p>
            </div>
          </div>
          <ul className="flex flex-col gap-6">
            {/* General */}
            <li>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-500 mb-3 ml-2">General</p>
              <Link to="/admin" className={linkClass('/admin')}>
                <span className="material-symbols-outlined">grid_view</span>
                <span>Dashboard</span>
              </Link>
            </li>

            {/* Management */}
            <li>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-500 mb-3 ml-2">Operations</p>
              <div className="flex flex-col gap-1">
                <Link to="/admin/bookings" className={linkClass('/admin/bookings')}>
                  <span className="material-symbols-outlined">confirmation_number</span>
                  <span>Bookings</span>
                </Link>
                <Link to="/admin/refunds" className={linkClass('/admin/refunds')}>
                  <span className="material-symbols-outlined">request_quote</span>
                  <span>Refunds</span>
                </Link>
                <Link to="/admin/schedules" className={linkClass('/admin/schedules')}>
                  <span className="material-symbols-outlined">calendar_month</span>
                  <span>Schedules</span>
                </Link>
                <Link to="/admin/routes" className={linkClass('/admin/routes')}>
                  <span className="material-symbols-outlined">map</span>
                  <span>Routes</span>
                </Link>
              </div>
            </li>

            {/* Fleet */}
            <li>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-500 mb-3 ml-2">Fleet & Staff</p>
              <div className="flex flex-col gap-1">
                <Link to="/admin/buses" className={linkClass('/admin/buses')}>
                  <span className="material-symbols-outlined">directions_bus</span>
                  <span>Buses</span>
                </Link>
                <Link to="/admin/drivers" className={linkClass('/admin/drivers')}>
                  <span className="material-symbols-outlined">badge</span>
                  <span>Drivers</span>
                </Link>
              </div>
            </li>

            {/* System */}
            <li>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-slate-500 mb-3 ml-2">System</p>
              <Link to="/admin/users" className={linkClass('/admin/users')}>
                <span className="material-symbols-outlined">group</span>
                <span>Users</span>
              </Link>
              <Link to="/admin/support" className={linkClass('/admin/support')}>
                <span className="material-symbols-outlined">support_agent</span>
                <span className="flex-1">Support</span>
                {supportUnread > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-auto">
                    {supportUnread}
                  </span>
                )}
              </Link>
            </li>
          </ul>
        </div>
        <div className="mt-auto p-6 flex flex-col gap-2 border-t border-white/5">
          <button onClick={handleSignOut} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-error hover:bg-error-container/10 transition-all text-left">
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 md:px-8 md:ml-64 max-w-[1600px] mx-auto z-10 relative">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/10 h-16 flex items-center justify-around z-50">
        <Link to="/admin" className={`${isActive('/admin') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center`}>
          <span className="material-symbols-outlined text-2xl">grid_view</span>
        </Link>
        <Link to="/admin/buses" className={`${isActive('/admin/buses') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center`}>
          <span className="material-symbols-outlined text-2xl">directions_bus</span>
        </Link>
        <Link to="/admin/routes" className={`${isActive('/admin/routes') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center`}>
          <span className="material-symbols-outlined text-2xl">map</span>
        </Link>
        <Link to="/admin/schedules" className={`${isActive('/admin/schedules') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center`}>
          <span className="material-symbols-outlined text-2xl">calendar_month</span>
        </Link>
        <Link to="/admin/bookings" className={`${isActive('/admin/bookings') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center`}>
          <span className="material-symbols-outlined text-2xl">confirmation_number</span>
        </Link>
        <Link to="/admin/support" className={`${isActive('/admin/support') ? 'text-primary' : 'text-slate-400'} flex flex-col items-center relative`}>
          <span className="material-symbols-outlined text-2xl">support_agent</span>
          {supportUnread > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          )}
        </Link>
      </nav>
    </div>
  );
}
