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

  // Block scroll / pull-to-refresh everywhere except inside scrollable overlays
  // (any .overlay or anything tagged .allow-scroll) — otherwise menus that
  // overflow a short landscape screen can't be scrolled to their buttons.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!e.target.closest('.allow-scroll, .overlay')) e.preventDefault();
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

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

// Requests fullscreen on the page root. Must be called from within a user
// gesture (e.g. the start-button click) or the browser will reject it.
// Returns true if the request resolved without throwing.
export async function enterFullscreen() {
  if (isFullscreen()) return true;
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch {
    /* user denied or unsupported — game still works windowed */
    return false;
  }
}

export function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch {
    /* ignore */
  }
}

export async function lockLandscape() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
  } catch {
    /* lock unsupported (iOS Safari) — the rotate prompt handles it */
  }
}

// Keeps the layout glued to the *visible* viewport. On mobile the URL bar
// shrinks `visualViewport.height`; we mirror that into a --app-h CSS var and
// resize the renderer, so the game always fills exactly what's on screen and
// the address bar never overlaps the HUD — even when true fullscreen is
// unavailable (e.g. iOS Safari/Chrome).
export function fitViewport(onResize) {
  const apply = () => {
    const vv = window.visualViewport;
    const h = Math.round(vv?.height ?? window.innerHeight);
    const w = Math.round(vv?.width ?? window.innerWidth);
    document.documentElement.style.setProperty('--app-h', `${h}px`);
    document.documentElement.style.setProperty('--app-w', `${w}px`);
    onResize?.();
  };
  apply();
  window.visualViewport?.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('scroll', apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
}

// Fallback: some mobile browsers ignore fullscreen from the first synthetic
// activation. Re-attempt on the first real touch/click after the run starts.
export function requestFullscreenOnFirstGesture() {
  if (!isTouchDevice()) return;
  const once = () => {
    enterFullscreen();
    document.removeEventListener('pointerdown', once);
  };
  document.addEventListener('pointerdown', once, { once: true });
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
