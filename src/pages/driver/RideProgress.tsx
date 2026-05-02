import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Bus, CheckCircle2, Loader2, LogOut, Share2, Copy } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@/leaflet.css';

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CITY_COORDS: Record<string, [number, number]> = {
  'Karachi':    [24.8607, 67.0011],
  'Lahore':     [31.5204, 74.3587],
  'Islamabad':  [33.6844, 73.0479],
  'Faisalabad': [31.4504, 73.1350],
  'Multan':     [30.1575, 71.5249],
  'Peshawar':   [34.0151, 71.5249],
  'Quetta':     [30.1798, 66.9750],
  'Hyderabad':  [25.3960, 68.3578],
};

const TRIP_DURATION_SECONDS = 120; // 2 minutes
const TICK_INTERVAL_MS = 3000;     // Update Supabase every 3s

// Custom bus icon
const busIcon = new L.DivIcon({
  className: '',
  html: `<div style="background:#6366f1;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(99,102,241,0.3);border:2px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="14" rx="2"/><path d="M16 17H8"/><path d="M12 3v14"/><path d="M1 8h22"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function interpolate(from: [number, number], to: [number, number], t: number): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
}

// Helper to keep map panned to bus position
function BusPositionUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(position, { animate: true, duration: 0.5 }); }, [position]);
  return null;
}

interface TripInfo {
  departure: string;
  destination: string;
  bus_no: string;
  schedule_id: string;
  trip_progress: number;
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

    if (error || !data) { toast.error('Could not load trip'); navigate('/driver'); return; }

    const route = data.route as any;
    const bus = data.bus as any;

    setTripInfo({
      departure: route?.departure ?? '',
      destination: route?.destination ?? '',
      bus_no: bus?.bus_no ?? '',
      schedule_id: data.id,
      trip_progress: data.trip_progress ?? 0,
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
        await supabase.from('schedules').update({ status: 'completed', trip_progress: 1.0 }).eq('id', scheduleId!);
        setCompleted(true);
        toast.success('🎉 Trip completed!');
      }
    }, TICK_INTERVAL_MS);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/track/${scheduleId}`;
    navigator.clipboard.writeText(url);
    toast.success('Tracking link copied to clipboard!');
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const departure = tripInfo?.departure ?? '';
  const destination = tripInfo?.destination ?? '';
  const fromCoords = CITY_COORDS[departure];
  const toCoords = CITY_COORDS[destination];

  if (!fromCoords || !toCoords) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p>City coordinates not found for: {departure} → {destination}</p>
      </div>
    );
  }

  const busPosition = completed ? toCoords : interpolate(fromCoords, toCoords, progress);
  const mapCenter: [number, number] = [
    (fromCoords[0] + toCoords[0]) / 2,
    (fromCoords[1] + toCoords[1]) / 2,
  ];
  const remaining = Math.max(0, TRIP_DURATION_SECONDS - elapsedSeconds);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  if (completed) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Trip Completed!</h1>
        <p className="text-muted-foreground">{departure} → {destination}</p>
        <Button onClick={() => { signOut(); navigate('/'); }}>
          <LogOut className="mr-2 h-4 w-4" /> End Session
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-md px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{tripInfo?.bus_no} — {departure} → {destination}</p>
            <p className="text-xs text-muted-foreground">Live Tracking Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Share2 className="mr-2 h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={[fromCoords, toCoords]} color="#6366f1" weight={3} dashArray="8 4" opacity={0.6} />
          <Marker position={fromCoords}><Popup>{departure} (Departure)</Popup></Marker>
          <Marker position={toCoords}><Popup>{destination} (Destination)</Popup></Marker>
          <Marker position={busPosition} icon={busIcon}><Popup>{tripInfo?.bus_no}</Popup></Marker>
          <BusPositionUpdater position={busPosition} />
        </MapContainer>

        {/* Overlay card */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[340px] rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Trip Progress</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{departure}</span>
            <span className="font-bold text-foreground tabular-nums">
              {mins}:{secs.toString().padStart(2, '0')} left
            </span>
            <span className="text-muted-foreground">{destination}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
