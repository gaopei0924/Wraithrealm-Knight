// 圖鑑 (Codex): browse discovered monsters, bosses, companions and equipment.
// Discovery is tracked in Save (bestiary kills, boss-kill flags, companions seen,
// owned items). Undiscovered entries show as ??? so there's something to chase.
import { icon } from './icons.js';
import { Save } from '../core/storage.js';
import { ENEMY_TYPES } from '../entities/enemy.js';
import { BOSSES } from '../combat/bosses.js';
import { COMPANIONS } from '../combat/companions.js';
import { EQUIPMENT } from '../combat/meta.js';

const $ = (id) => document.getElementById(id);

export class Codex {
  constructor() {
    this.tab = 'monster';
    this.tabs = [
      { id: 'monster', name: '怪物' }, { id: 'boss', name: '魔王' },
      { id: 'companion', name: '同伴' }, { id: 'gear', name: '裝備' },
    ];
    $('open-codex').addEventListener('click', () => this.open());
    $('codex-close').addEventListener('click', () => $('codex-overlay').classList.add('hidden'));
  }

  open() { $('codex-overlay').classList.remove('hidden'); this.render(); }

  render() {
    const tabsEl = $('codex-tabs');
    tabsEl.innerHTML = '';
    for (const t of this.tabs) {
      const b = document.createElement('button');
      b.className = 'hub-tab' + (this.tab === t.id ? ' active' : '');
      b.textContent = t.name;
      b.onclick = () => { this.tab = t.id; this.render(); };
      tabsEl.appendChild(b);
    }
    const body = $('codex-body');
    body.innerHTML = '';
    const entries = this.entries();
    const found = entries.filter((e) => e.found).length;
    const head = document.createElement('div');
    head.className = 'hub-slot-label';
    head.textContent = `已發現 ${found} / ${entries.length}`;
    body.appendChild(head);
    for (const e of entries) this.rowOf(body, e);
  }

  rowOf(body, e) {
    const r = document.createElement('div');
    r.className = 'hub-row' + (e.found ? '' : ' codex-locked');
    r.innerHTML = `<span class="hub-ico">${icon(e.icon)}</span>`
      + `<span class="hub-meta"><b>${e.found ? e.name : '？？？'}</b>`
      + `<small>${e.found ? e.sub : '尚未發現'}</small></span>`
      + (e.tag ? `<span class="hub-buy" style="pointer-events:none">${e.tag}</span>` : '');
    body.appendChild(r);
  }

  entries() {
    if (this.tab === 'monster') {
      return Object.entries(ENEMY_TYPES).filter(([k]) => k !== 'goblin').map(([id, d]) => {
        const kills = Save.bestiaryKills(id);
        return { found: kills > 0, name: d.name, icon: 'attack', sub: `${d.behavior} · HP ${d.hp}`, tag: kills ? `擊殺 ${kills}` : '' };
      });
    }
    if (this.tab === 'boss') {
      return Object.values(BOSSES).map((b) => {
        const found = Save.has(`boss:${b.id}`);
        return { found, name: b.name, icon: 'slam', sub: b.title, tag: found ? '已討伐' : '' };
      });
    }
    if (this.tab === 'companion') {
      return Object.values(COMPANIONS).map((c) => ({
        found: Save.companionSeen(c.id), name: c.name, icon: c.icon ?? 'chain', sub: c.desc,
      }));
    }
    return Object.values(EQUIPMENT).map((i) => ({
      found: Save.ownsItem(i.id), name: i.name, icon: i.icon, sub: i.summary,
      tag: Save.ownsItem(i.id) ? '已擁有' : '',
    }));
  }
}
