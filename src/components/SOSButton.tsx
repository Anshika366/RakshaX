import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ShieldAlert, 
  Check, 
  AlertCircle, 
  Loader2, 
  Send, 
  Smartphone, 
  User, 
  Globe, 
  Clock 
} from 'lucide-react';

export default function SOSButton() {
  // Input fields for SOS customization
  const [toNumber, setToNumber] = useState<string>('');
  const [name, setName] = useState<string>('Anshika Pathak');
  const [locationName, setLocationName] = useState<string>('NavGurukul Campus');

  // Real-time GPS/Location States
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsString, setGpsString] = useState<string>('');
  const [mapLink, setMapLink] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // API Dispatch States
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messageSid, setMessageSid] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastIncidentId, setLastIncidentId] = useState<string>('');

  // Auto-detect location on load so the user sees real coordinates right away
  useEffect(() => {
    detectLocation();
  }, []);

  // Function to fetch browser HTML5 Geolocation
  const detectLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });

        // Generate map link in format: https://maps.google.com/?q=LAT,LNG
        const generatedLink = `https://maps.google.com/?q=${lat},${lng}`;
        setMapLink(generatedLink);

        // Format GPS String dynamically as LAT° N, LNG° E
        const latDirection = lat >= 0 ? 'N' : 'S';
        const lngDirection = lng >= 0 ? 'E' : 'W';
        const formattedGPS = `${Math.abs(lat).toFixed(5)}° ${latDirection}, ${Math.abs(lng).toFixed(5)}° ${lngDirection}`;
        setGpsString(formattedGPS);

        setIsLocating(false);
      },
      (error) => {
        console.error("GPS Acquisition Error:", error);
        setIsLocating(false);
        
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please enable browser location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "GPS position unavailable. Ensure device location is on.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please retry.";
        }
        setLocationError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Dispatch function to trigger the WhatsApp SOS template broadcast
  const triggerSOS = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset feedback states
    setDispatchError(null);
    setMessageSid(null);
    setSuccess(false);

    // Validate number and name
    if (!toNumber.trim()) {
      setDispatchError("Please enter a valid WhatsApp recipient phone number.");
      return;
    }

    // Ensure we have active GPS coordinates
    if (!coords || !gpsString || !mapLink) {
      setDispatchError("Please capture valid GPS coordinates from your device before sending.");
      return;
    }

    setIsSending(true);

    // 5. Generate a unique incident ID dynamically using INC- combined with timestamp/random
    const randId = Math.floor(100000 + Math.random() * 900000);
    const generatedIncidentId = `INC-${randId}`;
    setLastIncidentId(generatedIncidentId);

    try {
      const response = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_number: toNumber,
          name: name,
          location: locationName,
          map_link: mapLink,
          gps: gpsString,
          incident_id: generatedIncidentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API dispatch failed.");
      }

      if (data.success) {
        setMessageSid(data.message_sid);
        setSuccess(true);
      } else {
        throw new Error("Failed to queue the emergency WhatsApp message.");
      }
    } catch (err: any) {
      console.error("SOS Dispatch Error:", err);
      setDispatchError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 rounded-[28px] shadow-2xl relative overflow-hidden">
      {/* Absolute Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-bold tracking-widest text-red-500 uppercase">Live Broadcast Portal</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
            WhatsApp SOS Dispatcher
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Uses Twilio Content Template <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-400 font-mono text-[10px]">HX19465ec99a0574262ea2a7e1f8c73eb1</code>
          </p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      <form onSubmit={triggerSOS} className="space-y-6 text-left">
        {/* Recipient Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Distress Sender Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sender Name"
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white transition-all outline-none"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Mapped to variable <code className="text-red-400 font-mono font-bold">{"{{1}}"}</code></p>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              WhatsApp Recipient Phone
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                placeholder="e.g. +919876543210"
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white transition-all outline-none placeholder:text-slate-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Include country code. Twilio Sandbox requires opting in first.</p>
          </div>
        </div>

        {/* Custom Location Name */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
            Safety Incident Location Name
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. NavGurukul Campus"
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white transition-all outline-none"
              required
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Mapped to variable <code className="text-red-400 font-mono font-bold">{"{{2}}"}</code></p>
        </div>

        {/* Live Device Geolocation Status Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${coords ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                <MapPin className={`w-4 h-4 ${isLocating ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Browser Geolocation (GPS)</h4>
                <p className="text-[10px] text-slate-500">Real-time device tracking coordinate query</p>
              </div>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={isLocating}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-xl text-[10px] font-bold text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {isLocating ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Locating...
                </span>
              ) : "Refresh GPS"}
            </button>
          </div>

          {/* Coordinate Details Display */}
          {locationError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] mb-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}

          {coords ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
              <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                  GPS Coordinates {"{{4}}"}
                </span>
                <span className="font-mono font-bold text-blue-400">
                  {gpsString}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl overflow-hidden">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                  Live Map Link {"{{3}}"}
                </span>
                <a 
                  href={mapLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-400 font-mono font-bold underline hover:text-blue-300 truncate block"
                >
                  {mapLink}
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
              {!locationError && !isLocating && (
                <p className="text-xs text-slate-500">
                  No GPS coordinates acquired. Click "Refresh GPS" to grant access.
                </p>
              )}
              {isLocating && (
                <p className="text-xs text-blue-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting with satellite network...
                </p>
              )}
            </div>
          )}
        </div>

        {/* FEEDBACK STATUS OVERLAYS / BLOCKS */}
        <AnimatePresence mode="wait">
          {dispatchError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-red-400">SOS Dispatch Failed</h5>
                <p className="text-[10px] text-red-300/80 mt-0.5 leading-normal">{dispatchError}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3"
            >
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-xs font-bold text-emerald-400">SOS Message Sent on WhatsApp!</h5>
                <p className="text-[10px] text-emerald-300/80 mt-1 leading-normal">
                  Twilio has successfully dispatched the automated WhatsApp SOS template message with real device coordinates.
                </p>
                <div className="mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[10px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Message SID:</span>
                    <span className="text-emerald-400 font-bold select-all">{messageSid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incident ID {"{{6}}"}:</span>
                    <span className="text-blue-400 font-bold">{lastIncidentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient:</span>
                    <span className="text-slate-300">whatsapp:{toNumber}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SOS Action Button */}
        <button
          type="submit"
          disabled={isSending || isLocating}
          className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
            isSending 
              ? 'bg-red-950 text-red-500 border border-red-500/20 cursor-not-allowed'
              : 'bg-red-600 text-white shadow-lg hover:bg-red-700 shadow-red-900/20 hover:shadow-red-900/40'
          }`}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Broadcasting SOS Alert...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 fill-white" />
              Send Live WhatsApp SOS
            </>
          )}
        </button>
      </form>
    </div>
  );
}
