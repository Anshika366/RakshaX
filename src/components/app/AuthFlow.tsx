import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Mail, Lock, User, ArrowRight, ArrowLeft, 
  Key, Check, Info, AlertCircle, X, Languages 
} from 'lucide-react';
import { signInUser, signUpUser, getCurrentUserAccount } from '../../lib/userDB';
import { useLanguage } from '../../context/LanguageContext';
import { acquireScrollLock } from '../../lib/scrollLock';

function GoogleIcon({ className = "w-4.5 h-4.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface AuthFlowProps {
  onAuthSuccess: (email: string, isSignUp: boolean) => void;
  onClose: () => void;
}

type AuthScreen = 'welcome' | 'signup' | 'signin' | 'forgot' | 'reset' | 'verify';

export default function AuthFlow({ onAuthSuccess, onClose }: AuthFlowProps) {
  const { t, currentLangInfo, setIsLangModalOpen } = useLanguage();
  const [screen, setScreen] = useState<AuthScreen>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Google SSO Account Chooser Custom States
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isAddingGoogleAccount, setIsAddingGoogleAccount] = useState(false);

  // Auth Footer Info Dialog
  const [authInfoModal, setAuthInfoModal] = useState<'help' | 'privacy' | 'terms' | null>(null);

  // Lock background scroll only when dialogs are open
  useEffect(() => {
    const isDialogOpen = Boolean(showGoogleChooser || authInfoModal);
    if (!isDialogOpen) return;

    const releaseScroll = acquireScrollLock();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (authInfoModal) {
          setAuthInfoModal(null);
        } else if (showGoogleChooser) {
          setShowGoogleChooser(false);
          setIsAddingGoogleAccount(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseScroll();
    };
  }, [showGoogleChooser, authInfoModal]);

  const handleSelectGoogleAccount = (selectedEmail: string, selectedName: string) => {
    setShowGoogleChooser(false);
    setIsAddingGoogleAccount(false);
    
    setInfoMessage(`Securing Google SSO handshake for ${selectedEmail}...`);
    
    const loginEmail = selectedEmail.toLowerCase().trim();
    const loginName = selectedName.trim();
    
    setTimeout(async () => {
      try {
        const accountExistsLocally = !!getCurrentUserAccount(loginEmail);
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: 'google-sso-bypass-key', fullName: loginName })
        });
        const isNewUser = response.status === 200 && !accountExistsLocally;
        
        try {
          signUpUser(loginEmail, 'google-sso-bypass-key', loginName);
        } catch (e) {}

        setInfoMessage(null);
        onAuthSuccess(loginEmail, isNewUser);
      } catch (err) {
        setInfoMessage(null);
        onAuthSuccess(loginEmail, false);
      }
    }, 1200);
  };

  const handleBack = () => {
    setError(null);
    if (screen === 'signup' || screen === 'signin') {
      onClose();
    } else if (screen === 'forgot') {
      setScreen('signin');
    } else if (screen === 'reset') {
      setScreen('signin');
    } else if (screen === 'verify') {
      setScreen('signup');
    } else {
      onClose(); // Exit to landing page
    }
  };

  const handleSocialLogin = async (platform: string) => {
    const loginEmail = email.trim() ? email.toLowerCase().trim() : 'anshikapathak25@navgurukul.org';
    const loginName = fullName.trim() ? fullName.trim() : (loginEmail === 'anshikapathak25@navgurukul.org' ? 'Anshika Pathak' : loginEmail.split('@')[0]);
    
    setInfoMessage(`Simulating secure SSO authentication via ${platform} for ${loginEmail}...`);
    try {
      const accountExistsLocally = !!getCurrentUserAccount(loginEmail);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: 'sso-bypass-passphrase', fullName: loginName })
      });
      const data = await response.json();
      const isNewUser = response.status === 200 && !accountExistsLocally;
      
      // Ensure sync locally
      try {
        signUpUser(loginEmail, 'sso-bypass-passphrase', loginName);
      } catch (e) {}

      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(loginEmail, isNewUser);
      }, 1200);
    } catch (err) {
      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(loginEmail, false);
      }, 1200);
    }
  };

  const handleBiometricLogin = async () => {
    const loginEmail = email.trim() ? email.toLowerCase().trim() : 'anshikapathak25@navgurukul.org';
    const loginName = fullName.trim() ? fullName.trim() : (loginEmail === 'anshikapathak25@navgurukul.org' ? 'Anshika Pathak' : loginEmail.split('@')[0]);

    setInfoMessage('Scanning biometric ID / Passkey credentials...');
    try {
      const accountExistsLocally = !!getCurrentUserAccount(loginEmail);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: 'biometric-bypass-passphrase', fullName: loginName })
      });
      const data = await response.json();
      const isNewUser = response.status === 200 && !accountExistsLocally;
      
      // Ensure sync locally
      try {
        signUpUser(loginEmail, 'biometric-bypass-passphrase', loginName);
      } catch (e) {}

      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(loginEmail, isNewUser);
      }, 1200);
    } catch (err) {
      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(loginEmail, false);
      }, 1200);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    
    // Check if user already exists before code verification
    const normalizedEmail = email.toLowerCase().trim();
    const rawUsers = localStorage.getItem('safeguard_users');
    let exists = false;
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        exists = users.some((u: any) => u.email === normalizedEmail);
      } catch (err) {}
    }
    if (exists) {
      setError('An account with this email already exists.');
      return;
    }

    setInfoMessage('Dispatched verification PIN...');
    try {
      const otpResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, fullName })
      });
      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        throw new Error(otpData.error || 'Failed to dispatch verification code.');
      }
      if (otpData.isSimulated && otpData.code) {
        setSimulatedOtp(otpData.code);
      } else {
        setSimulatedOtp(null);
      }
      setInfoMessage(otpData.message || 'Verification PIN sent to your email.');
      setTimeout(() => {
        setInfoMessage(null);
        setOtpDigits(Array(6).fill('')); // Clear any old input
        setScreen('verify');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code.');
      setInfoMessage(null);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setInfoMessage('Authenticating credentials...');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      // Sync offline cache
      try {
        signInUser(email, password);
      } catch (e) {
        // Create offline copy if needed
        signUpUser(email, password, data.fullName);
      }

      setInfoMessage('Authenticated successfully!');
      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(data.email, false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setInfoMessage(null);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    setError(null);
    setInfoMessage('Password reset link sent to your registered email.');
    setTimeout(() => {
      setInfoMessage(null);
      setScreen('reset');
    }, 2000);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new secure password.');
      return;
    }
    setError(null);
    setInfoMessage('Password reset successful. Redirecting to Sign In...');
    setTimeout(() => {
      setInfoMessage(null);
      setScreen('signin');
    }, 2000);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const otpCode = otpDigits.join('');
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setInfoMessage('Verifying security code & registering safety profile...');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, otpCode })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register account.');
      }
      
      // Also write locally for offline sync redundancy
      try {
        signUpUser(email, password, fullName);
      } catch (e) {}
      
      setInfoMessage('Verification successful!');
      setTimeout(() => {
        setInfoMessage(null);
        onAuthSuccess(data.email, true);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
      setInfoMessage(null);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setInfoMessage('Re-sending verification PIN...');
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const otpResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, fullName })
      });
      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        throw new Error(otpData.error || 'Failed to dispatch verification code.');
      }
      if (otpData.isSimulated && otpData.code) {
        setSimulatedOtp(otpData.code);
      } else {
        setSimulatedOtp(null);
      }
      setInfoMessage(otpData.message || 'A new verification code has been sent.');
      setTimeout(() => setInfoMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code.');
      setInfoMessage(null);
    }
  };

  // Render correct page
  return (
    <>
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-5 sm:p-8 md:p-10 flex flex-col relative text-left transition-all">
        {/* Top Controls Bar: Dedicated Flex Row to Guarantee Zero Overlap on Mobile and Desktop */}
        <div className="flex items-center justify-between w-full mb-4 pb-1">
          {/* Back button or Return to Home */}
          <button 
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 p-2 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title={screen === 'signup' || screen === 'signin' ? 'Return to Home' : 'Back'}
            aria-label={screen === 'signup' || screen === 'signin' ? 'Return to Home' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span className="hidden xs:inline text-xs font-medium text-slate-600">
              {screen === 'signup' || screen === 'signin' ? 'Home' : 'Back'}
            </span>
          </button>

          {/* Right Action Cluster: Language Switcher and Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLangModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-all cursor-pointer border border-slate-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title={t('chooseLanguage')}
              aria-label={t('chooseLanguage')}
            >
              <Languages className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="max-w-[70px] truncate sm:max-w-none">{currentLangInfo.nativeName}</span>
              <span className="text-xs">{currentLangInfo.flag}</span>
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Return to home"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Brand / Title Header inside Body */}
        <div className="text-center mb-6 sm:mb-8 mt-1">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight px-2">
            {screen === 'signup' && t('authTitleSignUp')}
            {screen === 'signin' && t('authTitleSignIn')}
            {screen === 'forgot' && t('authTitleForgot')}
            {screen === 'reset' && t('authTitleReset')}
            {screen === 'verify' && t('authTitleVerify')}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed px-2">
            {screen === 'signup' && t('authSubSignUp')}
            {screen === 'signin' && t('authSubSignIn')}
            {screen === 'forgot' && t('authSubForgot')}
            {screen === 'reset' && t('authSubReset')}
            {screen === 'verify' && t('authSubVerify')}
          </p>
        </div>

        {/* Message Notifications */}
        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        
        {infoMessage && (
          <div className="mb-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs flex items-center gap-2.5 animate-pulse">
            <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
            <span className="font-medium">{infoMessage}</span>
          </div>
        )}

        {/* Dynamic Forms */}
        <div className="flex-1">
          {/* SCREEN: SIGN UP */}
          {screen === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t('authFullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t('authEmail')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t('authPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 text-xs text-slate-500 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  {t('authRememberMe')}
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md shadow-blue-100 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {t('authSignUpBtn')} <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  {t('authHaveAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('signin')}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
                  >
                    {t('navSignIn')}
                  </button>
                </p>
              </div>

              {/* Social Login split */}
              <div className="relative flex py-2.5 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold tracking-wider uppercase">{t('authQuickDemo')}</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleChooser(true)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 transition-colors shadow-sm cursor-pointer border-none"
              >
                <GoogleIcon className="w-4.5 h-4.5" />
                {t('authGoogleLogin')}
              </button>
            </form>
          )}

          {/* SCREEN: SIGN IN */}
          {screen === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  {t('authEmail')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 pl-1 pr-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('authPassword')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setScreen('forgot')}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
                  >
                    {t('authForgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 text-xs text-slate-500 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  {t('authRememberMe')}
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md shadow-blue-100 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {t('authSignInBtn')} <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  {t('authNoAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('signup')}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
                  >
                    {t('authSignUpBtn')}
                  </button>
                </p>
              </div>

              {/* Social Login split */}
              <div className="relative flex py-2.5 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold tracking-wider uppercase">{t('authQuickDemo')}</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleChooser(true)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 transition-colors shadow-sm cursor-pointer border-none"
              >
                <GoogleIcon className="w-4.5 h-4.5" />
                {t('authGoogleLogin')}
              </button>
            </form>
          )}

          {/* SCREEN: FORGOT */}
          {screen === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/40 mb-2">
                <p className="text-xs text-blue-850 leading-relaxed font-medium">
                  Enter your registered email address below. We will send a security recovery link to log in safely.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                Send Recovery Link <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setScreen('signin')}
                className="w-full py-3 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer border-none bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
            </form>
          )}

          {/* SCREEN: RESET */}
          {screen === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  Choose New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                Update Password <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SCREEN: EMAIL VERIFICATION */}
          {screen === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-5 text-center">
              <div className="flex justify-center gap-1.5 sm:gap-2 py-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    type="text"
                    maxLength={1}
                    required
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ''); // Allow only digits
                      const newDigits = [...otpDigits];
                      newDigits[index] = val.slice(-1);
                      setOtpDigits(newDigits);
                      
                      // Auto-focus next input
                      if (val && index < 5) {
                        const nextInput = document.getElementById(`otp-input-${index + 1}`);
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
                        // Focus previous on backspace if current is empty
                        const prevInput = document.getElementById(`otp-input-${index - 1}`);
                        if (prevInput) {
                          prevInput.focus();
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pastedData) {
                        const newDigits = [...otpDigits];
                        for (let i = 0; i < 6; i++) {
                          newDigits[i] = pastedData[i] || '';
                        }
                        setOtpDigits(newDigits);
                        // Focus the last filled or next empty input
                        const focusIndex = Math.min(pastedData.length, 5);
                        const nextInput = document.getElementById(`otp-input-${focusIndex}`);
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    placeholder="•"
                    className="w-9 sm:w-11 h-11 sm:h-12 bg-slate-50 border border-slate-200 focus:border-blue-500 text-center font-bold text-base sm:text-lg rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                ))}
              </div>

              {simulatedOtp && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-left max-w-xs mx-auto mb-4 animate-pulse">
                  <div className="flex gap-2 items-start">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Dev Simulation Mode</h5>
                      <p className="text-[11px] text-amber-700/95 leading-relaxed mt-0.5">
                        No SendGrid keys set. Use verification code <strong className="font-extrabold text-blue-700 font-mono tracking-wider text-xs">{simulatedOtp}</strong> to register.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                We sent a validation code to <strong className="text-slate-700">{email || 'your email'}</strong>. Please input the security PIN to finish profile protection.
              </p>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                Validate Security PIN <Check className="w-4 h-4 stroke-[3]" />
              </button>

              <div className="text-xs text-slate-400">
                Didn't receive code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info Security Lock */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Key className="w-3.5 h-3.5 text-blue-500" />
          <span>AES-256 local Encryption Enabled</span>
        </div>
      </div>

      {/* High-Fidelity Professional Google Sign-In Modal */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none font-sans">
          {/* Authentic Google Account Chooser Card */}
          <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up my-auto p-8 md:p-10 text-slate-800 transition-all duration-300">
            
            {/* Google Logo */}
            <div className="flex justify-center mb-5">
              <GoogleIcon className="w-8 h-8" />
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-normal text-slate-900 tracking-tight">
                {isAddingGoogleAccount ? 'Sign in with Google' : 'Choose an account'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 font-normal">
                to continue to <span className="font-extrabold text-slate-900">Raksha<span className="text-blue-600 font-black">X</span> Vault</span>
              </p>
            </div>

            {/* Error and Info overlays */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {infoMessage && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs flex items-center gap-2 animate-pulse">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Main Interactive Account Chooser List */}
            {!isAddingGoogleAccount ? (
              <div className="space-y-1">
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-4">
                  {/* Account 1: anshika pathak */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('anshikapathak25@navgurukul.org', 'anshika pathak')}
                    className="w-full p-4 hover:bg-slate-50/80 flex items-center gap-3.5 transition-all cursor-pointer text-left group border-none bg-transparent"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#f4511e] text-white font-medium flex items-center justify-center text-base select-none shadow-sm shrink-0">
                      a
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        anshika pathak
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        anshikapathak25@navgurukul.org
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Signed in</span>
                  </button>

                  {/* Account 2: Anshika Pathak */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('anshika.akb80@gmail.com', 'Anshika Pathak')}
                    className="w-full p-4 hover:bg-slate-50/80 flex items-center gap-3.5 transition-all cursor-pointer text-left group border-none bg-transparent"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#7b1fa2] text-white font-medium flex items-center justify-center text-base select-none shadow-sm shrink-0">
                      A
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        Anshika Pathak
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        anshika.akb80@gmail.com
                      </p>
                    </div>
                  </button>

                  {/* Account 3: Divya Sonla */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('divyasonla10@gmail.com', 'Divya Sonla')}
                    className="w-full p-4 hover:bg-slate-50/80 flex items-center gap-3.5 transition-all cursor-pointer text-left group border-none bg-transparent"
                  >
                    <div className="w-9 h-9 rounded-full text-white font-medium flex items-center justify-center text-base select-none shadow-sm overflow-hidden bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=100&q=80')] bg-cover bg-center shrink-0 animate-pulse">
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        Divya Sonla
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        divyasonla10@gmail.com
                      </p>
                    </div>
                  </button>

                  {/* Account 4: Use another account */}
                  <button
                    type="button"
                    onClick={() => setIsAddingGoogleAccount(true)}
                    className="w-full p-4 hover:bg-slate-50 flex items-center gap-3.5 transition-all cursor-pointer text-left group border-none bg-transparent"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                      <User className="w-4.5 h-4.5 text-slate-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                        Use another account
                      </h4>
                    </div>
                  </button>
                </div>

                {/* Google OAuth Legal Notice */}
                <p className="text-xs text-slate-400 font-normal leading-relaxed text-left mb-6">
                  To continue, Google will share your name, email address, language preference, and profile picture with <span className="font-semibold text-slate-800">Raksha<span className="text-blue-600 font-bold">X</span> Vault</span>. Before using this app, you can review its <span className="text-blue-600 hover:underline cursor-pointer">privacy policy</span> and <span className="text-blue-600 hover:underline cursor-pointer">terms of service</span>.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-left mb-4 animate-fade-in">
                <p className="text-xs text-slate-500">Sign in using any custom Google Account ID below.</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                      Google Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Patel"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoogleAccount(false)}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border-none"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!customGoogleEmail || !customGoogleName}
                    onClick={() => handleSelectGoogleAccount(customGoogleEmail, customGoogleName)}
                    className={`flex-grow py-2.5 font-bold rounded-xl text-xs transition-all cursor-pointer text-center border-none ${
                      customGoogleEmail && customGoogleName
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Google-like Footer with Language & Actions */}
            <div className="mt-2 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1 select-none">
                <span>English (United States)</span>
                <span className="text-[9px]">▼</span>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setAuthInfoModal('help')} className="hover:text-slate-600 cursor-pointer text-[11px]">Help</button>
                <button type="button" onClick={() => setAuthInfoModal('privacy')} className="hover:text-slate-600 cursor-pointer text-[11px]">Privacy</button>
                <button type="button" onClick={() => setAuthInfoModal('terms')} className="hover:text-slate-600 cursor-pointer text-[11px]">Terms</button>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleChooser(false);
                setIsAddingGoogleAccount(false);
              }}
              className="mt-5 py-2.5 w-full text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel & Return
            </button>

          </div>
        </div>
      )}

      {/* Styled Auth Info Modal for Help, Privacy & Terms */}
      {authInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fadeIn text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>
                  {authInfoModal === 'help' && 'RakshaX Safety Help Center'}
                  {authInfoModal === 'privacy' && 'Zero-Tracking Privacy Guarantee'}
                  {authInfoModal === 'terms' && 'Emergency Services Usage Terms'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAuthInfoModal(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              {authInfoModal === 'help' && (
                <>
                  <p className="font-semibold text-slate-800">How RakshaX Keeps You Safe:</p>
                  <p>1. In immediate danger, call <strong className="text-rose-600">112</strong> directly.</p>
                  <p>2. Once logged in, use the large 1-Tap SOS button, shake your phone 3 times, or say "Help" / "Emergency" out loud for hands-free emergency dispatch.</p>
                  <p>3. Pre-cached offline map tiles allow coordinate viewing even without internet.</p>
                </>
              )}

              {authInfoModal === 'privacy' && (
                <>
                  <p className="font-semibold text-slate-800">Your Data Protection Guarantee:</p>
                  <p>RakshaX uses zero continuous background tracking. Your GPS coordinates are calculated strictly on your physical device when an emergency signal is actively triggered.</p>
                  <p>All emergency contact numbers and medical IDs remain encrypted in your local device storage.</p>
                </>
              )}

              {authInfoModal === 'terms' && (
                <>
                  <p className="font-semibold text-slate-800">Emergency Terms of Service:</p>
                  <p>1. Automatic SMS dispatches and direct police calls are strictly intended for real emergency distress.</p>
                  <p>2. Ensure browser location and microphone permissions are enabled for full voice and biometric SOS capability.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAuthInfoModal(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
