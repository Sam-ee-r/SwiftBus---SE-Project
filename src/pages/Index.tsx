import { useNavigate } from 'react-router-dom';
import { SwiftBusLogo } from '@/components/SwiftBusLogo';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { PassengerNav } from '@/components/PassengerNav';

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Hyderabad', 'Peshawar', 'Quetta', 'Sialkot',
  'Gujranwala', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan',
  'Swat', 'Muzaffarabad', 'Gilgit', 'Sukkur', 'Larkana',
];

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isDriver, loading: authLoading } = useAuth();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) navigate('/admin');
      else if (isDriver) navigate('/driver');
    }
  }, [user, isAdmin, isDriver, authLoading, navigate]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (fromCity) params.set('from', fromCity);
    if (toCity) params.set('to', toCity);
    navigate(`/search?${params.toString()}`);
  };

  const selectCls =
    'w-full bg-surface-container-highest border border-outline-variant rounded-lg py-3 pl-10 pr-8 font-label-md text-label-md text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet focus:outline-none transition-all appearance-none cursor-pointer bg-[#1c1a23]';

  return (
    <div className="bg-deep-space text-on-surface font-body-md antialiased overflow-x-hidden selection:bg-electric-violet selection:text-white min-h-screen">
      <PassengerNav />

      <main className="pt-16 md:pt-16">
        {/* ─── Hero ─────────────────────────────── */}
        <section className="relative min-h-[880px] flex items-center justify-center overflow-hidden px-6 md:px-12 py-24">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover object-center opacity-35"
              alt="Pakistani cityscape at night"
              src="/hero-bg-custom.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-space via-[#0f0c1e]/70 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,_hsla(255,65%,60%,0.12)_0%,_transparent_65%)]" />
          </div>

          <div className="relative z-10 max-w-[1200px] w-full mx-auto grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-9 lg:col-span-8 flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-spark/10 border border-emerald-spark/30 w-fit">
                  <span className="material-symbols-outlined text-emerald-spark text-[16px]">directions_bus</span>
                  <span className="font-label-sm text-[11px] text-emerald-spark uppercase tracking-wider font-bold">
                    Pakistan's Inter-City Bus Network
                  </span>
                </div>

                <h1 className="font-['Space_Grotesk'] text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                  Travel Across Pakistan,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-electric-violet to-emerald-spark">
                    Effortlessly
                  </span>
                </h1>

                <p className="font-body-lg text-lg text-on-surface-variant max-w-xl leading-relaxed">
                  Book inter-city bus seats from Karachi to Khyber — secure seats online, choose your spot, and travel with confidence across 20+ major cities.
                </p>
              </div>

              {/* ── Quick Booking Card ── */}
              <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-end max-w-3xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                {/* From */}
                <div className="w-full sm:flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">From</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px] pointer-events-none">my_location</span>
                    <select
                      className={selectCls}
                      value={fromCity}
                      onChange={(e) => setFromCity(e.target.value)}
                    >
                      <option value="" className="bg-slate-900">Select Origin</option>
                      {PAKISTAN_CITIES.map(c => (
                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex items-center justify-center pb-3 shrink-0">
                  <span className="material-symbols-outlined text-electric-violet text-[28px]">arrow_right_alt</span>
                </div>

                {/* To */}
                <div className="w-full sm:flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">To</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px] pointer-events-none">location_on</span>
                    <select
                      className={selectCls}
                      value={toCity}
                      onChange={(e) => setToCity(e.target.value)}
                    >
                      <option value="" className="bg-slate-900">Select Destination</option>
                      {PAKISTAN_CITIES.filter(c => c !== fromCity).map(c => (
                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  className="w-full sm:w-auto bg-electric-violet hover:bg-[#7e6be0] text-white font-['Space_Grotesk'] font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_hsla(255,65%,60%,0.4)] hover:shadow-[0_0_30px_hsla(255,65%,60%,0.6)] flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  Find Buses
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span> No hidden charges</span>
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span> Instant confirmation</span>
                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span> Free cancellation*</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Stats ─────────────────────────────── */}
        <section className="py-16 px-6 md:px-12 border-y border-white/5 bg-surface/50 relative z-10">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <span className="font-['Space_Grotesk'] text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">50K+</span>
              <span className="text-sm text-emerald-spark font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">group</span> Passengers Served
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <span className="font-['Space_Grotesk'] text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">20+</span>
              <span className="text-sm text-electric-violet font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">route</span> Cities Connected
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <span className="font-['Space_Grotesk'] text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">100+</span>
              <span className="text-sm text-secondary-fixed font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">directions_bus</span> Daily Departures
              </span>
            </div>
          </div>
        </section>

        {/* ─── Why SwiftBus ─────────────────────── */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto relative z-10">
          <div className="text-center mb-14 flex flex-col gap-3 items-center">
            <h2 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold text-white">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">SwiftBus</span>
            </h2>
            <p className="text-on-surface-variant max-w-xl leading-relaxed">
              Designed for Pakistan's inter-city travellers — affordable fares, comfortable coaches, and a booking experience that just works.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[280px]">
            {/* Wide Coverage */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between md:col-span-7 group relative overflow-hidden cursor-default">
              <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-electric-violet/20 border border-electric-violet/30 flex items-center justify-center shadow-[0_0_15px_hsla(255,65%,60%,0.2)]">
                  <span className="material-symbols-outlined text-electric-violet" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-2 group-hover:text-electric-violet transition-colors">Nationwide Coverage</h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">From Karachi to Islamabad, Lahore to Peshawar — our routes connect all major cities and growing regions of Pakistan with daily, scheduled departures.</p>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 pointer-events-none">
                <img className="w-full h-full object-cover rounded-full filter grayscale mix-blend-screen" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_GXaWZVNBTYGLFubIgoPiFBXc9ao0vWAf9_PdKG3BJHW6zNK8Xgrkp4w3HLADEEM79HVHaWTt0c8xokJd9ypM5o8KbBjTb0xGCNrPJu5zWM7dn91inwbEIgIzpgtd10cS-FUKKiUh424_eSGvMxTl5cxupCxd9AaoFaXteh_Kp6SCOr9v9SqrClgWHr1NzJDfjb_jhuXWC6yXLdcxzUbSAQpmH_wyP3mZHH_pvXg1my8qklwo4wW83RgPhaL9SRVWvLmF38T3O_s" />
              </div>
            </div>

            {/* Safety */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between md:col-span-5 group relative overflow-hidden cursor-default">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-spark/10 blur-3xl rounded-full" />
              <div className="relative z-10 flex flex-col gap-5 h-full justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-spark/20 border border-emerald-spark/30 flex items-center justify-center shadow-[0_0_15px_hsla(165,80%,50%,0.2)]">
                  <span className="material-symbols-outlined text-emerald-spark" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-2">Safety & Reliability</h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">Professionally maintained coaches with trained drivers. Your safety is our first priority on every journey.</p>
                </div>
              </div>
            </div>

            {/* Secure Booking */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between md:col-span-4 group relative cursor-default">
              <div className="relative z-10 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-white/10 flex items-center justify-center group-hover:border-electric-violet/50 transition-colors">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-2">Secure Online Booking</h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">Reserve your seat in seconds. Your booking and payment data are always encrypted and protected.</p>
                </div>
              </div>
            </div>

            {/* Affordable Fares */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between md:col-span-8 group relative overflow-hidden cursor-default">
              <div className="absolute inset-0 bg-gradient-to-tl from-surface-container-low to-transparent" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 h-full">
                <div className="flex-1 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/20 border border-secondary-fixed/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                  </div>
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-2">Affordable PKR Fares</h3>
                    <p className="text-on-surface-variant leading-relaxed text-sm">Transparent pricing in Pakistani Rupees — no hidden fees, no surprises. Pay online or at the terminal with multiple payment options.</p>
                  </div>
                </div>
                <div className="w-full md:w-1/3 h-full min-h-[100px] rounded-xl border border-white/5 bg-surface-container-lowest flex items-center justify-center relative overflow-hidden shrink-0">
                  <div className="absolute w-[150%] h-[20px] bg-electric-violet/20 blur-md rotate-45 transform origin-left" />
                  <div className="relative flex flex-col items-center gap-1">
                    <span className="font-['Space_Grotesk'] text-3xl font-black text-emerald-400">PKR</span>
                    <span className="text-slate-400 text-xs">Transparent Pricing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────── */}
        <section className="py-20 px-6 md:px-12 my-8 relative max-w-[1200px] mx-auto z-10">
          <div className="glass-card rounded-3xl p-10 md:p-16 text-center relative overflow-hidden border-electric-violet/30 shadow-[0_0_60px_hsla(255,65%,60%,0.15)]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-electric-violet/15 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center gap-5 max-w-2xl mx-auto">
              <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white">Ready for Your Next Trip?</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Join thousands of Pakistani travellers booking their inter-city journeys with SwiftBus every day. Select your route, pick your seat, and you're set.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full justify-center">
                <button
                  onClick={() => navigate('/search')}
                  className="bg-electric-violet hover:bg-[#7e6be0] text-white font-['Space_Grotesk'] font-bold px-10 py-4 rounded-xl transition-all shadow-[0_0_20px_hsla(255,65%,60%,0.4)] hover:shadow-[0_0_30px_hsla(255,65%,60%,0.6)] flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined">search</span>
                  Find Buses Now
                </button>
                {!user && (
                  <button
                    onClick={() => navigate('/auth')}
                    className="bg-surface-container-high border border-outline-variant hover:border-white/40 text-white font-['Space_Grotesk'] font-semibold px-10 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span className="material-symbols-outlined">person_add</span>
                    Create Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────── */}
      <footer className="bg-slate-950 w-full py-12 px-6 md:px-12 border-t border-white/5 relative z-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col gap-3 md:col-span-1">
            <SwiftBusLogo size="lg" />
            <p className="text-sm text-slate-500 leading-relaxed">
              Pakistan's trusted inter-city bus booking platform. Safe, affordable, and on time.
            </p>
            <p className="text-sm text-slate-600 mt-2">
              © 2025 SwiftBus. All rights reserved.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:col-span-3 justify-end md:flex-row md:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Company</p>
              {['About Us', 'Careers', 'Help Center', 'Safety Protocols'].map(l => (
                <a key={l} className="text-sm text-slate-500 hover:text-violet-400 transition-colors cursor-pointer">{l}</a>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Legal</p>
              {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(l => (
                <a key={l} className="text-sm text-slate-500 hover:text-violet-400 transition-colors cursor-pointer">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
