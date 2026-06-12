// Difficulty presets scale enemy stats and wave sizes globally; the per-stage
// `statRamp` multiplies on top. `buildWavePlans` turns a stage's enemy pool +
// counts into the per-room wave arrays the layout consumes.

export const DIFFICULTIES = {
  normal: {
    id: 'normal', name: '普通', subtitle: 'NORMAL', accent: '#6fae6f',
    enemyHp: 1.0, enemyDamage: 1.0, enemySpeed: 1.0, waveCountAdd: 0, xpMult: 1.0,
    desc: '適合熟悉操作。敵人數量與傷害標準。',
  },
  hard: {
    id: 'hard', name: '困難', subtitle: 'HARD', accent: '#c9a35c',
    enemyHp: 1.5, enemyDamage: 1.4, enemySpeed: 1.08, waveCountAdd: 1, xpMult: 1.35,
    desc: '敵人更硬更痛，每波多一隻。經驗 +35%。',
  },
  hell: {
    id: 'hell', name: '地獄', subtitle: 'HELL', accent: '#c0392b',
    enemyHp: 2.2, enemyDamage: 1.9, enemySpeed: 1.2, waveCountAdd: 2, xpMult: 1.8,
    desc: '殺意全開。血厚、爆發高、成群湧入。經驗 +80%。',
  },
};

// Combined stat multipliers for an enemy on a given stage + difficulty.
export function enemyMods(difficulty, stage) {
  return {
    hp: difficulty.enemyHp * stage.statRamp,
    damage: difficulty.enemyDamage * stage.statRamp,
    speed: difficulty.enemySpeed,
  };
}

// Per-room wave plans for a stage. Room 0 is the safe start room (no waves);
// combat rooms ramp up; the last combat room is the "boss" room (elite pool,
// one extra dense wave).
export function buildWavePlans(stage, difficulty) {
  const add = difficulty.waveCountAdd + stage.waveCountBase;
  const plans = [null]; // start room

  for (let i = 0; i < stage.combatCount; i++) {
    const isFinal = i === stage.combatCount - 1;
    const pool = isFinal ? stage.eliteFinal : stage.enemyPool;
    const intensity = i / Math.max(1, stage.combatCount - 1); // 0..1
    const waveCount = isFinal ? 3 : 2;
    const waves = [];
    for (let w = 0; w < waveCount; w++) {
      const base = 3 + Math.round(intensity * 2) + w;
      waves.push({ count: base + add, types: pool });
    }
    plans.push(waves);
  }
  return plans;
}
