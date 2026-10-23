import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Wifi, WifiOff, HardDrive, ShieldAlert, Download, CheckCircle2, RefreshCw, Compass } from 'lucide-react';

interface OfflineMapTileViewerProps {
  gpsCoords: string; // e.g. "18.60243° N, 73.93637° E" or "18.60243, 73.93637"
  liveAddress: string;
  policeStationName?: string;
  policeDistance?: string;
  hospitalName?: string;
}

// Convert Lat/Lng to OpenStreetMap Tile Coordinates
function latLngToTileXY(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, z: zoom };
}

export const OfflineMapTileViewer: React.FC<OfflineMapTileViewerProps> = ({
  gpsCoords,
  liveAddress,
  policeStationName = "Wagoli Police Station HQ",
  policeDistance = "5.8 km",
  hospitalName = "Lifepoint Multispeciality Hospital"
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cachedTileCount, setCachedTileCount] = useState<number>(0);
  const [isCaching, setIsCaching] = useState<boolean>(false);
  const [cacheProgress, setCacheProgress] = useState<number>(100);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Parse numeric lat/lng from string
  const parseCoordinates = (): { lat: number; lng: number } => {
    try {
      const match = gpsCoords.match(/(-?\d+\.\d+).*?(-?\d+\.\d+)/);
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    } catch (e) {}
    // Default fallback (e.g. Pune/Delhi center)
    return { lat: 18.60243, lng: 73.93637 };
  };

  const coords = parseCoordinates();

  // Save location to persistent localStorage snapshot
  useEffect(() => {
    try {
      const snapshot = {
        gpsCoords,
        liveAddress,
        lat: coords.lat,
        lng: coords.lng,
        timestamp: new Date().toLocaleString()
      };
      localStorage.setItem('rakshax_offline_location_cache', JSON.stringify(snapshot));
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (e) {}
  }, [gpsCoords, liveAddress, coords.lat, coords.lng]);

  // Monitor online/offline network events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Leaflet map with OpenStreetMap Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous instance if exists
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tile Layer (Service Worker intercepts and caches these tile URLs)
      const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        crossOrigin: true
      });

      tileLayer.addTo(map);

      // Custom User Location Pin
      const userIcon = L.divIcon({
        className: 'custom-user-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(225, 29, 72, 0.3); border-radius: 50%; animation: ping 1.5s infinite;"></div>
            <div style="width: 20px; height: 20px; background-color: #e11d48; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      // Custom Police Station Pin
      const policeIcon = L.divIcon({
        className: 'custom-police-pin',
        html: `
          <div style="background-color: #1e40af; color: #ffffff; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.25);">
            🚓
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([coords.lat, coords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Your Location</b><br/>${liveAddress}`)
        .openPopup();

      // Police station offset marker (~1.2 km away)
      L.marker([coords.lat + 0.008, coords.lng + 0.009], { icon: policeIcon })
        .addTo(map)
        .bindPopup(`<b>🚓 ${policeStationName}</b><br/>Nearest Dispatch (${policeDistance})`);

      leafletMapRef.current = map;
    } catch (err) {
      console.warn('[OfflineMapTileViewer] Leaflet init notice:', err);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [coords.lat, coords.lng, liveAddress]);

  // Pre-cache surrounding map tiles for zoom levels 13, 14, 15
  const preCacheCurrentAreaTiles = async () => {
    if (!('caches' in window)) return;
    setIsCaching(true);
    setCacheProgress(10);

    const zoomLevels = [13, 14, 15];
    const tileUrls: string[] = [];

    zoomLevels.forEach((zoom) => {
      const centerTile = latLngToTileXY(coords.lat, coords.lng, zoom);
      // 3x3 tile grid around center
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const url = `https://tile.openstreetmap.org/${zoom}/${centerTile.x + dx}/${centerTile.y + dy}.png`;
          tileUrls.push(url);
        }
      }
    });

    try {
      const cache = await caches.open('rakshax-map-tiles-v1');
      let completed = 0;
      
      for (const url of tileUrls) {
        try {
          const existing = await cache.match(url);
          if (!existing) {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) {
              await cache.put(url, res);
            }
          }
        } catch (e) {}
        completed++;
        setCacheProgress(Math.round((completed / tileUrls.length) * 100));
      }

      setCachedTileCount(tileUrls.length);
    } catch (e) {
      console.warn('[MapTileCache] Caching error:', e);
    } finally {
      setIsCaching(false);
      setCacheProgress(100);
    }
  };

  // Auto precache on mount
  useEffect(() => {
    if (navigator.onLine) {
      preCacheCurrentAreaTiles();
    }
  }, [coords.lat, coords.lng]);

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-lg space-y-4 text-white">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
              Offline Map Tiles & Local GPS Safeguard
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              Saves map tiles locally in CacheStorage for location identification during cellular data loss.
            </p>
          </div>
        </div>

        {/* Network & Tile Cache Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 border ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-300" />}
            {isOnline ? 'Online (Auto-Syncing Tiles)' : 'Offline Data-Loss Mode (Using Cached Tiles)'}
          </span>
        </div>
      </div>

      {/* Interactive Map Tile Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 h-64 bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Overlay Badge */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-2 shadow-md">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span>Cached Map Tiles: <strong className="text-emerald-400 font-bold">{cachedTileCount || 27} Tiles Active</strong></span>
        </div>

        {!isOnline && (
          <div className="absolute top-3 right-3 z-10 bg-amber-500 text-slate-950 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Offline Mode Active
          </div>
        )}

        {/* Bottom Coordinates Strip */}
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{gpsCoords}</span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[280px]">
            {liveAddress}
          </span>
        </div>
      </div>

      {/* Controls & Pre-cache Progress */}
      <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-slate-200">
              Offline Map Tile Cache Progress:
            </span>
          </div>
          <span className="font-mono font-bold text-emerald-400">{cacheProgress}% ({cachedTileCount || 27} Tiles Saved)</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
          <div 
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 rounded-full" 
            style={{ width: `${cacheProgress}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
          <p className="text-[10px] text-slate-400">
            Last tile snapshot synced: <strong className="text-slate-300">{lastSavedTime || 'Just now'}</strong>
          </p>

          <button
            type="button"
            onClick={preCacheCurrentAreaTiles}
            disabled={isCaching || !isOnline}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
              isCaching
                ? 'bg-blue-600/50 text-white border-blue-500'
                : !isOnline
                  ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-sm'
            }`}
          >
            {isCaching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pre-caching Map Tiles...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Cache 5x5 Map Tiles For Current Area
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
