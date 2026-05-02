import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Bus, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BusMap from '@/components/map/BusMap';

const POLL_INTERVAL_MS = 4000;

export default function TrackRide() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [tripData, setTripData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProgress = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('trip_progress, status, bus:buses(bus_no), route:routes(departure, destination)')
      .eq('id', scheduleId!)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTripData(data);
    setProgress(data.trip_progress ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scheduleId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Bus className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-foreground">Trip Not Found</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          This tracking link may be invalid, or the trip has already ended.
        </p>
      </div>
    );
  }

  const route = tripData?.route as any;
  const bus = tripData?.bus as any;
  const departure = route?.departure ?? '';
  const destination = route?.destination ?? '';
  const isCompleted = tripData?.status === 'completed' || progress >= 1.0;
  const isNotStarted = tripData?.status === 'scheduled';

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
              SwiftBus Live — {departure} → {destination}
            </p>
            <p className="text-xs text-muted-foreground">{bus?.bus_no} · Public Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Arrived
            </span>
          )}
          {!isCompleted && !isNotStarted && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              LIVE
            </span>
          )}
          {isNotStarted && (
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Not departed yet
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <BusMap
          departure={departure}
          destination={destination}
          progress={progress}
          isCompleted={isCompleted}
        />

        {/* Floating card */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-4">
          {isNotStarted ? (
            <div className="text-center py-2">
              <p className="font-semibold text-foreground text-sm">Bus hasn't departed yet</p>
              <p className="text-xs text-muted-foreground mt-1">Check back when the driver starts the trip</p>
            </div>
          ) : isCompleted ? (
            <div className="text-center py-2">
              <p className="font-semibold text-green-600 text-sm">Bus has arrived at {destination}!</p>
              <p className="text-xs text-muted-foreground mt-1">Journey complete · 100%</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Live Position</span>
                <span className="text-xs text-muted-foreground">{Math.round(progress * 100)}% complete</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>📍 {departure}</span>
                <span>🏁 {destination}</span>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Updates automatically every 4 seconds
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
