// Roguelike upgrade pool. Each upgrade mutates player stats; `apply` receives
// the player. Picked 3-at-a-time on level up, weighted random without repeats
// in a single offer.
export const UPGRADE_POOL = [
  {
    id: 'blade', icon: 'up_blade', name: '利刃精通',
    desc: '攻擊傷害 +20%',
    apply: (p) => { p.stats.damageMult *= 1.2; },
  },
  {
    id: 'finisher', icon: 'up_finisher', name: '終結重擊',
    desc: '連擊第三段傷害 +50%',
    apply: (p) => { p.stats.comboFinisherBonus *= 1.5; },
  },
  {
    id: 'vitality', icon: 'up_vitality', name: '生命強化',
    desc: '最大生命 +25，並回滿生命',
    apply: (p) => { p.stats.maxHp += 25; p.hp = p.stats.maxHp; },
  },
  {
    id: 'swift', icon: 'up_swift', name: '疾風步伐',
    desc: '移動速度 +12%',
    apply: (p) => { p.stats.moveSpeed *= 1.12; },
  },
  {
    id: 'roll', icon: 'roll', name: '影舞翻滾',
    desc: '翻滾冷卻 -25%',
    apply: (p) => { p.stats.rollCooldown *= 0.75; },
  },
  {
    id: 'leech', icon: 'bloodlust', name: '嗜血之刃',
    desc: '攻擊吸血：造成傷害的 8% 轉為生命',
    apply: (p) => { p.stats.lifesteal += 0.08; },
  },
  {
    id: 'crit', icon: 'up_crit', name: '致命要害',
    desc: '暴擊率 +10%',
    apply: (p) => { p.stats.critChance += 0.1; },
  },
  {
    id: 'critdmg', icon: 'up_critdmg', name: '毀滅暴擊',
    desc: '暴擊傷害 +40%',
    apply: (p) => { p.stats.critMult += 0.4; },
  },
  {
    id: 'mana', icon: 'up_mana', name: '法力湧泉',
    desc: '法力回復 +50%',
    apply: (p) => { p.stats.mpRegen *= 1.5; },
  },
  {
    id: 'wisdom', icon: 'up_wisdom', name: '古老智慧',
    desc: '經驗獲取 +20%',
    apply: (p) => { p.stats.xpMult *= 1.2; },
  },
  {
    id: 'potion', icon: 'potion', name: '補給藥劑',
    desc: '獲得 2 瓶治療藥水',
    apply: (p) => { p.potions += 2; },
  },
  {
    id: 'secondwind', icon: 'shield', name: '絕境重生',
    desc: '致命傷害時復活一次（40% 生命）',
    apply: (p) => { p.reviveCharges = (p.reviveCharges ?? 0) + 1; },
  },
  // --- survivors-style passive weapons (stack to level up) ---
  {
    id: 'orbit', icon: 'whirlwind', name: '旋刃環繞',
    desc: '召喚旋轉刀刃環繞自身，自動切割敵人',
    apply: (p) => { p.weapons.orbit += 1; },
  },
  {
    id: 'aura', icon: 'fireball', name: '灼炎光環',
    desc: '身周持續灼燒附近敵人',
    apply: (p) => { p.weapons.aura += 1; },
  },
  {
    id: 'frost_aura', icon: 'frost', name: '凜霜領域',
    desc: '減速接近你的所有敵人',
    apply: (p) => { p.weapons.frost += 1; },
  },
  {
    id: 'thorns', icon: 'shield', name: '荊棘反傷',
    desc: '受到近戰攻擊時反彈傷害',
    apply: (p) => { p.weapons.thorns += 1; },
  },
  // --- survivors-style stats ---
  {
    id: 'regen', icon: 'heal', name: '生命再生',
    desc: '每秒回復 3 點生命',
    apply: (p) => { p.stats.regen += 3; },
  },
  {
    id: 'armor', icon: 'shield', name: '堅甲',
    desc: '受到的傷害 -8%',
    apply: (p) => { p.stats.armor = Math.min(0.7, p.stats.armor + 0.08); },
  },
  {
    id: 'dodge', icon: 'dash', name: '身法',
    desc: '閃避率 +6%（完全閃避一次攻擊）',
    apply: (p) => { p.stats.dodgeChance = Math.min(0.5, p.stats.dodgeChance + 0.06); },
  },
  {
    id: 'cdr', icon: 'up_mana', name: '急速冷卻',
    desc: '技能冷卻 -12%',
    apply: (p) => { p.stats.cdr *= 0.88; },
  },
  {
    id: 'atkspeed', icon: 'up_finisher', name: '疾擊',
    desc: '攻擊速度 +12%',
    apply: (p) => { p.stats.atkSpeed *= 1.12; },
  },
  {
    id: 'maxmp', icon: 'up_mana', name: '法力之泉',
    desc: '最大法力 +25，並回滿',
    apply: (p) => { p.stats.maxMp += 25; p.mp = p.stats.maxMp; },
  },
  {
    id: 'greed', icon: 'potion', name: '貪婪',
    desc: '金幣獲取 +30%',
    apply: (p) => { p.stats.goldMult *= 1.3; },
  },
  {
    id: 'berserk', icon: 'bloodlust', name: '狂戰之怒',
    desc: '生命低於 35% 時傷害 +40%',
    apply: (p) => { p.stats.berserk += 0.4; },
  },
  {
    id: 'magnet', icon: 'up_wisdom', name: '磁吸力場',
    desc: '更快吸取經驗與掉落物',
    apply: (p) => { p.stats.magnet *= 1.4; },
  },
];

export function rollUpgradeChoices(count = 3) {
  const pool = [...UPGRADE_POOL];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }
  return choices;
}
