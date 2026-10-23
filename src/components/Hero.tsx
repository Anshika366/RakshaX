import React from 'react';
import { Shield, MapPin, Navigation, Compass, CheckCircle2, ArrowRight, Sparkles, Smartphone, BellRing } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export default function Hero({ onGetStarted, onLearnMore }: HeroProps) {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative pt-24 pb-10 md:pt-30 md:pb-14 overflow-hidden bg-transparent">
      {/* Soft gradient blobs for organic feel (strictly light theme, no dark/black shapes) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/70 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-purple-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Hero Left Content */}
        <div className="lg:col-span-6 flex flex-col justify-center text-left">
          {/* Micro-badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 w-fit border border-blue-100"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{t('heroBadge')}</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]"
          >
            {t('heroTitle1')} <br />
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('heroTitle2')}
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl"
          >
            {t('heroSubtitle')}
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
          >
            <button
              onClick={onGetStarted}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-8 py-4 rounded-full shadow-sm hover:shadow-md hover:shadow-blue-200/50 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 group cursor-pointer"
            >
              {t('heroGetStarted')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <button
              onClick={onLearnMore}
              className="flex items-center justify-center gap-2 bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-base px-6 py-4 rounded-full transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 cursor-pointer border border-slate-200/70"
            >
              {t('heroLearnMore')}
            </button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{t('freeToStart')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{t('privacyProtected')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{t('realtimeAlerts')}</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Right Content - Modern Illustration */}
        <div className="lg:col-span-6 flex items-center justify-center relative min-h-[400px]">
          {/* Main Visual: Floating graphic elements mimicking active safety */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full max-w-[460px] aspect-square flex items-center justify-center"
          >
            {/* Pulsing ring background */}
            <div className="absolute inset-0 rounded-full border border-blue-100/50 scale-100 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-purple-100/40 scale-95" />
            
            {/* The SafeGuard World Illustration */}
            <svg
              className="w-full h-full text-slate-100"
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Radial City Map Nodes */}
              <circle cx="250" cy="250" r="180" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="6 6" />
              <circle cx="250" cy="250" r="120" stroke="#E2E8F0" strokeWidth="1.5" />
              
              {/* Grid Lines representing location coordinates */}
              <line x1="250" y1="50" x2="250" y2="450" stroke="#F1F5F9" strokeWidth="2" />
              <line x1="50" y1="250" x2="450" y2="250" stroke="#F1F5F9" strokeWidth="2" />
              
              {/* Connected GPS nodes */}
              <circle cx="150" cy="180" r="6" fill="#94A3B8" />
              <circle cx="340" cy="150" r="8" fill="#94A3B8" />
              <circle cx="120" cy="320" r="5" fill="#CBD5E1" />
              <circle cx="360" cy="330" r="7" fill="#CBD5E1" />

              {/* Connecting lines */}
              <path d="M150 180 L250 250 M340 150 L250 250 M120 320 L250 250 M360 330 L250 250" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Floating Card 1: Safe Walking (Student/Woman) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="hidden sm:flex absolute top-[10%] left-[5%] glass-panel hover:bg-white/90 p-4 rounded-2xl shadow-md border border-white/80 items-center gap-3 w-[210px] z-10 transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Navigation className="w-5 h-5 fill-purple-100/50" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium font-mono">WALKING ALONE</p>
                <p className="text-sm font-bold text-slate-800">Jane • Campus Route</p>
              </div>
            </motion.div>

            {/* Floating Card 2: Family Alert Received */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
              className="hidden sm:flex absolute bottom-[10%] right-[2%] glass-panel hover:bg-white/90 p-4 rounded-2xl shadow-md border border-white/80 items-center gap-3 w-[240px] z-10 transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 relative">
                <BellRing className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-emerald-600 font-bold">ALERTS DISPATCHED</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Family contacted instantly via SMS & WhatsApp</p>
              </div>
            </motion.div>

            {/* Central Phone Mockup - Showing SafeGuard Interface */}
            <motion.div
              initial={{ rotate: -5, scale: 0.95 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute w-[240px] h-[440px] bg-white rounded-[40px] shadow-2xl shadow-blue-900/10 border-8 border-slate-900 overflow-hidden flex flex-col"
            >
              {/* Speaker Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Mini App UI inside Mockup */}
              <div className="flex-1 bg-slate-50 flex flex-col p-4 pt-8">
                {/* Header */}
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black text-slate-800">
                      Raksha<span className="text-blue-600 font-black">X</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-semibold text-slate-500">Live GPS</span>
                  </div>
                </div>

                {/* Modernized Location Card */}
                <div className="mt-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left leading-tight truncate">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">LIVE SATELLITE GPS</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 truncate">
                        FC Road / Shivajinagar, Pune
                      </p>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md shrink-0">
                    ±3m
                  </span>
                </div>

                {/* Pulsing Central Red SOS button */}
                <div className="flex-1 flex flex-col items-center justify-center my-3">
                  <div className="relative flex items-center justify-center">
                    {/* Ring animations */}
                    <div className="absolute w-28 h-28 bg-red-500/20 rounded-full animate-pulse-ring" />
                    <div className="absolute w-24 h-24 bg-red-500/30 rounded-full animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
                    <button 
                      type="button"
                      onClick={onGetStarted}
                      aria-label="Preview SOS Trigger - Get Started"
                      className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-red-200 border-2 border-white/30 cursor-pointer active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      SOS
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2.5 text-center tracking-wide uppercase">
                    Tap to test dispatch
                  </p>
                </div>

                {/* Modernized Trusted Contacts placeholder quick-view */}
                <div className="bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                      TRUSTED GUARDIANS (3 ACTIVE)
                    </p>
                    <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md border border-blue-100/60">
                      Auto-Relay
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex -space-x-1.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-black border-2 border-white shadow-2xs">M</div>
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-black border-2 border-white shadow-2xs">D</div>
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black border-2 border-white shadow-2xs">S</div>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-600 truncate">Mother, Doctor, Sister</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
