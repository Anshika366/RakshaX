import { acquireScrollLock, releaseAllScrollLocks, getActiveScrollLockCount } from '../src/lib/scrollLock';
import { SUPPORTED_LANGUAGES, getTranslation, translations, SupportedLanguage } from '../src/lib/translations';

// Mock DOM for Node environment
class MockClassList {
  classes = new Set<string>();
  add(c: string) { this.classes.add(c); }
  remove(c: string) { this.classes.delete(c); }
  contains(c: string) { return this.classes.has(c); }
}

const mockBody = {
  classList: new MockClassList(),
  style: {} as Record<string, string>,
};
const mockDocEl = {
  classList: new MockClassList(),
  style: {} as Record<string, string>,
  lang: 'en',
};

// Assign globals
(global as any).document = {
  body: mockBody,
  documentElement: mockDocEl,
};

let passed = 0;
let failed = 0;

function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${desc}`);
    failed++;
  }
}

console.log('--- TEST SUITE 1: SCROLL LOCK REFERENCE COUNTING & RESTORATION ---');
releaseAllScrollLocks();
assert('Initial lock count is 0', getActiveScrollLockCount() === 0);
assert('Initial body does not have modal-open', !mockBody.classList.contains('modal-open'));

// Test 1: Single modal open and close
const release1 = acquireScrollLock();
assert('Lock count is 1 after opening modal 1', getActiveScrollLockCount() === 1);
assert('Body has modal-open after opening modal 1', mockBody.classList.contains('modal-open'));

release1();
assert('Lock count is 0 after closing modal 1', getActiveScrollLockCount() === 0);
assert('Body modal-open removed after closing modal 1', !mockBody.classList.contains('modal-open'));

// Test 2: Nested/concurrent modals (the critical bug identified in prompt)
const releaseA = acquireScrollLock(); // Modal A opens (e.g. Contact modal or Dashboard modal)
assert('Lock count is 1 after opening Modal A', getActiveScrollLockCount() === 1);
assert('Body is locked for Modal A', mockBody.classList.contains('modal-open'));

const releaseB = acquireScrollLock(); // Modal B opens on top (e.g. Language Selector)
assert('Lock count is 2 after opening Modal B on top', getActiveScrollLockCount() === 2);
assert('Body remains locked', mockBody.classList.contains('modal-open'));

releaseB(); // Modal B closes
assert('Lock count drops to 1 when Modal B closes', getActiveScrollLockCount() === 1);
assert('CRITICAL: Body remains locked while Modal A is still open', mockBody.classList.contains('modal-open'));

releaseA(); // Modal A closes
assert('Lock count drops to 0 when Modal A closes', getActiveScrollLockCount() === 0);
assert('Body is cleanly unlocked when all modals close', !mockBody.classList.contains('modal-open'));

// Test 3: Repeated open/close cycles (50 iterations)
let cleanCycle = true;
for (let i = 0; i < 50; i++) {
  const rel = acquireScrollLock();
  if (!mockBody.classList.contains('modal-open') || getActiveScrollLockCount() !== 1) cleanCycle = false;
  rel();
  if (mockBody.classList.contains('modal-open') || getActiveScrollLockCount() !== 0) cleanCycle = false;
}
assert('50 repeated open/close cycles maintain 100% clean state without leaks', cleanCycle);

// Test 4: View transition safety reset
acquireScrollLock();
acquireScrollLock();
assert('Lock count is 2 before view transition', getActiveScrollLockCount() === 2);
releaseAllScrollLocks();
assert('releaseAllScrollLocks resets count to 0 upon view switch', getActiveScrollLockCount() === 0);
assert('releaseAllScrollLocks clears modal-open class', !mockBody.classList.contains('modal-open'));

console.log('\n--- TEST SUITE 2: TRANSLATION KEYS & MULTI-VIEW COVERAGE ---');
const criticalLandingKeys = ['heroTitle1', 'heroTitle2', 'heroSubtitle', 'navHome', 'navFeatures', 'navSignIn', 'navGetStarted'];
const criticalAuthKeys = ['authTitleSignUp', 'authTitleSignIn', 'chooseLanguage'];
const criticalDashboardKeys = ['navDashboard', 'cabRideWatch', 'helplines112', 'languageSelectedToast'];

const allLanguages: SupportedLanguage[] = ['en', 'hi', 'mr', 'gu', 'bn', 'ta', 'te', 'kn'];

assert('All 8 supported languages registered in SUPPORTED_LANGUAGES', SUPPORTED_LANGUAGES.length === 8);

allLanguages.forEach((lang) => {
  const allLandingValid = criticalLandingKeys.every((k) => {
    const val = getTranslation(lang, k);
    return typeof val === 'string' && val.length > 0;
  });
  assert(`Language [${lang}] has valid Landing Page translations`, allLandingValid);

  const allAuthValid = criticalAuthKeys.every((k) => {
    const val = getTranslation(lang, k);
    return typeof val === 'string' && val.length > 0;
  });
  assert(`Language [${lang}] has valid Auth Flow translations`, allAuthValid);

  const allDashValid = criticalDashboardKeys.every((k) => {
    const val = getTranslation(lang, k);
    return typeof val === 'string' && val.length > 0;
  });
  assert(`Language [${lang}] has valid Dashboard translations`, allDashValid);
});

// Test dynamic translation parameter interpolation
const interpolated = getTranslation('en', 'activeVaultFor');
assert('getTranslation returns non-empty string for activeVaultFor', typeof interpolated === 'string' && interpolated.length > 0);

console.log(`\nVerification complete. Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
