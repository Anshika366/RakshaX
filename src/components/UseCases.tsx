import React, { useState } from 'react';
import {
  Moon,
  GraduationCap,
  Sparkles,
  Heart,
  Car,
  Plane,
  HeartPulse,
  User,
  ArrowRight,
  Shield,
  MapPin,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function UseCases() {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string>('night-commute');

  const scenarios = [
    {
      id: 'night-commute',
      title: t('case1Title'),
      emoji: '🚕',
      group: 'daily',
      challenge: t('case1Desc'),
      safeguardAction: t('journeyDesc'),
      resolution: t('feat6Desc'),
      illustrationType: 'night_walk',
    },
    {
      id: 'walking-alone',
      title: t('case2Title'),
      emoji: '🚶‍♀️',
      group: 'daily',
      challenge: t('case2Desc'),
      safeguardAction: t('step1Desc'),
      resolution: t('step2Desc'),
      illustrationType: 'night_walk',
    },
    {
      id: 'medical-emergency',
      title: t('case3Title'),
      emoji: '❤️',
      group: 'crisis',
      challenge: t('case3Desc'),
      safeguardAction: t('onboardingMedicalDesc'),
      resolution: t('step3Desc'),
      illustrationType: 'medical',
    },
    {
      id: 'harassment-stalking',
      title: t('case4Title'),
      emoji: '🛡️',
      group: 'crisis',
      challenge: t('case4Desc'),
      safeguardAction: t('feat1Desc'),
      resolution: t('feat2Desc'),
      illustrationType: 'traveler',
    },
    {
      id: 'solo-travel',
      title: t('case5Title'),
      emoji: '🚗',
      group: 'daily',
      challenge: t('case5Desc'),
      safeguardAction: t('case5Action'),
      resolution: t('case5Resolution'),
      illustrationType: 'traveler',
    },
    {
      id: 'senior-care',
      title: t('case6Title'),
      emoji: '👵',
      group: 'crisis',
      challenge: t('case6Desc'),
      safeguardAction: t('case6Action'),
      resolution: t('case6Resolution'),
      illustrationType: 'medical',
    },
    {
      id: 'student-campus',
      title: t('case7Title'),
      emoji: '🎓',
      group: 'daily',
      challenge: t('case7Desc'),
      safeguardAction: t('case7Action'),
      resolution: t('case7Resolution'),
      illustrationType: 'night_walk',
    },
  ];

  const currentScenario = scenarios.find((s) => s.id === selectedId) || scenarios[0];

  const getGroupLabel = (group: string) => {
    if (group === 'daily') return t('practicalRealWorld');
    return t('silentSosTag');
  };

  const getGroupBadgeClass = (group: string) => {
    if (group === 'daily') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-purple-50 text-purple-700 border-purple-100';
  };

  return (
    <section id="scenarios" className="py-12 md:py-16 bg-transparent relative overflow-hidden">
      <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-100/60 px-3.5 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
            🛡️ Real-World Distress Situations
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
            {t('casesHeading')}
          </h2>
          <p className="text-base md:text-lg text-slate-600 mt-3 leading-relaxed font-normal">
            {t('casesSubheading')}
          </p>
        </div>

        {/* Board Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Selector Tabs */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 text-left">
              Select an Emergency Scenario
            </p>
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedId(sc.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border flex items-center justify-between group cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                  selectedId === sc.id
                    ? 'bg-white border-blue-200 shadow-sm text-blue-950 font-semibold'
                    : 'bg-white/60 hover:bg-white/95 border-slate-200/50 hover:border-slate-300/80 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0 group-hover:scale-105 transition-transform duration-200">{sc.emoji}</span>
                  <span className="text-sm font-bold truncate group-hover:text-blue-600 transition-colors duration-200">{sc.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-200 ${getGroupBadgeClass(sc.group)}`}>
                    {getGroupLabel(sc.group)}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    selectedId === sc.id ? 'translate-x-0.5 text-blue-600' : 'text-slate-300 group-hover:text-slate-500'
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {/* Right Panel: Content Showcase */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="bg-white/95 p-8 md:p-10 rounded-[32px] shadow-lg border border-slate-200/70"
              >
                {/* Showcase Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentScenario.emoji}</span>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-slate-900">{currentScenario.title}</h3>
                      <p className="text-xs text-slate-400 font-medium">RakshaX Scenario Profile</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getGroupBadgeClass(currentScenario.group)}`}>
                    {getGroupLabel(currentScenario.group)}
                  </span>
                </div>

                {/* Challenge Block */}
                <div className="mt-8 text-left">
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                    The Challenge
                  </span>
                  <p className="text-slate-700 text-sm md:text-base mt-3 leading-relaxed font-normal">
                    "{currentScenario.challenge}"
                  </p>
                </div>

                {/* SafeGuard Action Block */}
                <div className="mt-8 text-left">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                    The RakshaX Action
                  </span>
                  <p className="text-slate-700 text-sm md:text-base mt-3 leading-relaxed font-normal flex items-start gap-2">
                    <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span>{currentScenario.safeguardAction}</span>
                  </p>
                </div>

                {/* Resolution Block */}
                <div className="mt-8 text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    The Safe Outcome
                  </span>
                  <p className="text-slate-700 text-sm md:text-base mt-4 leading-relaxed font-normal flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 stroke-[3]" />
                    <span>{currentScenario.resolution}</span>
                  </p>
                </div>

                {/* Live Position simulator mini bar */}
                <div className="mt-8 flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Calibrated emergency response protocol preview</span>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
