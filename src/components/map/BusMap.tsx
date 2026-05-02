import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_COORDS } from '@/lib/constants';

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

interface BusMapProps {
  departure: string;
  destination: string;
  progress: number;    // 0.0 – 1.0
  isCompleted?: boolean;
}

export default function BusMap({ departure, destination, progress, isCompleted }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const initializedRef = useRef(false);

  const fromCoords = CITY_COORDS[departure];
  const toCoords = CITY_COORDS[destination];

  const busPosition = useMemo(() => {
    if (!fromCoords || !toCoords) return null;
    return isCompleted ? toCoords : lerp(fromCoords, toCoords, Math.min(progress, 1));
  }, [progress, isCompleted, departure, destination]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || !fromCoords || !toCoords || initializedRef.current) return;
    initializedRef.current = true;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: lerp(fromCoords, toCoords, 0.5),
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      // Fit map to show both cities
      const bounds = new maplibregl.LngLatBounds(fromCoords, toCoords);
      map.fitBounds(bounds, { padding: 80, maxZoom: 7 });

      // Dashed route line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [fromCoords, toCoords] },
          properties: {},
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#6366f1',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      });

      // Departure pin
      new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat(fromCoords)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText(`${departure} — Departure`))
        .addTo(map);

      // Destination pin
      new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(toCoords)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText(`${destination} — Destination`))
        .addTo(map);

      // Bus marker (custom pulsing element)
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="position:relative;width:36px;height:36px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(99,102,241,0.25);animation:pulse 1.5s ease-out infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(99,102,241,0.5);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="22" height="14" rx="2"/><path d="M16 17H8"/><path d="M12 3v14"/><path d="M1 8h22"/>
              <circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>
            </svg>
          </div>
        </div>
      `;

      // Add pulse CSS once
      if (!document.getElementById('bus-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'bus-pulse-style';
        style.textContent = `@keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.5); opacity: 0; } }`;
        document.head.appendChild(style);
      }

      const initPos = lerp(fromCoords, toCoords, Math.min(progress, 1));
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(initPos)
        .addTo(map);

      markerRef.current = marker;
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; initializedRef.current = false; };
  }, [departure, destination]);

  // Smooth-move bus marker whenever progress changes
  useEffect(() => {
    if (!markerRef.current || !busPosition) return;
    markerRef.current.setLngLat(busPosition);

    // Gently pan map to keep bus centered
    if (mapRef.current) {
      mapRef.current.easeTo({ center: busPosition, duration: 800, easing: (t) => t });
    }
  }, [busPosition]);

  if (!fromCoords || !toCoords) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground text-sm">
        Map unavailable — unknown city: {!fromCoords ? departure : destination}
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
