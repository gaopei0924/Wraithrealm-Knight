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

  // --- boss bar ---
  showBossBar(name, title) {
    $('boss-name').textContent = name;
    $('boss-title').textContent = title;
    $('boss-hp-fill').style.width = '100%';
    $('boss-bar').classList.remove('hidden');
  }
  updateBossBar(hp, max) { $('boss-hp-fill').style.width = `${Math.max(0, (hp / max) * 100)}%`; }
  hideBossBar() { $('boss-bar').classList.add('hidden'); }

  // --- hurt flash ---
  flashHurt() {
    const v = $('hurt-vignette');
    v.classList.remove('flash');
    void v.offsetWidth; // restart animation
    v.classList.add('flash');
  }

  // --- pause menu + settings ---
  wireMenu(cfg) {
    const { onToggle, onResume, onRestart, onVolume, volume, onHelp, onFullscreen,
      onShake, onMute, onMusic, shake = true, muted = false, music = true, fsAvailable = true } = cfg;
    $('pause-btn').addEventListener('click', () => onToggle());
    $('menu-btn').addEventListener('click', () => onToggle());
    $('resume-btn').addEventListener('click', () => onResume());
    $('pause-restart-btn').addEventListener('click', () => onRestart());
    $('help-btn').addEventListener('click', () => onHelp());
    $('pause-help-btn').addEventListener('click', () => onHelp());
    $('pause-fs-btn').addEventListener('click', () => onFullscreen());
    $('help-close').addEventListener('click', () => this.hideHelp());
    // iOS has no Fullscreen API — hide the toggle and show the home-screen hint.
    if (!fsAvailable) {
      $('pause-fs-btn').classList.add('hidden');
      $('ios-fs-hint').classList.remove('hidden');
    }
    const slider = $('volume-slider');
    slider.value = Math.round((volume ?? 0.35) * 100);
    slider.addEventListener('input', () => onVolume(slider.value / 100));
    const shakeBox = $('toggle-shake'); shakeBox.checked = shake;
    shakeBox.addEventListener('change', () => onShake(shakeBox.checked));
    const muteBox = $('toggle-mute'); muteBox.checked = muted;
    muteBox.addEventListener('change', () => onMute(muteBox.checked));
    const musicBox = $('toggle-music'); musicBox.checked = music;
    musicBox.addEventListener('change', () => onMusic(musicBox.checked));
  }

  // Help/controls overlay. Lists the live skill keybinds from the loadout.
  showHelp(loadout = []) {
    const skillLines = loadout.map(
      (s, i) => `<div class="help-row"><span class="help-key">${SKILL_KEY_LABELS[i] ?? '—'}</span><span>${s.name}</span></div>`,
    ).join('');
    $('help-body').innerHTML =
      `<div class="help-grid">
        <div class="help-row"><span class="help-key">WASD</span><span>移動</span></div>
        <div class="help-row"><span class="help-key">J / 左鍵</span><span>攻擊（三連擊）</span></div>
        <div class="help-row"><span class="help-key">Space / 右鍵</span><span>翻滾（無敵幀）</span></div>
        <div class="help-row"><span class="help-key">Q</span><span>治療藥水</span></div>
        <div class="help-row"><span class="help-key">Esc</span><span>暫停</span></div>
      </div>
      <div class="help-sub">技能（數字鍵 / 點擊技能列）</div>
      <div class="help-grid">${skillLines || '<div class="help-row"><span>—</span></div>'}</div>
      <div class="help-sub">手機：左半邊拖曳移動，下方技能列與右下按鈕施放。</div>`;
    $('help-overlay').classList.remove('hidden');
  }
  hideHelp() { $('help-overlay').classList.add('hidden'); }

  // Achievement / event toast (auto-dismiss).
  toast(title, sub = '') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="toast-title">${title}</div>${sub ? `<div class="toast-sub">${sub}</div>` : ''}`;
    $('toast-layer').appendChild(el);
    setTimeout(() => el.classList.add('show'), 20);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3200);
  }

  setPause(open, stats = {}) {
    $('pause-overlay').classList.toggle('hidden', !open);
    if (open) {
      $('pause-stats').textContent =
        `第 ${stats.stage} 關 · 分數 ${stats.score} · 擊殺 ${stats.kills} · 金幣 ${stats.gold}`;
    }
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

  update(player, director, extra = {}) {
    const hpPct = (player.hp / player.stats.maxHp) * 100;
    $('hp-fill').style.width = `${hpPct}%`;
    $('hp-text').textContent = `${Math.ceil(player.hp)}/${player.stats.maxHp}`;
    $('mp-fill').style.width = `${(player.mp / player.stats.maxMp) * 100}%`;
    $('mp-text').textContent = `${Math.floor(player.mp)}/${player.stats.maxMp}`;
    $('level-badge').textContent = player.level;
    $('kill-count').textContent = director.kills;
    $('btn-potion-count').textContent = player.potions;
    $('score-count').textContent = extra.score ?? 0;
    $('gold-count').textContent = player.gold ?? 0;
    const combo = extra.combo ?? 0;
    const comboLine = $('combo-line');
    comboLine.classList.toggle('hidden', combo < 2);
    if (combo >= 2) $('combo-count').textContent = `x${combo}`;
    // low-HP danger vignette (pulses below 30%)
    $('lowhp-vignette').classList.toggle('active', hpPct < 30 && player.alive);
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

  // Generic floating world-anchored text (dodge, crit popup, etc.).
  floatText(worldPos, text, kind = '') {
    const screen = this.engine.worldToScreen(worldPos);
    if (!screen.visible) return;
    const el = document.createElement('div');
    el.className = `dmg ${kind}`;
    el.textContent = text;
    el.style.left = `${screen.x}px`;
    el.style.top = `${screen.y - 56}px`;
    this.damageLayer.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  setEnrage(on) {
    document.getElementById('enrage-vignette')?.classList.toggle('active', on);
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
    const inRoom = (r) => playerPos.x >= r.minX && playerPos.x <= r.maxX && playerPos.z >= r.minZ && playerPos.z <= r.maxZ;
    for (const r of rooms) {
      let fill = r.cleared || !r.waves ? 'rgba(160,135,90,0.38)' : 'rgba(120,60,40,0.45)';
      if (r.type === 'final' && !r.cleared) fill = 'rgba(200,50,40,0.55)'; // boss room
      if (inRoom(r)) fill = 'rgba(230,210,160,0.6)'; // current room highlight
      drawRect(r, fill);
      // boss-room skull marker
      if (r.type === 'final' && !r.cleared) {
        const mx = ox + (r.gx + r.w / 2) * gridSize * scale;
        const mz = oz + (r.gz + r.h / 2) * gridSize * scale;
        ctx.fillStyle = '#ff5a4a';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('☠', mx, mz);
      }
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

  // Between-stage shop. items: [{id, icon, name, desc, cost, apply(player)}]
  showShop(player, items, onDone) {
    const overlay = $('shop-overlay');
    const cardsEl = $('shop-cards');
    const render = () => {
      $('shop-gold').textContent = player.gold;
      cardsEl.innerHTML = '';
      for (const item of items) {
        const card = document.createElement('div');
        const affordable = player.gold >= item.cost;
        card.className = 'upgrade-card shop-card' + (affordable ? '' : ' broke');
        card.innerHTML =
          `<div class="icon">${icon(item.icon)}</div><div class="name">${item.name}</div>` +
          `<div class="desc">${item.desc}</div><div class="cost">${item.cost} 金</div>`;
        card.addEventListener('click', () => {
          if (player.gold < item.cost) return;
          player.gold -= item.cost;
          item.apply(player);
          render();
        });
        cardsEl.appendChild(card);
      }
    };
    render();
    overlay.classList.remove('hidden');
    $('shop-done').onclick = () => onDone();
  }
  hideShop() { $('shop-overlay').classList.add('hidden'); }

  showEnd(title, s) {
    $('end-title').textContent = title;
    $('end-sub').textContent = `${s.difficulty}難度 · 第 ${s.stage} 關`;
    const mins = Math.floor(s.time / 60), secs = s.time % 60;
    const rows = [
      ['分數', s.newBest ? `${s.score} ★新紀錄` : s.score],
      ['最高分', s.highScore],
      ['擊殺', s.kills],
      ['最高連擊', `x${s.bestCombo}`],
      ['總傷害', s.damage ?? 0],
      ['等級', s.level],
      ['金幣', s.gold],
      ['圖鑑', `${s.bestiary ?? 0}/12 種`],
      ['時間', `${mins}:${String(secs).padStart(2, '0')}`],
    ];
    $('end-stats').innerHTML = rows.map(
      ([k, v]) => `<div class="stat-row"><span>${k}</span><span>${v}</span></div>`,
    ).join('');
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
