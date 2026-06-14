// Playable characters. Each uses a KayKit rig and applies a stat identity +
// a passive perk + a signature skill auto-granted at run start. Data-driven so
// dropping a new rig into public/assets/characters/ + an entry here adds a hero.
// (Quaternius CC0 rigs can be added the same way once their GLBs are placed.)
export const CHARACTERS = {
  knight: {
    id: 'knight', name: '騎士', subtitle: 'KNIGHT', model: 'Knight', headNode: 'Knight_Head',
    desc: '均衡的全能戰士，無明顯弱點。',
    icon: 'attack', signature: 'slam',
    stats: { maxHp: 1.0, damageMult: 1.0, moveSpeed: 1.0, critChance: 0.0, lifesteal: 0, mpRegen: 1.0 },
  },
  barbarian: {
    id: 'barbarian', name: '蠻王', subtitle: 'BARBARIAN', model: 'Barbarian',
    desc: '血厚、攻高、移動稍慢。signature 震地波。',
    icon: 'shockwave', signature: 'shockwave',
    stats: { maxHp: 1.45, damageMult: 1.15, moveSpeed: 0.92, critChance: 0.0, lifesteal: 0, mpRegen: 0.9 },
  },
  mage: {
    id: 'mage', name: '法師', subtitle: 'ARCMAGE', model: 'Mage',
    desc: '法力充沛、技能強大，但生命脆弱。',
    icon: 'fireball', signature: 'fireball',
    stats: { maxHp: 0.75, damageMult: 1.0, moveSpeed: 1.0, critChance: 0.05, lifesteal: 0, mpRegen: 1.8 },
  },
  rogue: {
    id: 'rogue', name: '盜賊', subtitle: 'ROGUE', model: 'Rogue',
    desc: '高速、高暴擊，生命較低。',
    icon: 'dash', signature: 'dash',
    stats: { maxHp: 0.82, damageMult: 1.0, moveSpeed: 1.18, critChance: 0.18, critMult: 0.3, lifesteal: 0, mpRegen: 1.1 },
  },
  warden: {
    id: 'warden', name: '蝕魂者', subtitle: 'SOULWARDEN', model: 'Rogue_Hooded',
    desc: '天生吸血，越戰越強。',
    icon: 'bloodlust', signature: 'poison',
    stats: { maxHp: 1.0, damageMult: 1.0, moveSpeed: 1.0, critChance: 0.04, lifesteal: 0.08, mpRegen: 1.1 },
  },
  bonelord: {
    id: 'bonelord', name: '骸骨君主', subtitle: 'BONE SOVEREIGN', model: 'Skeleton_Warrior',
    headNode: 'Skeleton_Warrior_Head', tint: 0x8fb0d8,
    desc: '不死的亡域之主，血厚、附帶連鎖閃電。',
    icon: 'chain', signature: 'chain',
    stats: { maxHp: 1.3, damageMult: 1.05, moveSpeed: 0.96, critChance: 0.04, lifesteal: 0.05, mpRegen: 1.2 },
  },
  // To add a Quaternius (or any non-KayKit) CC0 rig as a hero: drop its .glb in
  // public/assets/characters/, add an entry here, and supply `aliases` mapping the
  // game's KayKit clip names → that rig's clip names, e.g.:
  //   quaternius: {
  //     id:'quaternius', name:'流浪者', model:'Quaternius_Adventurer', signature:'dash',
  //     stats:{...},
  //     aliases:{ Idle:'Idle', Running_A:'Run', Dodge_Forward:'Roll', Death_A:'Death',
  //       Hit_A:'HitRecieve', '1H_Melee_Attack_Chop':'1H_Melee_Attack',
  //       '1H_Melee_Attack_Slice_Diagonal':'1H_Melee_Attack', '1H_Melee_Attack_Slice_Horizontal':'1H_Melee_Attack' },
  //   },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);
export const DEFAULT_CHARACTER = 'knight';
