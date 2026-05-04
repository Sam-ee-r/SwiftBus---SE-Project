import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { signIn, signUp, user, isAdmin, isDriver, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Only redirect once auth is fully resolved (role included)
  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) navigate('/admin', { replace: true });
      else if (isDriver) navigate('/driver', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [user, isAdmin, isDriver, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const validation = signUpSchema.safeParse({ firstName, lastName, email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created! Signing you in...');
          // Redirect handled by useEffect above once role loads
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        }
        // Redirect handled by useEffect above once role loads
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-deep-space text-on-surface font-body-md antialiased min-h-screen relative flex items-center justify-center p-4 selection:bg-electric-violet selection:text-white">
      {/* Decorative Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-electric-violet/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-spark/10 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Back Link */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-white transition-colors group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to home
        </Link>

        {/* Card */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-electric-violet/20 border border-electric-violet/30 shadow-[0_0_15px_hsla(255,65%,60%,0.2)]">
                <span className="material-symbols-outlined text-[32px] text-electric-violet">directions_bus</span>
              </div>
              <h1 className="font-h2 text-3xl font-bold text-white tracking-tight">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                {isSignUp
                  ? 'Start your journey with SwiftBus'
                  : 'Sign in to your SwiftBus account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {isSignUp && (
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">First Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full bg-[#14121a]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full bg-[#14121a]/50 border border-white/10 rounded-lg py-3 px-4 text-sm font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#14121a]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-[#14121a]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-semibold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-semibold py-3 rounded-lg transition-colors shadow-[0_0_15px_hsla(255,65%,60%,0.2)] hover:shadow-[0_0_20px_hsla(255,65%,60%,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-on-surface-variant">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                  >
                    Create one
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
