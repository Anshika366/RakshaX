import React, { useState } from 'react';
import {
  Zap,
  Clock,
  MapPin,
  MessageSquare,
  Shield,
  History,
  FileText,
  WifiOff,
  Share2,
  EyeOff,
  Smartphone,
  ShieldAlert,
  Volume2,
  Activity,
  Users2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function Features() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: t('navFeatures') },
    { id: 'core', name: t('silentSosTag') },
    { id: 'communication', name: t('directGuardianTitle') },
    { id: 'detection', name: t('nearestSafetyResources') },
    { id: 'profile', name: t('safetyProfile') },
  ];

  const features = [
    {
      id: 'one-tap-sos',
      title: t('feat1Title'),
      description: t('feat1Desc'),
      category: 'core',
      iconName: 'Zap',
      badge: 'Critical',
    },
    {
      id: 'police-relay',
      title: t('feat2Title'),
      description: t('feat2Desc'),
      category: 'detection',
      iconName: 'Shield',
      badge: '112 Relay',
    },
    {
      id: 'offline-mesh',
      title: t('feat3Title'),
      description: t('feat3Desc'),
      category: 'core',
      iconName: 'WifiOff',
    },
    {
      id: 'cab-watch',
      title: t('feat4Title'),
      description: t('feat4Desc'),
      category: 'communication',
      iconName: 'Clock',
      badge: 'Smart Watch',
    },
    {
      id: 'voice-safe-word',
      title: t('feat5Title'),
      description: t('feat5Desc'),
      category: 'core',
      iconName: 'Smartphone',
      badge: 'Voice AI',
    },
    {
      id: 'multi-guardian',
      title: t('feat6Title'),
      description: t('feat6Desc'),
      category: 'communication',
      iconName: 'MessageSquare',
      badge: 'WhatsApp',
    },
    {
      id: 'gps-tracking',
      title: t('liveGpsActive'),
      description: t('journeyDesc'),
      category: 'communication',
      iconName: 'MapPin',
    },
    {
      id: 'medical-profile',
      title: t('safetyProfile'),
      description: t('onboardingMedicalDesc'),
      category: 'profile',
      iconName: 'FileText',
    },
    {
      id: 'incident-history',
      title: t('incidentLogTitle'),
      description: t('incidentLogDesc'),
      category: 'profile',
      iconName: 'History',
    },
    {
      id: 'location-sharing',
      title: t('journeyTitle'),
      description: t('journeyBufferText'),
      category: 'communication',
      iconName: 'Share2',
    },
    {
      id: 'shake-sensor',
      title: t('featShakeTitle'),
      description: t('featShakeDesc'),
      category: 'core',
      iconName: 'Activity',
      badge: 'Sensor AI',
    },
    {
      id: 'panic-siren',
      title: t('featSirenTitle'),
      description: t('featSirenDesc'),
      category: 'core',
      iconName: 'Volume2',
      badge: 'Acoustic',
    },
  ];

  const getIcon = (name: string) => {
    switch (name) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-blue-600" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-slate-600" />;
      case 'EyeOff':
        return <EyeOff className="w-5 h-5 text-purple-600" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-indigo-600" />;
      case 'WifiOff':
        return <WifiOff className="w-5 h-5 text-slate-600" />;
      case 'MapPin':
        return <MapPin className="w-5 h-5 text-red-600" />;
      case 'MessageSquare':
        return <MessageSquare className="w-5 h-5 text-sky-600" />;
      case 'Share2':
        return <Share2 className="w-5 h-5 text-teal-600" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-blue-800" />;
      case 'Users2':
        return <Users2 className="w-5 h-5 text-indigo-500" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-violet-600" />;
      case 'History':
        return <History className="w-5 h-5 text-amber-600" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-emerald-600" />;
      case 'Volume2':
        return <Volume2 className="w-5 h-5 text-rose-600" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    if (badge === 'Critical') return 'bg-red-50 text-red-700 border-red-100';
    if (badge === 'Real-time') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (badge === 'Smart Watch') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (badge === 'Sensor AI') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (badge === 'Acoustic') return 'bg-rose-50 text-rose-700 border-rose-100';
    if (badge === '112 Relay') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  const getThemeHoverBorder = (category: string) => {
    switch (category) {
      case 'core':
        return 'group-hover:border-red-200/80 group-hover:shadow-red-500/[0.04]';
      case 'communication':
        return 'group-hover:border-blue-200/80 group-hover:shadow-blue-500/[0.04]';
      case 'detection':
        return 'group-hover:border-purple-200/80 group-hover:shadow-purple-500/[0.04]';
      case 'profile':
        return 'group-hover:border-emerald-200/80 group-hover:shadow-emerald-500/[0.04]';
      default:
        return 'group-hover:border-slate-200/80 group-hover:shadow-slate-500/[0.04]';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 280,
        damping: 24,
      },
    },
  };

  const filteredFeatures =
    activeCategory === 'all'
      ? features
      : features.filter((f) => f.category === activeCategory);

  return (
    <section id="features" className="py-12 md:py-16 bg-transparent relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[350px] h-[350px] bg-purple-50/30 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-800 bg-blue-50/80 px-4 py-2 rounded-full border border-blue-100 inline-flex items-center gap-1.5 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-50" /> 12-Layer Defense Protocol
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4 tracking-tight leading-tight">
            {t('featuresHeading')}
          </h2>
          <p className="text-base md:text-lg text-slate-600 mt-3 leading-relaxed font-normal">
            {t('featuresSubheading')}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50'
                  : 'bg-white/85 hover:bg-slate-100/90 text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-2xs'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredFeatures.map((feat) => (
              <motion.div
                key={feat.id}
                variants={itemVariants}
                className={`glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col justify-between group border border-slate-200/60 shadow-2xs ${getThemeHoverBorder(
                  feat.category
                )}`}
              >
                <div>
                  {/* Top bar in card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:scale-[1.04] transition-all duration-200">
                      {getIcon(feat.iconName)}
                    </div>
                    {feat.badge && (
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase transition-colors duration-200 ${getBadgeColor(
                          feat.badge
                        )}`}
                      >
                        {feat.badge}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed font-normal">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Informative Note */}
        <div className="mt-10 text-center text-xs md:text-sm text-slate-500 font-medium bg-slate-50/80 border border-slate-200/40 rounded-xl py-3 px-4 max-w-2xl mx-auto">
          * <span className="font-sans font-bold">Raksha<span className="text-blue-600 font-extrabold">X</span></span> respects your battery health. All background tracking utilizes smart low-power motion sensors to prevent draining your device.
        </div>
      </div>
    </section>
  );
}
