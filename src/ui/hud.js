// DOM HUD: bars, wave banner, kills, minimap, cooldowns, damage numbers,
// upgrade cards, setup + end screens. All game→HUD flow goes through this class.
import { SKILL_LIST, DEFAULT_LOADOUT, SKILL_KEYS, SKILL_KEY_LABELS, STARTING_SLOTS } from '../combat/skills.js';
import { icon } from './icons.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor(engine, input) {
    this.engine = engine;
    this.input = input;
    this.root = $('hud');
    this.damageLayer = $('damage-layer');
    this.minimapCtx = $('minimap').getContext('2d');
    this.loadout = [];
    // Core action buttons are wired by TouchControls; the dynamic skill bar is
    // wired in setSkillBar(). Nothing static to wire here.
  }

  show() {
    this.root.classList.remove('hidden');
  }

  // Paint the fixed (non-dynamic) icons once at boot.
  paintStaticIcons() {
    const set = (sel, name) => {
      const el = document.querySelector(sel);
      if (el) el.innerHTML = icon(name);
    };
    set('#btn-attack .ico', 'attack');
    set('#btn-roll .ico', 'roll');
    set('#btn-potion .ico', 'potion');
    set('#fullscreen-btn', 'expand');
    set('#rotate-icon', 'rotate');
  }

  setLoading(progress, text) {
    $('loading-fill').style.width = `${Math.round(progress * 100)}%`;
    if (text) $('loading-text').textContent = text;
  }

  hideLoading() {
    $('loading').style.display = 'none';
  }

  // Difficulty + skill-loadout chooser. Calls onConfirm(difficulty, [skillIds]).
  showSetup(difficulties, onConfirm) {
    $('loading-text').textContent = '整裝待發';
    const diffRow = $('difficulty-row');
    const skillGrid = $('skill-grid');
    const startBtn = $('start-gate');
    const pickLabel = $('skill-pick-count');

    let chosenDiff = 'normal';
    const chosenSkills = [...DEFAULT_LOADOUT];

    // difficulty cards
    diffRow.innerHTML = '';
    for (const diff of Object.values(difficulties)) {
      const card = document.createElement('button');
      card.className = 'setup-card diff' + (diff.id === chosenDiff ? ' selected' : '');
      card.style.setProperty('--accent', diff.accent);
      card.innerHTML = `<div class="card-name">${diff.name}</div><div class="card-sub">${diff.subtitle}</div><div class="card-desc">${diff.desc}</div>`;
      card.addEventListener('click', () => {
        chosenDiff = diff.id;
        for (const c of diffRow.children) c.classList.remove('selected');
        card.classList.add('selected');
      });
      diffRow.appendChild(card);
    }

    // skill cards (pick exactly STARTING_SLOTS)
    const refresh = () => {
      pickLabel.textContent = `(${chosenSkills.length}/${STARTING_SLOTS})`;
      startBtn.disabled = chosenSkills.length !== STARTING_SLOTS;
      for (const c of skillGrid.children) {
        c.classList.toggle('selected', chosenSkills.includes(c.dataset.id));
      }
    };
    skillGrid.innerHTML = '';
    for (const skill of SKILL_LIST) {
      const card = document.createElement('button');
      card.className = 'setup-card skill';
      card.dataset.id = skill.id;
      card.innerHTML = `<div class="card-icon">${icon(skill.icon)}</div><div class="card-name">${skill.name}</div><div class="card-desc">${skill.desc}</div>`;
      card.addEventListener('click', () => {
        const i = chosenSkills.indexOf(skill.id);
        if (i >= 0) chosenSkills.splice(i, 1);
        else if (chosenSkills.length < STARTING_SLOTS) chosenSkills.push(skill.id);
        refresh();
      });
      skillGrid.appendChild(card);
    }
    refresh();

    $('setup').classList.remove('hidden');
    startBtn.addEventListener('click', () => {
      if (chosenSkills.length !== STARTING_SLOTS) return;
      onConfirm(difficulties[chosenDiff], chosenSkills);
    }, { once: true });
  }

  update(player, director) {
    $('hp-fill').style.width = `${(player.hp / player.stats.maxHp) * 100}%`;
    $('hp-text').textContent = `${Math.ceil(player.hp)}/${player.stats.maxHp}`;
    $('mp-fill').style.width = `${(player.mp / player.stats.maxMp) * 100}%`;
    $('mp-text').textContent = `${Math.floor(player.mp)}/${player.stats.maxMp}`;
    $('level-badge').textContent = player.level;
    $('kill-count').textContent = director.kills;
    $('btn-potion-count').textContent = player.potions;
    const expPct = Math.floor((player.xp / player.xpToNext) * 100);
    $('exp-fill').style.width = `${expPct}%`;
    $('exp-text').textContent = `EXP ${expPct}%`;

    // Dynamic skill bar cooldowns + MP dimming.
    for (let i = 0; i < this.loadout.length; i++) {
      const skill = this.loadout[i];
      const cool = $(`skill-cool-${i}`);
      if (cool) cool.style.transform = `scaleY(${Math.max(0, Math.min(1, player.skillCd[i] / skill.cooldown))})`;
      const slot = $(`skill-slot-${i}`);
      if (slot) slot.classList.toggle('insufficient', player.skillCd[i] > 0 || player.mp < skill.mp);
    }
    this.setCooldown('cool-roll', player.rollCooldownLeft, player.stats.rollCooldown);
    $('btn-roll').classList.toggle('insufficient', player.rollCooldownLeft > 0);
  }

  setCooldown(id, left, total) {
    const el = $(id);
    if (el) el.style.transform = `scaleY(${Math.max(0, Math.min(1, left / total))})`;
  }

  // Rebuild the dynamic skill bar from the equipped loadout. Each button mirrors
  // its keyboard key and fires the same input. Called on run start + each new slot.
  setSkillBar(loadout) {
    this.loadout = loadout;
    const bar = $('skill-bar');
    bar.innerHTML = '';
    loadout.forEach((skill, i) => {
      const btn = document.createElement('button');
      btn.className = 'skill-slot';
      btn.id = `skill-slot-${i}`;
      btn.title = `${skill.name} (${SKILL_KEY_LABELS[i] ?? ''})`;
      btn.innerHTML =
        `<span class="ico">${icon(skill.icon)}</span>` +
        `<span class="key">${SKILL_KEY_LABELS[i] ?? ''}</span>` +
        `<span class="cool" id="skill-cool-${i}"></span>`;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.triggerKey(SKILL_KEYS[i]);
      });
      bar.appendChild(btn);
    });
  }

  setStageTag(current, total, name) {
    $('stage-tag').textContent = `第 ${current}/${total} 關 · ${name}`;
  }

  setWave(n) {
    $('wave-text').textContent = `WAVE ${n}`;
  }

  setObjective(text) {
    $('objective-text').textContent = text;
  }

  announce(text, subText) {
    const el = document.createElement('div');
    el.className = 'announce-text';
    el.textContent = text;
    $('announce').appendChild(el);
    setTimeout(() => el.remove(), 2300);
    if (subText) {
      const sub = document.createElement('div');
      sub.className = 'announce-text';
      sub.style.fontSize = '18px';
      sub.style.letterSpacing = '8px';
      sub.textContent = subText;
      $('announce').appendChild(sub);
      setTimeout(() => sub.remove(), 2300);
    }
  }

  damageNumber(worldPos, amount, kind = '') {
    const screen = this.engine.worldToScreen(worldPos);
    if (!screen.visible) return;
    const el = document.createElement('div');
    el.className = `dmg ${kind}`;
    el.textContent = typeof amount === 'number' ? Math.round(amount) : amount;
    el.style.left = `${screen.x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${screen.y - 40}px`;
    this.damageLayer.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  drawMinimap(rooms, corridors, playerPos, gridSize) {
    const ctx = this.minimapCtx;
    const size = 150;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    const scale = 1.55;
    const ox = size / 2 - playerPos.x * scale;
    const oz = size / 2 - playerPos.z * scale;

    const drawRect = (r, fill) => {
      ctx.fillStyle = fill;
      ctx.fillRect(
        ox + r.gx * gridSize * scale,
        oz + r.gz * gridSize * scale,
        r.w * gridSize * scale,
        r.h * gridSize * scale,
      );
    };
    for (const c of corridors) drawRect(c, 'rgba(160,135,90,0.30)');
    for (const r of rooms) {
      drawRect(r, r.cleared || !r.waves ? 'rgba(160,135,90,0.38)' : 'rgba(120,60,40,0.45)');
    }
    // player dot
    ctx.fillStyle = '#e8d9b0';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  showUpgradeChoices(choices, onPick) {
    const overlay = $('upgrade-overlay');
    const cardsEl = $('upgrade-cards');
    cardsEl.innerHTML = '';
    for (const choice of choices) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div class="icon">${icon(choice.icon)}</div><div class="name">${choice.name}</div><div class="desc">${choice.desc}</div>`;
      card.addEventListener('click', () => {
        overlay.classList.add('hidden');
        onPick(choice);
      });
      cardsEl.appendChild(card);
    }
    overlay.classList.remove('hidden');
  }

  // Skill-point choice (every 5 levels): pick a new skill to add a loadout slot.
  showSkillChoice(skills, onPick) {
    const overlay = $('skill-overlay');
    const cardsEl = $('skill-cards');
    cardsEl.innerHTML = '';
    for (const skill of skills) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div class="icon">${icon(skill.icon)}</div><div class="name">${skill.name}</div><div class="desc">${skill.desc}</div>`;
      card.addEventListener('click', () => {
        overlay.classList.add('hidden');
        onPick(skill);
      });
      cardsEl.appendChild(card);
    }
    overlay.classList.remove('hidden');
  }

  showEnd(title, sub) {
    $('end-title').textContent = title;
    $('end-sub').textContent = sub;
    $('end-overlay').classList.remove('hidden');
    $('restart-btn').onclick = () => window.location.reload();
  }

  // Render the knight's face once into the portrait circle via a render
  // target (reliable regardless of preserveDrawingBuffer).
  async paintPortrait(renderer, scene, model) {
    const THREE = await import('three');
    const SIZE = 96;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
    model.updateWorldMatrix(true, true);
    const head = model.getObjectByName('Knight_Head') ?? model;
    const headPos = new THREE.Vector3();
    head.getWorldPosition(headPos);
    cam.position.set(headPos.x + 0.3, headPos.y + 0.22, headPos.z + 1.45);
    cam.lookAt(headPos.x, headPos.y + 0.05, headPos.z);

    const fill = new THREE.DirectionalLight(0xffe0b0, 2.4);
    fill.position.copy(cam.position).add(new THREE.Vector3(1, 1, 0.5));
    fill.target.position.copy(headPos);
    scene.add(fill, fill.target);

    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE);
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    const pixels = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, pixels);
    renderer.setRenderTarget(null);
    rt.dispose();
    scene.remove(fill, fill.target);

    // flip Y while copying into the 2D canvas
    const pctx = $('portrait').getContext('2d');
    const imageData = pctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      const src = (SIZE - 1 - y) * SIZE * 4;
      imageData.data.set(pixels.subarray(src, src + SIZE * 4), y * SIZE * 4);
    }
    pctx.putImageData(imageData, 0, 0);
  }
}
