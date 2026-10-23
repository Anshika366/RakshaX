import React, { useEffect, useState } from 'react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../lib/translations';
import { acquireScrollLock } from '../../lib/scrollLock';
import { Languages, Check, X, Globe, Sparkles, Search } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectLanguage: (code: SupportedLanguage) => void;
}

export default function LanguageSelectorModal({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage
}: LanguageSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Lock body scroll only when modal is open using reference-counted lock
  useEffect(() => {
    if (!isOpen) return;

    const releaseScroll = acquireScrollLock();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((lang) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      onClick={onClose}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain animate-fadeIn"
      style={{ overscrollBehavior: 'contain' }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden overscroll-contain max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close language selector"
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-2 pr-8">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
            <Languages className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Select App Language / भाषा चुनें
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred language to customize the whole application UI
            </p>
          </div>
        </div>

        {/* Modern Search Bar with Placeholder */}
        <div className="mt-3 sm:mt-4 relative group/search flex items-center bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 focus-within:bg-white dark:focus-within:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 rounded-2xl transition-all duration-200 shadow-2xs">
          <div className="w-10 h-10 flex items-center justify-center text-slate-400 group-focus-within/search:text-blue-600 transition-colors shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language / भाषा खोजें (e.g. Hindi, Bengali, Tamil)..."
            className="w-full bg-transparent py-2.5 pr-8 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none text-xs font-semibold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Language Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 my-4 sm:my-5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
          {filteredLanguages.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400">
              No languages matched &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black leading-tight">{lang.nativeName}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {lang.name}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-blue-900 dark:text-blue-200 text-[11px] flex items-center gap-2">
          <Globe className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>You can change your language anytime from the top bar or settings.</span>
        </div>
      </div>
    </div>
  );
}
