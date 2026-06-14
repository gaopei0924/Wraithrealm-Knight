// Active-skill registry. The player equips an expanding loadout (3 to start,
// +1 every 5 levels) bound to skill keys / on-screen skill buttons. Each skill
// declares its animation and an `effect` spec that main.js interprets when the
// skill's hit frame lands.
//
// effect.type:
//   nova       — radial AoE around the player; may carry slow / dot / heal-self
//   arc        — frontal cone; `dash` lunges the player forward first
//   projectile — spawns a player bolt that explodes into an AoE (fireball)
//   chain      — arcs lightning between the nearest enemies
//   buff       — temporary self buff (damage, lifesteal, invuln, instant heal)
//
// All animation names exist in the KayKit Knight rig.

// Slot → keyboard key. Skills sit on the number row (1-8): an intuitive ability
// bar, and every equipped skill always has a visible, usable key.
export const SKILL_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
export const SKILL_KEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const SKILLS = {
  whirlwind: {
    id: 'whirlwind', name: '旋風斬', icon: 'whirlwind', desc: '360° 旋轉斬，擊退周圍敵人',
    mp: 30, cooldown: 5, anim: '2H_Melee_Attack_Spin', animSpeed: 1.35, hitAt: 0.42, sfx: 'whirl',
    effect: { type: 'nova', range: 3.7, damage: 30, knockback: 8, color: 0xffc060, shake: 0.25 },
  },
  slam: {
    id: 'slam', name: '盾擊', icon: 'slam', desc: '向前猛擊，造成大幅擊退',
    mp: 25, cooldown: 6, anim: 'Block_Attack', animSpeed: 1.3, hitAt: 0.42, sfx: 'swing',
    effect: { type: 'arc', range: 3.4, arc: 1.4, damage: 24, knockback: 11, color: 0x88bbff, shake: 0.32 },
  },
  dash: {
    id: 'dash', name: '衝刺突刺', icon: 'dash', desc: '向前衝刺貫穿，落點造成傷害',
    mp: 22, cooldown: 4, anim: '2H_Melee_Attack_Stab', animSpeed: 1.5, hitAt: 0.5, sfx: 'swing',
    effect: { type: 'arc', range: 3.2, arc: 1.0, damage: 28, knockback: 7, color: 0xfff0a0, shake: 0.2, dash: 8 },
  },
  fireball: {
    id: 'fireball', name: '火球術', icon: 'fireball', desc: '投擲爆裂火球，範圍灼燒',
    mp: 28, cooldown: 3.5, anim: 'Spellcast_Shoot', animSpeed: 1.4, hitAt: 0.42, sfx: 'whirl',
    effect: { type: 'projectile', damage: 42, radius: 3.2, speed: 17, knockback: 6, color: 0xff7a22 },
  },
  frost: {
    id: 'frost', name: '冰霜新星', icon: 'frost', desc: '釋放寒霜，減速並冰封敵人',
    mp: 35, cooldown: 7, anim: 'Spellcast_Raise', animSpeed: 1.3, hitAt: 0.45, sfx: 'whirl',
    effect: { type: 'nova', range: 4.4, damage: 20, knockback: 3, color: 0x66ccff, shake: 0.2, slow: { factor: 0.4, duration: 3 } },
  },
  bloodlust: {
    id: 'bloodlust', name: '嗜血狂暴', icon: 'bloodlust', desc: '6 秒內傷害 +50%、吸血 +15%',
    mp: 40, cooldown: 12, anim: 'Cheer', animSpeed: 1.2, hitAt: 0.4, sfx: 'levelUp',
    effect: { type: 'buff', duration: 6, damageMult: 1.5, lifesteal: 0.15, color: 0xff3344 },
  },
  shockwave: {
    id: 'shockwave', name: '震地波', icon: 'shockwave', desc: '震碎大地，把敵人轟飛',
    mp: 28, cooldown: 6, anim: 'Block_Attack', animSpeed: 1.2, hitAt: 0.4, sfx: 'whirl',
    effect: { type: 'nova', range: 4.6, damage: 18, knockback: 16, color: 0xd0a860, shake: 0.4 },
  },
  poison: {
    id: 'poison', name: '劇毒新星', icon: 'poison', desc: '噴灑毒霧，持續侵蝕敵人生命',
    mp: 30, cooldown: 6, anim: 'Spellcast_Raise', animSpeed: 1.3, hitAt: 0.45, sfx: 'whirl',
    effect: { type: 'nova', range: 4.0, damage: 10, knockback: 2, color: 0x88dd44, dot: { dps: 16, duration: 4 } },
  },
  chain: {
    id: 'chain', name: '連鎖閃電', icon: 'chain', desc: '閃電在最近的敵人間跳躍',
    mp: 32, cooldown: 5, anim: 'Spellcast_Shoot', animSpeed: 1.4, hitAt: 0.42, sfx: 'whirl',
    effect: { type: 'chain', damage: 26, jumps: 5, range: 9, color: 0x9fe6ff },
  },
  shield: {
    id: 'shield', name: '守護聖盾', icon: 'shield', desc: '4 秒無敵並回復生命',
    mp: 38, cooldown: 14, anim: 'Block', animSpeed: 1.0, hitAt: 0.3, sfx: 'potion',
    effect: { type: 'buff', duration: 4, invuln: true, healInstant: 30, color: 0xffe070 },
  },
  heal: {
    id: 'heal', name: '治癒聖光', icon: 'heal', desc: '立即回復大量生命',
    mp: 34, cooldown: 9, anim: 'Spellcast_Raise', animSpeed: 1.3, hitAt: 0.4, sfx: 'potion',
    effect: { type: 'buff', duration: 0.1, healInstant: 55, color: 0x66dd66 },
  },
  // --- new mechanics ---
  summon: {
    id: 'summon', name: '亡魂召喚', icon: 'chain', desc: '召喚兩具骷髏亡魂助戰 12 秒',
    mp: 40, cooldown: 16, anim: 'Spellcast_Raise', animSpeed: 1.2, hitAt: 0.42, sfx: 'levelUp',
    effect: { type: 'summon', companions: ['imp', 'bone_ranger'], duration: 12, color: 0x9fe6ff },
  },
  timewarp: {
    id: 'timewarp', name: '時滯力場', icon: 'frost', desc: '凍結時間，大幅減速全場敵人 4 秒',
    mp: 45, cooldown: 14, anim: 'Spellcast_Raise', animSpeed: 1.1, hitAt: 0.45, sfx: 'whirl',
    effect: { type: 'slowfield', range: 13, slow: { factor: 0.25, duration: 4 }, color: 0x9fb8ff },
  },
  meteor: {
    id: 'meteor', name: '隕石轟擊', icon: 'fireball', desc: '召喚隕石砸向前方，巨大範圍爆傷',
    mp: 48, cooldown: 11, anim: 'Spellcast_Shoot', animSpeed: 1.3, hitAt: 0.4, sfx: 'whirl',
    effect: { type: 'meteor', damage: 90, range: 4.2, dist: 5, knockback: 9, color: 0xff7a22, delay: 0.5 },
  },
};

export const SKILL_LIST = Object.values(SKILLS);
export const DEFAULT_LOADOUT = ['whirlwind', 'slam', 'dash'];
export const STARTING_SLOTS = 3;
export const SLOTS_PER_MILESTONE = 5; // +1 slot every 5 levels
