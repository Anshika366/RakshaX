import React, { useState, useEffect } from 'react';
import { Shield, Menu, X, ArrowRight, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function Navbar({ onGetStarted, onSignIn }: NavbarProps) {
  const { t, currentLangInfo, setIsLangModalOpen } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0;
      if (scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Run on initial load
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navItems = [
    { name: t('navHome'), href: '#home' },
    { name: t('navFeatures'), href: '#features' },
    { name: t('navHowItWorks'), href: '#how-it-works' },
    { name: t('navScenarios'), href: '#scenarios' },
    { name: t('navFaq'), href: '#faq' },
  ];

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/60 py-3.5 shadow-sm'
          : 'bg-transparent py-6 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex items-center justify-between">
        {/* Logo */}
        <a 
          href="#home" 
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-[1.03]">
            <Shield className="w-5.5 h-5.5 fill-white/15" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors flex items-center">
            Raksha<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black text-3xl sm:text-4xl ml-0.5 inline-block transition-colors">X</span>
          </span>
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 relative group py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-sm"
            >
              {item.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Language Selector Button */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border border-slate-200 shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            title={t('chooseLanguage')}
          >
            <Languages className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentLangInfo.nativeName}</span>
            <span className="text-sm">{currentLangInfo.flag}</span>
          </button>

          <button
            onClick={onSignIn}
            className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-lg"
          >
            {t('navSignIn')}
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:shadow-blue-200/50 transition-all duration-200 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {t('navGetStarted')}
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile Menu & Language Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-bold border border-slate-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title={t('chooseLanguage')}
          >
            <span>{currentLangInfo.nativeName}</span>
            <span className="text-sm">{currentLangInfo.flag}</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-600 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg cursor-pointer"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden bg-white border-b border-slate-100 shadow-inner overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-5">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-semibold text-slate-700 hover:text-blue-600 transition-colors duration-200 py-1"
                >
                  {item.name}
                </a>
              ))}
              <hr className="border-slate-100 my-1" />
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsLangModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 font-bold text-xs bg-slate-100 active:bg-slate-200 rounded-2xl text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                >
                  <Languages className="w-4 h-4 text-blue-600" />
                  <span>{t('chooseLanguage')}: {currentLangInfo.nativeName} ({currentLangInfo.name})</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSignIn();
                  }}
                  className="w-full text-center py-3 font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-2xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {t('navSignIn')}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onGetStarted();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 rounded-2xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {t('navGetStarted')}
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
