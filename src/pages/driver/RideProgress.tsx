import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Bus, CheckCircle2, Loader2, LogOut, Share2 } from 'lucide-react';
import BusMap from '@/components/map/BusMap';

const TRIP_DURATION_SECONDS = 120;
const TICK_INTERVAL_MS = 3000;

interface TripInfo {
  departure: string;
  destination: string;
  bus_no: string;
}

export default function RideProgress() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { user, isDriver, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isDriver) { navigate('/'); return; }
      loadTrip();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, isDriver, authLoading]);

  const loadTrip = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, trip_progress, status, bus:buses(bus_no), route:routes(departure, destination)')
      .eq('id', scheduleId!)
      .single();

    if (error || !data) {
      toast.error('Could not load trip details');
      navigate('/driver');
      return;
    }

    const route = data.route as any;
    const bus = data.bus as any;

    setTripInfo({
      departure: route?.departure ?? '',
      destination: route?.destination ?? '',
      bus_no: bus?.bus_no ?? '',
    });

    const existingProgress = data.trip_progress ?? 0;
    setProgress(existingProgress);
    const alreadyElapsed = Math.round(existingProgress * TRIP_DURATION_SECONDS);
    setElapsedSeconds(alreadyElapsed);

    if (existingProgress >= 1.0 || data.status === 'completed') {
      setCompleted(true);
      setLoading(false);
      return;
    }

    setLoading(false);
    startSimulation(existingProgress, alreadyElapsed);
  };

  const startSimulation = (startProgress: number, startElapsed: number) => {
    let currentProgress = startProgress;
    let elapsed = startElapsed;

    intervalRef.current = setInterval(async () => {
      elapsed += TICK_INTERVAL_MS / 1000;
      currentProgress = Math.min(elapsed / TRIP_DURATION_SECONDS, 1.0);

      setProgress(currentProgress);
      setElapsedSeconds(elapsed);

      await supabase
        .from('schedules')
        .update({ trip_progress: currentProgress })
        .eq('id', scheduleId!);

      if (currentProgress >= 1.0) {
        clearInterval(intervalRef.current!);
        await supabase
          .from('schedules')
          .update({ status: 'completed', trip_progress: 1.0 })
          .eq('id', scheduleId!);
        setCompleted(true);
        toast.success('🎉 Trip completed! Great driving!');
      }
    }, TICK_INTERVAL_MS);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/track/${scheduleId}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Tracking link copied! Share it with passengers.');
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Trip Completed!</h1>
        <p className="text-muted-foreground text-lg">
          {tripInfo?.departure} → {tripInfo?.destination}
        </p>
        <Button
          onClick={() => { signOut(); navigate('/'); }}
          className="mt-2"
        >
          <LogOut className="mr-2 h-4 w-4" /> End Session
        </Button>
      </div>
    );
  }

  const remaining = Math.max(0, TRIP_DURATION_SECONDS - elapsedSeconds);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/50 bg-card/90 backdrop-blur-md px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {tripInfo?.bus_no} — {tripInfo?.departure} → {tripInfo?.destination}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-muted-foreground">Live Tracking Active</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Share2 className="mr-2 h-3.5 w-3.5" /> Share Link
        </Button>
      </header>

      {/* Map fills remaining height */}
      <div className="flex-1 relative">
        <BusMap
          departure={tripInfo?.departure ?? ''}
          destination={tripInfo?.destination ?? ''}
          progress={progress}
          isCompleted={completed}
        />

        {/* Floating progress overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Trip Progress</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-500">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-accent transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{tripInfo?.departure}</span>
            <span className="font-bold text-foreground text-sm tabular-nums">
              {mins}:{secs.toString().padStart(2, '0')} left
            </span>
            <span>{tripInfo?.destination}</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {Math.round(progress * 100)}% of journey completed
          </p>
        </div>
      </div>
    </div>
  );
}
