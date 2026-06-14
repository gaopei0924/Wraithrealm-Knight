// Companion (同伴) registry. Companions are summoned allies that follow the
// player and auto-attack the nearest enemy. Data-driven like CHARACTERS: each
// entry names a CC0 rig, an attack style, and combat stats. Grave_* rigs reuse
// the GRAVE_ALIASES animation map so their KayKit clip requests resolve.
import { GRAVE_ALIASES } from './characters.js';

export const COMPANIONS = {
  imp: {
    id: 'imp', name: '骷髏小鬼', subtitle: 'BONE IMP', model: 'Skeleton_Minion',
    attack: 'melee', damage: 7, range: 2.0, cooldown: 0.7, moveSpeed: 7.4, scale: 0.8,
    color: 0xcfd4dc, icon: 'attack', cost: 0, // first companion, free
    attackAnim: '1H_Melee_Attack_Slice_Diagonal',
    desc: '靈活的骷髏小兵，快速近戰騷擾敵人。',
  },
  bone_guard: {
    id: 'bone_guard', name: '骷髏衛兵', subtitle: 'BONE GUARD', model: 'Skeleton_Warrior',
    attack: 'melee', damage: 15, range: 2.3, cooldown: 1.15, moveSpeed: 6.2, scale: 1.05,
    color: 0x9fb0c8, icon: 'slam', cost: 120,
    attackAnim: '2H_Melee_Attack_Chop',
    desc: '厚重的骷髏戰士，重擊敵人並擊退。',
  },
  bone_ranger: {
    id: 'bone_ranger', name: '骷髏遊俠', subtitle: 'BONE RANGER', model: 'Skeleton_Rogue',
    attack: 'melee', damage: 9, range: 2.0, cooldown: 0.55, moveSpeed: 8.6, scale: 0.95,
    color: 0xc8b890, icon: 'dash', cost: 140,
    attackAnim: 'Dualwield_Melee_Attack_Stab',
    desc: '雙刀骷髏，攻速極快、貼身連刺。',
  },
  spectral_mage: {
    id: 'spectral_mage', name: '幽冥法師', subtitle: 'SPECTRAL MAGE', model: 'Skeleton_Mage',
    attack: 'ranged', damage: 17, range: 9, cooldown: 1.3, moveSpeed: 6.0, scale: 1.0,
    color: 0xa070ff, icon: 'fireball', cost: 180, boltColor: 0xb070ff,
    attackAnim: 'Spellcast_Shoot',
    desc: '遠程亡靈法師，發射穿透的暗影箭。',
  },
  frost_shade: {
    id: 'frost_shade', name: '寒霜亡魂', subtitle: 'FROST SHADE', model: 'Grave_Ghost',
    attack: 'ranged', damage: 11, range: 8.5, cooldown: 1.25, moveSpeed: 6.4, scale: 0.95,
    color: 0x8fd0ff, icon: 'frost', boltColor: 0x9fe6ff, aliases: GRAVE_ALIASES,
    slow: { factor: 0.5, duration: 1.6 }, cost: 200,
    attackAnim: 'Spellcast_Shoot',
    desc: '飄渺的怨靈，寒霜彈減速命中的敵人。',
  },
  blood_thrall: {
    id: 'blood_thrall', name: '血僕', subtitle: 'BLOOD THRALL', model: 'Grave_Vampire',
    attack: 'melee', damage: 12, range: 2.1, cooldown: 1.0, moveSpeed: 7.0, scale: 0.92,
    color: 0xd14a5a, icon: 'bloodlust', aliases: GRAVE_ALIASES,
    healPlayer: 0.35, cost: 220, // heals you for 35% of its damage dealt
    attackAnim: '1H_Melee_Attack_Chop',
    desc: '吸血傀儡，造成傷害時為你回復生命。',
  },
};

export const COMPANION_LIST = Object.values(COMPANIONS);
export const STARTER_COMPANION = 'imp';
// Models companions need preloaded (deduped).
export const COMPANION_MODELS = [...new Set(COMPANION_LIST.map((c) => c.model))];
