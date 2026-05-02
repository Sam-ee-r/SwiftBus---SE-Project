import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bus, CheckCircle2, Loader2, Copy, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

const busIcon = new L.DivIcon({
  className: '',
  html: `<div style="background:#6366f1;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(99,102,241,0.25);border:2px solid white;">
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

interface TripData {
  departure: string;
  destination: string;
  bus_no: string;
  departure_time: string;
  status: string;
  trip_progress: number;
}

export default function TrackRide() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, status, trip_progress, departure_time, bus:buses(bus_no), route:routes(departure, destination)')
      .eq('id', scheduleId!)
      .single();

    if (error || !data) { setError('Trip not found.'); setLoading(false); return; }

    const route = data.route as any;
    const bus = data.bus as any;
    setTrip({
      departure: route?.departure ?? '',
      destination: route?.destination ?? '',
      bus_no: bus?.bus_no ?? '',
      departure_time: data.departure_time ?? '',
      status: data.status ?? 'scheduled',
      trip_progress: data.trip_progress ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchProgress();
    // Poll every 4 seconds
    const interval = setInterval(fetchProgress, 4000);
    return () => clearInterval(interval);
  }, [scheduleId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Tracking link copied!');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4 text-foreground">
        <Bus className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">Trip Not Found</h1>
        <p className="text-muted-foreground">{error ?? 'This tracking link may be invalid or expired.'}</p>
      </div>
    );
  }

  const fromCoords = CITY_COORDS[trip.departure];
  const toCoords = CITY_COORDS[trip.destination];

  if (!fromCoords || !toCoords) {
    return <div className="flex h-screen items-center justify-center">Unknown city coordinates</div>;
  }

  const progress = trip.trip_progress ?? 0;
  const isCompleted = trip.status === 'completed';
  const isLive = trip.status === 'in_transit';
  const busPosition = isCompleted ? toCoords : interpolate(fromCoords, toCoords, progress);
  const mapCenter: [number, number] = [
    (fromCoords[0] + toCoords[0]) / 2,
    (fromCoords[1] + toCoords[1]) / 2,
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card/90 backdrop-blur-md px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {trip.bus_no} · {trip.departure} → {trip.destination}
            </p>
            <p className="text-xs text-muted-foreground">
              Dep. {trip.departure_time ? String(trip.departure_time).slice(0,5) : '--:--'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-full px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> LIVE
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Copy Link
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={[fromCoords, toCoords]} color="#6366f1" weight={3} dashArray="8 4" opacity={0.6} />
          <Marker position={fromCoords}>
            <Popup><strong>{trip.departure}</strong><br />Departure City</Popup>
          </Marker>
          <Marker position={toCoords}>
            <Popup><strong>{trip.destination}</strong><br />Destination</Popup>
          </Marker>
          {isLive && (
            <Marker position={busPosition} icon={busIcon}>
              <Popup>{trip.bus_no} — {Math.round(progress * 100)}% complete</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Status overlay card */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[340px] rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md shadow-xl p-4">
          {isCompleted ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="font-semibold text-foreground">Trip Completed</p>
              <p className="text-sm text-muted-foreground">{trip.departure} → {trip.destination}</p>
            </div>
          ) : isLive ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Journey Progress</span>
                <span className="text-sm font-bold text-accent">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.departure}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.destination}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <Bus className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">Trip Not Started Yet</p>
              <p className="text-sm text-muted-foreground">The bus has not departed yet. Check back soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
