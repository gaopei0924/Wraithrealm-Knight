// Mobile browser ergonomics: fullscreen, landscape lock, and suppression of
// the gestures that wreck a fullscreen canvas game (pinch-zoom, double-tap
// zoom, pull-to-refresh, long-press menu, rubber-band scroll).

export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function suppressBrowserGestures() {
  const stop = (e) => e.preventDefault();
  // Block multi-touch pinch zoom and double-tap zoom.
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });

  // Block scroll / pull-to-refresh everywhere except inside scrollable overlays.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!e.target.closest('.allow-scroll')) e.preventDefault();
    },
    { passive: false },
  );

  // Long-press context menu.
  document.addEventListener('contextmenu', stop);

  // iOS Safari: prevent the double-tap-to-zoom by tracking tap timing.
  let lastTouch = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouch < 300) e.preventDefault();
      lastTouch = now;
    },
    { passive: false },
  );
}

export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch {
    /* user denied or unsupported — game still works windowed */
  }
}

export async function lockLandscape() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
  } catch {
    /* lock unsupported (iOS Safari) — the rotate prompt handles it */
  }
}

// Show/hide a "please rotate" overlay when a touch device is held in portrait.
export function watchOrientation(promptEl) {
  if (!isTouchDevice()) return;
  const check = () => {
    const portrait = window.innerHeight > window.innerWidth;
    promptEl.classList.toggle('hidden', !portrait);
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  check();
}
