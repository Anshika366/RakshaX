import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import WhyChoose from './components/WhyChoose';
import UseCases from './components/UseCases';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, X, Languages } from 'lucide-react';

// New Modular Application Views
import AuthFlow from './components/app/AuthFlow';
import OnboardingFlow from './components/app/OnboardingFlow';
import Dashboard from './components/app/Dashboard';
import LanguageSelectorModal from './components/app/LanguageSelectorModal';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SafetyProfile } from './types';
import { getCurrentUserAccount, updateUserProfile } from './lib/userDB';
import { releaseAllScrollLocks } from './lib/scrollLock';
import { SupportedLanguage, getTranslation } from './lib/translations';

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { language, setLanguage, t, isLangModalOpen, setIsLangModalOpen, currentLangInfo } = useLanguage();

  // Navigation states: 'landing' | 'auth' | 'onboarding' | 'dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'onboarding' | 'dashboard'>('landing');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Profile details
  const [userEmail, setUserEmail] = useState<string>('anshikapathak25@navgurukul.org');
  const [userName, setUserName] = useState<string>('Anshika Pathak');
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile>({
    fullName: 'Anshika Pathak',
    gender: 'Female',
    dateOfBirth: '2000-08-20',
    bloodGroup: 'B+',
    medicalConditions: 'None',
    allergies: 'None',
    currentMedications: 'None',
    address: 'Viman Nagar / Dhanori Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    emergencyNotes: 'Alert emergency contacts immediately upon SOS dispatch.',
    doctorName: 'Dr. Joshi',
    doctorNumber: '+91 98765 43210'
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAuthSuccess = (email: string, isSignUp: boolean) => {
    setUserEmail(email);
    const account = getCurrentUserAccount(email);
    if (account) {
      setUserName(account.fullName);
      setSafetyProfile(account.profile);
    } else {
      const parts = email.split('@');
      setUserName(parts[0] || 'User');
      setSafetyProfile(prev => ({
        ...prev,
        fullName: parts[0] || 'User'
      }));
    }

    if (isSignUp) {
      setCurrentView('onboarding');
      triggerToast('Account created! Let us guide you through personal safety onboarding.');
    } else {
      setCurrentView('dashboard');
      triggerToast('Securely authenticated into RakshaX vault.');
    }
  };

  const handleOnboardingComplete = (profile: SafetyProfile) => {
    setSafetyProfile(profile);
    setUserName(profile.fullName);
    
    // Save to the persistent local DB
    updateUserProfile(userEmail, profile);
    
    setCurrentView('dashboard');
    triggerToast('Safety Profile completed! Your SOS button is fully configured.');
  };

  const handleOnboardingCancel = () => {
    setCurrentView('auth');
  };

  const handleLogout = () => {
    setCurrentView('landing');
    triggerToast('Logged out of RakshaX Vault. Your local profile remains encrypted.');
  };

  // Ensure background scroll is completely free and unlocked when switching views or mounting
  useEffect(() => {
    releaseAllScrollLocks();
  }, [currentView]);

  const handleGlobalLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    triggerToast(getTranslation(newLang, 'languageSelectedToast'));
  };

  return (
    <div className="relative min-h-screen bg-transparent selection:bg-blue-100 selection:text-blue-800 antialiased">
      
      {/* Dynamic View Routing rendering */}
      {currentView === 'landing' && (
        <>
          {/* Sticky Header */}
          <Navbar
            onGetStarted={() => setCurrentView('auth')}
            onSignIn={() => setCurrentView('auth')}
          />

          {/* Main Sections */}
          <main>
            {/* Section 2: Hero */}
            <Hero
              onGetStarted={() => setCurrentView('auth')}
              onLearnMore={() => {
                const howItWorksSection = document.getElementById('how-it-works');
                howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Section 3: How It Works */}
            <HowItWorks />

            {/* Section 4: Key Features */}
            <Features />

            {/* Section 6: Why Choose SafeGuard AI */}
            <WhyChoose />

            {/* Section 7: Real Use Cases */}
            <UseCases />

            {/* Section 8: FAQ */}
            <FAQ />
          </main>

          {/* Section 9: Final CTA + Footer */}
          <Footer
            onCreateAccount={() => setCurrentView('auth')}
            onLearnMore={() => {
              const faqSection = document.getElementById('faq');
              faqSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </>
      )}

      {/* VIEW: AUTHENTICATION FLOW */}
      {currentView === 'auth' && (
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-50/50 relative py-8 sm:py-12">
          {/* Top Brand Logo - hidden on xs phones to prevent clash with modal, visible on sm+ */}
          <div className="hidden sm:flex absolute top-5 left-6 items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              Raksha<span className="text-blue-600 font-black text-lg ml-0.5">X</span>
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-md my-auto"
          >
            <AuthFlow 
              onAuthSuccess={handleAuthSuccess}
              onClose={() => setCurrentView('landing')}
            />
          </motion.div>
        </div>
      )}

      {/* VIEW: ONBOARDING FLOW */}
      {currentView === 'onboarding' && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/40 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              Raksha<span className="text-blue-600 font-black text-lg ml-0.5">X</span> <span className="text-slate-500 text-xs font-semibold ml-1">Setup</span>
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl"
          >
            <OnboardingFlow 
              initialName={userName}
              onComplete={handleOnboardingComplete}
              onCancel={handleOnboardingCancel}
            />
          </motion.div>
        </div>
      )}

      {/* VIEW: COMPREHENSIVE DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="min-h-screen bg-slate-50/30 relative">
          {/* Navigation Bar for Dashboard */}
          <header className="fixed top-0 left-0 right-0 bg-white/85 backdrop-blur-md border-b border-slate-100 z-30 py-3 sm:py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 shrink-0">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Raksha<span className="text-blue-600 font-black text-xl sm:text-2xl ml-0.5">X</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Global Language Selector in Dashboard Top Bar */}
                <button
                  type="button"
                  onClick={() => setIsLangModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title={t('chooseAppLanguage')}
                >
                  <Languages className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm">{currentLangInfo.flag}</span>
                  <span className="font-extrabold">{currentLangInfo.nativeName}</span>
                </button>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">{t('activeVaultFor')}</span>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-full">
                    {safetyProfile.fullName}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <Dashboard 
            key={userEmail}
            initialProfile={safetyProfile}
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* GLOBAL LANGUAGE SELECTOR MODAL */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLanguage={language}
        onSelectLanguage={handleGlobalLanguageSelect}
      />

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-slate-800"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 text-white mt-0.5">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-relaxed text-slate-100 text-left">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white shrink-0 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
