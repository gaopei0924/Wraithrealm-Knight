// Persistent meta-progression: attributes, equipment, cosmetics, class unlocks.
// Bought with 魂晶 (souls) earned each run and applied to the player at run start.

// --- Attributes ----------------------------------------------------------
// Each allocated point grants a permanent bonus. Cost scales with points owned.
export const ATTRIBUTES = [
  { key: 'str', name: '力量', icon: 'up_blade', desc: '每點 攻擊傷害 +4%' },
  { key: 'dex', name: '敏捷', icon: 'up_crit', desc: '每點 暴擊 +1.5%、攻速 +2%' },
  { key: 'int', name: '智略', icon: 'up_wisdom', desc: '每點 同伴威力 +6%、法力回復 +4%' },
  { key: 'vit', name: '體魄', icon: 'up_vitality', desc: '每點 最大生命 +12、護甲 +1%' },
];

export function attrCost(points) { return 20 + points * 12; }

// --- Equipment -----------------------------------------------------------
// slot: weapon | armor | trinket. One item per slot may be equipped.
export const EQUIPMENT = {
  // weapons
  rusty_blade: { id: 'rusty_blade', slot: 'weapon', name: '鏽蝕短劍', icon: 'up_blade', cost: 80, summary: '傷害 +10%', apply: (p) => { p.stats.damageMult *= 1.10; } },
  flame_sword: { id: 'flame_sword', slot: 'weapon', name: '烈焰巨劍', icon: 'fireball', cost: 220, summary: '傷害 +22%', apply: (p) => { p.stats.damageMult *= 1.22; } },
  godslayer: { id: 'godslayer', slot: 'weapon', name: '弒神戰刃', icon: 'up_critdmg', cost: 500, summary: '傷害 +35%、暴擊 +8%', apply: (p) => { p.stats.damageMult *= 1.35; p.stats.critChance += 0.08; } },
  // armor
  leather: { id: 'leather', slot: 'armor', name: '游俠皮甲', icon: 'up_vitality', cost: 80, summary: '最大生命 +30', apply: (p) => { p.stats.maxHp += 30; } },
  plate: { id: 'plate', slot: 'armor', name: '騎士板甲', icon: 'shield', cost: 240, summary: '生命 +60、減傷 +10%', apply: (p) => { p.stats.maxHp += 60; p.stats.armor = Math.min(0.7, p.stats.armor + 0.10); } },
  dragon: { id: 'dragon', slot: 'armor', name: '龍鱗重甲', icon: 'shield', cost: 520, summary: '生命 +100、減傷 +15%、再生 +2', apply: (p) => { p.stats.maxHp += 100; p.stats.armor = Math.min(0.7, p.stats.armor + 0.15); p.stats.regen += 2; } },
  // trinkets
  vamp_amulet: { id: 'vamp_amulet', slot: 'trinket', name: '吸血護符', icon: 'bloodlust', cost: 120, summary: '吸血 +8%', apply: (p) => { p.stats.lifesteal += 0.08; } },
  haste_ring: { id: 'haste_ring', slot: 'trinket', name: '急速指環', icon: 'up_mana', cost: 200, summary: '冷卻 -15%、攻速 +12%', apply: (p) => { p.stats.cdr *= 0.85; p.stats.atkSpeed *= 1.12; } },
  command_sigil: { id: 'command_sigil', slot: 'trinket', name: '統御之印', icon: 'chain', cost: 260, summary: '同伴威力 +50%', apply: (p) => { p.stats.companionPower *= 1.5; } },
};

export const EQUIPMENT_LIST = Object.values(EQUIPMENT);
export const EQUIP_SLOTS = [
  { key: 'weapon', name: '武器' }, { key: 'armor', name: '護甲' }, { key: 'trinket', name: '飾品' },
];

// --- Cosmetics (形象轉變): an aura colour that transforms how the hero reads ---
export const COSMETICS = [
  { id: 'aura_none', name: '無', color: null, cost: 0 },
  { id: 'aura_ember', name: '熔火形態', color: 0xff6a1e, cost: 60 },
  { id: 'aura_frost', name: '霜寒形態', color: 0x8fd0ff, cost: 60 },
  { id: 'aura_void', name: '虛空形態', color: 0xb060ff, cost: 120 },
  { id: 'aura_holy', name: '聖光形態', color: 0xffe070, cost: 120 },
  { id: 'aura_blood', name: '血煞形態', color: 0xff2a4a, cost: 180 },
];

// --- Class unlocks (轉職): non-base heroes cost souls to unlock --------------
export const BASE_CLASSES = new Set(['knight', 'barbarian', 'mage', 'rogue', 'warden']);
export const CLASS_UNLOCK_COST = {
  bonelord: 150, zombie: 200, vampire: 250, reaper: 250, wraith: 300,
};

// --- Application ----------------------------------------------------------
// Apply all persistent meta to a freshly-built player. Returns { auraColor }.
export function applyMeta(player, Save) {
  const a = Save.attrs;
  if (a.str) player.stats.damageMult *= 1 + 0.04 * a.str;
  if (a.dex) { player.stats.critChance += 0.015 * a.dex; player.stats.atkSpeed *= 1 + 0.02 * a.dex; }
  if (a.int) { player.stats.companionPower *= 1 + 0.06 * a.int; player.stats.mpRegen *= 1 + 0.04 * a.int; }
  if (a.vit) { player.stats.maxHp += 12 * a.vit; player.stats.armor = Math.min(0.7, player.stats.armor + 0.01 * a.vit); }

  for (const slot of ['weapon', 'armor', 'trinket']) {
    const id = Save.equipped[slot];
    if (id && EQUIPMENT[id]) EQUIPMENT[id].apply(player);
  }
  player.hp = player.stats.maxHp;
  player.mp = player.stats.maxMp;

  const cos = COSMETICS.find((c) => c.id === Save.cosmetics.aura);
  return { auraColor: cos?.color ?? null };
}

// Souls earned for a finished run.
export function soulReward({ score = 0, stage = 0, kills = 0, bossKills = 0 }) {
  return Math.round(score / 40 + stage * 15 + kills * 0.5 + bossKills * 25);
}
