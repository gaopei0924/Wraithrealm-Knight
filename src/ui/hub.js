// 聖殿 (Hub): spend 魂晶 (souls) on persistent meta — attributes, equipment,
// appearance (形象), and class unlocks (轉職). Pure DOM; reads/writes Save.
import { icon } from './icons.js';
import { Save } from '../core/storage.js';
import {
  ATTRIBUTES, attrCost, EQUIPMENT, EQUIP_SLOTS, COSMETICS,
  CLASS_UNLOCK_COST,
} from '../combat/meta.js';
import { CHARACTERS } from '../combat/characters.js';

const $ = (id) => document.getElementById(id);

export class Hub {
  constructor(onChange) {
    this.onChange = onChange; // refresh setup (souls + char row) when meta changes
    this.tab = 'attr';
    this.tabs = [
      { id: 'attr', name: '屬性' }, { id: 'equip', name: '裝備' },
      { id: 'form', name: '形象' }, { id: 'class', name: '轉職' },
    ];
    $('open-hub').addEventListener('click', () => this.open());
    $('hub-close').addEventListener('click', () => $('hub-overlay').classList.add('hidden'));
  }

  open() { $('hub-overlay').classList.remove('hidden'); this.render(); }

  render() {
    $('hub-souls').textContent = `魂晶 ${Save.souls}`;
    const tabsEl = $('hub-tabs');
    tabsEl.innerHTML = '';
    for (const t of this.tabs) {
      const b = document.createElement('button');
      b.className = 'hub-tab' + (this.tab === t.id ? ' active' : '');
      b.textContent = t.name;
      b.onclick = () => { this.tab = t.id; this.render(); };
      tabsEl.appendChild(b);
    }
    const body = $('hub-body');
    body.innerHTML = '';
    ({ attr: () => this.renderAttrs(body), equip: () => this.renderEquip(body),
      form: () => this.renderForm(body), class: () => this.renderClass(body) })[this.tab]();
    this.onChange?.();
  }

  // a list row: icon · title/sub · action button
  row(body, iconKey, title, sub, btn) {
    const r = document.createElement('div');
    r.className = 'hub-row' + (btn.active ? ' active' : '');
    r.innerHTML = `<span class="hub-ico">${icon(iconKey)}</span>`
      + `<span class="hub-meta"><b>${title}</b><small>${sub}</small></span>`;
    const b = document.createElement('button');
    b.className = 'hub-buy';
    b.textContent = btn.label;
    b.disabled = !!btn.disabled;
    if (btn.onClick) b.onclick = () => btn.onClick();
    r.appendChild(b);
    body.appendChild(r);
  }

  renderAttrs(body) {
    for (const a of ATTRIBUTES) {
      const pts = Save.attrs[a.key] ?? 0;
      const cost = attrCost(pts);
      this.row(body, a.icon, `${a.name} · Lv ${pts}`, `${a.desc} · 花費 ${cost} 魂晶`, {
        label: `+1 (${cost})`, disabled: Save.souls < cost,
        onClick: () => { if (Save.spendSouls(cost)) { Save.addAttr(a.key); this.render(); } },
      });
    }
  }

  renderEquip(body) {
    for (const slot of EQUIP_SLOTS) {
      const label = document.createElement('div');
      label.className = 'hub-slot-label';
      label.textContent = slot.name;
      body.appendChild(label);
      for (const item of Object.values(EQUIPMENT).filter((i) => i.slot === slot.key)) {
        const owned = Save.ownsItem(item.id);
        const equipped = Save.equipped[slot.key] === item.id;
        let btn;
        if (!owned) {
          btn = { label: `購買 (${item.cost})`, disabled: Save.souls < item.cost,
            onClick: () => { if (Save.spendSouls(item.cost)) { Save.ownItem(item.id); Save.equip(slot.key, item.id); this.render(); } } };
        } else if (equipped) {
          btn = { label: '已裝備', active: true, onClick: () => { Save.equip(slot.key, null); this.render(); } };
        } else {
          btn = { label: '裝備', onClick: () => { Save.equip(slot.key, item.id); this.render(); } };
        }
        this.row(body, item.icon, item.name, item.summary, { ...btn, active: equipped });
      }
    }
  }

  renderForm(body) {
    for (const c of COSMETICS) {
      const owned = c.cost === 0 || Save.ownsCosmetic(c.id);
      const active = (Save.cosmetics.aura ?? 'aura_none') === c.id;
      const iconKey = c.id === 'aura_frost' ? 'frost' : c.id === 'aura_ember' ? 'fireball'
        : c.id === 'aura_holy' ? 'heal' : c.id === 'aura_blood' ? 'bloodlust'
        : c.id === 'aura_void' ? 'chain' : 'up_wisdom';
      let btn;
      if (!owned) {
        btn = { label: `購買 (${c.cost})`, disabled: Save.souls < c.cost,
          onClick: () => { if (Save.spendSouls(c.cost)) { Save.ownCosmetic(c.id); Save.setCosmetic('aura', c.id); this.render(); } } };
      } else {
        btn = { label: active ? '使用中' : '套用', active,
          onClick: () => { Save.setCosmetic('aura', c.id); this.render(); } };
      }
      this.row(body, iconKey, c.name, c.color ? '戰鬥時環繞光環' : '無光環', btn);
    }
  }

  renderClass(body) {
    for (const [id, cost] of Object.entries(CLASS_UNLOCK_COST)) {
      const def = CHARACTERS[id];
      if (!def) continue;
      const unlocked = Save.classUnlocked(id);
      this.row(body, def.icon ?? 'attack', def.name, def.desc ?? '', unlocked
        ? { label: '已解鎖', active: true, disabled: true }
        : { label: `解鎖 (${cost})`, disabled: Save.souls < cost,
            onClick: () => { if (Save.spendSouls(cost)) { Save.unlockClass(id); this.render(); } } });
    }
  }
}
