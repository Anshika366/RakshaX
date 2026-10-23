import React, { useState, useEffect } from 'react';
import { 
  Shield, Sparkles, ArrowRight, Mail, Phone, MapPin, Instagram, Twitter, Heart, X, 
  CheckCircle2, FileText, Lock, HelpCircle, Info, Send, ExternalLink, Search, AlertCircle,
  User, MessageSquare, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { acquireScrollLock } from '../lib/scrollLock';

interface FooterProps {
  onCreateAccount: () => void;
  onLearnMore: () => void;
}

export default function Footer({ onCreateAccount, onLearnMore }: FooterProps) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  // Active Modal state
  const [activeModal, setActiveModal] = useState<'about' | 'privacy' | 'terms' | 'contact' | 'help' | null>(null);

  // Modal open lifecycle: keyboard dismiss and background scroll prevention
  useEffect(() => {
    if (!activeModal) return;

    const releaseScroll = acquireScrollLock();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseScroll();
    };
  }, [activeModal]);

  // Contact Form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', queryType: 'General Enquiry', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Help search query
  const [helpSearch, setHelpSearch] = useState('');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;

    // Persist inquiry to local browser storage
    try {
      const existingRaw = localStorage.getItem('rakshax_contact_inquiries');
      const inquiries = existingRaw ? JSON.parse(existingRaw) : [];
      inquiries.push({
        id: 'inq_' + Date.now(),
        ...contactForm,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('rakshax_contact_inquiries', JSON.stringify(inquiries.slice(-20)));
    } catch {
      // Local storage full or unavailable
    }

    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', queryType: 'General Enquiry', message: '' });
      setActiveModal(null);
    }, 3000);
  };

  return (
    <footer className="relative border-t border-slate-100/50">
      {/* SECTION 9: FINAL CTA - Original Light Glass style as requested */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 pt-10 pb-12 text-center">
        <div className="glass-panel-heavy rounded-[32px] p-8 md:p-14 relative overflow-hidden glow-blue shadow-2xl bg-white border border-slate-100">
          {/* Subtle gradient light flare */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            {/* Sparkle Icon */}
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t('heroTitle1')} {t('heroTitle2')}
            </h2>
            
            <p className="text-slate-600 text-sm md:text-base mt-4 leading-relaxed font-normal">
              {t('heroSubtitle')}
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full justify-center">
              <button
                type="button"
                onClick={onCreateAccount}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-8 py-4 rounded-full shadow-sm hover:shadow-md hover:shadow-blue-200/50 transition-all duration-200 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 group"
              >
                {t('navGetStarted')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
              <button
                type="button"
                onClick={onLearnMore}
                className="flex items-center justify-center gap-2 border-2 border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-sm px-8 py-4 rounded-full hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                {t('navHowItWorks')}
              </button>
            </div>

            {/* Trust highlights */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 mt-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t('freeToStart')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t('privacyProtected')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t('realtimeAlerts')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER - Dark UI */}
      <div className="bg-slate-950 text-slate-400 border-t border-slate-900 py-12 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-blue-900/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-between">
            
            {/* Footer Logo & Brand info */}
            <div className="md:col-span-4 flex flex-col items-start gap-3">
              <button 
                type="button"
                onClick={() => scrollToSection('home')} 
                className="flex items-center gap-2 group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg p-0.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40 group-hover:scale-105 transition-transform duration-200">
                  <Shield className="w-4 h-4 fill-white/10" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-blue-400 transition-colors flex items-center">
                  Raksha<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-black text-2xl ml-0.5 inline-block">X</span>
                </span>
              </button>
              <p className="text-xs text-slate-400 font-normal leading-relaxed max-w-xs text-left">
                {t('footerTagline')}
              </p>
              <p className="text-[10px] text-amber-400 font-semibold text-left">
                {t('emergencyDisclaimer')}
              </p>
            </div>

            {/* Footer Menu: Home, Features, How It works, About, Privacy, Terms, Contact, Help */}
            <div className="md:col-span-5 flex flex-wrap items-center gap-x-5 gap-y-3 justify-start md:justify-center">
              <button type="button" onClick={() => scrollToSection('home')} className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">{t('navHome')}</button>
              <button type="button" onClick={() => scrollToSection('features')} className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">{t('navFeatures')}</button>
              <button type="button" onClick={() => scrollToSection('how-it-works')} className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">{t('navHowItWorks')}</button>
              <button type="button" onClick={() => scrollToSection('scenarios')} className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">{t('navScenarios')}</button>
              <button type="button" onClick={() => scrollToSection('faq')} className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">{t('navFaq')}</button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => setActiveModal('about')} className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors cursor-pointer underline decoration-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">About</button>
              <button type="button" onClick={() => setActiveModal('privacy')} className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors cursor-pointer underline decoration-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">Privacy</button>
              <button type="button" onClick={() => setActiveModal('terms')} className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors cursor-pointer underline decoration-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">Terms</button>
              <button type="button" onClick={() => setActiveModal('contact')} className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors cursor-pointer underline decoration-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">Contact</button>
              <button type="button" onClick={() => setActiveModal('help')} className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors cursor-pointer underline decoration-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xs py-0.5">Help</button>
            </div>

            {/* Social Icons & Copyright */}
            <div className="md:col-span-3 flex flex-col items-start md:items-end gap-3">
              <div className="flex gap-4">
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" title="Twitter / X">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" title="Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                © {currentYear} RakshaX. {t('allRightsReserved')}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* FOOTER INTERACTIVE MODALS - Clean Light UI matching the RakshaX Website Theme */}
      {activeModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto overscroll-contain animate-fadeIn"
          style={{ overscrollBehavior: 'contain' }}
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/98 border border-slate-200/90 w-full max-w-2xl rounded-[28px] p-6 md:p-8 text-slate-900 relative shadow-2xl my-8 space-y-6 backdrop-blur-2xl ring-1 ring-slate-900/5 overscroll-contain"
          >
            
            {/* Modal Ambient Glow Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header & Navigation Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
                    {activeModal === 'about' && <Info className="w-5 h-5" />}
                    {activeModal === 'privacy' && <Lock className="w-5 h-5" />}
                    {activeModal === 'terms' && <FileText className="w-5 h-5" />}
                    {activeModal === 'contact' && <Mail className="w-5 h-5" />}
                    {activeModal === 'help' && <HelpCircle className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        RakshaX System Info
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {activeModal === 'about' && 'About RakshaX Platform'}
                      {activeModal === 'privacy' && 'Privacy & Local Data Protection'}
                      {activeModal === 'terms' && 'Terms & Emergency Usage Policy'}
                      {activeModal === 'contact' && '24/7 Safety Help Desk'}
                      {activeModal === 'help' && 'Help & Troubleshooting Guide'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="Close Modal"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-Tabs Row */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveModal('about')}
                  className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    activeModal === 'about' 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  About
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    activeModal === 'privacy' 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Privacy
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    activeModal === 'terms' 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Terms
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('contact')}
                  className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    activeModal === 'contact' 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('help')}
                  className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    activeModal === 'help' 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Help
                </button>
              </div>
            </div>

            {/* Modal Content Body - Strictly Real App Capabilities in Clean Light Theme */}
            {activeModal === 'about' && (
              <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin text-left">
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs">
                    <Shield className="w-4 h-4 text-blue-600" /> Real-Time Emergency Broadcast Engine
                  </div>
                  <p className="text-slate-700">
                    RakshaX transforms standard personal web browsers into instantaneous emergency broadcast nodes. When triggered, it calculates precise GPS location, formats SMS/WhatsApp distress templates, and connects directly to emergency services (112) and your trusted contacts.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Core Integrated Features Built In App</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Offline Map Tile Caching
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Pre-caches OpenStreetMap tiles via background Service Worker (`sw.js`) so you can view map coordinates even in cellular dead zones.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Voice & 3x Phone Shake Triggers
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Hands-free activation using custom voice keyphrases ("Help", "Emergency") or shaking phone 3 times rapidly.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Screen Keep-Active Wake Lock
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Utilizes the Web Screen Wake Lock API to keep device screens active during night travel or active SOS monitoring.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Direct Sun High-Contrast Mode
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        One-tap emergency contrast toggle in Settings optimized for bright sunlight glare and high visibility.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'privacy' && (
              <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin text-left">
                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <Lock className="w-4 h-4 text-emerald-600" /> Zero Background Tracking Policy
                  </div>
                  <p className="text-slate-700">
                    RakshaX values absolute privacy. Your location is never logged continuously to external servers or sold to data brokers. Coordinates are queried strictly on your physical device when you actively use the app or trigger an SOS signal.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Data Architecture Principles</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <span className="font-bold text-slate-900">1. Device Local Storage:</span> Emergency contacts, medical profile (blood type, allergies), and preference toggles are stored locally in browser storage.
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <span className="font-bold text-slate-900">2. Ephemeral Emergency Links:</span> SOS tracking URLs are generated on demand with unique session identifiers and expire when marked resolved.
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <span className="font-bold text-slate-900">3. One-Click Reset:</span> You can clear all saved contacts and app preferences anytime from the Settings tab.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'terms' && (
              <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin text-left">
                <p className="text-slate-700">
                  By utilizing the RakshaX emergency dispatch application, you agree to the following terms of operation:
                </p>

                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-slate-900">1. Genuine Emergency Triggering</h5>
                    <p className="text-slate-600 text-[11px]">
                      The SOS dispatch features, police dialer (112), and automatic contact notifications are intended exclusively for genuine distress, personal danger, or medical emergencies.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-slate-900">2. Device Permission Requirements</h5>
                    <p className="text-slate-600 text-[11px]">
                      For full functionality (such as voice keyphrase triggers and offline tile caching), keep browser location permissions, microphone access, and Service Workers enabled.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-slate-900">3. Offline Map Tile Service Worker</h5>
                    <p className="text-slate-600 text-[11px]">
                      Offline maps rely on local browser cache storage (`sw.js`). While offline tiles display current coordinates during cell loss, external police response speed depends on official regional emergency infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'contact' && (
              <div className="text-left">
                {contactSubmitted ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-fadeIn">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-extrabold text-emerald-900">Inquiry Recorded Locally</h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Your query has been recorded locally on this device. For active emergencies, please call the official national helpline <strong className="text-slate-900">112</strong> immediately.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    {/* Quick inquiry chips */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Quick Topic Shortcut
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '⚡ SOS Trigger Help', text: 'Need assistance configuring my 1-tap emergency SOS broadcast and auto-dialer settings.' },
                          { label: '📍 GPS Tile Caching', text: 'How do I verify that OpenStreetMap tiles are saved locally for offline dead zones?' },
                          { label: '👥 Guardian Alerts', text: 'Question regarding emergency contact SMS and WhatsApp multi-dispatch templates.' },
                          { label: '🛡️ Police 112 Relay', text: 'Inquiry regarding automated 112 direct emergency dialer integration in my state.' },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setContactForm({ ...contactForm, message: chip.text })}
                            className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Name Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-0.5">
                            Your Name
                          </label>
                          <span className="text-[10px] font-semibold text-slate-400">Required</span>
                        </div>
                        <div className="relative group/input flex items-center bg-white hover:bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all duration-200 shadow-2xs">
                          <div className="w-10 h-10 flex items-center justify-center text-slate-400 group-focus-within/input:text-blue-600 transition-colors shrink-0 pl-1">
                            <User className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            placeholder="e.g. Ananya Sharma"
                            className="w-full bg-transparent pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Email Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-0.5">
                            Email Address
                          </label>
                          <span className="text-[10px] font-medium text-slate-400">
                            Required
                          </span>
                        </div>
                        <div className="relative group/input flex items-center bg-white hover:bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all duration-200 shadow-2xs">
                          <div className="w-10 h-10 flex items-center justify-center text-slate-400 group-focus-within/input:text-blue-600 transition-colors shrink-0 pl-1">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            placeholder="e.g. ananya@example.com"
                            className="w-full bg-transparent pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none text-xs font-semibold"
                          />
                          {contactForm.email && contactForm.email.includes('@') && (
                            <span className="pr-3 text-emerald-500 text-xs font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-0.5">
                          Department / Inquiry Type
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Select Topic</span>
                      </div>
                      <div className="relative flex items-center bg-white hover:bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all duration-200 shadow-2xs">
                        <select
                          value={contactForm.queryType}
                          onChange={(e) => setContactForm({ ...contactForm, queryType: e.target.value })}
                          className="w-full bg-transparent px-4 py-2.5 text-slate-900 focus:outline-none text-xs font-semibold cursor-pointer appearance-none pr-9"
                        >
                          <option value="General Enquiry">General Enquiry & User Feedback</option>
                          <option value="Technical Support">Technical Support (GPS, Audio, Offline Tiles)</option>
                          <option value="Emergency Desk">Emergency Help Desk & 112 Calibration</option>
                          <option value="Partnership">Police & Campus Safety Administration</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-0.5">
                          Message
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Local Entry</span>
                      </div>
                      <div className="relative flex bg-white hover:bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all duration-200 shadow-2xs">
                        <textarea
                          required
                          rows={3}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          placeholder="Describe what you need help with (e.g. configuring emergency contacts, offline SOS, speech activation)..."
                          className="w-full bg-transparent p-3.5 text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none text-xs font-normal resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-fit">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> Direct Police Helpline: <strong className="text-slate-900 font-extrabold">112</strong>
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm hover:shadow-md text-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeModal === 'help' && (
              <div className="space-y-4 text-xs text-left">
                {/* Modern Search Bar */}
                <div className="relative group/search flex items-center bg-slate-50/90 hover:bg-slate-50 focus-within:bg-white border border-slate-200/90 focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-100/90 rounded-2xl transition-all duration-200 shadow-2xs">
                  <div className="w-10 h-10 flex items-center justify-center text-slate-400 group-focus-within/search:text-blue-600 transition-colors shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={helpSearch}
                    onChange={(e) => setHelpSearch(e.target.value)}
                    placeholder="Search safety topics (e.g. offline maps, biometrics, wake lock, voice)..."
                    className="w-full bg-transparent py-2.5 pr-8 text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none text-xs font-medium"
                  />
                  {helpSearch && (
                    <button
                      type="button"
                      onClick={() => setHelpSearch('')}
                      className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter chips for quick topic browsing */}
                <div className="flex flex-wrap gap-1.5">
                  {['All Topics', 'offline maps', 'voice', '112', 'screen'].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setHelpSearch(topic === 'All Topics' ? '' : topic)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        (topic === 'All Topics' && !helpSearch) || (helpSearch.toLowerCase() === topic.toLowerCase())
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 border-slate-200/60'
                      }`}
                    >
                      {topic === 'All Topics' ? 'All Guides' : topic}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-2 scrollbar-thin">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> How do offline map tiles work during data loss?
                    </h5>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      RakshaX installs a background Service Worker (`sw.js`) that automatically caches map tiles in browser memory. When cell data drops, the OfflineMapTileViewer component displays pre-cached tiles and your GPS location without interruption.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> How do I activate voice keyphrase triggers?
                    </h5>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Go to the Biometrics & Voice tab on the dashboard, turn on Voice Detection, and speak distress phrases like "Help" or "Emergency". The app triggers an automatic 5-second countdown before sending SOS alerts.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <h5 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> What does 'Keep Screen Active' do in Settings?
                    </h5>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Toggling 'Keep Screen Active' uses the Web Screen Wake Lock API to prevent your phone from entering sleep mode while tracking your route or waiting for emergency contacts.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Immediate emergency assistance:</span>
                  <a
                    href="tel:112"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Police Control Room (112)
                  </a>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] font-medium">RakshaX Safety System v2.4</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </footer>
  );
}

