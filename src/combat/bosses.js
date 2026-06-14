// Boss roster. Each boss reuses a base rig at large scale with a distinct tint,
// a colour for its VFX, and an attack pattern. `attacks` are picked by the Boss
// AI; main.js resolves each attack spec (telegraph → damage) against the player.
//
// attack.type:
//   cleave — frontal cone melee
//   nova   — radial burst around the boss
//   slam   — big delayed ground AoE (longer telegraph)
//   volley — fan of projectiles at the player
//   charge — dash across the arena, contact damage
//   summon — spawn a wave of adds

export const BOSSES = {
  bonelord: {
    id: 'bonelord', name: '骸骨領主', title: 'THE BONE LORD',
    model: 'Skeleton_Warrior', tint: 0xe8e2cc, scale: 2.7, color: 0xfff0c0,
    hp: 900, damage: 22, speed: 2.2, xp: 400, radius: 1.3, enrageAt: 0.5,
    adds: ['minion', 'warrior'], addCount: 4,
    attacks: [
      { type: 'cleave', range: 5, arc: 1.3, damage: 24, telegraph: 0.6 },
      { type: 'nova', range: 6, damage: 20, telegraph: 0.8 },
      { type: 'summon', telegraph: 0.9 },
    ],
  },
  infernal: {
    id: 'infernal', name: '烈焰魔將', title: 'INFERNAL GENERAL',
    model: 'Barbarian', tint: 0xc0301a, scale: 2.9, color: 0xff6a1e,
    hp: 1050, damage: 26, speed: 2.6, xp: 460, radius: 1.4, enrageAt: 0.5,
    adds: ['revenant'], addCount: 3,
    attacks: [
      { type: 'nova', range: 6.5, damage: 26, telegraph: 0.7, status: 'burn' },
      { type: 'charge', damage: 28, telegraph: 0.5 },
      { type: 'slam', range: 7, damage: 32, telegraph: 1.1, status: 'burn' },
    ],
  },
  frostqueen: {
    id: 'frostqueen', name: '寒霜女王', title: 'THE FROST QUEEN',
    model: 'Mage', tint: 0x6fb8ff, scale: 2.6, color: 0x8fd0ff,
    hp: 980, damage: 22, speed: 2.3, xp: 460, radius: 1.3, enrageAt: 0.5,
    adds: ['frostmage'], addCount: 3,
    attacks: [
      { type: 'volley', count: 7, damage: 16, telegraph: 0.6, status: 'chill' },
      { type: 'nova', range: 6.5, damage: 22, telegraph: 0.9, status: 'chill' },
      { type: 'slam', range: 6.5, damage: 28, telegraph: 1.0 },
    ],
  },
  venommatron: {
    id: 'venommatron', name: '劇毒蛛母', title: 'THE VENOM MATRON',
    model: 'Rogue_Hooded', tint: 0x4e8a2e, scale: 2.7, color: 0x88dd44,
    hp: 1020, damage: 20, speed: 2.5, xp: 480, radius: 1.3, enrageAt: 0.55,
    adds: ['venom'], addCount: 4,
    attacks: [
      { type: 'slam', range: 7, damage: 24, telegraph: 1.0, status: 'poison' },
      { type: 'nova', range: 6, damage: 18, telegraph: 0.8, status: 'poison' },
      { type: 'summon', telegraph: 0.9 },
    ],
  },
  stormjudge: {
    id: 'stormjudge', name: '雷霆審判者', title: 'THE STORM JUDGE',
    model: 'Skeleton_Mage', tint: 0x9fe6ff, scale: 2.7, color: 0xc9a3ff,
    hp: 1100, damage: 24, speed: 2.4, xp: 520, radius: 1.3, enrageAt: 0.5,
    adds: ['mage', 'archer'], addCount: 4,
    attacks: [
      { type: 'volley', count: 9, damage: 18, telegraph: 0.5 },
      { type: 'nova', range: 7, damage: 24, telegraph: 0.8 },
      { type: 'slam', range: 7.5, damage: 30, telegraph: 1.0 },
    ],
  },
  voidarchon: {
    id: 'voidarchon', name: '虛空執政', title: 'THE VOID ARCHON',
    model: 'Rogue_Hooded', tint: 0x8a4ad0, scale: 2.7, color: 0xc060ff,
    hp: 1150, damage: 26, speed: 3.0, xp: 540, radius: 1.3, enrageAt: 0.55,
    adds: ['wraith'], addCount: 4,
    attacks: [
      { type: 'charge', damage: 30, telegraph: 0.4 },
      { type: 'volley', count: 8, damage: 20, telegraph: 0.5 },
      { type: 'nova', range: 6.5, damage: 26, telegraph: 0.8 },
    ],
  },
  bloodbutcher: {
    id: 'bloodbutcher', name: '嗜血屠夫', title: 'THE BLOOD BUTCHER',
    model: 'Barbarian', tint: 0x7a1010, scale: 3.1, color: 0xd11a1a,
    hp: 1300, damage: 30, speed: 2.7, xp: 580, radius: 1.5, enrageAt: 0.5,
    adds: ['brute'], addCount: 2, lifesteal: true,
    attacks: [
      { type: 'cleave', range: 5.5, arc: 1.5, damage: 32, telegraph: 0.55 },
      { type: 'charge', damage: 34, telegraph: 0.45 },
      { type: 'slam', range: 7, damage: 38, telegraph: 1.0 },
    ],
  },
  soulcantor: {
    id: 'soulcantor', name: '亡魂吟者', title: 'THE SOUL CANTOR',
    model: 'Rogue_Hooded', tint: 0x3a6e8a, scale: 2.7, color: 0x66ddbb,
    hp: 1180, damage: 22, speed: 2.3, xp: 560, radius: 1.3, enrageAt: 0.6,
    adds: ['minion', 'rogue', 'mage'], addCount: 5,
    attacks: [
      { type: 'summon', telegraph: 0.9 },
      { type: 'nova', range: 6.5, damage: 24, telegraph: 0.8 },
      { type: 'volley', count: 6, damage: 18, telegraph: 0.6 },
    ],
  },
  colossus: {
    id: 'colossus', name: '黯金巨像', title: 'THE OBSIDIAN COLOSSUS',
    model: 'Skeleton_Warrior', tint: 0x342a44, scale: 3.5, color: 0xb088ff,
    hp: 1600, damage: 34, speed: 1.9, xp: 640, radius: 1.7, enrageAt: 0.5,
    adds: ['warrior'], addCount: 3,
    attacks: [
      { type: 'slam', range: 8.5, damage: 40, telegraph: 1.2 },
      { type: 'cleave', range: 6, arc: 1.4, damage: 34, telegraph: 0.7 },
      { type: 'nova', range: 7.5, damage: 30, telegraph: 0.9 },
    ],
  },
  endking: {
    id: 'endking', name: '終焉之王', title: 'THE END KING',
    model: 'Barbarian', tint: 0x2a1240, scale: 3.6, color: 0xffd24a,
    hp: 2200, damage: 38, speed: 2.8, xp: 1000, radius: 1.7, enrageAt: 0.6, regal: true,
    adds: ['warrior', 'mage', 'wraith', 'revenant'], addCount: 5,
    attacks: [
      { type: 'slam', range: 8.5, damage: 44, telegraph: 1.0, status: 'burn' },
      { type: 'nova', range: 8, damage: 36, telegraph: 0.7 },
      { type: 'charge', damage: 40, telegraph: 0.4 },
      { type: 'volley', count: 10, damage: 22, telegraph: 0.5 },
      { type: 'summon', telegraph: 0.8 },
    ],
  },
};

export const BOSS_KEYS = Object.keys(BOSSES);
