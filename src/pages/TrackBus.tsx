import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Bus Icon
const busIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div class="w-10 h-10 bg-electric-violet rounded-full border-2 border-white shadow-[0_0_15px_rgba(138,117,240,0.8)] flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-[20px]">directions_bus</span>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

import { CITY_COORDS as CITY_COORDS_LNG_LAT } from '@/lib/constants';

// Leaflet needs [lat, lng]; constants store [lng, lat] — flip here
const cityCoords: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(CITY_COORDS_LNG_LAT).map(([code, [lng, lat]]) => [code, [lat, lng]])
);

// Component to dynamically fit bounds when route is loaded
function MapBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

export default function TrackBus() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { user, isDriver, loading: authLoading } = useAuth();
  
  const isGuest = !authLoading && !user;
  const isPassenger = !authLoading && !!user && !isDriver;

  const [schedule, setSchedule] = useState<any>(null);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Fetch initial data — no auth required (guests can view live tracking)
  useEffect(() => {
    if (authLoading) return;
    // Guests are allowed — only wait for auth to resolve before fetching
    
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, route:routes(*), bus:buses(*)')
        .eq('id', scheduleId)
        .single();
        
      if (error || !data) {
        toast.error('Could not find this trip.');
        navigate('/');
        return;
      }
      
      setSchedule(data);
      // DB stores 0.0–1.0, convert to 0–100 for UI
      setProgress((data.trip_progress || 0) * 100);
      
      const depCoords = cityCoords[data.route.departure];
      const destCoords = cityCoords[data.route.destination];
      
      if (depCoords && destCoords) {
        // Fetch real road path via OSRM demo API
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${depCoords[1]},${depCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`);
          const json = await res.json();
          if (json.code === 'Ok' && json.routes[0]) {
            // OSRM returns [lon, lat], Leaflet needs [lat, lon]
            const path = json.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            setRoutePath(path);
          } else {
            // Fallback to straight line
            setRoutePath([depCoords, destCoords]);
          }
        } catch (e) {
          setRoutePath([depCoords, destCoords]);
        }
      }
      setLoading(false);
    };
    fetchDetails();
  }, [scheduleId, user, authLoading, navigate]);

  // Real-time subscription for passengers AND guests
  useEffect(() => {
    if (!scheduleId || isDriver) return;
    
    const channel = supabase.channel(`public:schedules:id=eq.${scheduleId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules', filter: `id=eq.${scheduleId}` }, (payload) => {
        const newProgress = payload.new.trip_progress;
        // DB stores 0.0–1.0, convert to 0–100 for UI
        if (newProgress !== undefined) setProgress(newProgress * 100);
        if (payload.new.status === 'completed') {
          toast.success('🎉 The bus has reached its destination!');
          // Only navigate logged-in passengers back to bookings
          if (user) navigate('/my-bookings');
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [scheduleId, isDriver, navigate, user]);

  // Driver Simulation Loop — only runs when driver explicitly starts it
  useEffect(() => {
    if (!isDriver || !schedule || !simulationRunning) return;

    const interval = setInterval(async () => {
      setProgress(prev => {
        const next = Math.min(prev + 2, 100); // 2% every 2s → ~100s total
        // DB stores 0.0–1.0, so divide by 100 before writing
        supabase.from('schedules').update({ trip_progress: next / 100 }).eq('id', scheduleId).then();
        return next;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isDriver, schedule, scheduleId, simulationRunning]);

  // Calculate current position based on routePath and progress
  useEffect(() => {
    if (routePath.length === 0) return;
    
    if (progress === 0) { setCurrentPos(routePath[0]); return; }
    if (progress >= 100) { setCurrentPos(routePath[routePath.length - 1]); return; }
    
    // Simple interpolation
    const totalSegments = routePath.length - 1;
    const targetSegment = (progress / 100) * totalSegments;
    const index = Math.floor(targetSegment);
    const remainder = targetSegment - index;
    
    const p1 = routePath[index];
    const p2 = routePath[index + 1];
    if (!p2) { setCurrentPos(p1); return; }
    
    const lat = p1[0] + (p2[0] - p1[0]) * remainder;
    const lng = p1[1] + (p2[1] - p1[1]) * remainder;
    setCurrentPos([lat, lng]);
  }, [progress, routePath]);

  const handleCompleteRide = async () => {
    if (!isDriver) return;

    const routeName = schedule?.route
      ? `${schedule.route.departure} to ${schedule.route.destination}`
      : 'your route';
    const distanceKm: number = schedule?.route?.distance_km ?? 0;

    // 1. Notify all confirmed passengers
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('passenger_id')
      .eq('schedule_id', scheduleId)
      .eq('status', 'confirmed');

    if (bookingsData && bookingsData.length > 0) {
      await supabase.from('notifications').insert(
        bookingsData.map((b: any) => ({
          user_id: b.passenger_id,
          title: 'Bus Arrived \ud83c\udf89',
          message: `Your bus for ${routeName} has completed its journey and arrived at the destination.`,
        }))
      );
    }

    // 2. Mark the schedule as completed
    const { error } = await supabase
      .from('schedules')
      .update({ status: 'completed', trip_progress: 1.0 })
      .eq('id', scheduleId);

    if (error) {
      toast.error(`Failed to complete trip: ${error.message}`);
      return;
    }

    // 3. Increment bus odometer
    if (distanceKm > 0 && schedule?.bus_id) {
      const { data: busData } = await supabase
        .from('buses')
        .select('total_km_driven, km_since_service')
        .eq('id', schedule.bus_id)
        .single();

      if (busData) {
        const newTotal = Number(busData.total_km_driven || 0) + Number(distanceKm);
        const newSinceService = Number(busData.km_since_service || 0) + Number(distanceKm);

        await supabase.from('buses').update({
          total_km_driven: newTotal,
          km_since_service: newSinceService,
          maintenance_alert_dismissed: false,
        }).eq('id', schedule.bus_id);

        // 4. Send driver notification if maintenance threshold crossed
        if (newSinceService >= 8000 && user) {
          const isOverdue = newSinceService >= 10000;
          await supabase.from('notifications').insert([{
            user_id: user.id,
            title: isOverdue ? 'Bus Maintenance Overdue \ud83d\udea8' : 'Bus Maintenance Due Soon \u26a0\ufe0f',
            message: `Bus ${schedule.bus?.bus_no} has driven ${Math.round(newSinceService).toLocaleString()} km since last service. ${isOverdue ? 'Service is overdue — take the bus for maintenance immediately.' : 'Service due within 2,000 km.'}`,
          }]);
        }
      }
    }

    toast.success('Trip completed! Passengers have been notified.');
    navigate('/driver');
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied! Share it with anyone to track this bus live.');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  if (loading) {
    return (
      <div className="bg-deep-space text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const mapBounds: L.LatLngBoundsExpression | null = routePath.length > 0 
    ? L.latLngBounds(routePath) 
    : null;

  return (
    <div className="bg-deep-space text-on-surface font-body-md min-h-screen flex flex-col md:flex-row relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-electric-violet/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Glassmorphic Sidebar */}
      <div className="w-full md:w-[400px] bg-surface-container/60 backdrop-blur-2xl border-r border-white/10 flex flex-col p-6 z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)] order-2 md:order-1">
        
        <button onClick={() => navigate(-1)} className="self-start mb-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="font-semibold text-sm">Back</span>
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-bold text-electric-violet uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-electric-violet animate-pulse"></span>
            Live Tracking
          </p>
          <h1 className="font-h1 text-4xl text-white mb-1 tracking-tight">{schedule.route.destination}</h1>
          <p className="text-slate-400 font-medium">from {schedule.route.departure}</p>
        </div>

        <div className="bg-surface-container-high/40 border border-white/5 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="material-symbols-outlined text-[24px] text-electric-violet">directions_bus</span>
            <div>
              <p className="font-bold text-white uppercase tracking-wider">{schedule.bus.bus_no}</p>
              <p className="text-xs text-slate-400">SwiftBus Express</p>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Progress</span>
                <span className="text-white font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-electric-violet to-emerald-spark transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Driver: Begin Journey + Complete Trip */}
        {isDriver && (
          <div className="mt-auto space-y-3">
            {!simulationRunning ? (
              <>
                <button 
                  onClick={() => setSimulationRunning(true)}
                  className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_hsla(255,65%,60%,0.3)] hover:shadow-[0_0_30px_hsla(255,65%,60%,0.5)] flex items-center justify-center gap-2 text-lg active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  Begin Journey
                </button>
                <p className="text-center text-xs text-slate-500 font-medium">Press to start simulating bus movement</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between bg-electric-violet/10 border border-electric-violet/20 rounded-xl px-4 py-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-electric-violet animate-ping"></span>
                    <span className="text-sm text-electric-violet font-bold">Journey in progress</span>
                  </div>
                  <span className="text-white font-bold text-sm">{Math.round(progress)}%</span>
                </div>
                <button 
                  onClick={handleCompleteRide}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 text-lg active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  Complete Trip
                </button>
              </>
            )}
          </div>
        )}

        {/* Passenger: Status + Share button */}
        {isPassenger && (
          <div className="mt-auto space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px] text-emerald-400 animate-pulse">speed</span>
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Bus is in transit</p>
                <p className="text-xs text-slate-400">Arriving smoothly.</p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-electric-violet/10 border-electric-violet/30 text-electric-violet hover:bg-electric-violet/20'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'share'}</span>
              {copied ? 'Link Copied!' : 'Share Live Trip'}
            </button>
            <p className="text-center text-[10px] text-slate-600 font-medium uppercase tracking-widest">Anyone with the link can view this map</p>
          </div>
        )}

        {/* Guest viewer banner */}
        {isGuest && (
          <div className="mt-auto space-y-3">
            <div className="bg-electric-violet/10 border border-electric-violet/20 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-electric-violet uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                Guest Viewer
              </p>
              <p className="text-sm text-slate-300 font-medium">You're viewing a shared live trip link.</p>
              <p className="text-xs text-slate-500 mt-1">Book your own journey on SwiftBus.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_hsla(255,65%,60%,0.3)] flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">directions_bus</span>
              Book a Trip
            </button>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 h-[60vh] md:h-screen relative z-10 order-1 md:order-2 bg-[#1a1c23]">
        <MapContainer center={currentPos || cityCoords['KHI']} zoom={6} className="w-full h-full" zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {routePath.length > 0 && (
            <Polyline positions={routePath} color="#8a75f0" weight={4} opacity={0.6} />
          )}
          {currentPos && (
            <Marker position={currentPos} icon={busIcon} />
          )}
          <MapBounds bounds={mapBounds} />
        </MapContainer>
      </div>

    </div>
  );
}
