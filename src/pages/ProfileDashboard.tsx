import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PassengerNav } from '@/components/PassengerNav';

export default function ProfileDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) fetchProfile();
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user!.id)
      .single();

    if (data) {
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || user!.email || '',
        phone: data.phone || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
    }).eq('id', user!.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="bg-deep-space text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  return (
    <div className="bg-deep-space text-on-surface font-body-md antialiased min-h-screen relative overflow-x-hidden selection:bg-electric-violet selection:text-white">
      <PassengerNav />

      {/* Main Content */}
      <main className="relative z-10 pt-[80px] pb-[100px] md:pb-8 px-4 md:px-margin max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-lg">
          <h1 className="font-h1 text-4xl md:text-5xl font-bold text-on-surface mb-2">My Profile</h1>
          <p className="font-body-lg text-lg text-on-surface-variant">Manage your personal information.</p>
        </header>

        <div className="bg-surface-container/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          
          <form onSubmit={handleSave} className="flex flex-col gap-6 relative z-10">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">First Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                  <input 
                    type="text"
                    className="w-full bg-[#36343c]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                  <input 
                    type="text"
                    className="w-full bg-[#36343c]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input 
                  type="email"
                  className="w-full bg-[#1c1b22]/50 border border-white/5 rounded-lg py-3 pl-10 pr-4 font-semibold text-white cursor-not-allowed"
                  value={formData.email}
                  disabled
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">phone</span>
                <input 
                  type="tel"
                  className="w-full bg-[#36343c]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+92 300 0000000"
                />
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-white/10">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full md:w-auto md:ml-auto md:px-10 bg-electric-violet hover:bg-[#7e6be0] text-white font-semibold py-3 rounded-lg transition-colors shadow-[0_0_15px_hsla(255,65%,60%,0.2)] hover:shadow-[0_0_20px_hsla(255,65%,60%,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">save</span>
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-error-container/10 border border-error/20 rounded-xl p-6 md:p-8">
          <h2 className="font-h3 text-xl font-semibold text-error mb-2">Account Actions</h2>
          <p className="text-on-surface-variant mb-6 text-sm">Need to sign out of your account on this device?</p>
          <button 
            onClick={handleSignOut}
            className="w-full md:w-auto px-8 py-3 rounded-lg border border-error/50 text-error font-semibold hover:bg-error/10 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </main>


    </div>
  );
}
