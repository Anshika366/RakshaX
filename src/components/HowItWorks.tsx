import React from 'react';
import { UserPlus, Users2, ShieldAlert, Radio, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      title: t('onboardingStep1'),
      description: t('onboardingPersonalDesc'),
    },
    {
      number: 2,
      title: t('onboardingStep3'),
      description: t('onboardingContactsDesc'),
    },
    {
      number: 3,
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      number: 4,
      title: t('step2Title'),
      description: t('step2Desc'),
    },
  ];

  const getStepIcon = (num: number) => {
    switch (num) {
      case 1:
        return <UserPlus className="w-6 h-6 text-blue-600" />;
      case 2:
        return <Users2 className="w-6 h-6 text-purple-600" />;
      case 3:
        return <ShieldAlert className="w-6 h-6 text-red-600" />;
      case 4:
        return <Radio className="w-6 h-6 text-emerald-600" />;
      default:
        return <Check className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStepColorClass = (num: number) => {
    switch (num) {
      case 1:
        return 'bg-blue-50 border-blue-100 text-blue-600';
      case 2:
        return 'bg-purple-50 border-purple-100 text-purple-600';
      case 3:
        return 'bg-red-50 border-red-100 text-red-600';
      case 4:
        return 'bg-emerald-50 border-emerald-100 text-emerald-600';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <section id="how-it-works" className="py-12 md:py-16 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50/80 px-3.5 py-1.5 rounded-full border border-blue-100 inline-flex items-center gap-1.5">
            ⚡ 3-Step Rapid Response
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
            {t('howHeading')}
          </h2>
          <p className="text-base md:text-lg text-slate-600 mt-3 leading-relaxed font-normal">
            {t('howSubheading')}
          </p>
        </div>

        {/* 4 Premium Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Decorative Connecting Line for Desktop */}
          <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-0.5 bg-slate-200/50 -z-10" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="glass-panel glass-panel-hover p-6 rounded-[22px] flex flex-col group relative bg-white border border-slate-100 shadow-xs"
            >
              {/* Step Icon & Floating Number Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${getStepColorClass(step.number)} shadow-2xs group-hover:scale-[1.04] transition-transform duration-200`}>
                  {getStepIcon(step.number)}
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-blue-600 transition-colors duration-200">
                  0{step.number}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors duration-200">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
