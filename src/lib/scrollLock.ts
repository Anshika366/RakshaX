/**
 * Reference-Counted Scroll Lock Manager for RakshaX
 *
 * Ensures that nested or concurrent modals do not prematurely release
 * background scroll locking, and that all locks are cleanly restored
 * upon unmount or view transitions.
 */

let activeLockCount = 0;

export function acquireScrollLock(): () => void {
  let released = false;
  activeLockCount++;

  if (activeLockCount === 1 && typeof document !== 'undefined') {
    document.body.classList.add('modal-open');
  }

  return () => {
    if (released) return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);

    if (activeLockCount === 0 && typeof document !== 'undefined') {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
  };
}

export function releaseAllScrollLocks(): void {
  activeLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

export function getActiveScrollLockCount(): number {
  return activeLockCount;
}
