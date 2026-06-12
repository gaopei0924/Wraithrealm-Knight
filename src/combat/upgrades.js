// Roguelike upgrade pool. Each upgrade mutates player stats; `apply` receives
// the player. Picked 3-at-a-time on level up, weighted random without repeats
// in a single offer.
export const UPGRADE_POOL = [
  {
    id: 'blade', icon: '⚔️', name: '利刃精通',
    desc: '攻擊傷害 +20%',
    apply: (p) => { p.stats.damageMult *= 1.2; },
  },
  {
    id: 'finisher', icon: '💥', name: '終結重擊',
    desc: '連擊第三段傷害 +50%',
    apply: (p) => { p.stats.comboFinisherBonus *= 1.5; },
  },
  {
    id: 'vitality', icon: '❤️', name: '生命強化',
    desc: '最大生命 +25，並回滿生命',
    apply: (p) => { p.stats.maxHp += 25; p.hp = p.stats.maxHp; },
  },
  {
    id: 'swift', icon: '👢', name: '疾風步伐',
    desc: '移動速度 +12%',
    apply: (p) => { p.stats.moveSpeed *= 1.12; },
  },
  {
    id: 'roll', icon: '🌀', name: '影舞翻滾',
    desc: '翻滾冷卻 -25%',
    apply: (p) => { p.stats.rollCooldown *= 0.75; },
  },
  {
    id: 'leech', icon: '🩸', name: '嗜血之刃',
    desc: '攻擊吸血：造成傷害的 8% 轉為生命',
    apply: (p) => { p.stats.lifesteal += 0.08; },
  },
  {
    id: 'crit', icon: '🎯', name: '致命要害',
    desc: '暴擊率 +10%',
    apply: (p) => { p.stats.critChance += 0.1; },
  },
  {
    id: 'critdmg', icon: '☄️', name: '毀滅暴擊',
    desc: '暴擊傷害 +40%',
    apply: (p) => { p.stats.critMult += 0.4; },
  },
  {
    id: 'mana', icon: '🔮', name: '法力湧泉',
    desc: '法力回復 +50%',
    apply: (p) => { p.stats.mpRegen *= 1.5; },
  },
  {
    id: 'wisdom', icon: '📜', name: '古老智慧',
    desc: '經驗獲取 +20%',
    apply: (p) => { p.stats.xpMult *= 1.2; },
  },
  {
    id: 'potion', icon: '🧪', name: '補給藥劑',
    desc: '獲得 2 瓶治療藥水',
    apply: (p) => { p.potions += 2; },
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
