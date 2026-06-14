// localStorage-backed save: high score, settings, bestiary, achievements, and
// persistent meta-progression (魂晶 currency, attributes, equipment, unlocked
// classes, cosmetics). All best-effort — never throws.
const KEY = 'wraithrealm-save-v1';

const DEFAULT = {
  highScore: 0,
  bestStage: 0,
  volume: 0.35,
  muted: false,
  shake: true,
  music: true,
  autoAttack: true,
  autoCast: true,
  layout: {}, // key → { x, y } drag offsets for on-screen controls
  bestiary: {}, // monsterId → kill count
  achievements: {}, // id → true
  // --- meta progression ---
  souls: 0, // 魂晶 currency, banked across runs
  attrs: { str: 0, dex: 0, int: 0, vit: 0 }, // allocated attribute points
  equipped: { weapon: null, armor: null, trinket: null }, // item ids in slots
  items: {}, // itemId → true (owned)
  classes: {}, // classId → true (unlocked beyond the base roster)
  cosmetics: { aura: null, trail: null, title: null }, // active cosmetics
  ownedCosmetics: {}, // cosmeticId → true
  companionsSeen: {}, // companionId → true (codex)
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    // deep-merge the nested meta objects so new keys appear for old saves
    return {
      ...DEFAULT, ...saved,
      attrs: { ...DEFAULT.attrs, ...(saved.attrs ?? {}) },
      equipped: { ...DEFAULT.equipped, ...(saved.equipped ?? {}) },
      cosmetics: { ...DEFAULT.cosmetics, ...(saved.cosmetics ?? {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT));
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
  get shake() { return state.shake; },
  get music() { return state.music; },
  get autoAttack() { return state.autoAttack; },
  get autoCast() { return state.autoCast; },
  setShake(s) { state.shake = s; persist(); },
  setMusic(m) { state.music = m; persist(); },
  setAutoAttack(v) { state.autoAttack = v; persist(); },
  setAutoCast(v) { state.autoCast = v; persist(); },
  get layout() { return state.layout; },
  setLayout(key, x, y) { state.layout[key] = { x, y }; persist(); },
  resetLayout() { state.layout = {}; persist(); },

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
  bestiaryKills(id) { return state.bestiary[id] ?? 0; },

  unlock(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = true;
    persist();
    return true;
  },
  has(id) { return !!state.achievements[id]; },

  // --- meta progression ---------------------------------------------------
  get souls() { return state.souls; },
  addSouls(n) { state.souls += Math.max(0, Math.round(n)); persist(); },
  spendSouls(n) { if (state.souls < n) return false; state.souls -= n; persist(); return true; },

  get attrs() { return state.attrs; },
  addAttr(key) { if (key in state.attrs) { state.attrs[key]++; persist(); } },

  get equipped() { return state.equipped; },
  equip(slot, id) { state.equipped[slot] = id; persist(); },

  ownsItem(id) { return !!state.items[id]; },
  ownItem(id) { state.items[id] = true; persist(); },
  get items() { return state.items; },

  classUnlocked(id) { return !!state.classes[id]; },
  unlockClass(id) { state.classes[id] = true; persist(); },

  get cosmetics() { return state.cosmetics; },
  setCosmetic(slot, id) { state.cosmetics[slot] = id; persist(); },
  ownsCosmetic(id) { return !!state.ownedCosmetics[id]; },
  ownCosmetic(id) { state.ownedCosmetics[id] = true; persist(); },

  seeCompanion(id) { if (!state.companionsSeen[id]) { state.companionsSeen[id] = true; persist(); } },
  companionSeen(id) { return !!state.companionsSeen[id]; },
};
