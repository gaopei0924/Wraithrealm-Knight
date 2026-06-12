// Stage definitions: each stage is a full dungeon with a distinct biome theme
// (tile palette, fog, lighting, torch color), an enemy pool, and a size/ramp.
// Stages are cleared in order; finishing the last one wins the run.

export const STAGES = [
  {
    id: 0,
    name: '石牢',
    subtitle: 'THE STONE GAOL',
    combatCount: 3,
    sizeScale: 1.0,
    statRamp: 1.0,
    waveCountBase: 0,
    enemyPool: ['minion', 'minion', 'rogue'],
    eliteFinal: ['warrior', 'rogue', 'minion'],
    theme: {
      floors: [
        ['floor_tile_large', 70],
        ['floor_tile_large_rocks', 18],
        ['floor_tile_small_decorated', 6],
      ],
      walls: [
        ['wall', 70],
        ['wall_cracked', 18],
        ['wall_arched', 12],
      ],
      fog: 0x070605,
      fogDensity: 0.026,
      ambient: 0x2a2018,
      hemiSky: 0x4a3a28,
      key: 0x8a7355,
      torch: 0xff7a2a,
      torchChance: 0.22,
    },
  },
  {
    id: 1,
    name: '枯井泥窟',
    subtitle: 'THE MIRE CATACOMBS',
    combatCount: 4,
    sizeScale: 1.1,
    statRamp: 1.28,
    waveCountBase: 0,
    enemyPool: ['minion', 'rogue', 'mage'],
    eliteFinal: ['warrior', 'mage', 'rogue'],
    theme: {
      floors: [
        ['floor_dirt_large', 50],
        ['floor_dirt_large_rocky', 34],
        ['floor_tile_large_rocks', 16],
      ],
      walls: [
        ['wall_cracked', 50],
        ['wall_broken', 30],
        ['wall', 20],
      ],
      fog: 0x0a0d08,
      fogDensity: 0.032,
      ambient: 0x24301c,
      hemiSky: 0x3c5230,
      key: 0x7a8a55,
      torch: 0x9fd86a,
      torchChance: 0.18,
    },
  },
  {
    id: 2,
    name: '餘燼深淵',
    subtitle: 'THE EMBER ABYSS',
    combatCount: 4,
    sizeScale: 1.15,
    statRamp: 1.6,
    waveCountBase: 1,
    enemyPool: ['warrior', 'rogue', 'mage'],
    eliteFinal: ['warrior', 'warrior', 'mage'],
    theme: {
      floors: [
        ['floor_tile_large_rocks', 56],
        ['floor_dirt_large_rocky', 30],
        ['floor_tile_large', 14],
      ],
      walls: [
        ['wall_broken', 48],
        ['wall_cracked', 30],
        ['wall', 22],
      ],
      fog: 0x140503,
      fogDensity: 0.03,
      ambient: 0x3a1810,
      hemiSky: 0x6a2818,
      key: 0xb05530,
      torch: 0xff5418,
      torchChance: 0.28,
    },
  },
];

export const FINAL_STAGE_INDEX = STAGES.length - 1;
