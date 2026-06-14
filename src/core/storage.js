// Tiny localStorage-backed save: high score, settings (volume), bestiary
// (monsters seen), and unlocked achievements. All best-effort — never throws.
const KEY = 'wraithrealm-save-v1';

const DEFAULT = {
  highScore: 0,
  bestStage: 0,
  volume: 0.35,
  muted: false,
  bestiary: {}, // monsterId → kill count
  achievements: {}, // id → true
};

function load() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT };
  }
}

let state = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export const Save = {
  get: () => state,
  get highScore() { return state.highScore; },
  get bestStage() { return state.bestStage; },
  get volume() { return state.volume; },
  get muted() { return state.muted; },

  setVolume(v) { state.volume = v; persist(); },
  setMuted(m) { state.muted = m; persist(); },

  recordScore(score, stageIndex) {
    let best = false;
    if (score > state.highScore) { state.highScore = Math.round(score); best = true; }
    if (stageIndex > state.bestStage) state.bestStage = stageIndex;
    persist();
    return best;
  },

  recordKill(monsterId) {
    state.bestiary[monsterId] = (state.bestiary[monsterId] ?? 0) + 1;
    // persist lazily — bestiary writes are frequent; flush on score/stage events
  },

  flush() { persist(); },

  bestiaryCount() { return Object.keys(state.bestiary).length; },

  unlock(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = true;
    persist();
    return true;
  },
  has(id) { return !!state.achievements[id]; },
};
