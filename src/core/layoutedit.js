import { Save } from './storage.js';

// Lets the player drag the on-screen controls (skill bar + action cluster) to
// reposition them, persisting an (x,y) offset per element via margin nudges so
// the elements keep their original CSS anchoring.
const TARGETS = [
  { key: 'skills', sel: '#bottom-center' },
  { key: 'cluster', sel: '#action-cluster' },
  { key: 'joystick', sel: '#joystick' },
];

export class LayoutEditor {
  constructor() {
    this.editing = false;
    this.drag = null;
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    window.addEventListener('pointerup', () => { this.drag = null; });
  }

  // Apply saved offsets (call once controls exist / on run start).
  apply() {
    for (const t of TARGETS) {
      const el = document.querySelector(t.sel);
      if (!el) continue;
      const o = Save.layout[t.key];
      el.style.marginLeft = o ? `${o.x}px` : '';
      el.style.marginTop = o ? `${o.y}px` : '';
    }
  }

  enter() {
    this.editing = true;
    document.body.classList.add('editlayout');
    document.getElementById('layout-bar')?.classList.remove('hidden');
    for (const t of TARGETS) {
      const el = document.querySelector(t.sel);
      if (!el) continue;
      el.classList.add('draggable');
      el.__layoutKey = t.key;
      el.__onDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const o = Save.layout[t.key] ?? { x: 0, y: 0 };
        this.drag = { el, key: t.key, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y };
      };
      el.addEventListener('pointerdown', el.__onDown, { passive: false });
    }
  }

  exit() {
    this.editing = false;
    document.body.classList.remove('editlayout');
    document.getElementById('layout-bar')?.classList.add('hidden');
    for (const t of TARGETS) {
      const el = document.querySelector(t.sel);
      if (!el) continue;
      el.classList.remove('draggable');
      if (el.__onDown) el.removeEventListener('pointerdown', el.__onDown);
    }
    this.drag = null;
  }

  onMove(e) {
    if (!this.drag) return;
    e.preventDefault();
    const x = this.drag.ox + (e.clientX - this.drag.sx);
    const y = this.drag.oy + (e.clientY - this.drag.sy);
    this.drag.el.style.marginLeft = `${x}px`;
    this.drag.el.style.marginTop = `${y}px`;
    Save.setLayout(this.drag.key, Math.round(x), Math.round(y));
  }

  reset() {
    Save.resetLayout();
    this.apply();
  }
}
