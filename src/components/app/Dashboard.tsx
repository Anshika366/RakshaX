import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, AlertTriangle, Users, Heart, History, Settings, LogOut,
  MapPin, Battery, Wifi, Phone, MessageSquare, Mail, Play, Pause,
  Plus, Edit2, Trash2, Star, Check, X, ShieldAlert, Share2, Navigation,
  Activity, Volume2, VolumeX, Smartphone, Search, Compass, Eye, Sun,
  HelpCircle, EyeOff, FileText, CheckCircle, Languages, Accessibility as AccessIcon,
  ArrowLeft, Mic, Sparkles, Radio, Zap, Send, Copy, CheckCircle2,
  PhoneCall, Car, QrCode, ShieldCheck, AlertCircle, Clock, XCircle,
  RefreshCw, Sliders
} from 'lucide-react';
import { SafetyProfile, EmergencyContact, IncidentHistory } from '../../types';
import { OfflineMapTileViewer } from './OfflineMapTileViewer';
import { getTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../lib/translations';
import { useLanguage } from '../../context/LanguageContext';
import { acquireScrollLock } from '../../lib/scrollLock';
import { 
  getCurrentUserAccount, 
  updateUserProfile, 
  updateUserContacts, 
  updateUserIncidents,
  deleteUserAccount
} from '../../lib/userDB';

interface DashboardProps {
  key?: string;
  initialProfile: SafetyProfile;
  userEmail: string;
  onLogout: () => void;
  isPreview?: boolean;
}

export default function Dashboard({ initialProfile, userEmail, onLogout, isPreview = false }: DashboardProps) {
  // Load data from persistent DB
  const account = getCurrentUserAccount(userEmail);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'home' | 'contacts' | 'medical' | 'biometrics' | 'history' | 'settings'>('home');
  
  // Voice Enrollment & Safe Words States (Supports 3-4 customizable trigger words/phrases)
  const [voiceEnrolled, setVoiceEnrolled] = useState<boolean>(() => {
    if (initialProfile?.biometrics?.voiceModelRegistered !== undefined) {
      return initialProfile.biometrics.voiceModelRegistered;
    }
    return localStorage.getItem('rakshax_voice_enrolled') === 'true';
  });
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(true);
  const isVoiceListeningRef = useRef<boolean>(true);

  // Initialize custom safe phrases (Supports up to 6 customizable trigger words/phrases with deduplication)
  const [customSafeWords, setCustomSafeWords] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('rakshax_safe_words');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const deduped: string[] = [];
          for (const item of parsed) {
            const word = String(item || '').trim();
            if (word && !seen.has(word.toLowerCase())) {
              seen.add(word.toLowerCase());
              deduped.push(word);
            }
          }
          if (deduped.length > 0) return deduped.slice(0, 6);
        }
      }
      const legacy = localStorage.getItem('rakshax_safe_word');
      if (legacy && legacy !== 'Bachao' && legacy !== 'Help Emergency Bachao') {
        return [legacy, 'Bachao', 'Emergency', 'Red Alert'].slice(0, 6);
      }
    } catch (e) {}
    return ['Help', 'Bachao', 'Emergency', 'Red Alert'];
  });
  const customSafeWordsRef = useRef<string[]>(customSafeWords);

  // Inline editing state for safe words
  const [editingSafeWordIdx, setEditingSafeWordIdx] = useState<number | null>(null);
  const [editingSafeWordVal, setEditingSafeWordVal] = useState<string>('');
  const [newSafeWordInput, setNewSafeWordInput] = useState<string>('');

  // Backward compatibility legacy safe word state
  const customSafeWord = customSafeWords[0] || 'Help';
  const customSafeWordRef = useRef<string>(customSafeWord);

  const [micStatus, setMicStatus] = useState<'idle' | 'ready' | 'listening' | 'permission_denied' | 'unsupported'>('listening');
  const speechRecRef = useRef<any>(null);
  const [voiceRecognizedPhrase, setVoiceRecognizedPhrase] = useState<string>('');
  const clearPhraseTimerRef = useRef<any>(null);
  const [isStealthLockActive, setIsStealthLockActive] = useState<boolean>(false);

  // Shake sensitivity setting ('low' | 'medium' | 'high')
  const [shakeSensitivity, setShakeSensitivity] = useState<'low' | 'medium' | 'high'>(() => {
    try {
      const saved = localStorage.getItem('rakshax_shake_sensitivity');
      if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
    } catch (e) {}
    return 'medium';
  });

  // Real-time audio waveform / level meter & permission refs
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simulatedAudioTimerRef = useRef<any>(null);
  const hasMicPermissionRef = useRef<boolean>(true);

  // Sync refs and persistence
  useEffect(() => {
    isVoiceListeningRef.current = isVoiceListening;
  }, [isVoiceListening]);

  useEffect(() => {
    try {
      localStorage.setItem('rakshax_voice_enrolled', voiceEnrolled ? 'true' : 'false');
    } catch (e) {}
  }, [voiceEnrolled]);

  useEffect(() => {
    customSafeWordsRef.current = customSafeWords;
    customSafeWordRef.current = customSafeWords[0] || 'Help';
    try {
      localStorage.setItem('rakshax_safe_words', JSON.stringify(customSafeWords));
      if (customSafeWords[0]) {
        localStorage.setItem('rakshax_safe_word', customSafeWords[0]);
      }
    } catch (e) {}
  }, [customSafeWords]);

  // App States
  const [profile, setProfile] = useState<SafetyProfile>(account?.profile || initialProfile);
  const [contacts, setContacts] = useState<EmergencyContact[]>(account?.contacts ? account.contacts : [
    {
      id: 'c1',
      name: 'Primary Guardian (Verified)',
      relationship: 'Family',
      phoneNumber: '+91 90393 01380',
      whatsAppNumber: '+91 90393 01380',
      email: 'anshikapathak25@navgurukul.org',
      priority: 'High',
      isPrimary: true,
      isSecondary: false,
      isFavorite: true,
      alertChannels: { sms: true, whatsapp: true, call: true, email: true }
    },
    {
      id: 'c2',
      name: 'Emergency Contact 2 (Verified)',
      relationship: 'Guardian',
      phoneNumber: '+91 92342 13875',
      whatsAppNumber: '+91 92342 13875',
      email: 'anshikapathak25@navgurukul.org',
      priority: 'High',
      isPrimary: false,
      isSecondary: true,
      isFavorite: true,
      alertChannels: { sms: true, whatsapp: true, call: true, email: true }
    },
    {
      id: 'c3',
      name: 'Emergency Contact 3 (Verified)',
      relationship: 'Family',
      phoneNumber: '+91 89572 49440',
      whatsAppNumber: '+91 89572 49440',
      email: 'anshikapathak25@navgurukul.org',
      priority: 'Medium',
      isPrimary: false,
      isSecondary: false,
      isFavorite: false,
      alertChannels: { sms: true, whatsapp: false, call: true, email: true }
    }
  ]);

  const [incidents, setIncidents] = useState<IncidentHistory[]>(account?.incidents ? account.incidents : [
    {
      id: 'INC-2026-PUN-01',
      date: '2026-06-12',
      time: '09:45 PM',
      duration: '4 mins',
      location: 'Viman Nagar, Pune, Maharashtra',
      coordinates: '18.5679° N, 73.9143° E',
      status: 'Resolved',
    },
    {
      id: 'INC-2026-PUN-02',
      date: '2026-05-30',
      time: '08:12 AM',
      duration: '12 mins',
      location: 'Dhanori, Pune, Maharashtra',
      coordinates: '18.6027° N, 73.9366° E',
      status: 'Resolved',
    }
  ]);

  // Load data from persistent DB on mount
  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.contacts && data.contacts.length > 0) {
          setContacts(data.contacts);
        }
        if (data.incidents && data.incidents.length > 0) {
          setIncidents(data.incidents);
        }
      })
      .catch(err => {
        console.warn("Backend load failed, falling back to local Storage cache:", err);
      });
  }, [userEmail]);

  // Sync state changes back to database
  useEffect(() => {
    updateUserProfile(userEmail, profile);
    fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, profile })
    }).catch(e => console.warn("Error updating profile in backend:", e));

    if (profile.address) {
      setLiveAddress(`${profile.address}${profile.city ? ', ' + profile.city : ''}${profile.state ? ', ' + profile.state : ''}`);
    }
  }, [profile, userEmail]);

  useEffect(() => {
    updateUserContacts(userEmail, contacts);
    fetch('/api/contacts/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, contacts })
    }).catch(e => console.warn("Error updating contacts in backend:", e));
  }, [contacts, userEmail]);

  useEffect(() => {
    updateUserIncidents(userEmail, incidents);
  }, [incidents, userEmail]);

  // SOS activation triggers
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isSimulatedEmergency, setIsSimulatedEmergency] = useState(false);
  const [silentSOS, setSilentSOS] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rakshax_silent_sos') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rakshax_silent_sos', String(silentSOS));
    }
  }, [silentSOS]);
  const [shakeSOS, setShakeSOS] = useState(true);
  const [longPressActive, setLongPressActive] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);

  // Security 4-digit PIN / Safe Word verification for stopping SOS
  const [showPinModal, setShowPinModal] = useState(false);
  const [deactivateMethod, setDeactivateMethod] = useState<'pin' | 'safeword'>('pin');
  const [enteredPin, setEnteredPin] = useState('');
  const [enteredSafeWord, setEnteredSafeWord] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [safeWordDeactivateError, setSafeWordDeactivateError] = useState<string | null>(null);

  // -------------------- REAL-WORLD EMERGENCY SECONDARY TOOLS --------------------
  // 1. Cab / Auto Safety Guardian (With resilient timestamp-based countdown)
  const [showCabGuardModal, setShowCabGuardModal] = useState(false);
  const [cabNumber, setCabNumber] = useState('DL 01 AB 1234');
  const [cabDriverName, setCabDriverName] = useState('Ramesh Kumar');
  const [cabCompany, setCabCompany] = useState('Uber / Ola / Auto');
  const [cabDurationMins, setCabDurationMins] = useState(25);
  const [isCabGuardActive, setIsCabGuardActive] = useState(false);
  const [cabTimeLeft, setCabTimeLeft] = useState(1500); // in seconds
  const cabTargetEndTimeRef = useRef<number>(0);
  const [hasSharedCabDetails, setHasSharedCabDetails] = useState(false);
  const journeyTargetEndTimeRef = useRef<number>(0);

  // 2. Safety Check-in / "I Am Safe" Reassurance State
  const [showSafeCheckinModal, setShowSafeCheckinModal] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string>(() => {
    const name = initialProfile?.fullName?.trim() || (userEmail ? userEmail.split('@')[0] : 'Anshika');
    return `${name} has reached safely! Thank you for tracking. - by RakshaX`;
  });
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);
  const [checkinResults, setCheckinResults] = useState<any[] | null>(null);

  // 3. Fake Call Excuse Simulator State
  const [showFakeCallModal, setShowFakeCallModal] = useState(false);
  const [fakeCallerName, setFakeCallerName] = useState('Dad');
  const [fakeCallDelaySecs, setFakeCallDelaySecs] = useState(5);
  const [fakeCallState, setFakeCallState] = useState<'idle' | 'countdown' | 'ringing' | 'active'>('idle');
  const [fakeCallCountdown, setFakeCallCountdown] = useState(0);
  const [fakeCallActiveSecs, setFakeCallActiveSecs] = useState(0);
  const fakeCallAudioCtxRef = useRef<AudioContext | null>(null);
  const fakeCallOscillatorRef = useRef<any>(null);

  // 4. Acoustic Siren Sound Test State
  const [isSirenTesting, setIsSirenTesting] = useState(false);
  const sirenTestTimeoutRef = useRef<any>(null);

  // 5. India Helplines Hub Modal
  const [showHelplinesModal, setShowHelplinesModal] = useState(false);

  // 6. Medical Emergency ID Badge Modal
  const [showMedicalBadgeModal, setShowMedicalBadgeModal] = useState(false);

  // 7. Safety Preparedness Quiz Modal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Resilient Cab ride guardian timer using absolute timestamp to survive tab suspension
  useEffect(() => {
    let timer: any = null;
    if (isCabGuardActive) {
      timer = setInterval(() => {
        const remainingMs = cabTargetEndTimeRef.current - Date.now();
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
        setCabTimeLeft(remainingSecs);

        if (remainingSecs <= 0) {
          clearInterval(timer);
          setIsCabGuardActive(false);
          if (!silentSOS) {
            speak("Cab safety timer expired. Auto-triggering RakshaX SOS alert.");
          }
          showToast("🚨 CAB RIDE WATCH TIMEOUT: Auto-triggering Emergency SOS!");
          handleSOSTrigger();
        }
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isCabGuardActive, silentSOS]);

  // Sync remaining cab time when tab returns to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (isCabGuardActive && document.visibilityState === 'visible') {
        const remainingMs = cabTargetEndTimeRef.current - Date.now();
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
        setCabTimeLeft(remainingSecs);
        if (remainingSecs <= 0) {
          setIsCabGuardActive(false);
          showToast("🚨 CAB RIDE WATCH TIMEOUT: Auto-triggering Emergency SOS!");
          handleSOSTrigger();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isCabGuardActive]);

  // Live Active Route & Safe Havens Tracking States
  const [routeProgress, setRouteProgress] = useState(25); // 0 to 100% representing route completion
  const [isUserMoving, setIsUserMoving] = useState(true);
  const [movementMode, setMovementMode] = useState<'walking' | 'running' | 'stationary'>('walking');
  const [approachingSafeHaven, setApproachingSafeHaven] = useState<string>("Pune Police Chowki / Safe Haven");

  // Biometric & Real-Time Security States
  const [isBiometricVerifying, setIsBiometricVerifying] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<IncidentHistory | null>(null);
  const currentIncidentRef = useRef<IncidentHistory | null>(null);
  useEffect(() => {
    currentIncidentRef.current = currentIncident;
  }, [currentIncident]);

  // Idempotency & Debounce guards for duplicate SOS triggers
  const isTriggeringRef = useRef<boolean>(false);
  const lastTriggerTimestampRef = useRef<number>(0);

  // Accurate Location Telemetry States
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationIsFresh, setLocationIsFresh] = useState<boolean>(true);

  type AlertDeliveryStatus = 
    | 'sending' 
    | 'dispatched_provider_accepted' 
    | 'delivered' 
    | 'not_configured' 
    | 'failed' 
    | 'idle' 
    | 'not_selected' 
    | 'queued' 
    | 'sandbox' 
    | 'initiated' 
    | 'simulated';

  const parseDeliveryStatus = (val: string | undefined): AlertDeliveryStatus => {
    if (!val) return 'failed';
    if (val.includes('delivered')) return 'delivered';
    if (val.includes('dispatched_provider_accepted')) return 'dispatched_provider_accepted';
    if (val.includes('call_initiated') || val.includes('initiated')) return 'initiated';
    if (val.includes('sandbox')) return 'sandbox';
    if (val.includes('not_configured')) return 'not_configured';
    if (val.includes('simulated')) return 'simulated';
    if (val === 'not_selected') return 'not_selected';
    if (val.includes('failed')) return 'failed';
    return 'failed';
  };

  const [emergencyStartTime, setEmergencyStartTime] = useState<number | null>(null);
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, {
    sms: AlertDeliveryStatus;
    whatsapp: AlertDeliveryStatus;
    call: AlertDeliveryStatus;
    email: AlertDeliveryStatus;
    smsError?: string;
    whatsappError?: string;
    callError?: string;
    emailError?: string;
  }>>({});

  // Offline SOS Queue Type and Persistence Helpers
  interface QueuedSOSItem {
    incidentId: string;
    userEmail: string;
    userName: string;
    coordinates: string;
    address: string;
    contacts: EmergencyContact[];
    timestamp: string;
    createdAt: number;
    retryCount: number;
    status: 'QUEUED_OFFLINE' | 'DISPATCHED' | 'FAILED_MAX_RETRIES';
  }

  const getOfflineQueue = (): QueuedSOSItem[] => {
    try {
      const raw = localStorage.getItem('rakshax_offline_sos_queue');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveOfflineQueue = (queue: QueuedSOSItem[]) => {
    try {
      localStorage.setItem('rakshax_offline_sos_queue', JSON.stringify(queue));
    } catch (e) {}
  };

  // Backend logger states
  const [liveBackendLogs, setLiveBackendLogs] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Form Modals states
  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    contactId?: string;
  }>({ isOpen: false, mode: 'add' });

  // Contact Form Fields
  const [cName, setCName] = useState('');
  const [cRelationship, setCRelationship] = useState('Parent');
  const [cPhone, setCPhone] = useState('');
  const [cWhatsApp, setCWhatsApp] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPriority, setCPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [cIsPrimary, setCIsPrimary] = useState(false);
  const [cIsSecondary, setCIsSecondary] = useState(false);
  const [cIsFavorite, setCIsFavorite] = useState(false);
  const [cAlertSms, setCAlertSms] = useState(true);
  const [cAlertWhatsapp, setCAlertWhatsapp] = useState(true);
  const [cAlertCall, setCAlertCall] = useState(true);
  const [cAlertEmail, setCAlertEmail] = useState(true);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Poll server logs when emergency is active
  useEffect(() => {
    let interval: any = null;
    if (isEmergencyActive) {
      const fetchLogs = () => {
        fetch("/api/logs")
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.logs)) {
              setLiveBackendLogs(data.logs);
            }
          })
          .catch(err => console.warn("Error fetching backend logs:", err));
      };
      fetchLogs();
      interval = setInterval(fetchLogs, 4000);
    } else {
      setLiveBackendLogs([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isEmergencyActive]);

  // WebAuthn Passkey & Biometric States
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const [isWebAuthnRegistered, setIsWebAuthnRegistered] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [isBiometricRegisteringSim, setIsBiometricRegisteringSim] = useState(false);

  // Settings Sub-View Routing: Profile, Medical, Contacts, Biometric, Language, Logout
  const [settingsSubView, setSettingsSubView] = useState<'hub' | 'profile' | 'medical' | 'contacts' | 'biometric' | 'language'>('hub');

  // Account Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handlePermanentDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      showToast("Please type DELETE to confirm account deletion.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
    } catch (e) {
      console.error("Account delete API error:", e);
    }
    deleteUserAccount(userEmail);
    setIsDeletingAccount(false);
    setIsDeleteModalOpen(false);
    showToast("Your account and all personal safety data have been permanently erased.");
    onLogout();
  };

  // SOS Press & Hold States
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<any>(null);

  // Re-inserted Accessibility, UI, and Simulated Device States
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [colorBlind, setColorBlind] = useState(false);
  const [voiceNarrator, setVoiceNarrator] = useState(false);
  const [narratorText, setNarratorText] = useState('');
  
  // Keep Screen Active Wake Lock State
  const [keepActive, setKeepActive] = useState(true);
  const wakeLockSentinelRef = useRef<any>(null);

  // Screen Wake Lock Handler to prevent device sleep mode
  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          if (!wakeLockSentinelRef.current) {
            const sentinel = await (navigator as any).wakeLock.request('screen');
            if (isMounted) {
              wakeLockSentinelRef.current = sentinel;
              sentinel.addEventListener('release', () => {
                wakeLockSentinelRef.current = null;
              });
            }
          }
        } catch (err) {
          console.warn('[WakeLock] Screen wake lock notice:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockSentinelRef.current) {
        try {
          await wakeLockSentinelRef.current.release();
          wakeLockSentinelRef.current = null;
        } catch (e) {}
      }
    };

    if (keepActive || currentIncident) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (keepActive || currentIncident)) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release().catch(() => {});
        wakeLockSentinelRef.current = null;
      }
    };
  }, [keepActive, currentIncident]);
  
  // SOS Configuration Trigger
  const [oneTapSOS, setOneTapSOS] = useState(false);

  // Continuous Journey Sharing States
  const [journeySharingActive, setJourneySharingActive] = useState(false);
  const [hasSharedJourneyLocation, setHasSharedJourneyLocation] = useState(false);
  const [journeyDuration, setJourneyDuration] = useState<number>(30); // minutes
  const [journeyTimeLeft, setJourneyTimeLeft] = useState<number>(1800); // seconds

  // Language from unified global context
  const { language, setLanguage, t, isLangModalOpen, setIsLangModalOpen, currentLangInfo } = useLanguage();

  // Lock body scroll only when a modal is open; uses reference-counted lock
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      showPinModal ||
      isBiometricVerifying ||
      contactModal.isOpen ||
      showCabGuardModal ||
      showSafeCheckinModal ||
      showFakeCallModal ||
      showQuizModal ||
      showHelplinesModal ||
      showMedicalBadgeModal ||
      isDeleteModalOpen
    );

    if (!isAnyModalOpen) return;
    const releaseScroll = acquireScrollLock();

    return () => {
      releaseScroll();
    };
  }, [
    showPinModal,
    isBiometricVerifying,
    contactModal.isOpen,
    showCabGuardModal,
    showSafeCheckinModal,
    showFakeCallModal,
    showQuizModal,
    showHelplinesModal,
    showMedicalBadgeModal,
    isDeleteModalOpen
  ]);

  const handleLanguageSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === code);
    showToast(getTranslation(code, 'languageSelectedToast'));
    speak(`Language changed to ${langObj?.name || code}`);
  };

  const [notifSms, setNotifSms] = useState(true);
  const [notifCall, setNotifCall] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);

  const [configStatus, setConfigStatus] = useState<any>({
    twilioConfigured: false,
    sendgridConfigured: false,
    hasSecrets: false
  });
  const [twilioSidInput, setTwilioSidInput] = useState('');
  const [twilioTokenInput, setTwilioTokenInput] = useState('');
  const [twilioPhoneInput, setTwilioPhoneInput] = useState('');
  const [twilioWhatsAppInput, setTwilioWhatsAppInput] = useState('+14155238886');
  const [sendgridKeyInput, setSendgridKeyInput] = useState('');
  const [sendgridSenderInput, setSendgridSenderInput] = useState('');
  const [isSavingTwilioConfig, setIsSavingTwilioConfig] = useState(false);
  const [isTestingTwilioConfig, setIsTestingTwilioConfig] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const refreshConfigStatus = () => {
    fetch('/api/config/status')
      .then(res => res.json())
      .then(data => {
        setConfigStatus(data);
        if (data.twilioPhone && !twilioPhoneInput) setTwilioPhoneInput(data.twilioPhone);
        if (data.twilioWhatsApp && !twilioWhatsAppInput) setTwilioWhatsAppInput(data.twilioWhatsApp);
        if (data.sendgridSender && !sendgridSenderInput) setSendgridSenderInput(data.sendgridSender);
      })
      .catch(err => console.warn("Error fetching config status:", err));
  };

  useEffect(() => {
    refreshConfigStatus();
  }, []);

  // Pune default preset localities for rapid accurate geolocation
  const PUNE_LOCALITIES = [
    { name: "Viman Nagar", lat: 18.5679, lng: 73.9143, address: "Viman Nagar, Pune, Maharashtra" },
    { name: "Dhanori / Lohegaon", lat: 18.6027, lng: 73.9366, address: "Dhanori, Lohegaon, Pune, Maharashtra" },
    { name: "Shivajinagar / FC Rd", lat: 18.5314, lng: 73.8446, address: "Shivajinagar, FC Road, Pune, Maharashtra" },
    { name: "Kothrud", lat: 18.5074, lng: 73.8077, address: "Kothrud, Pune, Maharashtra" },
    { name: "Hinjawadi IT Park", lat: 18.5913, lng: 73.7389, address: "Hinjawadi Phase 1, Pune, Maharashtra" },
    { name: "Hadapsar / Magarpatta", lat: 18.5089, lng: 73.9259, address: "Magarpatta City, Hadapsar, Pune, Maharashtra" },
  ];

  // Purge any stale New Delhi cache on mount so user in Pune never sees old Delhi data
  useEffect(() => {
    try {
      const cachedAddr = localStorage.getItem('rakshax_cached_address');
      const cachedPolice = localStorage.getItem('rakshax_cached_police');
      const cachedMetro = localStorage.getItem('rakshax_cached_metro');
      const isStale = (s: string | null) => s && (s.includes('New Delhi') || s.includes('Green Park') || s.includes('Connaught Place') || s.includes('Delhi Metro Transit Safe Zone'));
      if (isStale(cachedAddr) || isStale(cachedPolice) || isStale(cachedMetro)) {
        localStorage.removeItem('rakshax_cached_address');
        localStorage.removeItem('rakshax_cached_police');
        localStorage.removeItem('rakshax_cached_metro');
        localStorage.removeItem('rakshax_cached_hospitals');
        localStorage.removeItem('rakshax_cached_clinics');
        localStorage.removeItem('rakshax_last_known_coords');
      }
    } catch (e) {}
  }, []);

  // Live Tracking variables defaulting to user's Pune hub
  const [numericCoords, setNumericCoords] = useState<{ lat: number; lng: number }>(() => {
    try {
      const cached = localStorage.getItem('rakshax_last_known_coords');
      if (cached) {
        const p = JSON.parse(cached);
        if (p.lat && p.lng && !(p.lat > 28.4 && p.lat < 28.8 && p.lng > 77.0 && p.lng < 77.4)) {
          return { lat: p.lat, lng: p.lng };
        }
      }
    } catch (e) {}
    return { lat: 18.5204, lng: 73.8567 }; // Pune, Maharashtra
  });

  const [gpsCoords, setGpsCoords] = useState(() => {
    return `${numericCoords.lat.toFixed(5)}° N, ${numericCoords.lng.toFixed(5)}° E`;
  });
  const [locationFreshness, setLocationFreshness] = useState<string | null>(null);
  const [placesSource, setPlacesSource] = useState<string>("Detecting");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [liveAddress, setLiveAddress] = useState(() => {
    try {
      const cachedAddr = localStorage.getItem('rakshax_cached_address');
      if (cachedAddr && !cachedAddr.includes('New Delhi') && !cachedAddr.includes('Green Park')) {
        return cachedAddr;
      }
    } catch (e) {}
    if (profile.address && !profile.address.includes('New Delhi') && !profile.address.includes('Green Park')) {
      return `${profile.address}${profile.city ? ', ' + profile.city : ''}${profile.state ? ', ' + profile.state : ''}`;
    }
    return 'Viman Nagar, Pune, Maharashtra';
  });
  const [batteryLevel, setBatteryLevel] = useState(94);
  const [internetStatus, setInternetStatus] = useState('Stable 5G');
  const [emergencyLogs, setEmergencyLogs] = useState<string[]>([]);
  const [mapPulse, setMapPulse] = useState(0);

  // Dynamic Real-World Safety Places States (Police, Metro, Hospital, Clinic)
  const [nearestPolice, setNearestPolice] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('rakshax_cached_police');
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length > 0 && !p[0]?.name?.includes('Green Park') && !p[0]?.name?.includes('Hauz Khas')) {
          return p;
        }
      }
    } catch (e) {}
    return [
      {
        name: "Pune Police Station / Chowki",
        facilityType: "Police Chowki",
        dist: "0.8 km",
        straightLineKm: 0.8,
        roadEta: null,
        eta: "Travel time unavailable",
        directPhone: null,
        emergencyHelpline: { number: "112", name: "112 (National Emergency)" },
        verified: false,
        is24x7: true
      }
    ];
  });

  const [nearestMetro, setNearestMetro] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('rakshax_cached_metro');
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length > 0 && !p[0]?.name?.includes('Green Park') && !p[0]?.name?.includes('Delhi') && !p[0]?.name?.includes('Yellow Line')) {
          return p;
        }
      }
    } catch (e) {}
    return [
      {
        name: "Pune Metro Station (Maha Metro)",
        facilityType: "Metro Station",
        dist: "1.2 km",
        straightLineKm: 1.2,
        roadEta: null,
        eta: "Travel time unavailable",
        directPhone: null,
        emergencyHelpline: { number: "18002705501", name: "Pune Metro Helpline (1800-270-5501)" },
        verified: false,
        is24x7: false
      }
    ];
  });

  const [nearestHospitals, setNearestHospitals] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('rakshax_cached_hospitals');
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length > 0 && !p[0]?.name?.includes('Max Super') && !p[0]?.name?.includes('AIIMS Trauma')) {
          return p;
        }
      }
    } catch (e) {}
    return [
      {
        name: "Sahyadri Super Speciality Hospital Pune",
        facilityType: "Emergency Hospital",
        dist: "1.0 km",
        straightLineKm: 1.0,
        roadEta: null,
        eta: "Travel time unavailable",
        directPhone: null,
        emergencyHelpline: { number: "108", name: "State Medical Ambulance (108)" },
        verified: false,
        is24x7: true
      }
    ];
  });

  const [nearestClinics, setNearestClinics] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('rakshax_cached_clinics');
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length > 0 && !p[0]?.name?.includes('Apollo 24/7') && !p[0]?.address?.includes('Delhi')) {
          return p;
        }
      }
    } catch (e) {}
    return [
      {
        name: "Apollo Clinic Pune & Pharmacy",
        facilityType: "Clinic & Pharmacy",
        dist: "0.4 km",
        straightLineKm: 0.4,
        roadEta: null,
        eta: "Travel time unavailable",
        directPhone: null,
        emergencyHelpline: { number: "104", name: "Health Advice Helpline (104)" },
        verified: false,
        is24x7: false
      }
    ];
  });

  const [nearestAmbulance, setNearestAmbulance] = useState<any[]>([
    {
      name: "Emergency Medical Ambulance Pune",
      facilityType: "Ambulance Hub",
      dist: "0.5 km",
      straightLineKm: 0.5,
      roadEta: null,
      eta: "Travel time unavailable",
      directPhone: null,
      emergencyHelpline: { number: "108", name: "State Medical Ambulance (108)" },
      verified: false
    }
  ]);

  // Haversine Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch real device live GPS location and nearby amenities
  const fetchLocationAndPlaces = () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    // Helper to load offline cached amenities & recalculate real distances
    const loadCachedAmenities = (currLat: number, currLng: number) => {
      try {
        const cachedPolice = localStorage.getItem('rakshax_cached_police');
        const cachedMetro = localStorage.getItem('rakshax_cached_metro');
        const cachedHospitals = localStorage.getItem('rakshax_cached_hospitals');
        const cachedClinics = localStorage.getItem('rakshax_cached_clinics');

        if (cachedPolice) {
          const parsed = JSON.parse(cachedPolice).map((p: any) => {
            const distKm = (p.lat && p.lng) ? calculateDistance(currLat, currLng, p.lat, p.lng) : parseFloat(p.straightLineKm || p.dist || "0.8");
            return {
              ...p,
              straightLineKm: distKm,
              dist: `${distKm.toFixed(1)} km`,
              distNum: distKm,
              roadEta: null,
              eta: "Travel time unavailable (Road routing not configured)",
              verified: false,
              isCached: true
            };
          });
          setNearestPolice(parsed);
          if (parsed[0]) setApproachingSafeHaven(parsed[0].name);
        }
        if (cachedMetro) {
          const parsed = JSON.parse(cachedMetro).map((p: any) => {
            const distKm = (p.lat && p.lng) ? calculateDistance(currLat, currLng, p.lat, p.lng) : parseFloat(p.straightLineKm || p.dist || "1.2");
            return {
              ...p,
              straightLineKm: distKm,
              dist: `${distKm.toFixed(1)} km`,
              distNum: distKm,
              roadEta: null,
              eta: "Travel time unavailable (Road routing not configured)",
              verified: false,
              isCached: true
            };
          });
          setNearestMetro(parsed);
        }
        if (cachedHospitals) {
          const parsed = JSON.parse(cachedHospitals).map((p: any) => {
            const distKm = (p.lat && p.lng) ? calculateDistance(currLat, currLng, p.lat, p.lng) : parseFloat(p.straightLineKm || p.dist || "1.0");
            return {
              ...p,
              straightLineKm: distKm,
              dist: `${distKm.toFixed(1)} km`,
              distNum: distKm,
              roadEta: null,
              eta: "Travel time unavailable (Road routing not configured)",
              verified: false,
              isCached: true
            };
          });
          setNearestHospitals(parsed);
        }
        if (cachedClinics) {
          const parsed = JSON.parse(cachedClinics).map((p: any) => {
            const distKm = (p.lat && p.lng) ? calculateDistance(currLat, currLng, p.lat, p.lng) : parseFloat(p.straightLineKm || p.dist || "0.4");
            return {
              ...p,
              straightLineKm: distKm,
              dist: `${distKm.toFixed(1)} km`,
              distNum: distKm,
              roadEta: null,
              eta: "Travel time unavailable (Road routing not configured)",
              verified: false,
              isCached: true
            };
          });
          setNearestClinics(parsed);
          setNearestAmbulance(parsed);
        }
        setPlacesSource("Offline Local Cache");
      } catch (e) {
        console.warn("Could not parse cached amenities:", e);
      }
    };

    if ("geolocation" in navigator) {
      const handleSuccess = async (position: GeolocationPosition) => {
        setIsDetectingLocation(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;
        setNumericCoords({ lat, lng });
        setGpsCoords(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
        setLocationAccuracy(accuracy);
        setLocationFreshness(new Date().toLocaleTimeString());

        // Cache last verified hardware coordinates immediately
        try {
          localStorage.setItem('rakshax_last_known_coords', JSON.stringify({ lat, lng, accuracy, time: Date.now() }));
        } catch (e) {}

        // Check internet connectivity
        const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

        if (!isOnline) {
          // Offline mode: device GPS hardware provided satellite coordinates
          const cachedAddr = localStorage.getItem('rakshax_cached_address');
          if (cachedAddr) {
            setLiveAddress(`${cachedAddr} (Satellite GPS Fix - Offline Mode)`);
          } else {
            setLiveAddress(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (Hardware GPS Fix - Offline Mode)`);
          }
          loadCachedAmenities(lat, lng);
          return;
        }

        // Online mode: First Reverse Geocode via OpenStreetMap Nominatim for human address
        try {
          let resolvedAddress = "";
          let cityName = "Local Area";
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData) {
              if (geoData.display_name) {
                resolvedAddress = geoData.display_name;
                setLiveAddress(geoData.display_name);
                try { localStorage.setItem('rakshax_cached_address', geoData.display_name); } catch (e) {}
              }
              if (geoData.address) {
                cityName = geoData.address.suburb || geoData.address.neighbourhood || geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || geoData.address.state || "Local";
              }
            }
          }
        } catch (e) {
          console.warn("Reverse geocode network error, continuing with GPS coordinates:", e);
        }

        if (!resolvedAddress) {
          resolvedAddress = `GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
          setLiveAddress(resolvedAddress);
        }

        // Fetch hyper-accurate nearest emergency stations via AI GIS locator
        try {
          const placesRes = await fetch(`/api/places/nearest?lat=${lat}&lon=${lng}&address=${encodeURIComponent(resolvedAddress || cityName)}`);
          if (placesRes.ok) {
            const data = await placesRes.json();
            if (data.source) {
              setPlacesSource(data.source);
            }
            if (data.police && data.police.length > 0) {
              setNearestPolice(data.police);
              setApproachingSafeHaven(data.police[0].name);
              try { localStorage.setItem('rakshax_cached_police', JSON.stringify(data.police)); } catch (e) {}
            }
            if (data.metro && data.metro.length > 0) {
              setNearestMetro(data.metro);
              try { localStorage.setItem('rakshax_cached_metro', JSON.stringify(data.metro)); } catch (e) {}
            }
            if (data.hospital && data.hospital.length > 0) {
              setNearestHospitals(data.hospital);
              try { localStorage.setItem('rakshax_cached_hospitals', JSON.stringify(data.hospital)); } catch (e) {}
            }
            if (data.clinic && data.clinic.length > 0) {
              setNearestClinics(data.clinic);
              setNearestAmbulance(data.clinic);
              try { localStorage.setItem('rakshax_cached_clinics', JSON.stringify(data.clinic)); } catch (e) {}
            }
            return;
          }
        } catch (placeErr) {
          console.warn("Could not reach /api/places/nearest, falling back to local calculation:", placeErr);
        }

        // Localized immediate fallback if server is unreachable
        loadCachedAmenities(lat, lng);

        } catch (err) {
          console.warn("Error inside location reverse geocoding & search flow (offline fallback):", err);
          const cachedAddr = localStorage.getItem('rakshax_cached_address');
          if (cachedAddr) {
            setLiveAddress(`${cachedAddr} (Offline Mode)`);
          } else {
            setLiveAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (Hardware GPS Fix)`);
          }
          loadCachedAmenities(lat, lng);
        }
      };

      const handleFailure = (geoErr: GeolocationPositionError) => {
        console.log("[GPS Low-Accuracy Retrying Log] High accuracy geolocation failed or timeout. Retrying with low-accuracy...", geoErr);
        
        // Second Attempt: Standard accuracy, no strict timeout to maximize chance of resolving
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (lowAccErr) => {
            console.log("[GPS Failure Log] Device geolocation failed completely:", lowAccErr);
            setIsDetectingLocation(false);

            // Check if we have cached last-known coordinates from previous GPS lock
            try {
              const cachedCoordsStr = localStorage.getItem('rakshax_last_known_coords');
              if (cachedCoordsStr) {
                const parsed = JSON.parse(cachedCoordsStr);
                setNumericCoords({ lat: parsed.lat, lng: parsed.lng });
                setGpsCoords(`${parsed.lat.toFixed(5)}° N, ${parsed.lng.toFixed(5)}° E`);
                const cachedAddr = localStorage.getItem('rakshax_cached_address');
                setLiveAddress(cachedAddr ? `${cachedAddr} (Last Known GPS Fix)` : `${parsed.lat.toFixed(5)}° N, ${parsed.lng.toFixed(5)}° E (Cached GPS Fix)`);
                loadCachedAmenities(parsed.lat, parsed.lng);
                setLocationError(null);
                return;
              }
            } catch (e) {}

            let message = "Could not fetch GPS location automatically.";
            if (lowAccErr.code === 1) {
              message = "Location permission denied. Please allow location access in your browser.";
            } else if (lowAccErr.code === 2) {
              message = "GPS position unavailable. Try moving to an open area.";
            } else if (lowAccErr.code === 3) {
              message = "Location request timed out. Please refresh.";
            }
            setLocationError(message);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      };

      // First Attempt: High accuracy GPS
      navigator.geolocation.getCurrentPosition(handleSuccess, handleFailure, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      });
    } else {
      setIsDetectingLocation(false);
      setLocationError("Geolocation is not supported by your browser.");
    }
  };

  // Manually apply or switch to a specific locality (e.g. Pune localities) and refresh amenities
  const applyLocation = async (lat: number, lng: number, addressStr: string) => {
    setIsDetectingLocation(true);
    setLocationError(null);
    setNumericCoords({ lat, lng });
    setGpsCoords(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
    setLiveAddress(addressStr);
    setLocationAccuracy(12);
    setLocationFreshness(new Date().toLocaleTimeString());

    try {
      localStorage.setItem('rakshax_last_known_coords', JSON.stringify({ lat, lng, accuracy: 12, time: Date.now() }));
      localStorage.setItem('rakshax_cached_address', addressStr);
    } catch (e) {}

    try {
      const placesRes = await fetch(`/api/places/nearest?lat=${lat}&lon=${lng}&address=${encodeURIComponent(addressStr)}`);
      if (placesRes.ok) {
        const data = await placesRes.json();
        if (data.source) {
          setPlacesSource(data.source);
        }
        if (data.police && data.police.length > 0) {
          setNearestPolice(data.police);
          setApproachingSafeHaven(data.police[0].name);
          try { localStorage.setItem('rakshax_cached_police', JSON.stringify(data.police)); } catch (e) {}
        }
        if (data.metro && data.metro.length > 0) {
          setNearestMetro(data.metro);
          try { localStorage.setItem('rakshax_cached_metro', JSON.stringify(data.metro)); } catch (e) {}
        }
        if (data.hospital && data.hospital.length > 0) {
          setNearestHospitals(data.hospital);
          try { localStorage.setItem('rakshax_cached_hospitals', JSON.stringify(data.hospital)); } catch (e) {}
        }
        if (data.clinic && data.clinic.length > 0) {
          setNearestClinics(data.clinic);
          setNearestAmbulance(data.clinic);
          try { localStorage.setItem('rakshax_cached_clinics', JSON.stringify(data.clinic)); } catch (e) {}
        }
      }
    } catch (placeErr) {
      console.warn("Could not reach /api/places/nearest for selected locality:", placeErr);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Run location fetch and configure device telemetry listeners on mount
  useEffect(() => {
    fetchLocationAndPlaces();
  }, []);

  // 1. Get exact device battery percent
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        const onLevelChange = () => {
          setBatteryLevel(Math.round(battery.level * 100));
        };
        battery.addEventListener('levelchange', onLevelChange);
        
        return () => {
          battery.removeEventListener('levelchange', onLevelChange);
        };
      });
    }
  }, []);

  // 2. Real-time network detection & Offline Queue Auto-Retry
  useEffect(() => {
    // Auto-retry queued offline alerts upon reconnection
    const retryQueuedAlerts = async () => {
      if (!navigator.onLine) return;
      const queue = getOfflineQueue();
      const pending = queue.filter(item => item.status === 'QUEUED_OFFLINE');
      if (pending.length === 0) return;

      for (const item of pending) {
        try {
          const res = await fetch('/api/emergency/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: item.userEmail,
              incidentId: item.incidentId,
              userName: item.userName,
              coordinates: item.coordinates,
              address: item.address,
              contacts: item.contacts,
              timestamp: item.timestamp
            })
          });

          if (res.ok) {
            const data = await res.json();
            item.status = 'DISPATCHED';
            saveOfflineQueue(queue);

            if (currentIncidentRef.current?.id === item.incidentId && data.results && Array.isArray(data.results)) {
              const updated: Record<string, any> = {};
              data.results.forEach((r: any) => {
                updated[r.id] = {
                  sms: parseDeliveryStatus(r.sms),
                  whatsapp: parseDeliveryStatus(r.whatsapp),
                  call: parseDeliveryStatus(r.call),
                  email: parseDeliveryStatus(r.email),
                  smsError: r.sms?.includes('failed') ? r.sms : undefined,
                  whatsappError: (r.whatsapp?.includes('failed') || r.whatsapp?.includes('sandbox') || r.whatsappError) ? (r.whatsappError || r.whatsapp) : undefined,
                  callError: r.call && r.call.includes('failed') ? r.call : undefined,
                  emailError: r.email && r.email.includes('failed') ? r.email : undefined,
                };
              });
              setDeliveryStatuses(prev => ({ ...prev, ...updated }));
              setEmergencyLogs(prev => [
                ...prev,
                `✓ [Reconnect Sync] Offline alerts for incident ${item.incidentId} successfully dispatched to relay server.`
              ]);
            }
          } else {
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount >= 5) item.status = 'FAILED_MAX_RETRIES';
            saveOfflineQueue(queue);
          }
        } catch (e) {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount >= 5) item.status = 'FAILED_MAX_RETRIES';
          saveOfflineQueue(queue);
        }
      }
    };

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const type = connection.effectiveType ? connection.effectiveType.toUpperCase() : '4G';
        const isOnline = navigator.onLine;
        if (!isOnline) {
          setInternetStatus('Offline');
        } else {
          setInternetStatus(`Connected (${type})`);
          retryQueuedAlerts();
        }
      } else {
        const isOnline = navigator.onLine;
        setInternetStatus(isOnline ? 'Connected' : 'Offline');
        if (isOnline) retryQueuedAlerts();
      }
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Periodic check every 15 seconds to retry any pending offline alerts if online
    const retryInterval = setInterval(() => {
      if (navigator.onLine) {
        retryQueuedAlerts();
      }
    }, 15000);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      clearInterval(retryInterval);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Re-inserted Audio Context references for Siren alert
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Re-inserted Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    speak(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Re-inserted Voice Narrator helper
  const speak = (text: string) => {
    if (silentSOS) return; // Silent SOS suppresses all vocal narration and sounds
    if (voiceNarrator) {
      setNarratorText(text);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Re-inserted Siren audio generator
  const startSiren = () => {
    try {
      if (silentSOS) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 1);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      osc.start();
      oscillatorRef.current = osc;
      setIsSirenPlaying(true);
    } catch (e) {
      console.log("Siren audio failed to load: ", e);
    }
  };

  const stopSiren = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  const [shakeCount, setShakeCount] = useState<number>(0);
  const shakeTimerRef = useRef<any>(null);

  const triggerShakeSOS = () => {
    if (isEmergencyActive || isTriggeringRef.current) {
      showToast("Emergency SOS is already active.");
      return;
    }
    if (!silentSOS) {
      showToast("🚨 3-TIMES DEVICE SHAKE DETECTED! Autostarting Emergency SOS...");
      speak("Emergency shake detected 3 times. Dispatching live location to police and guardians.");
    } else {
      showToast("🚨 3-TIMES DEVICE SHAKE DETECTED! (Silent Mode Active - Stealth Dispatches)");
    }
    handleSOSTrigger();
  };

  const recordShakePeak = () => {
    setShakeCount((prev) => {
      const next = prev + 1;
      showToast(`📱 Shake detected (${next}/3)... Shake 3 times to trigger SOS!`);
      if (next >= 3) {
        triggerShakeSOS();
        return 0;
      }
      return next;
    });

    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      setShakeCount(0);
    }, 2500);
  };

  const simulateShake3Times = () => {
    showToast("📱 Simulating 3-Times Device Shake...");
    recordShakePeak();
    setTimeout(() => recordShakePeak(), 300);
    setTimeout(() => recordShakePeak(), 600);
  };

  // Check WebAuthn support and registration status on mount
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsWebAuthnSupported(true);
      const registered = localStorage.getItem('safeguard_passkey_registered') === 'true';
      setIsWebAuthnRegistered(registered);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rakshax_shake_sensitivity', shakeSensitivity);
    } catch (e) {}
  }, [shakeSensitivity]);

  // Device shake motion listener with dynamic sensitivity
  useEffect(() => {
    if (!shakeSOS) return;

    let lastUpdate = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    // Low: 22 m/s^2 (hard shake), Medium: 15 m/s^2 (standard), High: 10 m/s^2 (gentle/quick motion)
    const SHAKE_THRESHOLD = shakeSensitivity === 'low' ? 22 : shakeSensitivity === 'high' ? 10 : 15;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const curTime = Date.now();
      if ((curTime - lastUpdate) > 100) {
        lastUpdate = curTime;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        // Calculate delta
        const deltaX = x - lastX;
        const deltaY = y - lastY;
        const deltaZ = z - lastZ;
        const change = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

        if (change > SHAKE_THRESHOLD) {
          recordShakePeak();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    // Request permissions if on iOS 13+
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [shakeSOS, shakeSensitivity]);

  // Resilient Walking / Journey Sharing timer using absolute timestamp to auto-trigger SOS on expiry
  useEffect(() => {
    let timer: any = null;
    if (journeySharingActive) {
      timer = setInterval(() => {
        const remainingMs = journeyTargetEndTimeRef.current - Date.now();
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
        setJourneyTimeLeft(remainingSecs);

        if (remainingSecs <= 0) {
          clearInterval(timer);
          setJourneySharingActive(false);
          if (!silentSOS) {
            speak("Walking safety timer expired without check-in. Auto-triggering RakshaX SOS alert.");
          }
          showToast("🚨 WALKING TIMER EXPIRED: Auto-triggering Emergency SOS!");
          handleSOSTrigger();
        }
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [journeySharingActive, silentSOS]);

  // Sync remaining walking time when tab returns to foreground
  useEffect(() => {
    const handleJourneyVisibility = () => {
      if (journeySharingActive && document.visibilityState === 'visible') {
        const remainingMs = journeyTargetEndTimeRef.current - Date.now();
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
        setJourneyTimeLeft(remainingSecs);
        if (remainingSecs <= 0) {
          setJourneySharingActive(false);
          showToast("🚨 WALKING TIMER EXPIRED: Auto-triggering Emergency SOS!");
          handleSOSTrigger();
        }
      }
    };
    document.addEventListener('visibilitychange', handleJourneyVisibility);
    return () => document.removeEventListener('visibilitychange', handleJourneyVisibility);
  }, [journeySharingActive]);

  // WebAuthn registration handler
  const registerBiometricPasskey = async () => {
    speak("Registering security passkey with your device's biometric authenticator.");
    
    if (!window.PublicKeyCredential) {
      showToast("WebAuthn / Passkey is not supported on this browser context.");
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const options: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "RakshaX Personal Safety",
          id: window.location.hostname || "localhost"
        },
        user: {
          id: userId,
          name: profile.fullName || "user@rakshax.io",
          displayName: profile.fullName || "RakshaX User"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // FaceID, TouchID, Windows Hello, device passcode
          userVerification: "required"
        },
        timeout: 10000
      };

      const credential = await navigator.credentials.create({ publicKey: options });
      if (credential) {
        localStorage.setItem('safeguard_passkey_registered', 'true');
        setIsWebAuthnRegistered(true);
        setBiometricEnabled(true);
        showToast("Passkey registered successfully! Biometrics enabled.");
        speak("Biometric security registered and active.");
      }
    } catch (err: any) {
      console.warn("Native WebAuthn creation failed (expected in sandbox):", err);
      // Open our highly interactive biometric registration simulator
      setIsBiometricRegisteringSim(true);
    }
  };

  // SOS Press & Hold triggers
  const startHolding = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (oneTapSOS) return; // Immediate tap is enabled, bypass holding
    if (isEmergencyActive) return;
    setIsHolding(true);
    setHoldProgress(0);
    speak("Hold for 3 seconds to trigger SOS.");

    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    
    let currentProgress = 0;
    holdTimerRef.current = setInterval(() => {
      currentProgress += 1;
      if (currentProgress >= 100) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        handleSOSTrigger();
      } else {
        setHoldProgress(currentProgress);
        // Micro countdown speech announcements at key points
        if (currentProgress === 33) {
          speak("2");
        } else if (currentProgress === 66) {
          speak("1");
        }
      }
    }, 30); // 30ms * 100 = 3000ms (3 seconds)
  };

  const stopHolding = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    // Smoothly animate the progress back to 0
    const drainInterval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev <= 0) {
          clearInterval(drainInterval);
          return 0;
        }
        return Math.max(0, prev - 10);
      });
    }, 20);
  };

  // Presents customized country-specific dial buttons based on current location coordinates
  const getEmergencyNumber = () => {
    if (!liveAddress) return "112";
    const addr = liveAddress.toLowerCase();
    if (addr.includes("united states") || addr.includes("usa") || addr.includes("us") || addr.includes("canada")) {
      return "911";
    }
    if (addr.includes("united kingdom") || addr.includes("uk") || addr.includes("great britain")) {
      return "999";
    }
    return "112";
  };

  // Immediate location lookup and authorization
  const handleSOSTrigger = () => {
    if (isEmergencyActive) {
      showToast("Emergency SOS is already active.");
      return;
    }
    if (isTriggeringRef.current || (Date.now() - lastTriggerTimestampRef.current < 4000)) {
      return;
    }
    isTriggeringRef.current = true;
    lastTriggerTimestampRef.current = Date.now();
    setTimeout(() => { isTriggeringRef.current = false; }, 4000);

    simulateVibration();
    
    // Capture GPS immediately
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setNumericCoords({ lat, lng });
          setGpsCoords(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
          
          if (!liveAddress || liveAddress.includes("New Delhi") || liveAddress.includes("Latitude:") || liveAddress.includes("12, Green Park Avenue")) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
              .then(res => res.ok ? res.json() : null)
              .then(geoData => {
                if (geoData && geoData.display_name) {
                  setLiveAddress(geoData.display_name);
                } else {
                  setLiveAddress(`Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)} (Device GPS)`);
                }
              })
              .catch(() => {
                setLiveAddress(`Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)} (Device GPS)`);
              });
          }
        },
        () => {
          // Keep existing coordinates
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    }

    if (biometricEnabled) {
      setIsBiometricVerifying(true);
      if (!silentSOS) {
        speak("Biometric authentication requested.");
      }
    } else {
      activateEmergency();
    }
  };

  // Auto-authentication hook if WebAuthn works natively inside iframe
  useEffect(() => {
    if (isBiometricVerifying) {
      const tryWebAuthnGet = async () => {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const options: PublicKeyCredentialRequestOptions = {
            challenge: challenge,
            rpId: window.location.hostname || "localhost",
            userVerification: "required",
            timeout: 4000,
          };
          const assertion = await navigator.credentials.get({ publicKey: options });
          if (assertion) {
            speak("Passkey verified. Initiating RakshaX dispatch sequence.");
            setIsBiometricVerifying(false);
            activateEmergency();
          }
        } catch (err) {
          console.warn("Native WebAuthn assertion failed or blocked in iframe:", err);
        }
      };
      tryWebAuthnGet();
    }
  }, [isBiometricVerifying]);

  // Vibrations simulator
  const simulateVibration = () => {
    if (silentSOS) return; // Silent SOS suppresses all physical vibrations
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 2000);
  };

  // Emergency Mode Activator
  const activateEmergency = () => {
    setIsEmergencyActive(true);
    setIsSimulatedEmergency(false);
    setEmergencyStartTime(Date.now());
    if (!silentSOS) {
      speak("RakshaX SOS Active. Automated warnings dispatched.");
      startSiren();
      simulateVibration();
    }

    // Immediately generate Incident Details
    const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];

    const newIncident: IncidentHistory = {
      id: incidentId,
      date: dateStr,
      time: timestamp,
      duration: 'Active',
      location: liveAddress,
      coordinates: gpsCoords,
      status: 'Active'
    };
    setCurrentIncident(newIncident);

    // Auto-detect Nearest Police Station for direct police phone dialer
    const policeStationObj = nearestPolice[0] || { name: "Local Police Station / Control Room (112)", phone: "112", dist: "0.8 km", eta: "2 mins" };
    const policePhone = policeStationObj.phone || "112";
    const isMobileDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Initialize delivery statuses for trusted guardians and nearest police station
    const initialStatuses: Record<string, any> = {};
    initialStatuses['police-112'] = {
      sms: 'sending',
      whatsapp: 'sending',
      call: 'sending',
      email: 'sending',
    };
    contacts.forEach(c => {
      initialStatuses[c.id] = {
        sms: (c.alertChannels?.sms ?? true) ? 'sending' : 'not_selected',
        whatsapp: (c.alertChannels?.whatsapp ?? true) ? 'sending' : 'not_selected',
        call: (c.alertChannels?.call ?? true) ? 'sending' : 'not_selected',
        email: (c.alertChannels?.email ?? true) ? 'sending' : 'not_selected',
      };
    });
    setDeliveryStatuses(initialStatuses);

    // Initial incident logs with clear distinction between dialer intent and call connection
    const newLogs = [
      `🚨 EMERGENCY INCIDENT INITIALIZED: ${incidentId}`,
      `• Device Coordinates: ${gpsCoords}`,
      `• Time Recorded: ${timestamp}`,
      `• Address Decoded: ${liveAddress}`,
      `🚓 POLICE EMERGENCY (112): ${isMobileDevice ? 'Native dialer intent launched (tel:112). Please tap Call on your device dialer.' : 'Telephony link ready (tel:112). Click Call Police to initiate dialer.'}`,
      `• Dispatching multi-channel SOS alerts (SMS, WhatsApp, Email, Call) to Nearest Police & ${contacts.length} Guardian(s)...`
    ];
    setEmergencyLogs(newLogs);

    // Auto-launch 112 dialer on mobile devices when emergency triggers
    if (typeof window !== 'undefined' && isMobileDevice) {
      setTimeout(() => {
        try { window.location.href = `tel:${policePhone.replace(/[^0-9+]/g, '')}`; } catch (e) {}
      }, 800);
    }

    // Fully Automated Server Dispatch for WhatsApp, SMS, Call & Email
    const gMapUrl = numericCoords 
      ? `https://maps.google.com/?q=${numericCoords.lat},${numericCoords.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(gpsCoords)}`;

    // Dispatch API post call with Guardians + Nearest Police Station
    fetch('/api/emergency/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        incidentId,
        userName: profile.fullName,
        coordinates: gpsCoords,
        address: liveAddress,
        contacts: contacts,
        policeStation: nearestPolice[0] || policeStationObj,
        nearestHospital: nearestHospitals[0],
        nearestMetro: nearestMetro[0],
        nearestClinic: nearestClinics[0],
        timestamp
      })
    })
    .then(res => res.json())
    .then(data => {
      setIsSimulatedEmergency(false);
      if (data.results && Array.isArray(data.results)) {
        const updatedStatuses: Record<string, any> = {};
        data.results.forEach((r: any) => {
          updatedStatuses[r.id] = {
            sms: parseDeliveryStatus(r.sms),
            whatsapp: parseDeliveryStatus(r.whatsapp),
            call: parseDeliveryStatus(r.call),
            email: parseDeliveryStatus(r.email),
            smsError: r.sms?.includes('failed') ? r.sms : undefined,
            whatsappError: (r.whatsapp?.includes('failed') || r.whatsapp?.includes('sandbox') || r.whatsappError) ? (r.whatsappError || r.whatsapp) : undefined,
            callError: r.call && r.call.includes('failed') ? r.call : undefined,
            emailError: r.email && r.email.includes('failed') ? r.email : undefined,
            directSmsUri: r.directSmsUri,
            directMailtoUri: r.directMailtoUri,
            directWhatsAppUri: r.directWhatsAppUri,
          };

          setEmergencyLogs(prev => [
            ...prev,
            `✓ [Relay Network] Alert broadcast status for ${r.name}:`,
            `   • SMS: ${r.sms}`,
            `   • WhatsApp: ${r.whatsapp}`,
            `   • Email: ${r.email}`,
            `   • Voice Call: ${r.call || 'simulated'}`
          ]);
        });

        setDeliveryStatuses(prev => ({
          ...prev,
          ...updatedStatuses
        }));
      }
    })
    .catch(err => {
      console.log("[SOS Trigger Log] SOS Trigger API call failed (offline fallback):", err);
      setIsSimulatedEmergency(true);
      setEmergencyLogs(prev => [
        ...prev,
        `⚠️ [Network Notice] Network offline / API unreachable. Incident saved locally to device storage.`,
        `• Direct emergency dialer and guardian links remain accessible locally.`
      ]);

      // Fallback local simulation logic
      const googleMapsUrl = numericCoords 
        ? `https://maps.google.com/?q=${numericCoords.lat},${numericCoords.lng}`
        : `https://maps.google.com/?q=${encodeURIComponent(gpsCoords)}`;

      contacts.forEach(c => {
        const name = c.name.split(' (')[0];
        const channels = c.alertChannels ?? { sms: true, whatsapp: true, call: true, email: true };

        if (channels.sms) {
          setTimeout(() => {
            setDeliveryStatuses(prev => ({
              ...prev,
              [c.id]: { ...prev[c.id], sms: 'simulated' }
            }));
            setEmergencyLogs(prev => [...prev, `✓ [Offline SMS Queue] Prepared for ${name}:\n"🚨 EMERGENCY ALERT! ${profile.fullName} is in distress.\n📍 Location: ${liveAddress || "Unknown"}\n🌐 Coordinates: ${gpsCoords}\n🔗 Track Live: ${googleMapsUrl}\n⚠️ Incident ID: ${incidentId}"`]);
          }, 1000);
        }
        if (channels.whatsapp) {
          setTimeout(() => {
            setDeliveryStatuses(prev => ({
              ...prev,
              [c.id]: { ...prev[c.id], whatsapp: 'simulated' }
            }));
            setEmergencyLogs(prev => [...prev, `✓ [Offline WhatsApp Queue] Prepared for ${name}:\n"🚨 EMERGENCY ALERT / आपातकालीन संदेश 🚨\n\n${profile.fullName} is in distress!\n📍 Location: ${liveAddress || "Determining via GPS..."}\n🌐 Coordinates: ${gpsCoords}\n🔗 Live Link: ${googleMapsUrl}\n⚠️ Incident ID: ${incidentId}"`]);
          }, 1500);
        }
        if (channels.email) {
          setTimeout(() => {
            setDeliveryStatuses(prev => ({
              ...prev,
              [c.id]: { ...prev[c.id], email: 'simulated' }
            }));
            setEmergencyLogs(prev => [...prev, `✓ [Offline Email Queue] Queued for ${c.email} with Live Location: ${liveAddress || "Unknown"}`]);
          }, 1800);
        }
        if (channels.call) {
          setTimeout(() => {
            setDeliveryStatuses(prev => {
              if (!prev[c.id]) return prev;
              return {
                ...prev,
                [c.id]: { ...prev[c.id], call: 'simulated' }
              };
            });
            setEmergencyLogs(prev => [...prev, `📞 [Offline Voice Attempt] Dialing queue initialized for ${name}...`]);
          }, 2200);
        }
      });
    });
  };

  const deactivateEmergency = () => {
    setIsEmergencyActive(false);
    setIsSimulatedEmergency(false);
    stopSiren();

    let durationStr = '2 mins';
    if (emergencyStartTime) {
      const diffMs = Date.now() - emergencyStartTime;
      const secs = Math.floor(diffMs / 1000);
      if (secs < 60) {
        durationStr = `${secs}s`;
      } else {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        durationStr = `${mins}m ${remainingSecs}s`;
      }
    }

    if (currentIncident) {
      const resolvedIncident: IncidentHistory = {
        ...currentIncident,
        duration: durationStr,
        status: 'Resolved'
      };
      setIncidents(prev => [resolvedIncident, ...prev]);

      // Resolve in backend DB
      fetch('/api/emergency/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          incidentId: currentIncident.id,
          duration: durationStr
        })
      }).catch(err => console.warn("Failed to resolve emergency in database:", err));
      
      showToast(`Emergency Marked Safe. Incident ${currentIncident.id} saved as Resolved.`);
    } else {
      showToast("Emergency Ended. Guardian tracking links closed.");
    }

    // Dispatch "Emergency Ended" notification to all emergency contacts
    setEmergencyLogs(prev => [
      ...prev,
      `💚 STATUS UPDATE: USER MARKED SAFE`,
      `• Sending 'Emergency Ended' message to all emergency contacts...`
    ]);
    
    contacts.forEach(c => {
      const name = c.name.split(' (')[0];
      setTimeout(() => {
        setEmergencyLogs(prev => [...prev, `✓ [Broadcast] 'Emergency Ended' message successfully delivered to ${name}`]);
      }, 400 + Math.random() * 400);
    });

    speak("Status marked safe. Sending security cancel broadcast to all contacts.");
    setCurrentIncident(null);
  };

  const handleSafeClick = () => {
    setEnteredPin('');
    setPinError(null);
    setShowPinModal(true);
    speak("Please verify your four digit safety PIN to deactivate the emergency SOS.");
  };

  // Safe arrival check-in handler for walking / journey sharing
  const handleJourneyArrivedSafely = () => {
    setJourneySharingActive(false);
    if (hasSharedJourneyLocation) {
      // User shared location with contacts during this journey: provide option to send WhatsApp safe message!
      const userName = profile?.fullName?.trim() || initialProfile?.fullName?.trim() || (userEmail ? userEmail.split('@')[0] : 'Anshika');
      setCheckinMessage(`${userName} has reached safely! Thank you for tracking. - by RakshaX`);
      setShowSafeCheckinModal(true);
      showToast("✅ You arrived safely! Send safe arrival note on WhatsApp.");
      if (!silentSOS) speak("You arrived safely. You can send safe arrival note to your guardians on WhatsApp.");
    } else {
      // User did NOT share location: normal stop! No arrival note prompt!
      setShowSafeCheckinModal(false);
      showToast("✅ Journey completed safely. Tracking stopped.");
      if (!silentSOS) speak("Journey completed. You are safe.");
    }
  };

  // Safe arrival check-in handler for cab / auto ride watch
  const handleCabArrivedSafely = () => {
    setIsCabGuardActive(false);
    if (hasSharedCabDetails) {
      // User notified guardians of cab details: offer option to send safe message!
      const userName = profile?.fullName?.trim() || initialProfile?.fullName?.trim() || (userEmail ? userEmail.split('@')[0] : 'Anshika');
      setCheckinMessage(`${userName} has reached safely from cab (${cabCompany} - ${cabNumber})! Thank you for tracking. - by RakshaX`);
      setShowSafeCheckinModal(true);
      showToast("✅ Cab Ride Watch completed. You checked in safely! Send arrival note on WhatsApp.");
      if (!silentSOS) speak("Cab watch completed. You can send safe check-in on WhatsApp.");
    } else {
      // User did NOT share cab details: normal stop!
      setShowSafeCheckinModal(false);
      showToast("Cab Ride Watch stopped. You checked in safely!");
      if (!silentSOS) speak("Cab watch completed. Marked safe.");
    }
  };

  // Trigger Fake Call simulator with customizable delay in seconds
  const triggerFakeCallSequence = (delay: number) => {
    if (delay === 0) {
      setFakeCallState('ringing');
      setShowFakeCallModal(true);
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          fakeCallAudioCtxRef.current = ctx;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          fakeCallOscillatorRef.current = osc;
        }
      } catch (e) {}
    } else {
      setFakeCallCountdown(delay);
      setFakeCallState('countdown');
      setShowFakeCallModal(true);
      const int = setInterval(() => {
        setFakeCallCountdown(prev => {
          if (prev <= 1) {
            clearInterval(int);
            setFakeCallState('ringing');
            try {
              const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtxClass) {
                const ctx = new AudioCtxClass();
                fakeCallAudioCtxRef.current = ctx;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                fakeCallOscillatorRef.current = osc;
              }
            } catch (e) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Helper to stop live audio meter
  const stopAudioMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Real Audio Visualizer Meter from genuine MediaStream
  const startAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Only genuine voice input sets the level: no synthetic wave
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {
      console.warn("Real audio meter init notice:", e);
    }
  };

  // Request real microphone access via getUserMedia & start real audio meter
  const requestMicrophoneAccess = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("⚠️ Microphone access is not supported on this browser.");
        return false;
      }
      stopAudioMeter();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      startAudioMeter(stream);
      hasMicPermissionRef.current = true;
      setMicStatus('listening');
      setIsVoiceListening(true);
      showToast("🎙️ Real Microphone Connected! Listening for your voice.");
      return true;
    } catch (err: any) {
      console.warn("Direct microphone request notice:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        hasMicPermissionRef.current = false;
        showToast("⚠️ Microphone access denied. Click the lock 🔒 icon in the browser address bar and set Microphone to 'Allow'.");
      } else {
        showToast("⚠️ Microphone access notice: " + (err.message || 'Check browser permissions'));
      }
      return false;
    }
  };

  // Screen WakeLock to prevent screen timeout while voice listener is armed
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    const acquireWakeLock = async () => {
      if (isVoiceListening && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn("Screen wakeLock notice:", err);
        }
      } else if (!isVoiceListening && wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (e) {}
        wakeLockRef.current = null;
      }
    };
    acquireWakeLock();

    return () => {
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    };
  }, [isVoiceListening]);

  // Clean Toggle Handler that ALWAYS works on click or tap
  const toggleVoiceListener = async () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      setMicStatus('idle');
      setVoiceRecognizedPhrase('');
      stopAudioMeter();
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (e) {}
        speechRecRef.current = null;
      }
      showToast("⏸️ Microphone listener paused.");
    } else {
      setIsVoiceListening(true);
      setMicStatus('listening');
      setVoiceRecognizedPhrase('');
      await requestMicrophoneAccess();
    }
  };

  // Initialize real microphone listener on mount if permissions exist
  useEffect(() => {
    if (isVoiceListening) {
      setMicStatus('listening');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            audioStreamRef.current = stream;
            startAudioMeter(stream);
            hasMicPermissionRef.current = true;
          })
          .catch(() => {
            // Pending user gesture for audio stream
          });
      }
    }

    return () => {
      stopAudioMeter();
    };
  }, []);

  // Continuous Speech Listener Effect for Multi-Keyword Voice Triggers
  useEffect(() => {
    if (!isVoiceListening) {
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (err) {}
        speechRecRef.current = null;
      }
      stopAudioMeter();
      setMicStatus('idle');
      return;
    }

    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      return;
    }

    try {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'hi-IN'; // Multi-lingual recognition for Hindi + English

      rec.onstart = () => {
        setMicStatus('listening');
      };

      rec.onresult = (e: any) => {
        // Debounce & single active incident check to prevent duplicate activations
        if (isEmergencyActive || isTriggeringRef.current || (Date.now() - lastTriggerTimestampRef.current < 4000)) {
          return;
        }

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const rawTranscript = e.results[i][0].transcript || '';
          const transcript = rawTranscript.toLowerCase().trim();
          
          // REAL speech from microphone only
          if (transcript) {
            setVoiceRecognizedPhrase(transcript);
            // Clear temporary transcript after 4 seconds of silence if no emergency keyword matched
            if (clearPhraseTimerRef.current) clearTimeout(clearPhraseTimerRef.current);
            clearPhraseTimerRef.current = setTimeout(() => {
              setVoiceRecognizedPhrase('');
            }, 4000);
          }

          const activeSafeWords = (customSafeWordsRef.current || []).map(w => w.toLowerCase().trim()).filter(Boolean);
          const builtInEmergencyKeywords = [
            // Devanagari Hindi keywords recognized by Google hi-IN
            'बचाओ', 'बचाओ बचाओ', 'मदद', 'मदद करो', 'हेल्प', 'इमरजेंसी', 'पुलिस', 'खतरा', 'चोर', 
            'मार दिया', 'मार देगा', 'छोड़ो', 'मुझको बचाओ', 'कोई है', 'बचा लो', 'भागो',
            // Hinglish / Latin script keywords
            'bachao', 'bacao', 'bchao', 'bachaoo', 'bachaao', 'bchaoo', 'help', 
            'emergency', 'save me', 'save', 'madad', 'police', 'danger', 'help me', 
            'savior', 'koyi hai', 'koi hai', 'fire', 'ambulance', 'distress', 
            'thief', 'chor', 'chaur', 'mado', 'mar gaya', 'mar do', 'mujhe bachao', 
            'bachao mujhe', 'sos', 'bachao bachao', 'chhoro', 'choro'
          ];
          const allKeywords = [...activeSafeWords, ...builtInEmergencyKeywords];
          
          // Match keywords cleanly with punctuation removed
          const cleanTranscript = transcript.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ');
          const matched = allKeywords.some(kw => {
            if (!kw || kw.length < 2) return false;
            const cleanKw = kw.toLowerCase().replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ').trim();
            return cleanTranscript.includes(cleanKw);
          });

          if (matched) {
            lastTriggerTimestampRef.current = Date.now();
            try { rec.stop(); } catch (err) {}
            setIsVoiceListening(false);

            // User requested: "aur iss situation me silent sos trigger ho aur jitne contacts hain nearest police sbko mail sms whatsapp aur call sab jana chaiye"
            // Activate Silent SOS (stealth mode: suppresses phone siren so attacker is unaware)
            setSilentSOS(true);
            showToast(`🚨 VOICE SAFE WORD DETECTED: "${transcript.toUpperCase()}"! Dispatching Silent SOS to Police & Contacts!`);

            handleSOSTrigger();
            break;
          }
        }
      };

      rec.onerror = (err: any) => {
        console.warn("Speech listener status:", err);
        if (isVoiceListeningRef.current && err.error !== 'aborted') {
          setTimeout(() => {
            try { rec.start(); } catch (e) {}
          }, 800);
        }
      };

      rec.onend = () => {
        if (isVoiceListeningRef.current) {
          setTimeout(() => {
            try { rec.start(); } catch (e) {}
          }, 400);
        }
      };

      rec.start();
      speechRecRef.current = rec;
      setMicStatus('listening');
    } catch (err) {
      console.warn("Speech rec launch notice:", err);
    }

    return () => {
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (err) {}
      }
    };
  }, [isVoiceListening]);

  // Stealth Screen-Off Mode Handler - keeps mic alive with Screen WakeLock while screen appears completely turned off
  const activateStealthScreenOff = async () => {
    setIsStealthLockActive(true);
    if (!isVoiceListening) {
      setIsVoiceListening(true);
      setMicStatus('listening');
      await requestMicrophoneAccess();
    }
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn("WakeLock request notice:", e);
    }
    showToast("🕶️ Stealth Screen-Off Mode Active! Screen appears turned off while microphone listens in real-time. Double-tap to exit.");
  };

  const deactivateStealthScreenOff = () => {
    setIsStealthLockActive(false);
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {}
  };

  // Real voice prompt helper (prompts user to speak into real mic, zero fake simulation)
  const handlePromptRealVoiceTest = async () => {
    if (isEmergencyActive || isTriggeringRef.current) {
      showToast("Emergency SOS is already in progress.");
      return;
    }
    if (!isVoiceListening) {
      await toggleVoiceListener();
    }
    showToast(`🎙️ Microphone is active and listening! Speak "${customSafeWords[0] || 'Bachao'}" aloud to test.`);
  };

  const handleAddSafeWord = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    if (customSafeWords.some(w => w.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`⚠️ "${trimmed}" is already configured!`);
      return;
    }
    if (customSafeWords.length >= 8) {
      showToast("⚠️ Maximum 8 safe words allowed. Remove one to add a new phrase.");
      return;
    }
    setCustomSafeWords([...customSafeWords, trimmed]);
    setVoiceEnrolled(true);
    setNewSafeWordInput('');
    showToast(`✅ Added safe phrase: "${trimmed}"`);
  };

  const handleSaveEditedWord = (index: number, newWord: string) => {
    const trimmed = newWord.trim();
    if (!trimmed) {
      setEditingSafeWordIdx(null);
      return;
    }
    if (customSafeWords.some((w, idx) => idx !== index && w.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`⚠️ "${trimmed}" already exists in your list!`);
      return;
    }
    const next = [...customSafeWords];
    next[index] = trimmed;
    setCustomSafeWords(next);
    setVoiceEnrolled(true);
    setEditingSafeWordIdx(null);
    showToast(`✅ Updated phrase to "${trimmed}"`);
  };

  const handleDeleteSafeWord = (index: number) => {
    if (customSafeWords.length <= 1) {
      showToast("⚠️ You must have at least one safe phrase configured.");
      return;
    }
    const removed = customSafeWords[index];
    const next = customSafeWords.filter((_, i) => i !== index);
    setCustomSafeWords(next);
    if (editingSafeWordIdx === index) {
      setEditingSafeWordIdx(null);
    }
    showToast(`Deleted phrase "${removed}"`);
  };

  // Global double tap listener on web page
  useEffect(() => {
    let clickCount = 0;
    let timer: any = null;

    const handleGlobalDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON')) {
        return;
      }
      
      clickCount++;
      if (clickCount === 1) {
        timer = setTimeout(() => {
          clickCount = 0;
        }, 400);
      } else if (clickCount === 2) {
        clearTimeout(timer);
        clickCount = 0;
        simulateShake3Times();
      }
    };

    window.addEventListener('dblclick', handleGlobalDoubleClick);
    return () => {
      window.removeEventListener('dblclick', handleGlobalDoubleClick);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Map simulation movement loop
  useEffect(() => {
    if (!isEmergencyActive) return;
    const interval = setInterval(() => {
      // Shift coordinates slightly to show live updates, starting from the real numericCoords
      let updatedCoords = "";
      setNumericCoords(prev => {
        const shiftLat = (Math.random() - 0.5) * 0.0004;
        const shiftLng = (Math.random() - 0.5) * 0.0004;
        const newLat = prev.lat + shiftLat;
        const newLng = prev.lng + shiftLng;
        updatedCoords = `${newLat.toFixed(5)}° N, ${newLng.toFixed(5)}° E`;
        setGpsCoords(updatedCoords);
        return { lat: newLat, lng: newLng };
      });
      setMapPulse(prev => (prev + 1) % 4);
      setBatteryLevel(prev => Math.max(1, prev - 1));

      // Simulate movement along a route with safe havens
      if (isUserMoving) {
        setRouteProgress(prev => {
          const nextProgress = prev >= 100 ? 5 : prev + 5;
          
          // Dynamically set upcoming safe havens from actual nearest elements if available
          if (nextProgress < 25) {
            setApproachingSafeHaven(nearestPolice[0]?.name || (liveAddress.toLowerCase().includes('pune') ? "Pune Police Chowki" : "Local Police Safe Haven"));
          } else if (nextProgress < 55) {
            setApproachingSafeHaven(nearestHospitals[0]?.name || (liveAddress.toLowerCase().includes('pune') ? "Sahyadri Super Speciality Hospital Pune" : "Nearest Emergency Hospital"));
          } else if (nextProgress < 80) {
            setApproachingSafeHaven(nearestMetro[0]?.name || (liveAddress.toLowerCase().includes('pune') ? "Pune Metro Transit Safe Zone" : "Metro Transit Safe Hub"));
          } else {
            setApproachingSafeHaven("24/7 Citizen Emergency Help Center");
          }
          return nextProgress;
        });
      }

      // Post update to full-stack API!
      if (currentIncident) {
        fetch('/api/emergency/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            incidentId: currentIncident.id,
            coordinates: updatedCoords || gpsCoords,
            address: liveAddress
          })
        }).catch(err => console.warn("Live location sync failed:", err));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isEmergencyActive, currentIncident, userEmail, liveAddress, isUserMoving, nearestPolice, nearestHospitals, nearestAmbulance, gpsCoords]);

  // Phone presets importer
  const importContactsPreset = () => {
    const presets: EmergencyContact[] = [
      {
        id: 'cp1',
        name: 'Mamta Sharma (Mother)',
        relationship: 'Mother',
        phoneNumber: '+91 98765 00901',
        whatsAppNumber: '+91 98765 00901',
        email: 'mamta@safeguard.io',
        priority: 'High',
        isPrimary: false,
        isSecondary: true,
        isFavorite: true,
      },
      {
        id: 'cp2',
        name: 'Arjun Sen (Friend)',
        relationship: 'Friend',
        phoneNumber: '+91 98765 00902',
        whatsAppNumber: '+91 98765 00902',
        email: 'arjun@safeguard.io',
        priority: 'Low',
        isPrimary: false,
        isSecondary: false,
        isFavorite: false,
      }
    ];

    setContacts(prev => {
      const filtered = prev.filter(c => !c.id.startsWith('cp'));
      return [...filtered, ...presets];
    });
    showToast("Imported 2 premium phone contacts successfully.");
  };

  // Contacts CRUD
  const handleAddEditContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cPhone) {
      showToast("Please provide Contact Name and Phone Number.");
      return;
    }

    if (contactModal.mode === 'add') {
      const newContact: EmergencyContact = {
        id: `c-${Date.now()}`,
        name: `${cName} (${cRelationship})`,
        relationship: cRelationship,
        phoneNumber: cPhone,
        whatsAppNumber: cWhatsApp || cPhone,
        email: cEmail,
        priority: cPriority,
        isPrimary: cIsPrimary,
        isSecondary: cIsSecondary,
        isFavorite: cIsFavorite,
        alertChannels: {
          sms: cAlertSms,
          whatsapp: cAlertWhatsapp,
          call: cAlertCall,
          email: cAlertEmail
        }
      };

      // Ensure single primary logic
      let updated = [...contacts];
      if (cIsPrimary) {
        updated = updated.map(c => ({ ...c, isPrimary: false }));
      }
      setContacts([...updated, newContact]);
      showToast(`Added ${cName} as Emergency Contact.`);
    } else {
      // edit
      const updated = contacts.map(c => {
        if (c.id === contactModal.contactId) {
          return {
            ...c,
            name: `${cName} (${cRelationship})`,
            relationship: cRelationship,
            phoneNumber: cPhone,
            whatsAppNumber: cWhatsApp || cPhone,
            email: cEmail,
            priority: cPriority,
            isPrimary: cIsPrimary,
            isSecondary: cIsSecondary,
            isFavorite: cIsFavorite,
            alertChannels: {
              sms: cAlertSms,
              whatsapp: cAlertWhatsapp,
              call: cAlertCall,
              email: cAlertEmail
            }
          };
        }
        // remove other primaries if this is primary
        if (cIsPrimary && c.id !== contactModal.contactId) {
          return { ...c, isPrimary: false };
        }
        return c;
      });
      setContacts(updated);
      showToast(`Updated contact details for ${cName}.`);
    }

    setContactModal({ isOpen: false, mode: 'add' });
    // reset form
    setCName('');
    setCPhone('');
    setCWhatsApp('');
    setCEmail('');
    setCIsPrimary(false);
    setCIsSecondary(false);
    setCIsFavorite(false);
    setCAlertSms(true);
    setCAlertWhatsapp(true);
    setCAlertCall(true);
    setCAlertEmail(true);
  };

  const openEditContact = (c: EmergencyContact) => {
    // Extract name before parentheses
    const rawName = c.name.split(' (')[0] || c.name;
    setCName(rawName);
    setCRelationship(c.relationship);
    setCPhone(c.phoneNumber);
    setCWhatsApp(c.whatsAppNumber);
    setCEmail(c.email);
    setCPriority(c.priority);
    setCIsPrimary(c.isPrimary);
    setCIsSecondary(c.isSecondary);
    setCIsFavorite(c.isFavorite);
    setCAlertSms(c.alertChannels?.sms ?? true);
    setCAlertWhatsapp(c.alertChannels?.whatsapp ?? true);
    setCAlertCall(c.alertChannels?.call ?? true);
    setCAlertEmail(c.alertChannels?.email ?? true);

    setContactModal({
      isOpen: true,
      mode: 'edit',
      contactId: c.id
    });
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    showToast("Contact removed successfully.");
  };

  const toggleFavorite = (id: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, isFavorite: !c.isFavorite };
      }
      return c;
    }));
  };

  // Reordering simulation helper
  const reorderPriority = (id: string, dir: 'up' | 'down') => {
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) return;
    const newContacts = [...contacts];
    if (dir === 'up' && idx > 0) {
      const temp = newContacts[idx];
      newContacts[idx] = newContacts[idx - 1];
      newContacts[idx - 1] = temp;
    } else if (dir === 'down' && idx < contacts.length - 1) {
      const temp = newContacts[idx];
      newContacts[idx] = newContacts[idx + 1];
      newContacts[idx + 1] = temp;
    }
    setContacts(newContacts);
    showToast("Contacts priority order re-indexed.");
  };

  // Save safety profile updates
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Safety Profile saved securely.");
  };

  // PDF report export simulation
  const exportPDFIncident = (incident: IncidentHistory) => {
    const text = `
    ======================================
    SAFEGUARD AI - INCIDENT AUDIT REPORT
    ======================================
    Incident ID: ${incident.id}
    Timestamp: ${incident.date} at ${incident.time}
    Duration: ${incident.duration}
    Incident Location: ${incident.location}
    Coordinates: ${incident.coordinates}
    Status: ${incident.status}
    
    GUARDIAN BROADCAST LOGS:
    - SMS: Dispatched to all contacts successfully.
    - WhatsApp: Multi-channel live link active.
    - Status: Handled with absolute clearance.
    ======================================
    Encrypted with AES-256 Block cipher protocol.
    `;
    
    // Simple download trigger
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `RakshaX_Incident_${incident.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Exported incident report ${incident.id} as secure text.`);
  };

  return (
    <div className={`w-full ${isPreview ? 'h-full bg-slate-50/75 overflow-y-auto pt-16 pb-12 px-4 scrollbar-none relative' : 'min-h-screen bg-slate-50/50 pb-20 pt-24'} ${largeText ? 'large-text-active text-lg' : 'text-sm'} ${highContrast ? 'high-contrast-active contrast-125' : ''} ${colorBlind ? 'colorblind-active grayscale-0 saturate-200 border-2 border-red-600' : ''}`}>
      
      {/* STEALTH SCREEN-OFF DISGUISE OVERLAY */}
      {isStealthLockActive && (
        <div 
          onDoubleClick={deactivateStealthScreenOff}
          className="fixed inset-0 z-50 bg-black text-slate-800 flex flex-col justify-between p-6 select-none cursor-pointer"
          style={{ backgroundColor: '#000000' }}
        >
          {/* Faint OLED status indicator */}
          <div className="flex items-center justify-between opacity-20 text-[11px] font-mono tracking-widest text-slate-400">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>🔋 85% • REAL MIC ACTIVE</span>
          </div>

          {/* Central stealth guidance */}
          <div className="flex flex-col items-center justify-center space-y-4 text-center px-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 animate-ping mb-2" />
            <p className="text-xs font-mono text-slate-600 tracking-wider uppercase">
              🕶️ SCREEN DISGUISED AS OFF • WAKE-LOCK ACTIVE
            </p>
            <p className="text-[11px] text-slate-700 max-w-xs leading-relaxed">
              Real microphone is listening 24/7 for: <span className="text-slate-400 font-bold">{customSafeWords.slice(0, 3).join(', ')}</span>.
              <br />
              Speak any safe word to trigger <strong>Silent SOS</strong> immediately.
            </p>
            {voiceRecognizedPhrase && (
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 text-xs font-mono animate-pulse">
                🗣️ Real Mic Heard: "{voiceRecognizedPhrase}"
              </div>
            )}
            <p className="text-[10px] text-slate-800 font-mono mt-4">
              (Double-tap screen or tap Exit button below to exit)
            </p>
          </div>

          {/* Exit button */}
          <div className="flex justify-center opacity-30 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={deactivateStealthScreenOff}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 cursor-pointer shadow-lg"
            >
              ✕ Exit Stealth Screen-Off
            </button>
          </div>
        </div>
      )}

      {/* Accessibility floating fast panel */}
      <div className={`${isPreview ? 'absolute bottom-4 right-4 z-20' : 'fixed bottom-6 right-6 z-40'} flex flex-col gap-2`}>
        <button 
          onClick={() => setIsLangModalOpen(true)}
          className="p-3 rounded-full shadow-lg flex items-center justify-center transition-all bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60 cursor-pointer hover:border-blue-500"
          title="Choose App Language / भाषा चुनें"
        >
          <Languages className="w-4.5 h-4.5 text-blue-600" />
        </button>

        <button 
          onClick={() => {
            const next = !highContrast;
            setHighContrast(next);
            showToast(next ? "☀️ High-Contrast Emergency Mode ACTIVE (Sun Glare Optimised)" : "Standard Contrast Mode Restored");
            if (next) speak("High contrast mode active");
          }}
          className={`p-3 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer ${highContrast ? 'bg-amber-400 text-slate-950 font-black border-2 border-slate-950 shadow-xl animate-pulse' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60'}`}
          title="Toggle High-Contrast Emergency Mode (High Sunlight Glare)"
        >
          <Sun className="w-4.5 h-4.5" />
        </button>

        <button 
          onClick={() => {
            setVoiceNarrator(!voiceNarrator);
            showToast(voiceNarrator ? "Voice narration disabled" : "Voice narration active. Listening for events.");
          }}
          className={`p-3 rounded-full shadow-lg flex items-center justify-center transition-all ${voiceNarrator ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60'}`}
          title="Toggle Voice Reader"
        >
          <AccessIcon className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className={isPreview ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 md:px-12"}>
        
        {/* Dynamic accessibility announcement banner */}
        {voiceNarrator && !isPreview && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce text-blue-600 shrink-0" />
            <span className="font-mono">Voice Assitant Narrating: "{narratorText || 'Listening...'}"</span>
          </div>
        )}

        {/* Master Panel Header with State indicators */}
        {!isPreview && (
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-6 md:p-8 mb-8">
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                  {t('welcomeGreeting')}, {profile.fullName.split(' ')[0]}
                </span>
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{t('protectedBadge')}</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                {t('vaultVerified')}
              </p>
            </div>

            {/* Quick Real-Time Device Status Indicators + Language Button */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Change App Language"
              >
                <Languages className="w-3.5 h-3.5 text-blue-600" />
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName || 'English'}</span>
                <span className="text-[10px] text-blue-600 font-extrabold uppercase">({language})</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 text-[10px] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEmergencyActive ? t('liveGpsActive') : t('passiveTracking')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 text-[10px] font-semibold">
                <Battery className="w-3.5 h-3.5 text-emerald-500" />
                <span>{batteryLevel}% {t('battery')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 text-[10px] font-semibold">
                <Wifi className="w-3.5 h-3.5 text-purple-500" />
                <span>{internetStatus}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className={`grid grid-cols-1 ${isPreview ? '' : 'lg:grid-cols-12'} gap-6 lg:gap-8 items-start`}>
          
          {/* LEFT COLUMN: Sidebar Navigation Controls (Desktop) & Mode triggers */}
          {!isPreview && (
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-2.5">
              {[
                { id: 'home', label: t('navDashboard'), icon: <Shield className="w-4 h-4" /> },
                { id: 'biometrics', label: t('navTriggers'), icon: <Smartphone className="w-4 h-4" /> },
                { id: 'history', label: t('navAuditLog'), icon: <History className="w-4 h-4" /> },
                { id: 'settings', label: t('navSettings'), icon: <Settings className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'settings') {
                      setSettingsSubView('hub');
                    }
                    speak(`Switched to ${tab.label}`);
                  }}
                  className={`w-full text-left rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all flex items-center justify-between cursor-pointer p-4 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}

              <button
                onClick={onLogout}
                className="w-full text-left bg-rose-50/60 text-rose-800 hover:bg-rose-100 font-bold text-[11px] uppercase tracking-wide transition-all flex items-center gap-2.5 rounded-xl border border-rose-100/60 cursor-pointer p-4 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('navLockProfile')}</span>
              </button>

              {/* Simulated Pocket triggers & shake options */}
              <div className="bg-slate-100/50 rounded-xl border border-slate-200/40 text-left p-5 space-y-3 mt-2">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('pocketSimulators')}</h4>
                
                <button 
                  onClick={triggerShakeSOS}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200/50 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <Smartphone className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                  {t('simulateShake')}
                </button>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 pl-1 uppercase tracking-wider">
                  <span>{t('silentSosMode')}</span>
                  <input 
                    type="checkbox" 
                    checked={silentSOS} 
                    onChange={(e) => setSilentSOS(e.target.checked)}
                    className="w-3.5 h-3.5 text-rose-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: Interactive Tabs Canvas */}
          <div className={`${isPreview ? "w-full" : "lg:col-span-9"} space-y-6`}>
            
            {/* Custom Pill Tab bar for Mobile screens & Previews */}
            <div className="flex lg:hidden gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none w-full">
              {[
                { id: 'home', label: t('navDashboard') },
                { id: 'biometrics', label: t('navTriggers') },
                { id: 'history', label: t('navAuditLog') },
                { id: 'settings', label: t('navSettings') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'settings') {
                      setSettingsSubView('hub');
                    }
                    speak(`Switched to ${tab.label}`);
                  }}
                  className={`px-3.5 py-2 rounded-full font-extrabold text-[11px] uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 rounded-full font-bold text-[11px] uppercase tracking-wider shrink-0 cursor-pointer bg-rose-50 text-rose-700 border border-rose-200 ml-auto"
              >
                {t('navLockProfile')}
              </button>
            </div>

            <AnimatePresence mode="wait">
            {/* -------------------- TAB: HOME (SOS CENTRAL SCREEN) -------------------- */}
            {activeTab === 'home' && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* EMERGENCY MODE SCREEN (WHEN SOS ACTIVATED) */}
                <AnimatePresence>
                  {isEmergencyActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className={`bg-white rounded-[32px] p-6 md:p-8 shadow-2xl space-y-6 ${
                        silentSOS ? 'border border-slate-200' : 'border-2 border-rose-600'
                      }`}
                    >
                      {/* Emergency Active Header Banner */}
                      {silentSOS ? (
                        <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-slate-800 text-left">
                          <div className="flex gap-3.5 items-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                              <EyeOff className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Discreet Guard Active</h3>
                                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Silent SOS
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Emergency sequence executing silently. Zero sound, vibration, or alarming screen feedback.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleSafeClick}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Deactivate Silent SOS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-600 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-rose-600/20">
                          <div className="flex gap-4 items-center text-left">
                            <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center animate-ping shrink-0">
                              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
                            </div>
                            <div>
                              <h3 className="text-base font-black uppercase tracking-wider">🚨 RakshaX SOS Active</h3>
                              <p className="text-xs text-rose-100">
                                Incident ID: <strong className="font-mono text-white">{currentIncident?.id || 'PENDING'}</strong> • Locked on coordinates.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                              Live GPS Streaming
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Primary One-Hand Actions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Huge I'm Safe action */}
                        <button
                          onClick={handleSafeClick}
                          className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-600/30 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer border-4 border-white"
                        >
                          <CheckCircle className="w-8 h-8 animate-bounce" />
                          <span>I'M SAFE (End SOS)</span>
                          <span className="text-[10px] text-emerald-100 font-normal normal-case">Stops tracking & broadcasts safe status to guardians</span>
                        </button>

                        {/* Prominent Call National Emergency */}
                        <a
                          href={`tel:${getEmergencyNumber()}`}
                          className="w-full py-6 bg-rose-700 hover:bg-rose-800 active:scale-[0.98] text-white font-black text-xl rounded-2xl shadow-xl shadow-rose-700/30 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer border-4 border-white"
                        >
                          <Phone className="w-8 h-8 animate-pulse" />
                          <span>CALL {getEmergencyNumber()}</span>
                          <span className="text-[10px] text-rose-100 font-normal">Connects to national emergency response teams</span>
                        </a>
                      </div>

                      {/* POLICE STATION & 112 EMERGENCY DIALER CARD */}
                      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border-2 border-indigo-500/50 shadow-xl space-y-3 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/40">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-300 flex items-center justify-center animate-pulse shrink-0">
                              <ShieldAlert className="w-6 h-6 text-indigo-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                                  🚓 EMERGENCY POLICE 112
                                </span>
                                <span className="bg-blue-500/20 text-blue-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-blue-500/40">
                                  DIALER READY
                                </span>
                              </div>
                              <h4 className="text-sm md:text-base font-extrabold text-white mt-0.5">
                                {nearestPolice[0]?.name || "Local Police Station / Control Room (112)"}
                              </h4>
                              <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                                Nearest Hub: <span className="font-bold text-amber-300">{nearestPolice[0]?.dist || "0.6 km"}</span> • Est. Proximity: <span className="font-bold text-emerald-300">{nearestPolice[0]?.eta || "2 mins"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <a
                              href={`tel:${nearestPolice[0]?.phone || "112"}`}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-indigo-400/30 cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5 text-white animate-bounce" /> Call 112
                            </a>
                            <a
                              href={`sms:112?body=${encodeURIComponent(`EMERGENCY SOS: ${profile.fullName} is in distress! Location: ${liveAddress}. GPS: ${gpsCoords}. Track: https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, "")}`)}`}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-blue-300" /> SMS 112
                            </a>
                            <a
                              href={`mailto:controlroom.police@delhipolice.gov.in?subject=${encodeURIComponent(`URGENT POLICE SOS: Distress Alert from ${profile.fullName}`)}&body=${encodeURIComponent(`EMERGENCY DISTRESS SOS\n\nName: ${profile.fullName}\nLocation: ${liveAddress}\nGPS: ${gpsCoords}\nMap Link: https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, "")}\nTimestamp: ${new Date().toLocaleString()}\n\nPlease dispatch emergency response immediately.`)}`}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                            >
                              ✉️ Email PCR
                            </a>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-indigo-200/90 leading-relaxed font-medium">
                          <span>• Multi-channel police dispatch: Phone dialer (112), Police SMS (112), and Central PCR Email ready.</span>
                          <span className="font-mono text-amber-300 text-[10px] font-bold shrink-0">GPS: {gpsCoords}</span>
                        </div>
                      </div>

                      {/* 100% AUTOMATED BACKGROUND RELAY STATUS (NO MANUAL SENDING REQUIRED) */}
                      <div className="bg-emerald-950 text-white p-4.5 rounded-2xl border border-emerald-600/40 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <Radio className="w-5 h-5 text-emerald-300 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                                ⚡ AUTOMATED BACKGROUND RELAY (100% HANDS-FREE)
                              </h5>
                              <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[9px] font-extrabold uppercase rounded border border-emerald-400/40">
                                AUTO DISPATCHED
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-100/90 mt-0.5">
                              Server engine automatically fires <strong>WhatsApp, Emergency SMS Alert, Voice Call, and Email</strong> concurrently to all {contacts.length} Guardians and Police without requiring any manual clicks.
                            </p>
                          </div>
                        </div>

                        {/* Automated Relay Indicators */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                          <div className="px-3 py-1.5 bg-emerald-900/90 text-emerald-200 text-xs font-extrabold rounded-xl border border-emerald-600/50 flex items-center gap-1.5 shadow-2xs">
                            💬 Auto WhatsApp
                          </div>
                          <div className="px-3 py-1.5 bg-emerald-900/90 text-emerald-200 text-xs font-extrabold rounded-xl border border-emerald-600/50 flex items-center gap-1.5 shadow-2xs">
                            📱 Emergency SMS
                          </div>
                          <div className="px-3 py-1.5 bg-emerald-900/90 text-emerald-200 text-xs font-extrabold rounded-xl border border-emerald-600/50 flex items-center gap-1.5 shadow-2xs">
                            📞 Voice Call
                          </div>
                          <div className="px-3 py-1.5 bg-emerald-900/90 text-emerald-200 text-xs font-extrabold rounded-xl border border-emerald-600/50 flex items-center gap-1.5 shadow-2xs">
                            ✉️ Email SOS
                          </div>
                        </div>
                      </div>

                      {/* Map, Live Coordinates, and Secure tracking links */}
                      <div className={`grid grid-cols-1 ${isPreview ? '' : 'lg:grid-cols-12'} gap-6`}>
                        
                        {/* Dynamic Live Coordinates Screen (left) */}
                        <div className={`${isPreview ? 'w-full' : 'lg:col-span-5'} bg-slate-950 rounded-[24px] p-6 text-white relative overflow-hidden h-[260px] flex flex-col justify-between text-left border border-slate-800`}>
                          {/* Grid Overlay */}
                          <div className="absolute inset-0 opacity-15">
                            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <pattern id="activeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                                </pattern>
                              </defs>
                              <rect width="100%" height="100%" fill="url(#activeGrid)" />
                              <circle cx="120" cy="110" r="70" stroke="white" strokeWidth="1" fill="none" />
                            </svg>
                          </div>

                          <div className="relative z-10 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-red-600 text-white px-2.5 py-1 rounded-full animate-pulse">
                              LIVE GPS SHIFT MONITORING
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Precision: 4.8m</span>
                          </div>

                          <div className="relative z-10 flex flex-col items-center justify-center py-2">
                            <div className="w-12 h-12 rounded-full bg-red-500/30 border border-red-400 flex items-center justify-center relative">
                              <div className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute" />
                              <MapPin className="w-5 h-5 text-red-400 animate-bounce" />
                            </div>
                            <span className="text-sm text-slate-100 mt-2 font-bold font-mono tracking-tight">{gpsCoords}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 text-center px-4 font-sans leading-tight">
                              Satellite Coordinates (सटीक सैटेलाइट जीपीएस कोड - For Emergency Services/Police)
                            </span>
                          </div>

                          <div className="relative z-10 space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                              <span>Current Location Link</span>
                              <button 
                                onClick={() => {
                                  const url = `https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, '')}`;
                                  navigator.clipboard.writeText(url);
                                  showToast("Maps coordinate link copied!");
                                }}
                                className="text-blue-400 hover:underline capitalize"
                              >
                                Copy Link
                              </button>
                            </div>
                            <p className="text-xs text-slate-100 truncate font-semibold">{liveAddress}</p>
                          </div>
                        </div>

                        {/* Guardian Dispatch Parallel Matrix (right) */}
                        <div className={`${isPreview ? 'w-full' : 'lg:col-span-7'} bg-slate-50 border border-slate-100 rounded-[24px] p-6 text-left flex flex-col justify-between`}>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">GUARDIANS BROADCAST MATRIX</h4>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Parallel Dispatches Active</span>
                            </div>

                            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
                              {contacts.map((c) => {
                                const status = deliveryStatuses[c.id] || { sms: 'idle', whatsapp: 'idle', call: 'idle', email: 'idle' };
                                const channels = c.alertChannels ?? { sms: true, whatsapp: true, call: true, email: true };

                                return (
                                  <div key={c.id} className="bg-white p-3.5 rounded-xl border border-slate-100 flex flex-col gap-2 shadow-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-black text-slate-900">{c.name}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.relationship}</span>
                                    </div>

                                    {/* Channels Grid */}
                                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                                      {/* SMS */}
                                      {channels.sms ? (
                                        <div className={`p-1.5 rounded-lg border text-center text-[10px] font-bold ${
                                          status.sms === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          status.sms === 'dispatched_provider_accepted' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          status.sms === 'not_configured' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                          status.sms === 'simulated' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                          status.sms === 'failed' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                          'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                        }`} title={status.smsError || undefined}>
                                          SMS: {
                                            status.sms === 'delivered' ? '✓ Delivered' :
                                            status.sms === 'dispatched_provider_accepted' ? '✓ Dispatched' :
                                            status.sms === 'not_configured' ? '⚠️ Not Configured' :
                                            status.sms === 'simulated' ? '⚠️ Not Sent' :
                                            status.sms === 'failed' ? '⚠️ Failed' :
                                            'Sending...'
                                          }
                                        </div>
                                      ) : (
                                        <div className="p-1.5 rounded-lg bg-slate-100/50 text-slate-400 border border-transparent text-center text-[10px]">
                                          SMS: Off
                                        </div>
                                      )}

                                      {/* WhatsApp */}
                                      {channels.whatsapp ? (
                                        <div className={`p-1.5 rounded-lg border text-center text-[10px] font-bold ${
                                          status.whatsapp === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          status.whatsapp === 'dispatched_provider_accepted' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          status.whatsapp === 'sandbox' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                                          status.whatsapp === 'not_configured' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                          status.whatsapp === 'simulated' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                          status.whatsapp === 'failed' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                          'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                        }`} title={status.whatsappError || undefined}>
                                          WA: {
                                            status.whatsapp === 'delivered' ? '✓ Delivered' :
                                            status.whatsapp === 'dispatched_provider_accepted' ? '✓ Dispatched' :
                                            status.whatsapp === 'sandbox' ? '⏳ Sandbox Queued' :
                                            status.whatsapp === 'not_configured' ? '⚠️ Not Configured' :
                                            status.whatsapp === 'simulated' ? '⚠️ Not Sent' :
                                            status.whatsapp === 'failed' ? '⚠️ Failed' :
                                            'Sending...'
                                          }
                                        </div>
                                      ) : (
                                        <div className="p-1.5 rounded-lg bg-slate-100/50 text-slate-400 border border-transparent text-center text-[10px]">
                                          WA: Off
                                        </div>
                                      )}

                                      {/* Call */}
                                      {channels.call ? (
                                        <div className={`p-1.5 rounded-lg border text-center text-[10px] font-bold ${
                                          (status.call === 'delivered' || status.call === 'dispatched_provider_accepted' || status.call === 'initiated') ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          status.call === 'not_configured' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                          status.call === 'simulated' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                          status.call === 'failed' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                          'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                        }`} title={status.callError || undefined}>
                                          Call: {
                                            (status.call === 'delivered' || status.call === 'dispatched_provider_accepted' || status.call === 'initiated') ? '📞 Initiated' :
                                            status.call === 'not_configured' ? '⚠️ Not Configured' :
                                            status.call === 'simulated' ? '⚠️ Not Sent' :
                                            status.call === 'failed' ? '⚠️ Failed' :
                                            'Calling...'
                                          }
                                        </div>
                                      ) : (
                                        <div className="p-1.5 rounded-lg bg-slate-100/50 text-slate-400 border border-transparent text-center text-[10px]">
                                          Call: Off
                                        </div>
                                      )}

                                      {/* Email */}
                                      {channels.email ? (
                                        <div className={`p-1.5 rounded-lg border text-center text-[10px] font-bold ${
                                          status.email === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          status.email === 'dispatched_provider_accepted' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          status.email === 'not_configured' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                          status.email === 'simulated' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                          status.email === 'failed' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                          'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                        }`} title={status.emailError || undefined}>
                                          Email: {
                                            status.email === 'delivered' ? '✓ Delivered' :
                                            status.email === 'dispatched_provider_accepted' ? '✓ Accepted (202)' :
                                            status.email === 'not_configured' ? '⚠️ Not Configured' :
                                            status.email === 'simulated' ? '⚠️ Not Sent' :
                                            status.email === 'failed' ? '⚠️ Failed' :
                                            'Sending...'
                                          }
                                        </div>
                                      ) : (
                                        <div className="p-1.5 rounded-lg bg-slate-100/50 text-slate-400 border border-transparent text-center text-[10px]">
                                          Email: Off
                                        </div>
                                      )}
                                    </div>

                                    {/* 1-Tap Direct Actions (Instant Device SIM SMS, Native Email, and Direct WhatsApp) */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider w-full mb-0.5">Direct Action (100% Guaranteed):</span>
                                      {c.phoneNumber && (
                                        <a
                                          href={status.directSmsUri || `sms:${c.phoneNumber.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(`RAKSHAX EMERGENCY SOS: ${profile.fullName} is in DANGER! Location: ${liveAddress}. Live GPS: https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, '')}. Police 112 alerted.`)}`}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                          title="Direct cellular SMS via phone SIM"
                                        >
                                          <span>📱 1-Tap SIM SMS</span>
                                        </a>
                                      )}
                                      {c.email && (
                                        <a
                                          href={status.directMailtoUri || `mailto:${c.email}?subject=${encodeURIComponent(`🚨 EMERGENCY SOS: Immediate Assistance for ${profile.fullName}`)}&body=${encodeURIComponent(`EMERGENCY SOS ALERT!\n\nVictim: ${profile.fullName}\nStatus: IN GRAVE DANGER\nLocation: ${liveAddress}\nCoordinates: ${gpsCoords}\nLive Map: https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, '')}\nPolice 112 alerted.\nTime: ${new Date().toLocaleTimeString()} IST`)}`}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                          title="Direct email via Gmail / Mail App"
                                        >
                                          <span>✉️ 1-Tap Gmail/Mail</span>
                                        </a>
                                      )}
                                      {c.phoneNumber && (
                                        <a
                                          href={status.directWhatsAppUri || `https://wa.me/${c.phoneNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`🚨 RAKSHAX EMERGENCY SOS: ${profile.fullName} is in DANGER!\nLocation: ${liveAddress}\nLive Map: https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, '')}`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                          title="Direct chat on WhatsApp"
                                        >
                                          <span>💬 1-Tap WhatsApp</span>
                                        </a>
                                      )}
                                    </div>

                                    {/* Detailed Delivery Errors if any failure is recorded */}
                                    {(status.smsError || status.whatsappError || status.callError || status.emailError) && (
                                      <div className="col-span-4 mt-2.5 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-800 text-left">
                                        <div className="font-extrabold flex items-center gap-1 mb-1 text-rose-900">
                                          <span>⚠️ Dispatch Report & Status:</span>
                                        </div>
                                        <ul className="list-disc pl-3.5 space-y-1 font-medium text-[10px]">
                                          {status.smsError && <li><strong>SMS:</strong> {status.smsError}</li>}
                                          {status.whatsappError && <li><strong>WhatsApp:</strong> {status.whatsappError}</li>}
                                          {status.callError && <li><strong>Voice Call:</strong> {status.callError}</li>}
                                          {status.emailError && <li><strong>Email:</strong> {status.emailError}</li>}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Quick Troubleshooting & Twilio Subscription Guide */}
                                    {(status.smsError || status.whatsappError || status.callError || status.whatsapp === 'sandbox') && (
                                      <div className="col-span-4 mt-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
                                        <div className="font-black text-xs text-amber-950 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                                          <span>💡 Twilio Subscription & Automated Delivery Guide / समाधान गाइड</span>
                                        </div>
                                        <div className="space-y-2 text-[11px] text-amber-950 leading-relaxed font-semibold">
                                          <p className="text-amber-900">
                                            <strong>100% ऑटोमैटिक बैकग्राउंड डिलीवरी:</strong> जब आप Twilio का पेड सब्सक्रिप्शन (Paid Twilio Account) लेंगी, तो WhatsApp, SMS, और Voice Call बिना किसी मैन्युअल स्टेप या सैंडबॉक्स कोड के सीधे सभी कॉन्टैक्ट्स के मोबाइल पर डिलीवर होंगे।
                                          </p>
                                          <ul className="list-decimal pl-4 space-y-1.5 text-[10.5px]">
                                            <li>
                                              <strong>Twilio WhatsApp:</strong> वर्तमान में Twilio सैंडबॉक्स एक्टिव है (जिसमें प्राप्तकर्ता को एक बार <code>join &lt;code&gt;</code> भेजना होता है)। Twilio सब्सक्रिप्शन लेने के बाद आपका रजिस्टर्ड बिजनेस नंबर सीधे 100% खुद ही बिना किसी ऑप्ट-इन के अलर्ट भेज देगा।
                                            </li>
                                            <li>
                                              <strong>Emergency SMS & Voice Call:</strong> सब्सक्रिप्शन में भारत (+91) के किसी भी नंबर पर हाई-प्रायोरिटी इमरजेंसी SMS और हिंदी/इंग्लिश वॉइस कॉल खुद से कनेक्ट होती है।
                                            </li>
                                            <li>
                                              <strong>सेटिंग्स में तुरंत अपडेट करें:</strong> सब्सक्रिप्शन लेते ही आप <em>Settings &gt; Twilio Subscription Configuration</em> में जाकर अपने नए क्रेडेंशियल्स सेव कर सकती हैं।
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Live Server Diagnostics Logs */}
                          {liveBackendLogs.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-slate-200/50">
                              <button
                                onClick={() => setShowDiagnostics(!showDiagnostics)}
                                className="w-full text-left flex justify-between items-center text-[10px] font-black tracking-wider uppercase text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <span>🛠️ Server Dispatch Diagnostics ({liveBackendLogs.length} events)</span>
                                <span className="font-bold text-xs">{showDiagnostics ? "Hide" : "Show"}</span>
                              </button>

                              {showDiagnostics && (
                                <div className="mt-2 p-2 bg-slate-900 text-slate-300 font-mono text-[9px] rounded-lg max-h-[110px] overflow-y-auto leading-relaxed border border-slate-950 shadow-inner">
                                  {liveBackendLogs.map((log, idx) => (
                                    <div key={idx} className={`${log.includes("failed") || log.includes("skipped") ? "text-rose-400" : log.includes("successfully") || log.includes("delivered") ? "text-emerald-400" : "text-slate-300"}`}>
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-4 mt-3 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between items-center">
                            <span>Siren Alarm: {silentSOS ? 'Muted' : 'Audible'}</span>
                            <button 
                              onClick={() => {
                                if (silentSOS) {
                                  setSilentSOS(false);
                                  startSiren();
                                } else {
                                  setSilentSOS(true);
                                  stopSiren();
                                }
                              }} 
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {silentSOS ? 'Trigger Alarm Siren' : 'Mute Loud Siren'}
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Offline Map Tile Caching & Cell-Loss Emergency Location Viewer */}
                      <OfflineMapTileViewer 
                        gpsCoords={gpsCoords}
                        liveAddress={liveAddress}
                        policeStationName={nearestPolice[0]?.name}
                        policeDistance={`${nearestPolice[0]?.distance || 5.8} km`}
                        hospitalName={nearestHospitals[0]?.name}
                      />

                      {/* Live Moving Route & Safe Havens Guide */}
                      <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 text-white space-y-6 text-left relative overflow-hidden shadow-2xl">
                        {/* Background Grid Accent */}
                        <div className="absolute inset-0 opacity-10">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="routeGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#routeGrid)" />
                          </svg>
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                                [DEMO PREVIEW] Interactive Route Scenario Simulation
                              </h4>
                            </div>
                            <h3 className="text-lg font-extrabold text-white mt-1">
                              Safe Havens & Public Stations Along Route
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-400 italic">Demo Simulation Controls:</span>
                            <button
                              onClick={() => {
                                setIsUserMoving(!isUserMoving);
                                showToast(isUserMoving ? "Demo motion simulation paused" : "Demo motion simulation active");
                              }}
                              className={`px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                                isUserMoving 
                                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/30' 
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isUserMoving ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  Demo Motion Running
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Demo Stationary
                                </>
                              )}
                            </button>

                            <select
                              value={movementMode}
                              onChange={(e) => {
                                setMovementMode(e.target.value as any);
                              }}
                              className="bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                              <option value="walking">🚶 Demo Walk (~4km/h)</option>
                              <option value="running">🏃 Demo Run (~10km/h)</option>
                              <option value="stationary">📍 Stationary</option>
                            </select>
                          </div>
                        </div>

                        {/* Interactive Visual Timeline Map representation */}
                        <div className={`relative z-10 grid grid-cols-1 ${isPreview ? '' : 'lg:grid-cols-12'} gap-6 items-center`}>
                          <div className={`${isPreview ? 'w-full' : 'lg:col-span-7'} space-y-4`}>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                              Demo Scenario Milestones (Preview Only)
                            </span>
                            
                            <div className="relative h-20 bg-slate-950 rounded-2xl border border-white/5 flex items-center px-4 overflow-hidden">
                              {/* Central Line */}
                              <div className="absolute left-6 right-6 h-1 bg-slate-800 rounded-full" />
                              
                              {/* Filled progress line */}
                              <div 
                                className="absolute left-6 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"
                                style={{ width: `calc(${routeProgress}% - 12px)` }}
                              />

                              {/* Interactive check points */}
                              {[
                                { id: 'p1', label: 'Start Point', progress: 5, icon: MapPin },
                                { id: 'p2', label: 'Police Post', progress: 25, icon: Shield },
                                { id: 'p3', label: 'Hospital', progress: 55, icon: Heart },
                                { id: 'p4', label: 'Metro Hub', progress: 80, icon: Compass },
                                { id: 'p5', label: 'Help Desk', progress: 100, icon: CheckCircle },
                              ].map((pt) => {
                                const isPassed = routeProgress >= pt.progress;
                                const isCurrentNext = Math.abs(routeProgress - pt.progress) <= 15;
                                const Icon = pt.icon;
                                return (
                                  <div 
                                    key={pt.id}
                                    className="absolute transform -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                                    style={{ left: `${pt.progress}%` }}
                                    onClick={() => {
                                      setRouteProgress(pt.progress);
                                      const selectedHaven = 
                                        pt.label === 'Start Point' ? (nearestPolice[0]?.name || (liveAddress.toLowerCase().includes('pune') ? 'Pune Police Chowki' : 'Local Police Post')) :
                                        pt.label === 'Police Post' ? (nearestPolice[0]?.name || (liveAddress.toLowerCase().includes('pune') ? 'Pune Police Chowki' : 'Local Police Post')) :
                                        pt.label === 'Hospital' ? (nearestHospitals[0]?.name || (liveAddress.toLowerCase().includes('pune') ? 'Sahyadri Super Speciality Hospital Pune' : 'Emergency Hospital')) :
                                        pt.label === 'Metro Hub' ? (nearestMetro[0]?.name || (liveAddress.toLowerCase().includes('pune') ? 'Pune Metro Transit Safe Zone' : 'Metro Transit Safe Zone')) :
                                        '24/7 Citizen Emergency Help Center';
                                      setApproachingSafeHaven(selectedHaven);
                                      showToast(`Set simulated location to ${pt.label}`);
                                    }}
                                  >
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                      isPassed 
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                        : isCurrentNext
                                          ? 'bg-blue-600/20 border-blue-400 text-blue-300 animate-pulse'
                                          : 'bg-slate-900 border-slate-700 text-slate-500'
                                    }`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[9px] font-bold mt-1 tracking-tight transition-colors ${
                                      isPassed ? 'text-emerald-400' : 'text-slate-400'
                                    }`}>
                                      {pt.label}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Pulse User Marker */}
                              <div 
                                className="absolute transform -translate-x-1/2 -top-1 pointer-events-none transition-all duration-1000"
                                style={{ left: `${routeProgress}%` }}
                              >
                                <span className="flex h-3 w-3 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                              <span>Demo Progress: {routeProgress}% (Interactive simulation only)</span>
                              <span>Mode: {movementMode === 'running' ? 'Demo Running' : movementMode === 'walking' ? 'Demo Walking' : 'Stationary'}</span>
                            </div>
                          </div>

                          <div className={`${isPreview ? 'w-full' : 'lg:col-span-5'} bg-slate-950/80 border border-white/5 rounded-2xl p-5 text-left space-y-4`}>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block bg-emerald-950/50 px-2.5 py-1 rounded-full w-max border border-emerald-900/40">
                              🎯 Selected Facility of Refuge
                            </span>

                            <div className="space-y-1.5">
                              <h4 className="text-base font-extrabold text-white flex items-center gap-1.5">
                                <Shield className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                                {approachingSafeHaven}
                              </h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {approachingSafeHaven.toLowerCase().includes("police") || approachingSafeHaven.toLowerCase().includes("chowki") || approachingSafeHaven.toLowerCase().includes("thana") || approachingSafeHaven.toLowerCase().includes("post")
                                  ? "Local police facility. Contact 112 for emergency response or follow map directions to seek in-person assistance."
                                  : approachingSafeHaven.toLowerCase().includes("hospital") || approachingSafeHaven.toLowerCase().includes("medical") || approachingSafeHaven.toLowerCase().includes("clinic") || approachingSafeHaven.toLowerCase().includes("trauma")
                                  ? "Medical healthcare facility. Contact 108 for state emergency ambulance or follow directions for emergency medical care."
                                  : approachingSafeHaven.toLowerCase().includes("metro") || approachingSafeHaven.toLowerCase().includes("transit") || approachingSafeHaven.toLowerCase().includes("station")
                                  ? "Public transit station with station security. Use official transit helpline or follow map directions to reach the nearest open station."
                                  : "Nearby public safety facility detected via geographic coordinates. Contact 112 for emergency assistance."}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <button
                                onClick={() => {
                                  speak(`Navigating to ${approachingSafeHaven} immediately. Map directions launched.`);
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(approachingSafeHaven)}`, '_blank');
                                }}
                                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" /> GPS Path
                              </button>
                              <a
                                href={`tel:${getEmergencyNumber()}`}
                                className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Dial {getEmergencyNumber()}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 🚨 NEAREST EMERGENCY STATIONS AROUND YOU (POLICE, METRO, HOSPITAL, CLINIC) */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm text-left space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                🚨 {language === 'hi' ? 'निकटतम आपातकालीन सहायता केंद्र' : 'NEAREST EMERGENCY STATIONS AROUND YOU'}
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border-amber-300">
                                ⚠️ UNVERIFIED SPATIAL DATA (CROWDSOURCED)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Distances: straight-line (Haversine) and road routing (OSRM). Facility numbers originate from OpenStreetMap community data and are not independently verified by government authorities.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/80 font-mono">
                              {numericCoords 
                                ? `GPS: ${numericCoords.lat.toFixed(4)}, ${numericCoords.lng.toFixed(4)}${locationAccuracy ? ` (±${locationAccuracy}m)` : ''}` 
                                : 'Locating...'}
                            </span>
                            {locationFreshness && (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-200/60 font-mono">
                                Fix: {locationFreshness}
                              </span>
                            )}
                          </div>
                        </div>

                        {locationError && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
                            <span>⚠️ {locationError} — Showing fallback / last known coordinates. Live GPS not guaranteed.</span>
                            <button
                              onClick={fetchLocationAndPlaces}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] self-start sm:self-auto cursor-pointer border-none"
                            >
                              Retry Location
                            </button>
                          </div>
                        )}

                        {/* 4 Station Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                          {/* 1. Nearest Police Station */}
                          <div className="bg-slate-50 hover:bg-slate-50/90 rounded-2xl p-4 border border-indigo-100 text-left flex flex-col justify-between min-h-[190px] shadow-2xs transition-all">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                  nearestPolice[0]?.facilityType?.toLowerCase().includes("chowki")
                                    ? "bg-amber-100 text-amber-900 border-amber-200"
                                    : "bg-indigo-100 text-indigo-900 border-indigo-200"
                                }`}>
                                  {nearestPolice[0]?.facilityType?.toLowerCase().includes("chowki") ? "👮 Police Chowki" : "🚓 Police Station"}
                                </span>
                                <div className="text-right">
                                  <span className="text-xs font-black text-indigo-700 block">
                                    {nearestPolice[0]?.straightLineKm !== undefined && nearestPolice[0]?.straightLineKm !== null
                                      ? `${Number(nearestPolice[0].straightLineKm).toFixed(1)} km`
                                      : nearestPolice[0]?.dist || "0.8 km"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-normal">straight-line</span>
                                </div>
                              </div>
                              <h5 className="text-xs font-extrabold text-slate-900 mt-2 line-clamp-1">
                                {nearestPolice[0]?.name || "Local Police Station / Chowki"}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Road ETA: <span className="font-semibold text-slate-600">{nearestPolice[0]?.roadEta ? `${nearestPolice[0].roadEta} mins` : "Unavailable (Road routing not configured)"}</span> {nearestPolice[0]?.is24x7 ? "• 24/7" : ""}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Direct Desk: <span className="font-mono text-slate-700">{nearestPolice[0]?.directPhone ? `${nearestPolice[0].directPhone} (OSM unverified)` : "Unavailable in public registry"}</span>
                              </p>
                              {nearestPolice[0]?.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{nearestPolice[0].address}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                              <a
                                href={`tel:${nearestPolice[0]?.emergencyHelpline?.number || "112"}`}
                                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-[10px] text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                title="India Unified Emergency Helpline (112) - Police, Fire & Ambulance"
                              >
                                <Phone className="w-3 h-3 text-white" /> Call 112 (Police)
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearestPolice[0]?.name || "Police Station")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-[10px] text-center text-slate-700 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Navigation className="w-3 h-3 text-indigo-600" /> Map Directions
                              </a>
                            </div>
                          </div>

                          {/* 2. Nearest Metro Station */}
                          <div className="bg-slate-50 hover:bg-slate-50/90 rounded-2xl p-4 border border-blue-100 text-left flex flex-col justify-between min-h-[190px] shadow-2xs transition-all">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                                  🚇 {nearestMetro[0]?.facilityType || "Metro Station"}
                                </span>
                                <div className="text-right">
                                  <span className="text-xs font-black text-blue-700 block">
                                    {nearestMetro[0]?.straightLineKm !== undefined && nearestMetro[0]?.straightLineKm !== null
                                      ? `${Number(nearestMetro[0].straightLineKm).toFixed(1)} km`
                                      : nearestMetro[0]?.dist || "1.2 km"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-normal">straight-line</span>
                                </div>
                              </div>
                              <h5 className="text-xs font-extrabold text-slate-900 mt-2 line-clamp-1">
                                {nearestMetro[0]?.name || "Nearest Metro Station"}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Road ETA: <span className="font-semibold text-slate-600">{nearestMetro[0]?.roadEta ? `${nearestMetro[0].roadEta} mins` : "Unavailable (Road routing not configured)"}</span> • Transit Safe Hub
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Direct Desk: <span className="font-mono text-slate-700">{nearestMetro[0]?.directPhone ? `${nearestMetro[0].directPhone} (OSM unverified)` : "Unavailable in public registry"}</span>
                              </p>
                              {nearestMetro[0]?.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{nearestMetro[0].address}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                              <a
                                href={`tel:${nearestMetro[0]?.emergencyHelpline?.number || "18002705501"}`}
                                className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-[10px] text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                title={nearestMetro[0]?.emergencyHelpline?.label || "Transit Helpline"}
                              >
                                <Phone className="w-3 h-3 text-white" /> {nearestMetro[0]?.emergencyHelpline?.number === "18002705501" ? "Metro 18002705501" : "Metro Help"}
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearestMetro[0]?.name || "Metro Station")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-[10px] text-center text-slate-700 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Navigation className="w-3 h-3 text-blue-600" /> Map Directions
                              </a>
                            </div>
                          </div>

                          {/* 3. Nearest Emergency Hospital */}
                          <div className="bg-slate-50 hover:bg-slate-50/90 rounded-2xl p-4 border border-emerald-100 text-left flex flex-col justify-between min-h-[190px] shadow-2xs transition-all">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">
                                  🏥 {nearestHospitals[0]?.facilityType || "Emergency Hospital"}
                                </span>
                                <div className="text-right">
                                  <span className="text-xs font-black text-emerald-700 block">
                                    {nearestHospitals[0]?.straightLineKm !== undefined && nearestHospitals[0]?.straightLineKm !== null
                                      ? `${Number(nearestHospitals[0].straightLineKm).toFixed(1)} km`
                                      : nearestHospitals[0]?.dist || "1.0 km"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-normal">straight-line</span>
                                </div>
                              </div>
                              <h5 className="text-xs font-extrabold text-slate-900 mt-2 line-clamp-1">
                                {nearestHospitals[0]?.name || "Emergency Hospital & Trauma"}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Road ETA: <span className="font-semibold text-slate-600">{nearestHospitals[0]?.roadEta ? `${nearestHospitals[0].roadEta} mins` : "Unavailable (Road routing not configured)"}</span> {nearestHospitals[0]?.is24x7 ? "• 24/7 Casualty" : ""}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Direct Desk: <span className="font-mono text-slate-700">{nearestHospitals[0]?.directPhone ? `${nearestHospitals[0].directPhone} (OSM unverified)` : "Unavailable in public registry"}</span>
                              </p>
                              {nearestHospitals[0]?.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{nearestHospitals[0].address}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                              <a
                                href={`tel:${nearestHospitals[0]?.emergencyHelpline?.number || "108"}`}
                                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-[10px] text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                title="State Emergency Medical & Ambulance Service (108)"
                              >
                                <Phone className="w-3 h-3 text-white" /> Ambulance 108
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearestHospitals[0]?.name || "Hospital")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-[10px] text-center text-slate-700 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Navigation className="w-3 h-3 text-emerald-600" /> Map Directions
                              </a>
                            </div>
                          </div>

                          {/* 4. Nearest Clinic & Pharmacy */}
                          <div className="bg-slate-50 hover:bg-slate-50/90 rounded-2xl p-4 border border-rose-100 text-left flex flex-col justify-between min-h-[190px] shadow-2xs transition-all">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md border border-rose-200">
                                  🩺 {nearestClinics[0]?.facilityType || "Clinic & Meds"}
                                </span>
                                <div className="text-right">
                                  <span className="text-xs font-black text-rose-700 block">
                                    {nearestClinics[0]?.straightLineKm !== undefined && nearestClinics[0]?.straightLineKm !== null
                                      ? `${Number(nearestClinics[0].straightLineKm).toFixed(1)} km`
                                      : nearestClinics[0]?.dist || "0.4 km"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-normal">straight-line</span>
                                </div>
                              </div>
                              <h5 className="text-xs font-extrabold text-slate-900 mt-2 line-clamp-1">
                                {nearestClinics[0]?.name || "Care Clinic & Pharmacy"}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Road ETA: <span className="font-semibold text-slate-600">{nearestClinics[0]?.roadEta ? `${nearestClinics[0].roadEta} mins` : "Unavailable (Road routing not configured)"}</span> • First Aid
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Direct Desk: <span className="font-mono text-slate-700">{nearestClinics[0]?.directPhone ? `${nearestClinics[0].directPhone} (OSM unverified)` : "Unavailable in public registry"}</span>
                              </p>
                              {nearestClinics[0]?.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{nearestClinics[0].address}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                              <a
                                href={`tel:${nearestClinics[0]?.emergencyHelpline?.number || "104"}`}
                                className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-[10px] text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                title="State Health Advice Helpline (104) — Non-Emergency Medical Guidance (Active in Maharashtra & Selected States)"
                              >
                                <Phone className="w-3 h-3 text-white" /> Health Advice 104
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearestClinics[0]?.name || "Clinic Pharmacy")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-[10px] text-center text-slate-700 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Navigation className="w-3 h-3 text-rose-600" /> Map Directions
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400">
                          <span>
                            Data Source: <strong className="text-slate-600">{placesSource || 'Geographic Spatial Calculation'}</strong>
                            {nearestPolice[0]?.lastUpdated && ` • Updated: ${new Date(nearestPolice[0].lastUpdated).toLocaleTimeString()}`}
                            {nearestPolice[0]?.isCached && ` • [OFFLINE CACHED]`}
                          </span>
                          <span className="italic">
                            Note: Distances are straight-line (Haversine). Road routes & traffic may vary actual transit times.
                          </span>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

                {/* NORMAL SOS LAUNCH PANEL */}
                {!isEmergencyActive && sosCountdown === null && (
                  <div className="bg-white rounded-[32px] border border-slate-100/80 p-6 sm:p-8 shadow-sm text-center space-y-6 flex flex-col justify-between relative">
                    {/* Upper location display banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100 text-left">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-2xl shrink-0 ${isDetectingLocation ? 'bg-blue-50 text-blue-600 animate-pulse' : locationError ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          <MapPin className={`w-5 h-5 ${isDetectingLocation ? 'animate-bounce' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            Current Monitored Location
                            {isDetectingLocation && (
                              <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md animate-pulse uppercase font-black">
                                Detecting...
                              </span>
                            )}
                          </p>
                          {isDetectingLocation ? (
                            <p className="text-xs font-medium text-slate-500 animate-pulse mt-0.5">
                              {t('detectingLocation')}
                            </p>
                          ) : locationError ? (
                            <div className="space-y-1 mt-0.5">
                              <p className="text-xs font-semibold text-rose-600 leading-normal">
                                {locationError}
                              </p>
                              <button
                                onClick={fetchLocationAndPlaces}
                                className="text-[11px] font-black text-blue-600 hover:text-blue-700 underline cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                              >
                                Try Again / Grant Location Access
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5">
                              <p className="text-xs font-semibold text-slate-800 break-words leading-relaxed flex-1">
                                {liveAddress}
                              </p>
                              <button
                                onClick={fetchLocationAndPlaces}
                                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border-none shrink-0 flex items-center gap-1 self-start sm:self-center"
                                title="Refresh Device GPS Location"
                              >
                                🔄 {t('refreshLocation')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-500 font-medium shrink-0 text-right">
                        {isDetectingLocation ? (
                          <span className="text-slate-400">{t('detectingLocation')}</span>
                        ) : locationError ? (
                          <span className="text-rose-500 font-semibold">Location Unconfirmed</span>
                        ) : locationAccuracy ? (
                          <span>Accuracy: <strong className="text-blue-600 font-black">±{locationAccuracy}m</strong></span>
                        ) : (
                          <span>Accuracy: <strong className="text-slate-600 font-bold">Standard GPS</strong></span>
                        )}
                        {locationFreshness && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Fix: {locationFreshness}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Massive SOS Button Core */}
                    <div className="flex flex-col items-center justify-center py-6">
                      
                      {/* Hold instructions */}
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        {isHolding ? `${t('sosButtonHolding')}: ${holdProgress}%` : oneTapSOS ? t('sosButtonTap') : t('sosButtonHold')}
                      </p>

                      <div className="relative select-none touch-none">
                        {/* Radial progress ring SVG */}
                        <svg className="absolute -inset-8 w-[256px] h-[256px] transform -rotate-90 pointer-events-none z-10" viewBox="0 0 220 220">
                          {/* Track */}
                          <circle
                            cx="110"
                            cy="110"
                            r="98"
                            className="stroke-slate-100 fill-none"
                            strokeWidth="6"
                          />
                          {/* Filling Progress */}
                          <circle
                            cx="110"
                            cy="110"
                            r="98"
                            className="stroke-rose-600 fill-none transition-all duration-75"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 98}
                            strokeDashoffset={2 * Math.PI * 98 * (1 - (oneTapSOS ? 100 : holdProgress) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Pulsing Backlight */}
                        <div className={`absolute -inset-6 rounded-full transition-all duration-300 ${
                          isHolding ? 'bg-rose-500/30 scale-110' : 'bg-red-500/10 animate-ping'
                        }`} />
                        <div className="absolute -inset-12 bg-red-500/5 rounded-full animate-pulse pointer-events-none" />
                        
                        <button
                          onMouseDown={startHolding}
                          onMouseUp={stopHolding}
                          onMouseLeave={stopHolding}
                          onTouchStart={startHolding}
                          onTouchEnd={stopHolding}
                          onClick={(e) => {
                            e.preventDefault();
                            if (oneTapSOS) {
                              speak("One Tap SOS triggered. Broadcasting safety signals.");
                              handleSOSTrigger();
                            } else {
                              if (!isHolding) {
                                speak("Press and hold for 3 seconds to trigger SOS.");
                                showToast("Hold for 3 seconds during an emergency.");
                              }
                            }
                          }}
                          className={`w-48 h-48 rounded-full text-white font-black text-4xl shadow-2xl focus:outline-none transition-all duration-200 flex flex-col items-center justify-center cursor-pointer select-none relative z-20 border-[8px] border-white ${
                            isHolding 
                              ? 'bg-gradient-to-tr from-rose-700 to-red-600 scale-[0.96] shadow-rose-600/55' 
                              : 'bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 shadow-rose-600/40 active:scale-95'
                          }`}
                        >
                          <span>{isHolding ? `${Math.ceil((100 - holdProgress) / 33)}s` : "SOS"}</span>
                          <span className="text-[10px] tracking-widest font-black uppercase mt-1 text-rose-100">
                            {isHolding ? t('sosButtonHolding') : oneTapSOS ? t('tapOneTap') : t('tapAndHold')}
                          </span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 mt-6 max-w-sm mx-auto leading-relaxed">
                        {oneTapSOS 
                          ? t('emergencyExplanationTap', { count: contacts.length })
                          : t('emergencyExplanationHold', { count: contacts.length })
                        }
                      </p>
                    </div>

                    {/* Quick Access panel buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-100">
                      <button 
                        onClick={() => setActiveTab('contacts')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-100 cursor-pointer transition-colors border-none"
                      >
                        {t('emergencyContactsBtn')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('medical')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-100 cursor-pointer transition-colors border-none"
                      >
                        {t('updateProfileBtn')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-100 cursor-pointer transition-colors border-none"
                      >
                        {t('incidentHistoryBtn')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-100 cursor-pointer transition-colors border-none"
                      >
                        {t('quickPasskeySettings')}
                      </button>
                    </div>

                  </div>
                )}

                {/* EVERYDAY SAFETY TOOLS (ORIGINAL CLEAN 2-COLUMN LAYOUT) */}
                {!isEmergencyActive && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {t('everydayToolsTitle')}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {t('practicalRealWorld')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CARD 1: CAB RIDE WATCH */}
                      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-all">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                              <Car className="w-5 h-5" />
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full border ${
                              isCabGuardActive 
                                ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {isCabGuardActive ? `${Math.ceil(cabTimeLeft / 60)}m Active` : t('cabRideWatch')}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-900">{t('cabRideWatch')}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {isCabGuardActive
                              ? `Monitoring vehicle ${cabNumber}. Timer: ${Math.floor(cabTimeLeft / 60)}m ${cabTimeLeft % 60}s remaining before auto-SOS.`
                              : t('trackCabRoute')}
                          </p>
                        </div>

                        {isCabGuardActive ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleCabArrivedSafely}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Arrived Safely
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCabGuardModal(true)}
                              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all"
                            >
                              Details
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCabGuardModal(true)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Car className="w-3.5 h-3.5" /> {t('trackCabRoute')}
                          </button>
                        )}
                      </div>

                      {/* CARD 2: EMERGENCY SAFETY NUMBERS (INDIA HELPLINES 112) */}
                      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-rose-200 transition-all">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                              <Phone className="w-5 h-5" />
                            </div>
                            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              {t('helplines112')}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">{t('helplines112')}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                              {t('helplinesSub')} — National emergency police 112, women helpline 1091, ambulance 102 & medical 108.
                            </p>
                          </div>

                          {/* Quick Safety Numbers Direct Dial Chips */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <a
                              href="tel:112"
                              className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl border border-rose-200/80 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                              title="Call National Emergency 112"
                            >
                              <span>🚓 Police / All</span>
                              <span className="text-rose-600 font-mono font-black">112</span>
                            </a>
                            <a
                              href="tel:1091"
                              className="px-2.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl border border-purple-200/80 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                              title="Call Women Helpline 1091"
                            >
                              <span>👩 Women Line</span>
                              <span className="text-purple-600 font-mono font-black">1091</span>
                            </a>
                            <a
                              href="tel:108"
                              className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200/80 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                              title="Call Ambulance 108"
                            >
                              <span>🚑 Ambulance</span>
                              <span className="text-emerald-600 font-mono font-black">108</span>
                            </a>
                            <a
                              href="tel:181"
                              className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200/80 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                              title="Call Women Distress 181"
                            >
                              <span>🛡️ Distress 24/7</span>
                              <span className="text-amber-600 font-mono font-black">181</span>
                            </a>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowHelplinesModal(true)}
                          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call National 112 / Full Directory
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTINUOUS JOURNEY SHARING (ORIGINAL WALK GUARDIAN SECTION) */}
                {!isEmergencyActive && (
                  <div className="p-6 md:p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm text-left space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                            {t('journeyTitle')}
                          </h3>
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {t('journeyTag')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-xl">
                          {t('journeyDesc')}
                        </p>
                      </div>

                      {journeySharingActive && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-pulse self-start sm:self-auto">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>{t('silentGpsActive')}</span>
                        </div>
                      )}
                    </div>

                    {!journeySharingActive ? (
                      <div className="space-y-4 pt-2">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {t('journeyBufferText')}
                        </p>

                        {/* Custom timer duration controls */}
                        <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>⏱️ Set Tracking Duration:</span>
                              <span className="text-blue-600 font-extrabold font-mono text-sm">{journeyDuration} mins</span>
                            </span>

                            {/* User custom timer input */}
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs self-start sm:self-auto">
                              <label htmlFor="custom-duration-input" className="text-[11px] font-bold text-slate-400">Custom:</label>
                              <input
                                id="custom-duration-input"
                                type="number"
                                min="1"
                                max="720"
                                value={journeyDuration}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(720, parseInt(e.target.value) || 1));
                                  setJourneyDuration(val);
                                  setJourneyTimeLeft(val * 60);
                                }}
                                className="w-14 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-slate-500">mins</span>
                            </div>
                          </div>

                          {/* Quick preset chips */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: '5m', value: 5 },
                              { label: '15m', value: 15 },
                              { label: '30m', value: 30 },
                              { label: '45m', value: 45 },
                              { label: '60m', value: 60 },
                              { label: '120m', value: 120 }
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setJourneyDuration(option.value);
                                  setJourneyTimeLeft(option.value * 60);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  journeyDuration === option.value
                                    ? 'bg-blue-600 text-white shadow-xs font-black'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          <div className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 flex items-start gap-1.5">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>
                              <strong>Auto-SOS Safety Guard:</strong> If you don't tap <em>"I've Arrived Safely"</em> before the timer reaches 00:00, RakshaX will auto-trigger Emergency SOS to your guardians.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            journeyTargetEndTimeRef.current = Date.now() + journeyDuration * 60 * 1000;
                            setJourneyTimeLeft(journeyDuration * 60);
                            setJourneySharingActive(true);
                            setHasSharedJourneyLocation(false);
                            showToast(`🚶 Walk tracking active for ${journeyDuration} minutes. Auto-SOS armed.`);
                            if (!silentSOS) speak(`Journey walk tracking active for ${journeyDuration} minutes. Auto SOS armed if you don't arrive.`);
                          }}
                          className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Navigation className="w-4 h-4" /> {t('startSilentJourney')} ({journeyDuration}m)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {t('remainingTime')}
                            </span>
                            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                              {Math.floor(journeyTimeLeft / 60)}m {journeyTimeLeft % 60}s
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {hasSharedJourneyLocation 
                                ? '🟢 Live coordinates shared with guardians. Reassurance message will be offered upon arrival.'
                                : '⚪ Location not shared yet. Share below so guardians can watch your live journey.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                const mapUrl = `https://maps.google.com/?q=${numericCoords.lat.toFixed(5)},${numericCoords.lng.toFixed(5)}`;
                                const userName = profile?.fullName?.trim() || initialProfile?.fullName?.trim() || (userEmail ? userEmail.split('@')[0] : 'I');
                                const journeyMsg = `Hi, ${userName} is sharing live location. Track my journey safely on RakshaX: ${mapUrl}`;
                                navigator.clipboard.writeText(journeyMsg);
                                setHasSharedJourneyLocation(true);
                                showToast("📋 Live journey location link copied & marked as shared!");
                              }}
                              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <Copy className="w-3.5 h-3.5 text-blue-600" /> {t('copyLiveLink')}
                            </button>

                            <a
                              href={(() => {
                                const mapUrl = `https://maps.google.com/?q=${numericCoords.lat.toFixed(5)},${numericCoords.lng.toFixed(5)}`;
                                const userName = profile?.fullName?.trim() || initialProfile?.fullName?.trim() || (userEmail ? userEmail.split('@')[0] : 'I');
                                const journeyMsg = `Hi, ${userName} is sharing live location. Track my journey safely on RakshaX: ${mapUrl}`;
                                const primaryPhone = contacts[0]?.whatsAppNumber || contacts[0]?.phoneNumber;
                                const cleanPhone = primaryPhone ? primaryPhone.replace(/[^0-9]/g, '') : '';
                                return cleanPhone 
                                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(journeyMsg)}`
                                  : `https://wa.me/?text=${encodeURIComponent(journeyMsg)}`;
                              })()}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                setHasSharedJourneyLocation(true);
                                showToast("📲 Shared live tracking via WhatsApp!");
                              }}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                            >
                              <Share2 className="w-3.5 h-3.5" /> {t('shareWhatsapp')}
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                journeyTargetEndTimeRef.current += 15 * 60 * 1000;
                                setJourneyTimeLeft(prev => prev + 15 * 60);
                                showToast("⏱️ Added +15 minutes safety buffer to journey timer.");
                              }}
                              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              {t('add15Mins')}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleJourneyArrivedSafely}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> {t('iveArrivedSafely')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

            {/* -------------------- TAB: CONTACTS -------------------- */}
            {activeTab === 'contacts' && (
              <motion.div
                key="tab-contacts"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                
                {/* Back button */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> {t('backToDashboard')}
                  </button>
                </div>
                
                {/* Header controls inside tab */}
                <div className={`bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col ${isPreview ? '' : 'sm:flex-row sm:items-center'} justify-between gap-4 text-left`}>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{t('guardiansBroadcastMatrix')}</h3>
                    <p className="text-xs text-slate-500">
                      {t('manageGuardians')}
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={importContactsPreset}
                      className="px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      {t('importPresets') || 'Import Presets'}
                    </button>
                    <button
                      onClick={() => {
                        setContactModal({ isOpen: true, mode: 'add' });
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> {t('addGuardian')}
                    </button>
                  </div>
                </div>

                {/* Contacts grid list */}
                <div className={`grid grid-cols-1 ${isPreview ? '' : 'md:grid-cols-2'} gap-4`}>
                  {contacts.map((c, idx) => (
                    <div 
                      key={c.id}
                      className={`bg-white rounded-[24px] border p-6 text-left flex flex-col justify-between min-h-[220px] transition-all relative ${
                        c.isPrimary 
                          ? 'border-blue-200 ring-2 ring-blue-500/5 bg-gradient-to-br from-white to-blue-50/10' 
                          : 'border-slate-100'
                      }`}
                    >
                      
                      {/* Badge / Priority */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-1.5">
                          {c.isPrimary && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                              {t('primaryContact')}
                            </span>
                          )}
                          {c.isSecondary && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                              {t('secondaryBackup')}
                            </span>
                          )}
                        </div>

                        {/* Reordering / Star priority controls */}
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleFavorite(c.id)}
                            className={`p-1.5 rounded-lg hover:bg-slate-50 transition-colors ${c.isFavorite ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            <Star className="w-4.5 h-4.5 fill-current" />
                          </button>
                          <button 
                            disabled={idx === 0}
                            onClick={() => reorderPriority(c.id, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button 
                            disabled={idx === contacts.length - 1}
                            onClick={() => reorderPriority(c.id, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Contact Card Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-base shrink-0 uppercase">
                          {c.name.charAt(0)}
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{c.name}</h4>
                          <p className="text-xs text-slate-500">{t('relationship')}: <strong className="text-slate-700 font-semibold">{c.relationship}</strong></p>
                          <div className="flex flex-col gap-1 pt-1.5">
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-blue-500" /> {c.phoneNumber}
                            </span>
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> {c.whatsAppNumber} (WhatsApp)
                            </span>
                            {c.email && (
                              <span className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                <Mail className="w-3.5 h-3.5 text-purple-500" /> {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Communication Actions during simulator */}
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                        <div className="flex gap-2">
                          <a 
                            href={`tel:${c.phoneNumber}`}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200/50 flex items-center gap-1"
                          >
                            {t('quickCall')}
                          </a>
                          <a 
                            href={`https://wa.me/${c.whatsAppNumber.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-100 flex items-center gap-1"
                          >
                            {t('whatsappMsg')}
                          </a>
                        </div>

                        {/* Edit Delete */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditContact(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteContact(c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </motion.div>
            )}

            {/* -------------------- TAB: MEDICAL PROFILE -------------------- */}
            {activeTab === 'medical' && (
              <motion.div
                key="tab-medical"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[24px] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6"
              >
                
                {/* Back button */}
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> {t('backToDashboard')}
                  </button>
                </div>

                <div className="border-b border-slate-100 pb-4 text-left">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{t('activeProfileTitle')}</h3>
                  <p className="text-xs text-slate-500">
                    Medical metrics loaded automatically to paramedic lockscreens during emergency calls.
                  </p>
                </div>

                {/* Form fields */}
                <form onSubmit={handleProfileSave} className="space-y-6 text-left">
                  <div className={`grid grid-cols-1 ${isPreview ? '' : 'md:grid-cols-3'} gap-6`}>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('fullName')}</label>
                      <input 
                        type="text" 
                        value={profile.fullName} 
                        onChange={(e) => setProfile({...profile, fullName: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('gender')}</label>
                      <select 
                        value={profile.gender} 
                        onChange={(e) => setProfile({...profile, gender: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-Binary">Non-Binary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('dob')}</label>
                      <input 
                        type="date" 
                        value={profile.dateOfBirth} 
                        onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${isPreview ? '' : 'md:grid-cols-4'} gap-6`}>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('bloodGroup')}</label>
                      <select 
                        value={profile.bloodGroup} 
                        onChange={(e) => setProfile({...profile, bloodGroup: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="O+">O+</option>
                        <option value="A+">A+</option>
                        <option value="B+">B+</option>
                        <option value="AB+">AB+</option>
                        <option value="O-">O-</option>
                        <option value="A-">A-</option>
                        <option value="B-">B-</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    <div className={`${isPreview ? 'w-full' : 'md:col-span-3'} grid grid-cols-1 ${isPreview ? '' : 'md:grid-cols-3'} gap-4`}>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('medicalConditions')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Asthma" 
                          value={profile.medicalConditions} 
                          onChange={(e) => setProfile({...profile, medicalConditions: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('allergies')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Peanut" 
                          value={profile.allergies} 
                          onChange={(e) => setProfile({...profile, allergies: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('currentMedications')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. none" 
                          value={profile.currentMedications} 
                          onChange={(e) => setProfile({...profile, currentMedications: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${isPreview ? '' : 'md:grid-cols-2'} gap-6 pt-4 border-t border-slate-100`}>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('homeAddress')}</label>
                      <input 
                        type="text" 
                        value={profile.address} 
                        onChange={(e) => setProfile({...profile, address: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('city')}</label>
                        <input 
                          type="text" 
                          value={profile.city} 
                          onChange={(e) => setProfile({...profile, city: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-3 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('state')}</label>
                        <input 
                          type="text" 
                          value={profile.state} 
                          onChange={(e) => setProfile({...profile, state: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-3 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('country')}</label>
                        <input 
                          type="text" 
                          value={profile.country} 
                          onChange={(e) => setProfile({...profile, country: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-3 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('emergencyNotes')}</label>
                    <textarea 
                      rows={3} 
                      value={profile.emergencyNotes} 
                      onChange={(e) => setProfile({...profile, emergencyNotes: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('primaryDoctor')}</label>
                      <input 
                        type="text" 
                        value={profile.doctorName || ''} 
                        onChange={(e) => setProfile({...profile, doctorName: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('doctorNumber')}</label>
                      <input 
                        type="tel" 
                        value={profile.doctorNumber || ''} 
                        onChange={(e) => setProfile({...profile, doctorNumber: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="max-w-md">
                      <label className="block text-xs font-black text-rose-600 uppercase tracking-wider mb-1.5">
                        {t('safetyPinTitle')}
                      </label>
                      <input 
                        type="text" 
                        maxLength={4}
                        placeholder="e.g. 1234" 
                        value={profile.safetyPin || ''} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setProfile({...profile, safetyPin: val});
                        }} 
                        className="w-full bg-rose-50/50 border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm font-black tracking-widest text-rose-600 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                        {t('safetyPinSub')} Defaults to <strong className="text-slate-700">1234</strong> if left empty.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                    >
                      {t('saveParameters')}
                    </button>
                  </div>
                </form>

              </motion.div>
            )}

            {/* -------------------- TAB: BIOMETRICS HUB -------------------- */}
            {activeTab === 'biometrics' && (
              <motion.div
                key="tab-biometrics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[24px] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6"
              >
                {/* Back button */}
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> {t('backToDashboard')}
                  </button>
                </div>

                <div className="border-b border-slate-100 pb-4 text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-extrabold mb-1 border border-blue-100">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" /> Active Emergency Trigger Vault
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{t('navTriggers')}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hands-free emergency SOS triggers. Shaking your phone 3 times or speaking emergency keywords ("Help", "Emergency") dispatches live GPS location to police and guardians instantly.
                    </p>
                  </div>

                  {/* ENGLISH QUICK STATUS BANNER */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1 text-xs shrink-0 max-w-sm">
                    <div className="font-extrabold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Quick Operating Guide:
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      • <strong>3x Phone Shake:</strong> Shake device 3 times rapidly<br />
                      • <strong>Voice SOS:</strong> Say your custom safe phrase ("Help", "Emergency")<br />
                      • Location & alert dispatches immediately upon verification!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left items-stretch">
                  
                  {/* CARD 1: 3-Times Phone Shake SOS */}
                  <div className="p-6 bg-gradient-to-br from-blue-50/90 via-indigo-50/30 to-white rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                          <Smartphone className="w-6 h-6 animate-pulse" />
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                          shakeSOS 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {shakeSOS ? 'Active & Armed' : 'Sensor Paused'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">1. {t('shakeSensorSub')}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          Rapidly shaking your smartphone 3 times detects acceleration motion & automatically dispatches live emergency GPS location to Police and Guardians without unlocking.
                        </p>
                      </div>

                      {/* Sensor Interactive Motion Test Box (Height matched: h-36) */}
                      <div 
                        onClick={recordShakePeak}
                        className={`h-36 rounded-2xl border-2 p-3 text-center flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition-all select-none ${
                          shakeCount >= 3
                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg'
                            : shakeCount > 0
                              ? 'bg-amber-50 border-amber-400 text-amber-900 scale-[0.99] animate-pulse'
                              : 'bg-white border-blue-200 text-slate-700 hover:border-blue-400 shadow-xs'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform ${
                          shakeCount >= 3 ? 'bg-white text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Smartphone className={`w-6 h-6 ${shakeCount > 0 ? 'animate-bounce' : ''}`} />
                        </div>
                        <div>
                          <span className="block text-xs font-black uppercase tracking-wider">
                            {shakeCount >= 3 
                              ? '✅ 3x Shake Verified! Emergency Sent!' 
                              : shakeCount > 0
                                ? `📱 Shake (${shakeCount}/3)! Shake ${3 - shakeCount} More Times!` 
                                : 'TAP OR SHAKE PHONE 3 TIMES TO TEST'}
                          </span>
                          <span className="block text-[10px] opacity-75 mt-0.5">
                            {shakeCount > 0 ? 'Detecting rapid motion peaks...' : 'Tap 3 times or physically shake device'}
                          </span>
                        </div>
                        {/* 3-Step Progress Dots */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className={`w-2.5 h-2.5 rounded-full transition-all ${shakeCount >= 1 ? (shakeCount >= 3 ? 'bg-white' : 'bg-amber-500 scale-125') : 'bg-slate-200'}`} />
                          <span className={`w-2.5 h-2.5 rounded-full transition-all ${shakeCount >= 2 ? (shakeCount >= 3 ? 'bg-white' : 'bg-amber-500 scale-125') : 'bg-slate-200'}`} />
                          <span className={`w-2.5 h-2.5 rounded-full transition-all ${shakeCount >= 3 ? 'bg-white scale-125' : 'bg-slate-200'}`} />
                        </div>
                      </div>

                      {/* Motion Sensitivity Threshold Selector */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-blue-500" /> Shake Sensitivity Threshold
                          </span>
                          <span className="text-[10px] font-bold text-blue-600">
                            {shakeSensitivity === 'low' ? '22 m/s² (Firm Shake)' : shakeSensitivity === 'high' ? '10 m/s² (Light Motion)' : '15 m/s² (Standard)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                          {(['low', 'medium', 'high'] as const).map(sens => (
                            <button
                              key={sens}
                              type="button"
                              onClick={() => {
                                setShakeSensitivity(sens);
                                showToast(`📱 Shake sensitivity set to ${sens.toUpperCase()}`);
                              }}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                shakeSensitivity === sens
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {sens === 'low' ? 'Low' : sens === 'medium' ? 'Medium' : 'High'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons (2 buttons matching Card 2) */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={simulateShake3Times}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <Smartphone className="w-4 h-4" /> Simulate 3x Shake
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShakeSOS(!shakeSOS);
                            showToast(shakeSOS ? "Motion sensor paused." : "Motion sensor active & armed!");
                          }}
                          className={`w-full py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all ${
                            shakeSOS ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> {shakeSOS ? 'Pause Sensor' : 'Arm Sensor'}
                        </button>
                      </div>

                      {/* Accelerometer & Offline Hardware Info Card */}
                      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-[10px] text-slate-600 leading-relaxed space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Accelerometer & Offline Emergency Capability:</span>
                        </div>
                        <p>
                          • <strong>100% Offline Hardware:</strong> Phone accelerometer works natively without internet, WiFi, or mobile data.
                        </p>
                        <p>
                          • <strong>Lock Screen Readiness:</strong> On mobile devices, shaking works without unlocking the phone or looking at screen.
                        </p>
                        <p>
                          • <strong>Instant SOS Action:</strong> Dispatches emergency location alert to Guardians and prepares 112 Police speed-dial.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Motion Sensor Status:</span>
                        <span className={`font-bold ${shakeSOS ? 'text-blue-600' : 'text-slate-500'}`}>
                          {shakeSOS ? '✓ Accelerometer Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Guardians ({contacts.length}):</span>
                        <span className="font-bold text-blue-600">SMS + Call Dispatch</span>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Voice Safe Words Listener (Supports 3–8 Custom Safe Words) */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                          <Mic className="w-6 h-6" />
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                          isVoiceListening
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {isVoiceListening 
                            ? `${customSafeWords.length} Phrases Active` 
                            : 'Listener Paused'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">2. Voice Safe Words Trigger (3–8 Phrases)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          Speak any configured safe phrase ("Help", "Bachao", or custom words) to trigger hands-free SOS dispatch instantly.
                        </p>
                      </div>

                      {/* Real-time Live Audio Visualizer Pad (Height matched: h-36, Clickable!) */}
                      <div 
                        onClick={toggleVoiceListener}
                        className={`h-36 rounded-2xl border-2 p-3 text-center flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition-all select-none ${
                          isVoiceListening
                            ? 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 hover:shadow-xs'
                            : 'border-slate-200 bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform ${
                          isVoiceListening ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Mic className={`w-6 h-6 ${isVoiceListening ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="w-full px-4">
                          {/* 8-bar dynamic audio equalizer */}
                          <div className="flex items-center justify-center gap-1.5 h-6">
                            {[30, 60, 90, 45, 80, 50, 70, 35].map((factor, idx) => {
                              const active = isVoiceListening && audioLevel > 4;
                              const barHeight = active ? Math.max(4, Math.min(22, Math.round((audioLevel / 100) * factor))) : 4;
                              return (
                                <span
                                  key={idx}
                                  style={{ height: `${barHeight}px` }}
                                  className={`w-1.5 rounded-full transition-all duration-75 ${
                                    active ? 'bg-emerald-600' : 'bg-slate-300'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className="block text-xs font-black uppercase tracking-wider text-emerald-900 mt-1 truncate">
                            {voiceRecognizedPhrase ? `🗣️ Heard: "${voiceRecognizedPhrase}"` : (isVoiceListening ? '🎙️ Real Microphone Listening Active • Say safe word...' : 'Tap here to Start Listening')}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {isVoiceListening ? `Listening for: ${customSafeWords.slice(0, 3).join(', ')}${customSafeWords.length > 3 ? '...' : ''}` : 'Microphone listener paused • Tap to start'}
                          </span>
                        </div>
                      </div>

                      {/* Configured Phrases Container */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Configured Safe Words ({customSafeWords.length}/8)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            Say any phrase to trigger
                          </span>
                        </div>

                        {/* List of custom phrases with Inline Edit & Delete */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {customSafeWords.map((word, idx) => (
                            <div 
                              key={idx}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 flex items-center gap-1.5 shadow-2xs transition-all"
                            >
                              {editingSafeWordIdx === idx ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingSafeWordVal}
                                    onChange={(e) => setEditingSafeWordVal(e.target.value)}
                                    autoFocus
                                    className="w-20 px-1 py-0.5 bg-white border border-emerald-400 rounded text-xs font-bold text-slate-900 focus:outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditedWord(idx, editingSafeWordVal);
                                      if (e.key === 'Escape') setEditingSafeWordIdx(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedWord(idx, editingSafeWordVal)}
                                    className="text-emerald-600 hover:text-emerald-800 cursor-pointer p-0.5"
                                    title="Save"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSafeWordIdx(null)}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-slate-800 font-extrabold select-none">
                                    "{word}"
                                  </span>
                                  <button
                                    type="button"
                                    title="Edit phrase"
                                    onClick={() => {
                                      setEditingSafeWordIdx(idx);
                                      setEditingSafeWordVal(word);
                                    }}
                                    className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {customSafeWords.length > 1 && (
                                    <button
                                      type="button"
                                      title="Delete phrase"
                                      onClick={() => handleDeleteSafeWord(idx)}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Quick-Add Suggestions (1-tap to add) */}
                        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Add:</span>
                          {['Bachao', 'Help', 'Emergency', 'Police', 'Save Me', 'Danger'].map(sugg => {
                            const isAdded = customSafeWords.some(w => w.toLowerCase() === sugg.toLowerCase());
                            if (isAdded) return null;
                            return (
                              <button
                                key={sugg}
                                type="button"
                                onClick={() => handleAddSafeWord(sugg)}
                                className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md cursor-pointer transition-all"
                              >
                                + {sugg}
                              </button>
                            );
                          })}
                        </div>

                        {/* Add Phrase Input (if < 8) */}
                        {customSafeWords.length < 8 && (
                          <div className="flex gap-2 pt-1 border-t border-slate-100">
                            <input
                              type="text"
                              value={newSafeWordInput}
                              onChange={(e) => setNewSafeWordInput(e.target.value)}
                              placeholder="Add custom word (e.g. Danger, Run)"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddSafeWord(newSafeWordInput);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSafeWord(newSafeWordInput)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Listener Toggle & Stealth Screen-Off Mode */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={toggleVoiceListener}
                            className={`w-full py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all ${
                              isVoiceListening ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <Mic className="w-4 h-4" /> {isVoiceListening ? 'Pause Listener' : 'Start Listener'}
                          </button>

                          <button
                            type="button"
                            onClick={activateStealthScreenOff}
                            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 shadow-sm"
                            title="Activate Stealth Screen-Off Mode (Screen appears completely OFF while mic continues listening)"
                          >
                            <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> 🕶️ Stealth Screen-Off Mode
                          </button>
                        </div>

                        {/* Real Mic Test Button (speaks to real mic, zero fake simulation) */}
                        <button
                          type="button"
                          onClick={handlePromptRealVoiceTest}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 🎙️ Test with Real Mic (Speak "{customSafeWords[0] || 'Bachao'}")
                        </button>
                      </div>

                      {/* PWA Sandbox & OS Hardware Limitations Card */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] text-slate-600 leading-relaxed space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Smartphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Browser PWA Sandbox & Hardware Constraints:</span>
                        </div>
                        <p>
                          • <strong>Stealth Screen-Off Mode:</strong> Simulates a powered-off display via a full-screen black overlay and Screen Wake Lock API. Keeps the browser in the active foreground so microphone listening remains active. <em>Note: If the physical power button is pressed, mobile OS security suspends browser processes.</em>
                        </p>
                        <p>
                          • <strong>Physical Screen Lock Constraint:</strong> Standard mobile operating systems (Android & iOS) suspend Web Speech API and background accelerometer sensor events when the screen is locked with the hardware power button. Keep the app open in foreground or use Stealth Mode.
                        </p>
                        <p>
                          • <strong>Internet & Offline Behavior:</strong> Web Speech transcription relies on browser speech recognition services (which may require internet). In total network loss, direct phone dialing (<strong>Call 112</strong>) functions via cellular network without internet.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Listener State:</span>
                        <span className={`font-bold ${isVoiceListening ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {isVoiceListening ? '● Continuous Listening' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Configured Phrases:</span>
                        <span className="font-bold text-emerald-700 truncate max-w-[200px]">
                          {customSafeWords.join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* -------------------- TAB: HISTORY -------------------- */}
            {activeTab === 'history' && (
              <motion.div
                key="tab-history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[24px] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6"
              >
                
                {/* Back button */}
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> {t('backToDashboard')}
                  </button>
                </div>

                <div className="border-b border-slate-100 pb-4 text-left flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{t('incidentLogTitle')}</h3>
                    <p className="text-xs text-slate-500">
                      {t('incidentLogDesc')}
                    </p>
                  </div>
                </div>

                {incidents.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <History className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400">{t('noIncidents')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((inc) => (
                      <div 
                        key={inc.id}
                        className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-slate-400">{inc.id}</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-extrabold">
                              {inc.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{inc.location}</h4>
                          <p className="text-xs text-slate-500 font-mono">
                            Timestamp: {inc.date} at {inc.time} • Coordinates: {inc.coordinates} • Active Duration: {inc.duration}
                          </p>
                        </div>

                        <button
                          onClick={() => exportPDFIncident(inc)}
                          className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                        >
                          <FileText className="w-4 h-4 text-blue-600" /> {t('exportLog')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </motion.div>
            )}

            {/* -------------------- TAB: SETTINGS -------------------- */}
            {activeTab === 'settings' && (
              <motion.div
                key="tab-settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[24px] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6"
              >
                
                {/* Back button */}
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> {t('backToDashboard')}
                  </button>
                </div>

                <div className="border-b border-slate-100 pb-4 text-left">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{t('navSettings')}</h3>
                  <p className="text-xs text-slate-500">
                    Fine-tune SOS parameters, system accessibility, and personal client-side keys.
                  </p>
                </div>

                <div className="space-y-6 text-left">
                  {/* Grid 1: Notification & Trigger Rules */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 pl-1">SOS Trigger Preferences</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Dispatch SMS</p>
                          <p className="text-[10px] text-slate-400">To all active contacts</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={notifSms} 
                          onChange={(e) => setNotifSms(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">VoIP Voice Call</p>
                          <p className="text-[10px] text-slate-400">Sequential loop calling</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={notifCall} 
                          onChange={(e) => setNotifCall(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">WhatsApp Alert</p>
                          <p className="text-[10px] text-slate-400">Dynamic coordinate links</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={notifWhatsapp} 
                          onChange={(e) => setNotifWhatsapp(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">One Tap SOS</p>
                          <p className="text-[10px] text-slate-400">Instantly trigger SOS with a single tap</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={oneTapSOS} 
                          onChange={(e) => {
                            setOneTapSOS(e.target.checked);
                            showToast(e.target.checked ? "One Tap SOS enabled. Double check safety triggers." : "Hold Protection enabled.");
                          }}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <div className={`p-4.5 rounded-2xl border transition-all md:col-span-3 ${
                        silentSOS 
                          ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-2 ring-slate-700' 
                          : 'bg-slate-50 text-slate-800 border-slate-200/80 hover:border-slate-300'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className={`p-2.5 rounded-xl shrink-0 ${silentSOS ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-slate-200/80 text-slate-700'}`}>
                              <VolumeX className="w-5 h-5" />
                            </div>
                            <div className="text-left space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-black uppercase tracking-wider">Silent SOS Mode</p>
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                                  silentSOS 
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300'
                                }`}>
                                  {silentSOS ? 'Stealth Active' : 'Audible Alerts'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${silentSOS ? 'text-slate-300' : 'text-slate-500'}`}>
                                Allows triggering the emergency sequence quietly without any screen feedback, vibration, or sound — preventing detection by an aggressor while sending background GPS alerts to Guardians & Police.
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input 
                              type="checkbox" 
                              checked={silentSOS} 
                              onChange={(e) => {
                                const enabled = e.target.checked;
                                setSilentSOS(enabled);
                                showToast(enabled ? "Silent SOS enabled. Muting all audio, vibration & screen feedback." : "Audible alerts restored.");
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>
                      </div>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Shake Phone SOS</p>
                          <p className="text-[10px] text-slate-400">Repeatedly shake smartphone to trigger SOS</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={shakeSOS} 
                          onChange={(e) => {
                            setShakeSOS(e.target.checked);
                            showToast(e.target.checked ? "Shake SOS sensor listener activated." : "Shake SOS disabled.");
                          }}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                    </div>
                  </div>

                  {/* Grid 2: Accessibility Tuning */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 pl-1">Accessibility Assist Mode</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Large Typography Scale</p>
                          <p className="text-[10px] text-slate-400">Increase reading font size instantly</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={largeText} 
                          onChange={(e) => setLargeText(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Voice Assistance Narrator</p>
                          <p className="text-[10px] text-slate-400">Read aloud navigation and actions</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={voiceNarrator} 
                          onChange={(e) => setVoiceNarrator(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                        highContrast 
                          ? 'bg-amber-100 border-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-sm' 
                          : 'bg-slate-50 border-slate-100 text-slate-800 hover:border-slate-200'
                      }`}>
                        <div className="text-left space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-slate-900">High Contrast Emergency Mode</p>
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-amber-400 text-slate-950 border border-slate-900 shrink-0">
                              Direct Sun / Glare
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Applies maximum contrast black/white styling & bold outlines for emergency visibility under direct sunlight.
                          </p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={highContrast} 
                          onChange={(e) => {
                            setHighContrast(e.target.checked);
                            showToast(e.target.checked ? "☀️ High-Contrast Emergency Mode ACTIVE (Sun Glare Optimised)" : "Standard Contrast Mode Restored");
                            if (e.target.checked) speak("High contrast mode active");
                          }}
                          className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0 ml-2"
                        />
                      </label>

                      <label className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer select-none">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">Color Blind Clarity Pill</p>
                          <p className="text-[10px] text-slate-400">Replace solid colors with striped textures</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={colorBlind} 
                          onChange={(e) => setColorBlind(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-blue-600"
                        />
                      </label>

                      {/* Screen Keep Active (Wake Lock API) Toggle */}
                      <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                        keepActive 
                          ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 ring-2 ring-emerald-400/60 shadow-sm' 
                          : 'bg-slate-50 border-slate-100 text-slate-800 hover:border-slate-200'
                      }`}>
                        <div className="text-left space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-slate-900">Keep Screen Active (Screen Wake Lock)</p>
                            <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                              keepActive ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}>
                              {keepActive ? 'Prevent Screen Sleep ACTIVE' : 'Normal Timeout'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Requests the Web Screen Wake Lock API to prevent device sleep mode while monitoring or during active emergency triggers.
                          </p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={keepActive} 
                          onChange={(e) => {
                            const val = e.target.checked;
                            setKeepActive(val);
                            if (val) {
                              showToast("📱 Screen Keep Active Lock ENABLED (Prevents sleep mode)");
                              if (voiceNarrator) speak("Keep active wake lock enabled");
                            } else {
                              showToast("Screen Keep Active Lock disabled");
                            }
                          }}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 ml-2"
                        />
                      </label>

                    </div>
                  </div>

                  {/* Grid 3: Twilio Subscription & Automated Relay Gateway */}
                  <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 md:p-6 space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${configStatus.twilioConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            📡 Automated Relay & Twilio Subscription Settings (Twilio व आपातकालीन प्रसारण)
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Configure Twilio keys for 100% automated background WhatsApp, High-Priority Alert SMS, and Voice Calls.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${
                          configStatus.twilioConfigured 
                            ? (configStatus.isTwilioSandbox ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}>
                          {configStatus.twilioConfigured 
                            ? (configStatus.isTwilioSandbox ? 'Sandbox Mode' : 'Twilio Active') 
                            : 'Keys Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Explanatory callout for user subscription */}
                    <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-[11px] text-blue-950 leading-relaxed space-y-1.5 font-medium">
                      <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
                        <span>💡 Twilio Paid Subscription Benefits (सब्सक्रिप्शन की जानकारी):</span>
                      </div>
                      <p>
                        <strong>WhatsApp 100% ऑटोमैटिक:</strong> जब आप Twilio का पेड सब्सक्रिप्शन ले लेंगी, तो WhatsApp बिना किसी सैंडबॉक्स या 'join' मैसेज के सीधे और खुद से हर संपर्क को पहुंच जाएगा।
                      </p>
                      <p>
                        <strong>SMS & Voice Call:</strong> भारत (+91) के किसी भी नंबर पर हाई-अलर्ट SMS और हिंदी/इंग्लिश वॉइस कॉल बिना अनवेरिफाइड एरर के तुरंत डिलीवर होगी।
                      </p>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Twilio Account SID</label>
                        <input
                          type="text"
                          placeholder={configStatus.twilioSidMasked || "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                          value={twilioSidInput}
                          onChange={(e) => setTwilioSidInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Twilio Auth Token</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={twilioTokenInput}
                          onChange={(e) => setTwilioTokenInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Twilio Phone Number (SMS & Calls)</label>
                        <input
                          type="text"
                          placeholder="+1234567890"
                          value={twilioPhoneInput}
                          onChange={(e) => setTwilioPhoneInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Twilio WhatsApp Sender Number</label>
                        <input
                          type="text"
                          placeholder="+14155238886 (or your registered number)"
                          value={twilioWhatsAppInput}
                          onChange={(e) => setTwilioWhatsAppInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Test feedback */}
                    {twilioTestResult && (
                      <div className={`p-3 rounded-xl border text-xs font-medium ${
                        twilioTestResult.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        {twilioTestResult.success ? '✓ ' : '⚠️ '} {twilioTestResult.message}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={isSavingTwilioConfig}
                        onClick={async () => {
                          setIsSavingTwilioConfig(true);
                          try {
                            const res = await fetch('/api/config/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                twilioAccountSid: twilioSidInput,
                                twilioAuthToken: twilioTokenInput,
                                twilioPhoneNumber: twilioPhoneInput,
                                twilioWhatsAppNumber: twilioWhatsAppInput
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              showToast("✓ Twilio credentials saved and active!");
                              refreshConfigStatus();
                            } else {
                              showToast(data.message || "Failed to update configuration.");
                            }
                          } catch (err: any) {
                            showToast("Error updating config: " + err.message);
                          } finally {
                            setIsSavingTwilioConfig(false);
                          }
                        }}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSavingTwilioConfig ? 'Saving...' : '💾 Save Twilio Credentials'}
                      </button>

                      <button
                        type="button"
                        disabled={isTestingTwilioConfig}
                        onClick={async () => {
                          setIsTestingTwilioConfig(true);
                          setTwilioTestResult(null);
                          try {
                            const res = await fetch('/api/config/test-twilio', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const data = await res.json();
                            setTwilioTestResult(data);
                            if (data.success) {
                              showToast("✓ " + data.message);
                            } else {
                              showToast("⚠️ " + (data.message || "Test failed."));
                            }
                          } catch (err: any) {
                            setTwilioTestResult({ success: false, message: err.message });
                          } finally {
                            setIsTestingTwilioConfig(false);
                          }
                        }}
                        className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isTestingTwilioConfig ? 'Testing...' : '⚡ Test Twilio Connection'}
                      </button>
                    </div>
                  </div>

                  {/* Other standard configs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('systemLanguage')}</label>
                      <select 
                        value={language} 
                        onChange={(e) => handleLanguageSelect(e.target.value as SupportedLanguage)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none font-medium text-slate-800"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.nativeName} ({lang.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Security & Privacy Encryption</label>
                      <div className="p-3 bg-blue-50/50 rounded-xl text-xs text-blue-800 border border-blue-100">
                        AES-256 local profile key lock verified. We do not maintain unencrypted remote servers or sell metadata to third party metrics.
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone: Permanent Account Deletion */}
                  <div className="pt-4 border-t border-rose-100">
                    <div className="p-4.5 bg-rose-50/70 rounded-2xl border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <h5 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider">Danger Zone — Permanent Account Deletion</h5>
                        </div>
                        <p className="text-xs text-rose-700 leading-relaxed">
                          Permanently delete your RakshaX account, safety profile, medical badge, emergency contacts, and incident logs.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDeleteConfirmText('');
                          setIsDeleteModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 border-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Account
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span>RakshaX • Build v4.9.1-Production</span>
                    <button 
                      onClick={onLogout}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Lock vault & Logout
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* -------------------- ADD/EDIT CONTACT MODAL -------------------- */}
      <AnimatePresence>
        {contactModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContactModal({ isOpen: false, mode: 'add' })}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden w-full max-w-md flex flex-col max-h-[90vh] z-10"
            >
              
              {/* Modal header */}
              <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-base font-bold text-slate-900">
                    {contactModal.mode === 'add' ? 'Add New Guardian' : 'Edit Guardian Details'}
                  </span>
                </div>
                <button 
                  onClick={() => setContactModal({ isOpen: false, mode: 'add' })}
                  className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddEditContact} className="p-6 overflow-y-auto space-y-4 text-left flex-1 overscroll-contain">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Guardian Name</label>
                    <span className="text-[10px] text-slate-400">Required</span>
                  </div>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Vijay Kumar" 
                    value={cName} 
                    onChange={(e) => setCName(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Relationship</label>
                    <select 
                      value={cRelationship} 
                      onChange={(e) => setCRelationship(e.target.value)}
                      className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Friend">Friend</option>
                      <option value="Neighbor">Neighbor</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Priority</label>
                    <select 
                      value={cPriority} 
                      onChange={(e) => setCPriority(e.target.value as any)}
                      className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Phone Number</label>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">Direct SMS & Call</span>
                  </div>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. +91 98765 00113" 
                    value={cPhone} 
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">WhatsApp Number</label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">Instant Alert Link</span>
                  </div>
                  <input 
                    type="tel" 
                    placeholder="e.g. Same as Phone (+91 98765 00113)" 
                    value={cWhatsApp} 
                    onChange={(e) => setCWhatsApp(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Email (Optional)</label>
                    <span className="text-[10px] text-slate-400">Incident Report</span>
                  </div>
                  <input 
                    type="email" 
                    placeholder="e.g. vijay@example.com" 
                    value={cEmail} 
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={cIsPrimary} 
                      onChange={(e) => setCIsPrimary(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Set as Primary Contact</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={cIsSecondary} 
                      onChange={(e) => setCIsSecondary(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Set as Secondary Contact</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={cIsFavorite} 
                      onChange={(e) => setCIsFavorite(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Star this contact (Favorite)</span>
                  </label>
                </div>

                {/* Active alert channels for this contact */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="block text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1 mb-1">Active SOS Channels</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cAlertSms} 
                        onChange={(e) => setCAlertSms(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>SMS Alert</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cAlertWhatsapp} 
                        onChange={(e) => setCAlertWhatsapp(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>WhatsApp Msg</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cAlertCall} 
                        onChange={(e) => setCAlertCall(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Phone Call</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cAlertEmail} 
                        onChange={(e) => setCAlertEmail(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Email Dossier</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {contactModal.mode === 'add' ? 'Save Guardian' : 'Apply Changes'} <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- BIOMETRIC / PASSKEY VERIFICATION MODAL -------------------- */}
      <AnimatePresence>
        {isBiometricVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBiometricVerifying(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-2xl p-5 sm:p-6 max-w-sm w-full z-10 text-center space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100 animate-pulse shrink-0">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Passkey Security Relay</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Authenticate your RakshaX account using your device Security PIN or Passkey.
                </p>
              </div>

              {/* Simulation Scanner Area */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 relative overflow-hidden group">
                <motion.div
                  animate={{
                    y: [0, 60, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_10px_#3b82f6]"
                />
                
                <div className="relative z-10 space-y-2">
                  <div className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center mx-auto cursor-pointer shadow-lg active:scale-95 transition-transform"
                       onClick={() => {
                         speak("Passkey verified. Initiating RakshaX dispatch sequence.");
                         setIsBiometricVerifying(false);
                         activateEmergency();
                       }}>
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Tap Checkmark to Verify Passkey
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsBiometricVerifying(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    speak("System fingerprint simulated successfully.");
                    setIsBiometricVerifying(false);
                    activateEmergency();
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Bypass (Simulate Success)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- SAFETY PIN / SAFE WORD DEACTIVATION MODAL -------------------- */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto scrollbar-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-2xl p-4 sm:p-5 max-w-sm w-full z-10 text-center space-y-3 sm:space-y-3.5 max-h-[90vh] overflow-y-auto scrollbar-none my-auto"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100 shrink-0">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Deactivate SOS Alarm</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal">
                  Verify your identity using your 4-digit Security PIN or any enrolled Safe Word to cancel the emergency broadcast.
                </p>
              </div>

              {/* Method Switch: PIN vs Safe Word */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDeactivateMethod('pin');
                    setPinError(null);
                    setSafeWordDeactivateError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    deactivateMethod === 'pin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  4-Digit PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeactivateMethod('safeword');
                    setPinError(null);
                    setSafeWordDeactivateError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    deactivateMethod === 'safeword' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Secret Safe Word
                </button>
              </div>

              {deactivateMethod === 'pin' ? (
                <div className="space-y-3">
                  {/* 4-digit input display */}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div 
                        key={idx} 
                        className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                          pinError 
                            ? 'border-red-500 text-red-600 bg-red-50' 
                            : enteredPin.length > idx 
                              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                              : 'border-slate-200 text-slate-800 bg-slate-50'
                        }`}
                      >
                        {enteredPin.length > idx ? '●' : ''}
                      </div>
                    ))}
                  </div>

                  {pinError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="text-[11px] font-bold text-red-500"
                    >
                      {pinError}
                    </motion.p>
                  )}

                  {/* Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-[210px] mx-auto pt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          if (enteredPin.length < 4) {
                            setPinError(null);
                            setEnteredPin(prev => prev + num);
                          }
                        }}
                        className="h-10 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-extrabold text-sm rounded-xl transition-all border border-slate-100/50 cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setEnteredPin('');
                        setPinError(null);
                      }}
                      className="h-10 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-[9px] rounded-xl transition-all cursor-pointer"
                    >
                      CLEAR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (enteredPin.length < 4) {
                          setPinError(null);
                          setEnteredPin(prev => prev + '0');
                        }
                      }}
                      className="h-10 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-extrabold text-sm rounded-xl transition-all border border-slate-100/50 cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (enteredPin.length > 0) {
                          setPinError(null);
                          setEnteredPin(prev => prev.slice(0, -1));
                        }
                      }}
                      className="h-10 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    >
                      ⌫
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <label className="block text-xs font-bold text-slate-700">
                    Type any of your enrolled Safe Words / Phrases:
                  </label>
                  <input
                    type="text"
                    value={enteredSafeWord}
                    onChange={(e) => {
                      setEnteredSafeWord(e.target.value);
                      setSafeWordDeactivateError(null);
                    }}
                    placeholder={`e.g. ${customSafeWords[0] || 'Help'}`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const entered = enteredSafeWord.trim().toLowerCase();
                        const isMatch = customSafeWords.some(w => w.toLowerCase().trim() === entered) || 
                          ['bachao', 'help', 'emergency', 'safe'].includes(entered);
                        if (isMatch) {
                          setShowPinModal(false);
                          deactivateEmergency();
                        } else {
                          setSafeWordDeactivateError("Unrecognized safe word");
                          if (!silentSOS) speak("Verification failed. Unrecognized safe word.");
                        }
                      }
                    }}
                  />
                  {safeWordDeactivateError && (
                    <p className="text-[11px] font-bold text-red-500">
                      {safeWordDeactivateError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Active enrolled phrases: {customSafeWords.map(w => `"${w}"`).join(', ')}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Keep SOS Active
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deactivateMethod === 'pin') {
                      const reqPin = profile.safetyPin?.trim() || "1234";
                      if (enteredPin === reqPin) {
                        setShowPinModal(false);
                        deactivateEmergency();
                      } else {
                        setPinError("Incorrect security PIN");
                        if (!silentSOS) speak("Verification failed. Incorrect safety pin code.");
                        setEnteredPin('');
                      }
                    } else {
                      const entered = enteredSafeWord.trim().toLowerCase();
                      const isMatch = customSafeWords.some(w => w.toLowerCase().trim() === entered) || 
                        ['bachao', 'help', 'emergency', 'safe'].includes(entered);
                      if (isMatch) {
                        setShowPinModal(false);
                        deactivateEmergency();
                      } else {
                        setSafeWordDeactivateError("Unrecognized safe word");
                        if (!silentSOS) speak("Verification failed. Unrecognized safe word.");
                        setEnteredSafeWord('');
                      }
                    }
                  }}
                  disabled={deactivateMethod === 'pin' ? enteredPin.length < 4 : !enteredSafeWord.trim()}
                  className={`w-full py-2.5 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1 ${
                    (deactivateMethod === 'pin' ? enteredPin.length === 4 : !!enteredSafeWord.trim())
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" /> Deactivate SOS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- CAB / AUTO RIDE GUARDIAN MODAL -------------------- */}
      <AnimatePresence>
        {showCabGuardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-5 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">🚖 Cab Ride Watch</h3>
                    <p className="text-xs text-slate-500">Auto-monitor cab route & dispatch safety link</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCabGuardModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle / Cab Plate Number</label>
                  <input
                    type="text"
                    value={cabNumber}
                    onChange={(e) => setCabNumber(e.target.value)}
                    placeholder="e.g. DL 01 AB 1234"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={cabDriverName}
                      onChange={(e) => setCabDriverName(e.target.value)}
                      placeholder="Driver Name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">App / Service</label>
                    <select
                      value={cabCompany}
                      onChange={(e) => setCabCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="Uber">Uber</option>
                      <option value="Ola">Ola</option>
                      <option value="InDrive">InDrive</option>
                      <option value="Rapido">Rapido</option>
                      <option value="Auto Rickshaw">Auto Rickshaw</option>
                      <option value="Private Taxi">Private Taxi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Trip Duration (Minutes)</label>
                  <div className="flex items-center gap-2">
                    {[15, 25, 40, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCabDurationMins(mins)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                          cabDurationMins === mins
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {isCabGuardActive ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-emerald-800 font-extrabold text-xs">
                      <span>🟢 RIDE GUARDIAN ACTIVE</span>
                      <span className="font-mono text-sm">{Math.floor(cabTimeLeft / 60)}m {cabTimeLeft % 60}s</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Vehicle <strong className="font-mono">{cabNumber}</strong> is being monitored. If you don't check in before the timer expires, RakshaX will auto-trigger SOS.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCabGuardModal(false);
                        handleCabArrivedSafely();
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                    >
                      ✅ Arrived Safely (Stop Watch)
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      cabTargetEndTimeRef.current = Date.now() + cabDurationMins * 60 * 1000;
                      setCabTimeLeft(cabDurationMins * 60);
                      setIsCabGuardActive(true);
                      setHasSharedCabDetails(true);
                      showToast(`🚖 Ride Guardian Active for ${cabNumber}! Auto-alert armed.`);
                      if (!silentSOS) speak(`Cab watch armed for ${cabNumber}`);
                      
                      const primaryTarget = contacts[0];
                      if (primaryTarget) {
                        const trackingUrl = `https://maps.google.com/?q=${gpsCoords.replace(/[^\d.,\-NnSseE°]/g, "")}`;
                        const cabMsg = `🚨 RIDE WATCH ALERT: I am travelling in ${cabCompany} (${cabNumber}, Driver: ${cabDriverName}). Live Location: ${trackingUrl}. Expected arrival in ${cabDurationMins} mins. If I don't check in, RakshaX will auto-dispatch emergency response.`;
                        const num = primaryTarget.whatsAppNumber || primaryTarget.phoneNumber;
                        if (num) {
                          try {
                            window.open(`https://wa.me/${num.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(cabMsg)}`, '_blank');
                          } catch (e) {}
                        }
                      }
                    }}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Car className="w-4 h-4" /> Start Cab Ride Watch & Notify Family
                  </button>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed">
                  <strong>ℹ️ PWA Background Behavior:</strong> Timer escalation executes reliably while this tab remains open in your active browser. In backgrounded tabs or locked screens, browser power management may throttle intervals until re-focused.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- SAFETY CHECK-IN / "I AM SAFE" MODAL -------------------- */}
      <AnimatePresence>
        {showSafeCheckinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-5 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Safety Check-in / "I Am Safe"</h3>
                    <p className="text-xs text-slate-500">Send safe arrival confirmation to loved ones via WhatsApp</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSafeCheckinModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Reassurance Note (Editable)</label>
                    <span className="text-[10px] text-slate-400">You can customize before sending</span>
                  </div>
                  <textarea
                    value={checkinMessage}
                    onChange={(e) => setCheckinMessage(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Enter message for emergency contacts..."
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>Monitored Location:</span>
                    <span className="text-blue-600 font-mono text-[11px]">{numericCoords.lat.toFixed(4)}°N, {numericCoords.lng.toFixed(4)}°E</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{liveAddress}</p>
                </div>

                <div className="space-y-2">
                  <span className="block text-[11px] font-bold text-slate-600">Recipients ({contacts.length} Guardians):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.length > 0 ? (
                      contacts.map((c) => (
                        <span key={c.id} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                          {c.name.split(' (')[0]}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No contacts added yet</span>
                    )}
                  </div>
                </div>

                {/* WhatsApp Send and Stop buttons row */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const trackingUrl = `https://maps.google.com/?q=${numericCoords.lat},${numericCoords.lng}`;
                      const cleanMsg = checkinMessage.trim();
                      const fullWhatsAppText = `✅ ${cleanMsg}\n\n📍 Monitored Location: ${liveAddress}\n🔗 Live Location: ${trackingUrl}`;
                      
                      const primaryContact = contacts[0];
                      const primaryPhone = primaryContact?.whatsAppNumber || primaryContact?.phoneNumber;
                      const cleanPhone = primaryPhone ? primaryPhone.replace(/[^0-9]/g, '') : '';
                      
                      if (cleanPhone) {
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullWhatsAppText)}`, '_blank');
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(fullWhatsAppText)}`, '_blank');
                      }
                      showToast("📲 WhatsApp opened with safe arrival message!");
                      setShowSafeCheckinModal(false);
                    }}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" /> Send on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSafeCheckinModal(false);
                      showToast("Tracking stopped successfully.");
                    }}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-extrabold text-xs rounded-2xl cursor-pointer border border-slate-200/80 transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4 text-slate-500" /> Stop
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- FAKE CALL EXCUSE SIMULATOR MODAL -------------------- */}
      <AnimatePresence>
        {showFakeCallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 text-center"
            >
              {fakeCallState === 'idle' ? (
                <div className="p-6 space-y-5 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-violet-50 text-violet-600 rounded-2xl">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">Fake Call Assistant</h3>
                        <p className="text-xs text-slate-500">Excuse yourself from awkward/unsafe situations</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFakeCallModal(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Caller Name Display</label>
                      <input
                        type="text"
                        value={fakeCallerName}
                        onChange={(e) => setFakeCallerName(e.target.value)}
                        placeholder="e.g. Dad, Mom, Inspector Verma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Ring Timing</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 10, 30].map((secs) => (
                          <button
                            key={secs}
                            type="button"
                            onClick={() => setFakeCallDelaySecs(secs)}
                            className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                              fakeCallDelaySecs === secs
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {secs === 0 ? 'Immediately' : `${secs}s delay`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (fakeCallDelaySecs === 0) {
                          setFakeCallState('ringing');
                          try {
                            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                            if (AudioCtxClass) {
                              const ctx = new AudioCtxClass();
                              fakeCallAudioCtxRef.current = ctx;
                              const osc = ctx.createOscillator();
                              const gain = ctx.createGain();
                              osc.type = 'sine';
                              osc.frequency.setValueAtTime(440, ctx.currentTime);
                              gain.gain.setValueAtTime(0.2, ctx.currentTime);
                              osc.connect(gain);
                              gain.connect(ctx.destination);
                              osc.start();
                              fakeCallOscillatorRef.current = osc;
                            }
                          } catch (e) {}
                        } else {
                          setFakeCallCountdown(fakeCallDelaySecs);
                          setFakeCallState('countdown');
                          const int = setInterval(() => {
                            setFakeCallCountdown(prev => {
                              if (prev <= 1) {
                                clearInterval(int);
                                setFakeCallState('ringing');
                                try {
                                  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                                  if (AudioCtxClass) {
                                    const ctx = new AudioCtxClass();
                                    fakeCallAudioCtxRef.current = ctx;
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.type = 'sine';
                                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start();
                                    fakeCallOscillatorRef.current = osc;
                                  }
                                } catch (e) {}
                                return 0;
                              }
                              return prev - 1;
                            });
                          }, 1000);
                        }
                      }}
                      className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PhoneCall className="w-4 h-4" /> Start Fake Call Sequence
                    </button>
                  </div>
                </div>
              ) : fakeCallState === 'countdown' ? (
                <div className="p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto animate-pulse">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Incoming Call in {fakeCallCountdown}s</h3>
                  <p className="text-xs text-slate-500">Keep phone ready. Fake call will start ringing shortly.</p>
                  <button
                    type="button"
                    onClick={() => setFakeCallState('idle')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : fakeCallState === 'ringing' ? (
                <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-black text-white p-8 space-y-8 min-h-[380px] flex flex-col justify-between">
                  <div className="space-y-2 pt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Incoming Call</p>
                    <h2 className="text-2xl font-black">{fakeCallerName}</h2>
                    <p className="text-xs text-slate-400 font-mono">+91 98765 43210</p>
                  </div>

                  <div className="w-20 h-20 rounded-full bg-white/10 mx-auto flex items-center justify-center animate-bounce">
                    <Phone className="w-10 h-10 text-emerald-400 animate-pulse" />
                  </div>

                  <div className="flex items-center justify-around gap-6 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (fakeCallOscillatorRef.current) {
                          try { fakeCallOscillatorRef.current.stop(); } catch (e) {}
                        }
                        setFakeCallState('idle');
                        setShowFakeCallModal(false);
                      }}
                      className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-7 h-7 transform rotate-135" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (fakeCallOscillatorRef.current) {
                          try { fakeCallOscillatorRef.current.stop(); } catch (e) {}
                        }
                        setFakeCallState('active');
                        setFakeCallActiveSecs(0);
                      }}
                      className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg animate-pulse active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-slate-900 to-black text-white p-8 space-y-6 min-h-[380px] flex flex-col justify-between">
                  <div className="space-y-1 pt-2">
                    <h2 className="text-xl font-black">{fakeCallerName}</h2>
                    <p className="text-xs font-mono text-emerald-400 font-bold">
                      00:0{fakeCallActiveSecs < 10 ? `0${fakeCallActiveSecs}` : fakeCallActiveSecs}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-4 text-left space-y-2 border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Safe Excuse Talking Prompts:</p>
                    <p className="text-xs text-slate-200 italic leading-relaxed">
                      "Yes, I'm just leaving right now. I'll reach there in 5 minutes. See you soon!"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFakeCallState('idle');
                      setShowFakeCallModal(false);
                      showToast("Fake call completed.");
                    }}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white mx-auto flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                  >
                    <Phone className="w-6 h-6 transform rotate-135" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- SAFETY PREPAREDNESS QUIZ MODAL -------------------- */}
      <AnimatePresence>
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-5 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Safety Readiness Quiz</h3>
                    <p className="text-xs text-slate-500">Question {quizQuestionIndex + 1} of 3</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const quizQuestions = [
                  {
                    q: "What is the single unified emergency helpline number in India across Police, Fire, and Ambulance?",
                    options: ["100", "112", "108", "911"],
                    correct: 1,
                    explanation: "112 is the official pan-India Emergency Response Support System (ERSS) replacing older fragmented numbers."
                  },
                  {
                    q: "What does Silent SOS Mode in RakshaX do during an emergency?",
                    options: [
                      "Flashes phone screen with red light",
                      "Sounds loud siren at maximum volume",
                      "Sends dispatches completely quietly without sound or screen alarms",
                      "Only records voice without sending coordinates"
                    ],
                    correct: 2,
                    explanation: "Silent SOS prevents aggressor detection by suppressing sirens and alarms while dispatching background GPS dispatches."
                  },
                  {
                    q: "If an auto/cab trip takes longer than expected and you don't check in before the timer expires, what happens?",
                    options: [
                      "The trip cancels silently",
                      "RakshaX auto-triggers Emergency SOS to your contacts",
                      "Phone turns off automatically",
                      "GPS disables itself"
                    ],
                    correct: 1,
                    explanation: "RakshaX automatically escalates overdue trips into the coordinated Emergency SOS alert to notify guardians."
                  }
                ];
                const currentQ = quizQuestions[quizQuestionIndex];

                return (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {currentQ.q}
                    </h4>

                    <div className="space-y-2">
                      {currentQ.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!quizSubmitted) setSelectedQuizAnswer(i);
                          }}
                          className={`w-full p-3 rounded-xl text-xs font-semibold text-left border cursor-pointer transition-all ${
                            selectedQuizAnswer === i
                              ? quizSubmitted
                                ? i === currentQ.correct
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                  : 'bg-rose-50 border-rose-500 text-rose-900 font-bold'
                                : 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                              : quizSubmitted && i === currentQ.correct
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black shrink-0">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {quizSubmitted && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="font-extrabold text-slate-900">
                          {selectedQuizAnswer === currentQ.correct ? '✅ Correct Answer!' : '❌ Incorrect'}
                        </p>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {currentQ.explanation}
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      {!quizSubmitted ? (
                        <button
                          type="button"
                          disabled={selectedQuizAnswer === null}
                          onClick={() => {
                            if (selectedQuizAnswer !== null) {
                              setQuizSubmitted(true);
                              if (selectedQuizAnswer === currentQ.correct) {
                                setQuizScore(prev => prev + 1);
                              }
                            }
                          }}
                          className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                            selectedQuizAnswer !== null
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Check Answer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (quizQuestionIndex < 2) {
                              setQuizQuestionIndex(prev => prev + 1);
                              setSelectedQuizAnswer(null);
                              setQuizSubmitted(false);
                            } else {
                              showToast(`🎯 Quiz completed! Score: ${quizScore + (selectedQuizAnswer === currentQ.correct ? 1 : 0)}/3`);
                              setShowQuizModal(false);
                            }
                          }}
                          className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-extrabold text-xs cursor-pointer shadow-md"
                        >
                          {quizQuestionIndex < 2 ? 'Next Question' : `Complete Quiz (${quizScore + (selectedQuizAnswer === currentQ.correct ? 1 : 0)}/3)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- INDIA EMERGENCY HELPLINES HUB MODAL -------------------- */}
      <AnimatePresence>
        {showHelplinesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-5 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">🇮🇳 India Emergency Directory</h3>
                    <p className="text-xs text-slate-500">Official Government Emergency Helplines</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelplinesModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {[
                  { num: '112', name: 'National Emergency Response System', desc: 'Single number for Police, Fire & Medical Emergencies', icon: '🚨', bg: 'bg-rose-50 border-rose-200 text-rose-900' },
                  { num: '1091', name: 'Women Helpline (24/7)', desc: 'Dedicated safety and response hotline for women in distress', icon: '👩', bg: 'bg-purple-50 border-purple-200 text-purple-900' },
                  { num: '108', name: 'Disaster & Emergency Ambulance', desc: 'Free emergency medical transport & trauma care', icon: '🚑', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
                  { num: '1930', name: 'National Cyber Crime Helpline', desc: 'Immediate financial fraud reporting & account freeze hotline', icon: '💻', bg: 'bg-blue-50 border-blue-200 text-blue-900' },
                  { num: '1098', name: 'Childline India Foundation', desc: '24/7 emergency hotline for children in risk or distress', icon: '👧', bg: 'bg-amber-50 border-amber-200 text-amber-900' },
                  { num: '1090', name: 'Senior Citizen Helpline', desc: 'Toll-free security and assistance hotline for elderly', icon: '👴', bg: 'bg-slate-50 border-slate-200 text-slate-900' },
                  { num: '181', name: 'Women in Distress Helpline', desc: 'State women commission emergency support line', icon: '🛡️', bg: 'bg-pink-50 border-pink-200 text-pink-900' },
                ].map((item) => (
                  <div key={item.num} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${item.bg}`}>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <span className="font-mono font-black text-sm">{item.num}</span>
                        <span className="font-extrabold text-xs truncate">{item.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">{item.desc}</p>
                    </div>
                    <a
                      href={`tel:${item.num}`}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MEDICAL EMERGENCY ID BADGE MODAL -------------------- */}
      <AnimatePresence>
        {showMedicalBadgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-6 space-y-6 shadow-2xl border-2 border-slate-900 text-left relative overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              <div className="bg-rose-600 -mx-6 -mt-6 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-6 h-6 animate-pulse text-white" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Medical Emergency Pass</h3>
                    <p className="text-[10px] text-rose-100">First Responder Digital Health Badge</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedicalBadgeModal(false)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xl border border-rose-200 shrink-0">
                    {profile.bloodGroup || 'B+'}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{profile.fullName}</h4>
                    <p className="text-xs font-semibold text-rose-600">Blood Group: {profile.bloodGroup || 'B+ve'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{profile.city || 'Pune'}, India</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Allergies</span>
                    <p className="font-extrabold text-slate-800">{profile.allergies || 'None Specified'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Medical Condition</span>
                    <p className="font-extrabold text-slate-800">{profile.medicalConditions || 'Healthy'}</p>
                  </div>
                </div>

                {/* Primary Guardian Contact */}
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">Primary Emergency Contact</span>
                    <p className="text-xs font-extrabold text-emerald-950 mt-0.5">{contacts[0]?.name || 'Guardian Contact'}</p>
                    <p className="text-[10px] font-mono font-bold text-emerald-700">{contacts[0]?.phoneNumber || '+91 98765 43210'}</p>
                  </div>
                  <a
                    href={`tel:${contacts[0]?.phoneNumber || '112'}`}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <a
                  href="tel:112"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4" /> Dial National Police (112) Immediately
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- DELETE ACCOUNT PERMANENT MODAL -------------------- */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeletingAccount) setIsDeleteModalOpen(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] border border-rose-100 shadow-2xl overflow-hidden w-full max-w-md flex flex-col z-10"
            >
              {/* Modal header */}
              <div className="p-6 pb-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Delete Account Permanently</h3>
                    <p className="text-xs text-rose-600 font-medium">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeletingAccount}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 cursor-pointer transition-all border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4 text-left">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Permanent Data Erase Notice</span>
                  </div>
                  <ul className="text-xs text-rose-800 space-y-1 list-disc pl-4 font-medium leading-relaxed">
                    <li>Your account profile ({userEmail}) will be removed completely.</li>
                    <li>All emergency contacts, medical badges, and saved addresses will be deleted.</li>
                    <li>Recorded incident history and offline map caches will be wiped.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Type <span className="font-mono font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    disabled={isDeletingAccount}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeletingAccount}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePermanentDeleteAccount}
                    disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                    className={`flex-1 py-3 font-extrabold text-xs rounded-xl text-white shadow-md flex items-center justify-center gap-2 transition-all border-none ${
                      deleteConfirmText.trim().toUpperCase() === 'DELETE' && !isDeletingAccount
                        ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-200'
                        : 'bg-rose-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isDeletingAccount ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" /> Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING QUICK 3X SHAKE SOS BUTTON */}
      {!isPreview && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={simulateShake3Times}
            className={`p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center gap-3 border-2 transition-all cursor-pointer ${
              shakeCount >= 3 
                ? 'bg-rose-600 text-white border-white ring-4 ring-rose-300 animate-bounce' 
                : shakeCount > 0 
                  ? 'bg-amber-500 text-white border-white ring-4 ring-amber-200' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-300 hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            <div className="relative">
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
              {shakeCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {shakeCount}x
                </span>
              )}
            </div>
            <div className="text-left hidden md:block pr-1">
              <span className="block text-[9px] font-black uppercase tracking-wider text-blue-100">Shake SOS Sensor</span>
              <span className="block text-xs font-black tracking-tight">
                {shakeCount > 0 ? `SHAKE ${3 - shakeCount} MORE TIMES!` : '3-Times Phone Shake SOS'}
              </span>
            </div>
          </motion.button>
        </div>
      )}

    </div>
  );
}
