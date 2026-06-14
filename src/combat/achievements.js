// Achievement definitions. main.js calls Achievements.check(ctx) with a live
// snapshot; newly-satisfied ones are unlocked (persisted) and returned for toasts.
import { Save } from '../core/storage.js';

const DEFS = [
  { id: 'first_blood', name: '首殺', desc: '擊殺第一個敵人', test: (c) => c.kills >= 1 },
  { id: 'slayer_50', name: '殺戮者', desc: '單局擊殺 50', test: (c) => c.kills >= 50 },
  { id: 'slayer_200', name: '屠戮者', desc: '單局擊殺 200', test: (c) => c.kills >= 200 },
  { id: 'first_boss', name: '弒王者', desc: '擊敗第一隻魔王', test: (c) => c.bossKills >= 1 },
  { id: 'boss_5', name: '魔王獵人', desc: '擊敗 5 隻魔王', test: (c) => c.bossKills >= 5 },
  { id: 'combo_15', name: '連擊大師', desc: '達成 15 連擊', test: (c) => c.combo >= 15 },
  { id: 'combo_30', name: '不間斷', desc: '達成 30 連擊', test: (c) => c.combo >= 30 },
  { id: 'level_10', name: '成長', desc: '達到等級 10', test: (c) => c.level >= 10 },
  { id: 'level_20', name: '強者', desc: '達到等級 20', test: (c) => c.level >= 20 },
  { id: 'stage_5', name: '深入', desc: '抵達第 5 關', test: (c) => c.stage >= 5 },
  { id: 'stage_10', name: '無懼深淵', desc: '抵達第 10 關', test: (c) => c.stage >= 10 },
  { id: 'rich', name: '富甲一方', desc: '單局持有 500 金幣', test: (c) => c.gold >= 500 },
  { id: 'clear', name: '亡域制霸', desc: '通關全部關卡', test: (c) => c.victory },
  { id: 'bestiary_all', name: '博物學者', desc: '圖鑑收錄全部 12 種怪物', test: () => Save.bestiaryCount() >= 12 },
];

export const Achievements = {
  total: DEFS.length,
  defs: DEFS,
  // Returns newly-unlocked defs.
  check(ctx) {
    const out = [];
    for (const d of DEFS) {
      if (!Save.has(d.id) && d.test(ctx)) { if (Save.unlock(d.id)) out.push(d); }
    }
    return out;
  },
};
