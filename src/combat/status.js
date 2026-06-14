// Status-effect definitions shared by skills, enemies, and bosses. Each enemy
// carries a `status` map of { type → { until, ... } }; main.js ticks DoTs and
// enemy.js reads control/speed/vulnerability flags from it.
//
//   burn   — fire DoT (orange numbers), aura
//   poison — toxic DoT (green numbers), aura
//   chill  — movement slow (no control loss)
//   freeze — fully immobilised + can't act (hard CC), brief
//   stun   — can't act but can be pushed
//   shock  — vulnerability: takes extra damage while active

export const STATUS = {
  burn:   { color: 0xff6a1e, aura: 0.5, dot: true, label: '燃燒' },
  poison: { color: 0x88dd44, aura: 0.45, dot: true, label: '中毒' },
  chill:  { color: 0x8fd0ff, aura: 0.4, slow: true, label: '緩速' },
  freeze: { color: 0x9fe6ff, aura: 0.7, control: true, label: '冰封' },
  stun:   { color: 0xffe070, aura: 0.6, control: true, label: '暈眩' },
  shock:  { color: 0xc9a3ff, aura: 0.5, vulnerable: 1.4, label: '感電' },
};

export const STATUS_KEYS = Object.keys(STATUS);
