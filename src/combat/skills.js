// Active-skill registry. The player equips two (a loadout) bound to K / L and
// the two on-screen skill buttons. Each skill declares its animation and an
// `effect` spec that main.js interprets when the skill's hit frame lands.
//
// effect.type:
//   nova       — radial AoE around the player (whirlwind, frost)
//   arc        — frontal cone; `dash` lunges the player forward first
//   projectile — spawns a player bolt that explodes into an AoE (fireball)
//   buff       — temporary self buff (bloodlust)
//
// All animation names exist in the KayKit Knight rig.

export const SKILLS = {
  whirlwind: {
    id: 'whirlwind', name: '旋風斬', icon: '🌀', desc: '360° 旋轉斬，擊退周圍敵人',
    mp: 30, cooldown: 5, anim: '2H_Melee_Attack_Spin', animSpeed: 1.35, hitAt: 0.42,
    sfx: 'whirl',
    effect: { type: 'nova', range: 3.7, damage: 30, knockback: 8, color: 0xffc060, shake: 0.25 },
  },
  slam: {
    id: 'slam', name: '盾擊', icon: '🛡', desc: '向前猛擊，造成大幅擊退',
    mp: 25, cooldown: 6, anim: 'Block_Attack', animSpeed: 1.3, hitAt: 0.42,
    sfx: 'swing',
    effect: { type: 'arc', range: 3.4, arc: 1.4, damage: 24, knockback: 11, color: 0x88bbff, shake: 0.32 },
  },
  dash: {
    id: 'dash', name: '衝刺突刺', icon: '⚡', desc: '向前衝刺貫穿，落點造成傷害',
    mp: 22, cooldown: 4, anim: '2H_Melee_Attack_Stab', animSpeed: 1.5, hitAt: 0.5,
    sfx: 'swing',
    effect: { type: 'arc', range: 3.2, arc: 1.0, damage: 28, knockback: 7, color: 0xfff0a0, shake: 0.2, dash: 8 },
  },
  fireball: {
    id: 'fireball', name: '火球術', icon: '🔥', desc: '投擲爆裂火球，範圍灼燒',
    mp: 28, cooldown: 3.5, anim: 'Spellcast_Shoot', animSpeed: 1.4, hitAt: 0.42,
    sfx: 'whirl',
    effect: { type: 'projectile', damage: 42, radius: 3.2, speed: 17, knockback: 6, color: 0xff7a22 },
  },
  frost: {
    id: 'frost', name: '冰霜新星', icon: '❄️', desc: '釋放寒霜，減速並冰封敵人',
    mp: 35, cooldown: 7, anim: 'Spellcast_Raise', animSpeed: 1.3, hitAt: 0.45,
    sfx: 'whirl',
    effect: { type: 'nova', range: 4.4, damage: 20, knockback: 3, color: 0x66ccff, shake: 0.2, slow: { factor: 0.4, duration: 3 } },
  },
  bloodlust: {
    id: 'bloodlust', name: '嗜血狂暴', icon: '🩸', desc: '6 秒內傷害 +50%、吸血 +15%',
    mp: 40, cooldown: 12, anim: 'Cheer', animSpeed: 1.2, hitAt: 0.4,
    sfx: 'levelUp',
    effect: { type: 'buff', duration: 6, damageMult: 1.5, lifesteal: 0.15, color: 0xff3344 },
  },
};

export const SKILL_LIST = Object.values(SKILLS);
export const DEFAULT_LOADOUT = ['whirlwind', 'slam'];
