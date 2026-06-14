// Stage definitions: each stage is a full dungeon with a distinct biome theme
// (tile palette, fog, lighting, torch colour), an enemy pool, an elite chance,
// and an assigned boss for its final room. Stages are cleared in order; beating
// the last (The End King) wins the run.

export const STAGES = [
  {
    id: 0, name: '石牢', subtitle: 'THE STONE GAOL',
    combatCount: 3, sizeScale: 1.0, statRamp: 1.0, waveCountBase: 0, eliteChance: 0,
    enemyPool: ['minion', 'minion', 'rogue'], eliteFinal: ['warrior', 'rogue', 'minion'],
    boss: 'bonelord',
    theme: {
      floors: [['floor_tile_large', 70], ['floor_tile_large_rocks', 18], ['floor_tile_small_decorated', 6]],
      walls: [['wall', 70], ['wall_cracked', 18], ['wall_arched', 12]],
      fog: 0x070605, fogDensity: 0.026, ambient: 0x2a2018, hemiSky: 0x4a3a28, key: 0x8a7355, torch: 0xff7a2a, torchChance: 0.22,
    },
  },
  {
    id: 1, name: '枯井泥窟', subtitle: 'THE MIRE CATACOMBS',
    combatCount: 4, sizeScale: 1.1, statRamp: 1.25, waveCountBase: 0, eliteChance: 0.06,
    enemyPool: ['minion', 'rogue', 'archer'], eliteFinal: ['warrior', 'venom', 'rogue'],
    boss: 'venommatron',
    theme: {
      floors: [['floor_dirt_large', 50], ['floor_dirt_large_rocky', 34], ['floor_tile_large_rocks', 16]],
      walls: [['wall_cracked', 50], ['wall_broken', 30], ['wall', 20]],
      fog: 0x0a0d08, fogDensity: 0.032, ambient: 0x24301c, hemiSky: 0x3c5230, key: 0x7a8a55, torch: 0x9fd86a, torchChance: 0.18,
    },
  },
  {
    id: 2, name: '餘燼深淵', subtitle: 'THE EMBER ABYSS',
    combatCount: 4, sizeScale: 1.15, statRamp: 1.55, waveCountBase: 1, eliteChance: 0.1,
    enemyPool: ['warrior', 'rogue', 'revenant'], eliteFinal: ['brute', 'revenant', 'warrior'],
    boss: 'infernal',
    theme: {
      floors: [['floor_tile_large_rocks', 56], ['floor_dirt_large_rocky', 30], ['floor_tile_large', 14]],
      walls: [['wall_broken', 48], ['wall_cracked', 30], ['wall', 22]],
      fog: 0x140503, fogDensity: 0.03, ambient: 0x3a1810, hemiSky: 0x6a2818, key: 0xb05530, torch: 0xff5418, torchChance: 0.28,
    },
  },
  {
    id: 3, name: '冰封地窖', subtitle: 'THE FROZEN CRYPT',
    combatCount: 4, sizeScale: 1.18, statRamp: 1.85, waveCountBase: 1, eliteChance: 0.1,
    enemyPool: ['rogue', 'warrior', 'frostmage'], eliteFinal: ['warrior', 'frostmage', 'brute'],
    boss: 'frostqueen',
    theme: {
      floors: [['floor_tile_large', 54], ['floor_tile_large_rocks', 30], ['floor_tile_small_decorated', 16]],
      walls: [['wall', 50], ['wall_arched', 30], ['wall_cracked', 20]],
      fog: 0x06090e, fogDensity: 0.03, ambient: 0x1c2838, hemiSky: 0x35506e, key: 0x6f93c0, torch: 0x8fd0ff, torchChance: 0.2,
    },
  },
  {
    id: 4, name: '黯獄王座', subtitle: 'THE OBSIDIAN THRONE',
    combatCount: 4, sizeScale: 1.2, statRamp: 2.15, waveCountBase: 1, eliteChance: 0.12,
    enemyPool: ['warrior', 'mage', 'wraith'], eliteFinal: ['warrior', 'wraith', 'mage'],
    boss: 'voidarchon',
    theme: {
      floors: [['floor_tile_large', 46], ['floor_tile_large_rocks', 34], ['floor_dirt_large_rocky', 20]],
      walls: [['wall', 44], ['wall_broken', 30], ['wall_arched', 26]],
      fog: 0x0c0710, fogDensity: 0.032, ambient: 0x2a1c3a, hemiSky: 0x4a2c66, key: 0x8a5cc0, torch: 0xc060ff, torchChance: 0.26,
    },
  },
  {
    id: 5, name: '血色屠場', subtitle: 'THE CRIMSON SHAMBLES',
    combatCount: 4, sizeScale: 1.2, statRamp: 2.4, waveCountBase: 1, eliteChance: 0.14,
    enemyPool: ['brute', 'warrior', 'venom'], eliteFinal: ['brute', 'brute', 'revenant'],
    boss: 'bloodbutcher',
    theme: {
      floors: [['floor_tile_large_rocks', 50], ['floor_dirt_large_rocky', 34], ['floor_tile_large', 16]],
      walls: [['wall_broken', 50], ['wall_cracked', 30], ['wall', 20]],
      fog: 0x140304, fogDensity: 0.033, ambient: 0x401414, hemiSky: 0x7a2222, key: 0xb04030, torch: 0xff3a2a, torchChance: 0.24,
    },
  },
  {
    id: 6, name: '蝕骨毒沼', subtitle: 'THE ROTBONE FEN',
    combatCount: 4, sizeScale: 1.22, statRamp: 2.7, waveCountBase: 2, eliteChance: 0.14,
    enemyPool: ['venom', 'archer', 'shaman'], eliteFinal: ['venom', 'shaman', 'brute'],
    boss: 'venommatron',
    theme: {
      floors: [['floor_dirt_large', 46], ['floor_dirt_large_rocky', 38], ['floor_tile_large_rocks', 16]],
      walls: [['wall_cracked', 46], ['wall_broken', 34], ['wall', 20]],
      fog: 0x081004, fogDensity: 0.035, ambient: 0x223818, hemiSky: 0x4a6a26, key: 0x86a040, torch: 0xbce85a, torchChance: 0.2,
    },
  },
  {
    id: 7, name: '雷鳴聖殿', subtitle: 'THE THUNDER SANCTUM',
    combatCount: 5, sizeScale: 1.22, statRamp: 3.0, waveCountBase: 2, eliteChance: 0.15,
    enemyPool: ['mage', 'archer', 'wraith'], eliteFinal: ['mage', 'mage', 'wraith'],
    boss: 'stormjudge',
    theme: {
      floors: [['floor_tile_large', 56], ['floor_tile_large_rocks', 28], ['floor_tile_small_decorated', 16]],
      walls: [['wall_arched', 46], ['wall', 34], ['wall_cracked', 20]],
      fog: 0x070b12, fogDensity: 0.03, ambient: 0x222e44, hemiSky: 0x46668c, key: 0x88aee0, torch: 0xbfe6ff, torchChance: 0.22,
    },
  },
  {
    id: 8, name: '虛空裂界', subtitle: 'THE VOID RIFT',
    combatCount: 5, sizeScale: 1.24, statRamp: 3.3, waveCountBase: 2, eliteChance: 0.16,
    enemyPool: ['wraith', 'cultist', 'mage'], eliteFinal: ['wraith', 'wraith', 'cultist'],
    boss: 'voidarchon',
    theme: {
      floors: [['floor_tile_large', 50], ['floor_tile_large_rocks', 32], ['floor_dirt_large_rocky', 18]],
      walls: [['wall', 44], ['wall_broken', 32], ['wall_arched', 24]],
      fog: 0x0a0614, fogDensity: 0.034, ambient: 0x281840, hemiSky: 0x442a78, key: 0x9a6ad0, torch: 0xb060ff, torchChance: 0.24,
    },
  },
  {
    id: 9, name: '黃金陵墓', subtitle: 'THE GILDED TOMB',
    combatCount: 5, sizeScale: 1.24, statRamp: 3.6, waveCountBase: 2, eliteChance: 0.18,
    enemyPool: ['warrior', 'archer', 'cultist'], eliteFinal: ['brute', 'warrior', 'cultist'],
    boss: 'soulcantor',
    theme: {
      floors: [['floor_tile_large', 58], ['floor_tile_small_decorated', 26], ['floor_tile_large_rocks', 16]],
      walls: [['wall', 50], ['wall_arched', 34], ['wall_cracked', 16]],
      fog: 0x120c04, fogDensity: 0.028, ambient: 0x3a2c12, hemiSky: 0x6a5220, key: 0xc09a40, torch: 0xffcf5a, torchChance: 0.3,
    },
  },
  {
    id: 10, name: '永夜冰原', subtitle: 'THE ENDLESS NIGHT',
    combatCount: 5, sizeScale: 1.26, statRamp: 3.9, waveCountBase: 3, eliteChance: 0.18,
    enemyPool: ['frostmage', 'warrior', 'wraith'], eliteFinal: ['brute', 'frostmage', 'wraith'],
    boss: 'frostqueen',
    theme: {
      floors: [['floor_tile_large', 56], ['floor_tile_large_rocks', 28], ['floor_tile_small_decorated', 16]],
      walls: [['wall', 52], ['wall_arched', 30], ['wall_cracked', 18]],
      fog: 0x04070c, fogDensity: 0.034, ambient: 0x16222e, hemiSky: 0x2e486a, key: 0x6088b0, torch: 0xa8e0ff, torchChance: 0.18,
    },
  },
  {
    id: 11, name: '熔岩核心', subtitle: 'THE MAGMA CORE',
    combatCount: 5, sizeScale: 1.28, statRamp: 4.2, waveCountBase: 3, eliteChance: 0.2,
    enemyPool: ['revenant', 'brute', 'mage'], eliteFinal: ['brute', 'revenant', 'mage'],
    boss: 'infernal',
    theme: {
      floors: [['floor_tile_large_rocks', 54], ['floor_dirt_large_rocky', 34], ['floor_tile_large', 12]],
      walls: [['wall_broken', 52], ['wall_cracked', 30], ['wall', 18]],
      fog: 0x1a0602, fogDensity: 0.034, ambient: 0x4a1c0c, hemiSky: 0x8a3010, key: 0xc85828, torch: 0xff5010, torchChance: 0.32,
    },
  },
  {
    id: 12, name: '腐朽藏經閣', subtitle: 'THE MOULDERING ARCHIVE',
    combatCount: 5, sizeScale: 1.28, statRamp: 4.5, waveCountBase: 3, eliteChance: 0.2,
    enemyPool: ['cultist', 'shaman', 'wraith'], eliteFinal: ['cultist', 'cultist', 'brute'],
    boss: 'soulcantor',
    theme: {
      floors: [['floor_dirt_large', 48], ['floor_tile_large_rocks', 34], ['floor_tile_large', 18]],
      walls: [['wall_cracked', 48], ['wall', 30], ['wall_broken', 22]],
      fog: 0x0a0b06, fogDensity: 0.032, ambient: 0x303018, hemiSky: 0x585a2c, key: 0x9a9050, torch: 0xccc060, torchChance: 0.22,
    },
  },
  {
    id: 13, name: '骸骨深淵', subtitle: 'THE OSSUARY DEEP',
    combatCount: 5, sizeScale: 1.3, statRamp: 4.8, waveCountBase: 4, eliteChance: 0.22,
    enemyPool: ['warrior', 'revenant', 'brute'], eliteFinal: ['brute', 'brute', 'revenant'],
    boss: 'colossus',
    theme: {
      floors: [['floor_tile_large', 52], ['floor_tile_large_rocks', 32], ['floor_tile_small_decorated', 16]],
      walls: [['wall', 46], ['wall_broken', 30], ['wall_arched', 24]],
      fog: 0x0b0a0c, fogDensity: 0.032, ambient: 0x2c2a32, hemiSky: 0x52506a, key: 0x9088a8, torch: 0xc8b8e0, torchChance: 0.26,
    },
  },
  {
    id: 14, name: '終焉之殿', subtitle: 'THRONE OF THE END KING',
    combatCount: 5, sizeScale: 1.34, statRamp: 5.2, waveCountBase: 4, eliteChance: 0.25,
    enemyPool: ['brute', 'wraith', 'mage', 'revenant'], eliteFinal: ['brute', 'revenant', 'wraith', 'mage'],
    boss: 'endking',
    theme: {
      floors: [['floor_tile_large', 48], ['floor_tile_large_rocks', 32], ['floor_dirt_large_rocky', 20]],
      walls: [['wall', 44], ['wall_arched', 32], ['wall_broken', 24]],
      fog: 0x0c0816, fogDensity: 0.034, ambient: 0x301f44, hemiSky: 0x5a3a78, key: 0xb08adc, torch: 0xffd24a, torchChance: 0.3,
    },
  },
];

export const FINAL_STAGE_INDEX = STAGES.length - 1;
