import React from 'react';
import { Zap, HeartHandshake, Eye, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function WhyChoose() {
  const { t } = useLanguage();

  const cards = [
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      title: t('whyPoint1'),
      description: t('whyPoint1Desc'),
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-purple-600" />,
      title: t('whyPoint2'),
      description: t('whyPoint2Desc'),
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
    {
      icon: <Eye className="w-6 h-6 text-emerald-600" />,
      title: t('whyPoint3'),
      description: t('whyPoint3Desc'),
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-amber-600" />,
      title: t('whyPoint4'),
      description: t('whyPoint4Desc'),
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
  ];

  return (
    <section className="py-12 md:py-16 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50/80 px-3.5 py-1.5 rounded-full border border-blue-100 inline-flex items-center gap-1.5">
            🛡️ Zero-Delay Reliability
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
            {t('whyHeading')}
          </h2>
          <p className="text-base md:text-lg text-slate-600 mt-3 leading-relaxed font-normal">
            {t('whySubheading')}
          </p>
        </div>

        {/* 4 Value Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-panel glass-panel-hover p-6 rounded-[22px] flex flex-col items-start bg-white border border-slate-100 shadow-2xs group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border shadow-2xs group-hover:scale-[1.04] transition-transform duration-200 ${card.color}`}>
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 mb-2 leading-snug">{card.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-normal">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
