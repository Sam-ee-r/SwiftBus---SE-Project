import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Bus, MapPin, Calendar, Shield, Clock, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading]);

  const features = [
    {
      icon: MapPin,
      title: 'Wide Coverage',
      description: 'Access routes across the city with multiple pickup and drop-off points.',
    },
    {
      icon: Clock,
      title: 'Real-time Tracking',
      description: 'Track your bus in real-time and never miss a ride.',
    },
    {
      icon: Shield,
      title: 'Secure Booking',
      description: 'Your data and payments are protected with enterprise-grade security.',
    },
    {
      icon: CreditCard,
      title: 'Easy Payments',
      description: 'Multiple payment options for a seamless booking experience.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient">
        {/* Background image layer (blurred) placed behind everything but above the section background */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url('/hero-bg.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(6px)',
              transform: 'scale(1.03)'
            }}
          />
          <div
            className="absolute inset-0 z-10"
            style={{
              backgroundImage: 'var(--gradient-hero)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.8
            }}
          />
        </div>
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Dark overlay to improve text contrast over the background image */}
        <div className="absolute inset-0 z-15 bg-black/40 pointer-events-none" />

        <div className="container relative z-30 mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-primary-foreground/90">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>The future of bus travel is here</span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
              Travel Smart with{' '}
              <span className="text-gradient">SwiftBus</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-foreground/70 md:text-xl">
              Book your bus tickets in seconds. Enjoy comfortable rides, transparent pricing,
              and real-time updates all in one place.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate('/search')}
                className="w-full sm:w-auto"
              >
                Book Your Ride
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="hero-outline"
                size="xl"
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto"
              >
                Create Account
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3 md:mt-24">
            {[
              { value: '50K+', label: 'Happy Riders' },
              { value: '100+', label: 'Routes' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-accent md:text-4xl">{stat.value}</div>
                <div className="text-sm text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--card))" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Why Choose SwiftBus?
            </h2>
            <p className="mb-12 text-muted-foreground">
              We're redefining bus travel with technology that puts you first.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl">
            <Bus className="mx-auto mb-6 h-16 w-16 text-accent animate-float" />
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Ready to Travel?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Join thousands of happy travelers. Book your next journey today.
            </p>
            <Button variant="accent" size="lg" onClick={() => navigate('/search')}>
              Search Buses
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Bus className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">SwiftBus</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SwiftBus. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
