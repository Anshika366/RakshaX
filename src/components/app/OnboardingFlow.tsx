import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, Key, Check, ArrowRight, ArrowLeft, 
  MapPin, Bell, Phone, Mail, FileText, Activity, AlertCircle,
  Mic, Sparkles, Smartphone, Volume2, Languages 
} from 'lucide-react';
import { SafetyProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface OnboardingFlowProps {
  initialName: string;
  onComplete: (profile: SafetyProfile) => void;
  onCancel: () => void;
}

export default function OnboardingFlow({ initialName, onComplete, onCancel }: OnboardingFlowProps) {
  const { t, currentLangInfo, setIsLangModalOpen } = useLanguage();
  const [step, setStep] = useState(1);

  // Profile Form state
  const [fullName, setFullName] = useState(initialName || '');
  const [gender, setGender] = useState('Female');
  const [dateOfBirth, setDateOfBirth] = useState('1998-05-15');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [address, setAddress] = useState('Viman Nagar / Dhanori Road');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [emergencyNotes, setEmergencyNotes] = useState('Alert emergency contacts immediately upon SOS trigger.');
  const [doctorName, setDoctorName] = useState('Dr. Joshi');
  const [doctorNumber, setDoctorNumber] = useState('+91 98765 43210');

  // Automatic GPS Location detection during onboarding
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);

  const handleAutoDetectLocation = () => {
    setIsAutoDetecting(true);
    setAutoDetectError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.address) {
                const addr = data.address;
                const street = [
                  addr.road,
                  addr.suburb,
                  addr.neighbourhood,
                  addr.commercial,
                  addr.retail
                ].filter(Boolean).join(', ') || addr.amenity || data.display_name.split(',').slice(0, 2).join(',');

                setAddress(street || data.display_name.split(',')[0]);
                setCity(addr.city || addr.town || addr.village || addr.municipality || 'Pune');
                setState(addr.state || 'Maharashtra');
                setCountry(addr.country || 'India');
              } else {
                setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
              }
            } else {
              setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          } catch (err) {
            console.log("[Onboarding Geocoding Log] Onboarding reverse geocoding error:", err);
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } finally {
            setIsAutoDetecting(false);
          }
        },
        (err) => {
          console.log("[Onboarding GPS Log] Onboarding Geolocation error:", err);
          setIsAutoDetecting(false);
          if (err.code === 1) {
            setAutoDetectError("Permission denied. Please allow location in your browser settings.");
          } else {
            setAutoDetectError("GPS timeout. Please input address manually.");
          }
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    } else {
      setIsAutoDetecting(false);
      setAutoDetectError("Geolocation is not supported by your browser.");
    }
  };

  // Permission toggles (simulated)
  const [permLocation, setPermLocation] = useState(true);
  const [permNotifications, setPermNotifications] = useState(true);
  const [permPhone, setPermPhone] = useState(true);
  const [permSMS, setPermSMS] = useState(true);
  const [permMicrophone, setPermMicrophone] = useState(true);
  const [permBackground, setPermBackground] = useState(true);

  // Trigger preferences state (Step 6)
  const [shake3TimesEnabled, setShake3TimesEnabled] = useState(true);
  const [biomVoiceBiometric, setBiomVoiceBiometric] = useState(true);
  const [biomVoicePhrase, setBiomVoicePhrase] = useState('Help Emergency');
  const [voiceEnrolled, setVoiceEnrolled] = useState(true);

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      // Completed, package up profile
      const finalProfile: SafetyProfile = {
        fullName,
        gender,
        dateOfBirth,
        bloodGroup,
        medicalConditions,
        allergies,
        currentMedications,
        address,
        city,
        state,
        country,
        emergencyNotes,
        doctorName,
        doctorNumber,
        biometrics: {
          shake3TimesEnabled: shake3TimesEnabled,
          voiceBiometricEnabled: biomVoiceBiometric,
          voiceKeyword: biomVoicePhrase,
          voiceModelRegistered: voiceEnrolled
        }
      };
      onComplete(finalProfile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl sm:rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col min-h-[480px] sm:min-h-[560px] max-h-[92vh] text-left">
      {/* Upper header tracker */}
      <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{t('onboardingTitle')} ({step}/6)</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer border border-slate-200"
            title={t('chooseLanguage')}
          >
            <Languages className="w-3 h-3 text-blue-600" />
            <span className="hidden xs:inline">{currentLangInfo.nativeName}</span>
            <span>{currentLangInfo.flag}</span>
          </button>
          <div className="flex gap-1 sm:gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-5 sm:w-6 bg-blue-600' : s < step ? 'w-2.5 sm:w-3 bg-blue-300' : 'w-1.5 sm:w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100 flex items-center gap-1 w-fit">
                  Welcome to <span className="font-sans font-black">Raksha<span className="text-blue-600">X</span></span>
                </span>
                <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
                  Hello, {fullName || 'there'}! Let's secure your life circle.
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  RakshaX is designed with one single priority: **keeping you safe during high-stress scenarios**. No technical complexity, no cluttered dashboards. Just immediate rescue dispatch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100/40">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-600 mb-4 font-bold text-base">1</div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Fill Safety Profile</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Provide your medical specifics so emergency dispatchers understand critical notes immediately.</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-100/40">
                  <div className="w-10 h-10 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-600 mb-4 font-bold text-base">2</div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Add Trusted Guardians</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Input family, spouses, or nearby friends who must be alerted concurrently in milliseconds.</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-2xl border border-emerald-100/40">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 mb-4 font-bold text-base">3</div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Ready to Press SOS</h4>
                  <p className="text-[11px] text-slate-500 mt-1">If anything feels wrong, press the red circle. We trigger SMS, automatic calls, WhatsApp and live maps.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  How SOS works
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-2">
                  Immediate Rescue in 3 Seconds
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  When you feel unsafe or experience an emergency, you do not need to look for contact numbers. One tap triggers a cascade of automated protection channels.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold shrink-0">1</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">3-Second Hold or Shake</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Prevent false alarms. You can also trigger silently or double-tap power keys in your pocket.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">2</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Simultaneous Multi-Channel Relay</h4>
                    <p className="text-xs text-slate-500 mt-0.5">We dispatch instant SMS alerts, a WhatsApp message with high-accuracy GPS link, and automated voice dialing to your contacts.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">3</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Nearest Services Identified</h4>
                    <p className="text-xs text-slate-500 mt-0.5">The app automatically matches the nearest certified hospitals, ambulances, and local police stations with one-tap routing.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  Guardian Network
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-2">
                  Why Emergency Contacts are Vital
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  During critical scenarios, municipal emergency dispatch lines can sometimes face delays. Your trusted circle acts as your personal immediate response team.
                </p>
              </div>

              <div className="p-6 bg-purple-50/40 border border-purple-100/50 rounded-[24px] space-y-4">
                <div className="flex gap-3 items-start">
                  <Users className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">Multiple Contacts & Failover calling</h4>
                    <p className="text-xs text-purple-900/80 mt-1 leading-relaxed">
                      RakshaX calls your emergency contacts one-by-one. If Contact 1 is busy or has silent mode active, we automatically call Contact 2, and then Contact 3, ensuring someone is reached.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start border-t border-purple-100/60 pt-4">
                  <MapPin className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">Precise Tracking Link</h4>
                    <p className="text-xs text-purple-900/80 mt-1 leading-relaxed">
                      Your contacts receive a special temporary tracking link. They can watch your GPS coordinates shift in real-time, know your exact battery percentage, and receive navigation directions to find you.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  Permissions Control
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-2">
                  Grant Life-Saving Clearances
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  RakshaX operates client-side inside your browser sandbox. Turn on these indicators so that SOS triggers can operate smoothly in extreme situations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {/* Location */}
                <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between ${permLocation ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2.5 items-center">
                    <MapPin className={`w-5 h-5 ${permLocation ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800">GPS Location</h4>
                      <p className="text-[10px] text-slate-400">To route nearest hospitals</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permLocation} 
                    onChange={(e) => setPermLocation(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-blue-600"
                  />
                </div>

                {/* Notifications */}
                <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between ${permNotifications ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2.5 items-center">
                    <Bell className={`w-5 h-5 ${permNotifications ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800">Notifications</h4>
                      <p className="text-[10px] text-slate-400">For live tracking alerts</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permNotifications} 
                    onChange={(e) => setPermNotifications(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-blue-600"
                  />
                </div>

                {/* Phone */}
                <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between ${permPhone ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2.5 items-center">
                    <Phone className={`w-5 h-5 ${permPhone ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800">Phone Calling</h4>
                      <p className="text-[10px] text-slate-400">One-tap emergency calls</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permPhone} 
                    onChange={(e) => setPermPhone(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-blue-600"
                  />
                </div>

                {/* SMS */}
                <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between ${permSMS ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2.5 items-center">
                    <Mail className={`w-5 h-5 ${permSMS ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800">SMS / WhatsApp</h4>
                      <p className="text-[10px] text-slate-400">To dispatch location links</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permSMS} 
                    onChange={(e) => setPermSMS(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-blue-600"
                  />
                </div>

                {/* Background Location */}
                <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between md:col-span-2 ${permBackground ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2.5 items-center">
                    <MapPin className={`w-5 h-5 animate-pulse ${permBackground ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800">Background Location Sharing</h4>
                      <p className="text-[10px] text-slate-400">Maintains real-time coordinates tracking even if your device screen goes black or app is minimized.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permBackground} 
                    onChange={(e) => setPermBackground(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-blue-600"
                  />
                </div>
              </div>

              {/* Battery optimization note */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left flex gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Critical Battery optimization Instruction</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-normal">
                    To prevent Android/iOS from putting RakshaX to sleep in your pocket, go to device Settings → Battery → Optimize Battery Usage and select **Do Not Optimize (Unrestricted)** for this browser.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  Last Step
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-2">
                  Create Safety Profile
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Provide your medical and diagnostic parameters. First responders can unlock this screen directly from your widget during medical crises.
                </p>
              </div>

              <div className="space-y-4 pt-1 max-h-[420px] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer Not to Say">Prefer Not to Say</option>
                    </select>
                  </div>

                  {/* DoB */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Date of Birth</label>
                    <input 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Blood Group</label>
                    <select 
                      value={bloodGroup} 
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Medical Conditions */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Medical Conditions</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Asthma, Diabetes" 
                      value={medicalConditions} 
                      onChange={(e) => setMedicalConditions(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Allergies</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Penicillin, Peanuts" 
                      value={allergies} 
                      onChange={(e) => setAllergies(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Medications */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Current Medications</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Metformin 500mg" 
                      value={currentMedications} 
                      onChange={(e) => setCurrentMedications(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Home Address</label>
                      <button
                        type="button"
                        onClick={handleAutoDetectLocation}
                        disabled={isAutoDetecting}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 disabled:text-slate-400 cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                      >
                        {isAutoDetecting ? '⏳ Detecting...' : '📍 Auto Detect GPS'}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                    {autoDetectError && (
                      <p className="text-[10px] font-semibold text-rose-500 mt-1 pl-1">
                        ⚠️ {autoDetectError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">City</label>
                      <input 
                        type="text" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">State</label>
                      <input 
                        type="text" 
                        value={state} 
                        onChange={(e) => setState(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Country</label>
                      <input 
                        type="text" 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Emergency Notes & Instructions</label>
                  <textarea 
                    rows={2} 
                    value={emergencyNotes} 
                    onChange={(e) => setEmergencyNotes(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  {/* Doctor Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Primary Doctor's Name (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dr. Rajiv Mehta" 
                      value={doctorName} 
                      onChange={(e) => setDoctorName(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Doctor Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Doctor's Contact (Optional)</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +91 98765 43210" 
                      value={doctorNumber} 
                      onChange={(e) => setDoctorNumber(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: BIOMETRIC SECURITY SETUP */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-left"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[11px] font-extrabold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Emergency Trigger Safeguards
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  Set Up Voice & 3x Phone Shake Emergency SOS Triggers
                </h2>
                <p className="text-xs text-blue-100 leading-relaxed mt-1">
                  Configure instant emergency triggers. In dangerous situations, simply speak your security word or shake your phone 3 times to send instant alerts without unlocking your screen!
                </p>
              </div>

              {/* GUIDE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                  <div className="font-extrabold text-blue-900 flex items-center gap-1">
                    <Smartphone className="w-4 h-4 text-blue-600" /> 1. Shake Phone 3 Times
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Rapidly shake device 3 times &rarr; Instant emergency SOS dispatched with live location to Police & Guardians.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                  <div className="font-extrabold text-emerald-900 flex items-center gap-1">
                    <Mic className="w-4 h-4 text-emerald-600" /> 2. Voice Safe Word
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Speaking keywords like "Help" or "Emergency" auto-triggers SOS alerts immediately.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. 3x Device Shake Emergency Trigger */}
                <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                        <Smartphone className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">3-Times Phone Shake SOS Trigger</h4>
                        <p className="text-[11px] text-slate-500">
                          Shaking your smartphone 3 times detects acceleration & automatically triggers live distress broadcast.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={shake3TimesEnabled} 
                        onChange={(e) => setShake3TimesEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* 2. Voice Biometric Emergency Command */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Voice Command Listener ("Help", "Emergency")</h4>
                        <p className="text-[11px] text-slate-500">
                          Microphone actively listens for distress keywords to instantly alert emergency services.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={biomVoiceBiometric} 
                        onChange={(e) => setBiomVoiceBiometric(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {biomVoiceBiometric && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trigger Phrase:</label>
                        <input
                          type="text"
                          value={biomVoicePhrase}
                          onChange={(e) => setBiomVoicePhrase(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[10px]">
                          {voiceEnrolled ? '✓ Security phrase saved and active' : 'Phrase not saved yet'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVoiceEnrolled(!voiceEnrolled)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 border cursor-pointer ${
                            voiceEnrolled ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          {voiceEnrolled ? '✓ Voice Keyword Configured' : 'Save & Activate Security Word'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors text-slate-600 hover:bg-slate-200/60 cursor-pointer border-none"
        >
          <ArrowLeft className="w-4 h-4" /> {t('onboardingBack')}
        </button>

        <button
          onClick={handleNext}
          className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          {step === 6 ? t('onboardingFinish') : t('onboardingNext')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
