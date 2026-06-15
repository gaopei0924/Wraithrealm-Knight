// Per-character basic-attack styles. A hero's `attackStyle` (set in characters.js)
// selects one of these. Melee styles run a multi-hit combo (arc swings); ranged
// styles fire a projectile each press. All anim names resolve through the rig's
// alias layer, so Grave_* heroes work too.
export const ATTACK_STYLES = {
  // balanced 3-hit sword (knight / warden)
  sword: {
    kind: 'melee', range: 3.4,
    combo: [
      { anim: '1H_Melee_Attack_Chop', damage: 18, range: 3.0, arc: 1.2, hitAt: 0.38, speed: 1.65 },
      { anim: '1H_Melee_Attack_Slice_Diagonal', damage: 20, range: 3.0, arc: 1.3, hitAt: 0.36, speed: 1.65 },
      { anim: '1H_Melee_Attack_Slice_Horizontal', damage: 34, range: 3.4, arc: 1.7, hitAt: 0.40, speed: 1.45 },
    ],
  },
  // fast dual-wield flurry, lower per-hit but quick (rogue rivals / reaper / vampire)
  dual: {
    kind: 'melee', range: 3.0,
    combo: [
      { anim: 'Dualwield_Melee_Attack_Stab', damage: 13, range: 2.7, arc: 1.1, hitAt: 0.30, speed: 2.0 },
      { anim: 'Dualwield_Melee_Attack_Slice', damage: 14, range: 2.8, arc: 1.4, hitAt: 0.30, speed: 2.0 },
      { anim: 'Dualwield_Melee_Attack_Stab', damage: 16, range: 2.8, arc: 1.2, hitAt: 0.30, speed: 1.9 },
      { anim: 'Dualwield_Melee_Attack_Slice', damage: 22, range: 3.0, arc: 1.6, hitAt: 0.32, speed: 1.7 },
    ],
  },
  // heavy two-handed (barbarian / bonelord / zombie): slow, wide, big damage + knockback
  heavy: {
    kind: 'melee', range: 3.8,
    combo: [
      { anim: '2H_Melee_Attack_Chop', damage: 34, range: 3.6, arc: 1.5, hitAt: 0.45, speed: 1.25, knock: 8 },
      { anim: '2H_Melee_Attack_Spin', damage: 46, range: 4.0, arc: 2.4, hitAt: 0.46, speed: 1.15, knock: 11 },
    ],
  },
  // archer (rogue): fires arrows from range
  bow: {
    kind: 'ranged', range: 9, anim: '1H_Ranged_Shoot', fireAt: 0.5, speed: 1.5,
    projectile: { damage: 24, radius: 0.9, speed: 26, knockback: 3, color: 0xbfe08a },
  },
  // arcane caster (mage / wraith): slower bolt, small splash
  mage: {
    kind: 'ranged', range: 9, anim: 'Spellcast_Shoot', fireAt: 0.45, speed: 1.45,
    projectile: { damage: 22, radius: 1.5, speed: 18, knockback: 4, color: 0x9f6aff },
  },
};

export const DEFAULT_STYLE = 'sword';
