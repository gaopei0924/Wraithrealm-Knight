import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Assets } from './core/assets.js';
import { Input } from './core/input.js';
import { Physics } from './core/physics.js';
import { Sfx } from './core/audio.js';
import { Save } from './core/storage.js';
import { generateLayout } from './dungeon/layout.js';
import { DungeonBuilder } from './dungeon/builder.js';
import { STAGES, FINAL_STAGE_INDEX } from './dungeon/themes.js';
import { TorchLights } from './fx/lights.js';
import { Effects } from './fx/effects.js';
import { Player } from './entities/player.js';
import { WaveDirector } from './entities/spawner.js';
import { rollUpgradeChoices } from './combat/upgrades.js';
import { DIFFICULTIES, enemyMods, buildWavePlans } from './combat/difficulty.js';
import { SLOTS_PER_MILESTONE, SKILL_KEYS } from './combat/skills.js';
import { BOSSES } from './combat/bosses.js';
import { CHARACTERS, DEFAULT_CHARACTER } from './combat/characters.js';
import { applyMeta, soulReward, BASE_CLASSES } from './combat/meta.js';
import { Hub } from './ui/hub.js';
import { Codex } from './ui/codex.js';
import { COMPANIONS, COMPANION_MODELS, STARTER_COMPANION } from './combat/companions.js';
import { Companion } from './entities/companion.js';
import { Achievements } from './combat/achievements.js';
import { ENEMY_TYPES } from './entities/enemy.js';
import { Hud } from './ui/hud.js';
import { icon } from './ui/icons.js';
import { TouchControls } from './core/touch.js';
import { LayoutEditor } from './core/layoutedit.js';
import {
  isTouchDevice, suppressBrowserGestures, enterFullscreen, exitFullscreen,
  isFullscreen, lockLandscape, watchOrientation, fitViewport, requestFullscreenOnFirstGesture,
} from './core/mobile.js';

const canvas = document.getElementById('game');

class Game {
  async init() {
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.hud = new Hud(this.engine, this.input);
    this.touch = new TouchControls(this.input);
    this.sfx = new Sfx();
    this.assets = new Assets();
    this.paused = false;
    this.menuOpen = false;
    this.over = false;
    this.started = false;
    this.totalKills = 0;
    this.waveNumber = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.runStart = 0;
    this.bossRef = null;
    this.bossKills = 0;
    this.damageDealt = 0;

    fitViewport(() => this.engine.onResize());
    watchOrientation(); // tag body.portrait; game plays in any orientation
    if (isTouchDevice()) {
      document.body.classList.add('touch');
      suppressBrowserGestures();
    }
    const fsBtn = document.getElementById('fullscreen-btn');
    fsBtn.addEventListener('click', () => { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); });
    const onFsChange = () => {
      const full = isFullscreen();
      fsBtn.innerHTML = icon(full ? 'compress' : 'expand');
      fsBtn.classList.toggle('nudge', !full && this.started);
      this.engine.onResize();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    this.hud.paintStaticIcons();

    // Pause on Escape / pause button.
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape') this.togglePause(); });
    // Auto-pause when the tab is hidden (switched away / minimised).
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.togglePause(true); });
    this.hud.wireMenu({
      onToggle: () => this.togglePause(),
      onResume: () => this.togglePause(false),
      onRestart: () => window.location.reload(),
      onVolume: (v) => { Save.setVolume(v); this.sfx.setVolume(v); },
      onHelp: () => this.hud.showHelp(this.player?.loadout ?? []),
      onFullscreen: () => { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); },
      onShake: (on) => { Save.setShake(on); this.engine.shakeEnabled = on; },
      onMute: (m) => { Save.setMuted(m); this.sfx.setMuted(m); },
      onMusic: (on) => { Save.setMusic(on); if (on) this.sfx.startMusic(); else this.sfx.stopMusic(); },
      onAutoAtk: (v) => Save.setAutoAttack(v),
      onAutoCast: (v) => Save.setAutoCast(v),
      volume: Save.volume, shake: Save.shake, muted: Save.muted, music: Save.music,
      autoAttack: Save.autoAttack, autoCast: Save.autoCast,
      fsAvailable: !!document.documentElement.requestFullscreen,
    });
    this.engine.shakeEnabled = Save.shake;

    // Draggable on-screen controls.
    this.layoutEditor = new LayoutEditor();
    document.getElementById('pause-layout-btn').addEventListener('click', () => {
      this.togglePause(false);
      this.layoutEditor.enter();
    });
    document.getElementById('layout-done').addEventListener('click', () => this.layoutEditor.exit());
    document.getElementById('layout-reset').addEventListener('click', () => this.layoutEditor.reset());

    this.hud.setLoading(0.05, '召喚物理之力…');
    this.physics = await Physics.create();
    this.hud.setLoading(0.2, '丈量石磚…');
    await this.assets.loadTileManifest();
    this.fx = new Effects(this.engine.scene);

    this.hud.setLoading(0.6, '喚醒英雄與亡者…');
    // Preload every hero + enemy rig so character-select + stages are instant.
    for (const m of new Set(['Knight', 'Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded',
      'Grave_Zombie', 'Grave_Vampire', 'Grave_Skeleton', 'Grave_Ghost',
      'Skeleton_Minion', 'Skeleton_Rogue', 'Skeleton_Warrior', 'Skeleton_Mage',
      ...COMPANION_MODELS])) {
      await this.assets.loadGltf(`/assets/characters/${m}.glb`);
    }

    this.clock = new THREE.Clock();
    window.__game = this;
    this.hub = new Hub(() => this.renderSetup());
    this.codex = new Codex();
    this.hud.setLoading(1, '準備就緒');
    this.renderSetup();
  }

  // (Re)render the setup screen with only unlocked classes + the souls counter.
  renderSetup() {
    const unlocked = {};
    for (const [id, def] of Object.entries(CHARACTERS)) {
      if (BASE_CLASSES.has(id) || Save.classUnlocked(id)) unlocked[id] = def;
    }
    this.hud.showSetup(DIFFICULTIES, unlocked, (difficulty, loadoutIds, characterId) =>
      this.beginRun(difficulty, loadoutIds, characterId));
    const sc = document.getElementById('souls-count');
    if (sc) sc.textContent = `魂晶 ${Save.souls}`;
  }

  async beginRun(difficulty, loadoutIds, characterId) {
    if (this.started) return;
    this.started = true;
    this.difficulty = difficulty;
    // Build the chosen hero now.
    const charDef = CHARACTERS[characterId] ?? CHARACTERS[DEFAULT_CHARACTER];
    const charData = await this.assets.character(charDef.model);
    this.player = new Player(charData, this.engine.scene, this.physics, this.sfx, charDef.aliases);
    this.player.applyCharacter(charDef);
    // persistent meta-progression: attributes + equipment + appearance aura
    const meta = applyMeta(this.player, Save);
    if (meta.auraColor != null) this.player.char.setAura(meta.auraColor, 0.45);
    this.companions = [];
    this.pendingMeteors = [];
    this.wirePlayerEvents();
    // chosen skills + the hero's signature skill (deduped, capped at 8)
    const ids = [...new Set([...(loadoutIds ?? []), charDef.signature])].slice(0, 8);
    this.player.setLoadout(ids);
    this.hud.setSkillBar(this.player.loadout);
    await this.hud.paintPortrait(this.engine.renderer, this.engine.scene, this.player.char.model, charDef.headNode);

    this.sfx.ensure();
    this.sfx.setVolume(Save.volume);
    this.sfx.setMuted(Save.muted);
    if (this.sfx.ctx?.state === 'suspended') this.sfx.ctx.resume();
    if (Save.music) this.sfx.startMusic();

    // Fullscreen if available (Android), but DON'T lock orientation — the game
    // plays portrait or landscape, so the player keeps their phone as they hold it.
    const wentFull = await enterFullscreen();
    if (isTouchDevice() && !wentFull) requestFullscreenOnFirstGesture();
    if (!wentFull) document.getElementById('fullscreen-btn').classList.add('nudge');

    this.hud.hideLoading();
    this.hud.show();
    this.layoutEditor.apply(); // restore saved control positions
    this.runStart = performance.now();
    this.stageIndex = -1;
    await this.loadStage(0);
    await this.addCompanion(STARTER_COMPANION); // everyone starts with a loyal ally
    this.engine.renderer.setAnimationLoop(() => this.frame());
  }

  async loadStage(index) {
    this.stageIndex = index;
    const stage = STAGES[index];
    if (this.builder) this.builder.dispose();
    if (this.torches) this.torches.dispose();
    if (this.director) this.director.disposeAll();
    this.fx.reset();
    this.hud.hideBossBar();
    this.hud.setEnrage(false);
    this.bossRef = null;
    this.chestTimer = 22; this.healthTimer = 28;
    this.refreshPassives();

    const wavePlans = buildWavePlans(stage, this.difficulty);
    this.layout = generateLayout(Math.floor(Math.random() * 1e9), {
      combatCount: stage.combatCount, sizeScale: stage.sizeScale, wavePlans,
    });
    this.builder = new DungeonBuilder(this.assets, this.physics, this.engine.scene);
    this.rooms = await this.builder.build(this.layout, stage.theme);
    this.engine.applyTheme(stage.theme);
    this.torches = new TorchLights(this.engine.scene, this.builder.torchPoints, stage.theme.torch);

    const start = this.rooms[0];
    this.player.actor.body.setTranslation({ x: start.centerX, y: 1.1, z: start.centerZ }, true);
    this.player.syncFromPhysics();
    for (const c of this.companions ?? []) c.setPosition(start.centerX, start.centerZ);
    this.engine.cameraTarget.set(start.centerX, 0, start.centerZ);
    this.fx.startAmbient(stage.theme.torch, { x: start.centerX, z: start.centerZ });

    this.director = new WaveDirector({
      rooms: this.rooms, builder: this.builder, assets: this.assets, scene: this.engine.scene,
      physics: this.physics, sfx: this.sfx, mods: enemyMods(this.difficulty, stage),
      eliteChance: stage.eliteChance ?? 0, bossType: stage.boss,
      events: {
        onWaveStart: () => { this.waveNumber++; this.hud.setWave(this.waveNumber); this.hud.announce(`WAVE ${this.waveNumber}`); },
        onRoomCleared: () => {
          this.hud.announce('房間肅清', '前往下一個房間 →');
          this.player.heal(this.player.stats.maxHp * 0.25);
          this.player.potions = Math.min(6, this.player.potions + 1);
        },
        onAllCleared: () => this.onStageCleared(),
        onEliteSpawned: (e) => this.hud.announce('菁英降臨', e.def.name ?? ''),
        onBossSpawn: (b) => this.onBossSpawn(b),
        onEnemyExplode: (e, spec) => this.resolveExplosion(e, spec),
        onBlink: (pos) => this.fx.ringBurst(pos, 1.6, 0x9fb8ff),
        onThorns: (e) => this.onThorns(e),
      },
    });
    await this.director.preloadCharacters();
    this.director.kills = this.totalKills;

    this.hud.setObjective(`${stage.name}：消滅所有敵人`);
    this.hud.setStageTag(index + 1, STAGES.length, stage.name);
    this.hud.announce(`第 ${index + 1} 關 · ${stage.name}`, stage.subtitle);
    this.sfx.gate();
    this.checkAchievements();
  }

  onBossSpawn(boss) {
    this.bossRef = boss;
    this.hud.showBossBar(boss.bossDef.name, boss.bossDef.title);
    this.sfx.bossRoar();
    this.engine.addShake(0.5);
    this.hud.announce(boss.bossDef.name, boss.bossDef.title);
    boss.onTelegraph = (spec, ctx) => this.bossTelegraph(spec, ctx);
    boss.onAttack = (spec, ctx) => this.bossAttack(spec, ctx);
    boss.onEnrage = () => {
      this.hud.announce('狂怒', '');
      this.engine.addShake(0.4);
      this.hud.setEnrage(true);
      boss.char.setAura(0xff2a2a, 0.5);
    };
    boss.onDefeated = (b) => this.onBossDefeated(b);
  }

  bossTelegraph(spec, ctx) {
    this.sfx.telegraph();
    if (spec.type === 'nova' || spec.type === 'slam') {
      this.fx.telegraph(ctx.origin, spec.range, ctx.color, spec.telegraph);
    } else if (spec.type === 'cleave') {
      this.fx.telegraph(ctx.origin, spec.range, ctx.color, spec.telegraph);
    }
  }

  // Resolve a boss attack's impact against the player.
  bossAttack(spec, ctx) {
    const boss = this.bossRef;
    const p = this.player;
    const dist = p.position.distanceTo(ctx.origin);
    const hitPlayer = (dmg) => {
      if (p.takeDamage(dmg)) {
        this.hud.damageNumber(p.position, dmg, 'player-hit');
        if (ctx.status?.type === 'chill') p.applyChill(ctx.status.factor, ctx.status.duration);
        else if (ctx.status?.type === 'poison') p.applyPoison(ctx.status.dps, ctx.status.duration);
        this.onPlayerHurt();
      }
    };
    if (spec.type === 'nova' || spec.type === 'slam') {
      this.fx.burst(ctx.origin, spec.range, ctx.color);
      this.engine.addShake(0.35);
      if (dist <= spec.range) hitPlayer(spec.damage);
    } else if (spec.type === 'cleave') {
      this.fx.slashArc(ctx.origin, ctx.facing, spec.range, spec.arc, ctx.color);
      this.engine.addShake(0.25);
      const to = new THREE.Vector2(p.position.x - ctx.origin.x, p.position.z - ctx.origin.z);
      const fwd = new THREE.Vector2(Math.sin(ctx.facing), Math.cos(ctx.facing));
      if (to.length() <= spec.range && (to.length() < 1 || Math.abs(fwd.angleTo(to)) <= spec.arc)) hitPlayer(spec.damage);
    }
    if (boss?.bossDef.lifesteal) boss.hp = Math.min(boss.maxHp, boss.hp + spec.damage * 1.5);
  }

  onBossDefeated(boss) {
    this.hud.hideBossBar();
    this.hud.setEnrage(false);
    this.engine.addShake(0.6);
    this.setHitStop(220);
    this.hud.announce('魔王伏誅', '');
    if (boss.bossDef?.id) Save.unlock(`boss:${boss.bossDef.id}`); // codex discovery
    this.bossKills++;
    this.addScore(800 + this.stageIndex * 200);
    this.checkAchievements();
    for (let i = 0; i < 14; i++) this.fx.spawnPickup(boss.position, i % 3 === 0 ? 'heal' : 'gold');
    this.player.gold += 60;
  }

  resolveExplosion(enemy, spec) {
    this.fx.burst(enemy.position, spec.radius, spec.color ?? 0xff7a1e);
    this.engine.addShake(0.3);
    if (this.player.position.distanceTo(enemy.position) <= spec.radius) {
      if (this.player.takeDamage(spec.damage)) { this.hud.damageNumber(this.player.position, spec.damage, 'player-hit'); this.onPlayerHurt(); }
    }
  }

  wirePlayerEvents() {
    const player = this.player;
    player.events.onSwing = (swing) => this.resolveArcHit(swing, 0xffc878);
    player.events.onSkill = (ctx) => this.resolveSkill(ctx);
    player.events.onLevelUp = (lvl) => this.levelUp(lvl);
    player.events.onDeath = () => this.defeat();
    player.events.onDodge = () => this.hud.floatText(player.position, '閃避', 'dodge');
    player.events.onRevive = () => {
      this.hud.announce('絕境重生', '');
      this.hud.toast('絕境重生', '撐過致命一擊');
      this.fx.ringBurst(player.position, 4, 0xffe070);
      this.fx.burst(player.position, 3, 0xffe070);
      this.sfx.levelUp();
    };
  }

  resolveSkill({ skill, origin, facing, damageMult }) {
    const fx = skill.effect;
    const damage = (fx.damage ?? 0) * damageMult;
    switch (fx.type) {
      case 'nova': this.applyNova(origin, fx, damage); break;
      case 'arc':
        this.resolveArcHit({ origin, facing, range: fx.range, arc: fx.arc, damage, finisher: true, knock: fx.knockback }, fx.color);
        this.engine.addShake(fx.shake ?? 0.2); break;
      case 'projectile': this.fx.firePlayerBolt(origin, facing, fx); break;
      case 'chain': this.resolveChain(origin, fx, damageMult); break;
      case 'buff':
        this.fx.ringBurst(origin, 2.6, fx.color);
        if (fx.invuln) this.hud.announce('聖盾庇護', ''); else if (fx.damageMult) this.hud.announce('狂暴', '');
        break;
      case 'summon':
        this.fx.ringBurst(origin, 3, fx.color);
        for (const id of fx.companions ?? ['imp']) this.addCompanion(id, fx.duration);
        break;
      case 'slowfield':
        this.fx.ringBurst(origin, fx.range, fx.color);
        this.fx.telegraph(origin, fx.range, fx.color, 0.4);
        this.engine.addShake(0.2);
        for (const e of this.director.aliveEnemies) {
          if (e.position.distanceTo(origin) <= fx.range) e.applySlow(fx.slow.factor, fx.slow.duration);
        }
        break;
      case 'meteor': {
        const pt = new THREE.Vector3(origin.x + Math.sin(facing) * fx.dist, 0, origin.z + Math.cos(facing) * fx.dist);
        this.fx.telegraph(pt, fx.range, fx.color, fx.delay);
        this.pendingMeteors.push({ pt, fx, damage, at: performance.now() + fx.delay * 1000 });
        break;
      }
    }
  }

  // Resolve delayed meteor impacts (driven from tick so pause/hit-stop respect it).
  updateMeteors() {
    if (!this.pendingMeteors?.length) return;
    const now = performance.now();
    this.pendingMeteors = this.pendingMeteors.filter((m) => {
      if (now < m.at) return true;
      this.fx.burst(m.pt, m.fx.range, m.fx.color);
      this.engine.addShake(0.45);
      this.setHitStop(60);
      for (const e of this.director.aliveEnemies) {
        if (e.position.distanceTo(m.pt) <= m.fx.range + e.def.radius) {
          const crit = Math.random() < this.player.stats.critChance;
          this.applyDamage(e, m.damage * (crit ? this.player.stats.critMult : 1), m.pt, m.fx.knockback ?? 6, crit);
        }
      }
      return false;
    });
  }

  applyNova(origin, fx, damage) {
    this.fx.ringBurst(origin, fx.range, fx.color);
    this.engine.addShake(fx.shake ?? 0.2);
    let hit = false;
    for (const enemy of this.director.aliveEnemies) {
      if (enemy.position.distanceTo(origin) <= fx.range + enemy.def.radius) {
        const crit = Math.random() < this.player.stats.critChance;
        const dmg = damage * (crit ? this.player.stats.critMult : 1);
        this.applyDamage(enemy, dmg, origin, fx.knockback ?? 5, crit);
        if (fx.slow) enemy.applySlow(fx.slow.factor, fx.slow.duration);
        if (fx.dot) enemy.applyDot(fx.dot.dps, fx.dot.duration);
        hit = true;
      }
    }
    if (hit) this.sfx.hit();
  }

  resolveChain(origin, fx, damageMult) {
    const remaining = [...this.director.aliveEnemies];
    const points = [origin];
    let from = origin, struck = false;
    for (let jump = 0; jump < fx.jumps && remaining.length; jump++) {
      let best = -1, bestDist = fx.range * fx.range;
      for (let i = 0; i < remaining.length; i++) {
        const d = remaining[i].position.distanceToSquared(from);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      if (best < 0) break;
      const target = remaining.splice(best, 1)[0];
      points.push(target.position.clone());
      const crit = Math.random() < this.player.stats.critChance;
      const dmg = fx.damage * damageMult * (crit ? this.player.stats.critMult : 1);
      this.applyDamage(target, dmg, from, 3, crit);
      from = target.position.clone();
      struck = true;
    }
    this.fx.chainLightning(points, fx.color);
    if (struck) { this.sfx.hit(); this.engine.addShake(0.15); }
  }

  resolveArcHit(swing, color) {
    this.fx.slashArc(swing.origin, swing.facing, swing.range, swing.arc, color);
    const forward = new THREE.Vector2(Math.sin(swing.facing), Math.cos(swing.facing));
    let hitAny = false;
    for (const enemy of this.director.aliveEnemies) {
      const to = new THREE.Vector2(enemy.position.x - swing.origin.x, enemy.position.z - swing.origin.z);
      const dist = to.length();
      if (dist > swing.range + enemy.def.radius) continue;
      if (dist > 0.8 && Math.abs(forward.angleTo(to)) > swing.arc) continue;
      const crit = Math.random() < this.player.stats.critChance;
      const damage = swing.damage * (crit ? this.player.stats.critMult : 1);
      this.applyDamage(enemy, damage, swing.origin, swing.knock ?? (swing.finisher ? 7 : 4), crit);
      hitAny = true;
    }
    if (hitAny) { this.sfx.hit(); this.engine.addShake(swing.finisher ? 0.22 : 0.1); }
  }

  applyDamage(enemy, damage, fromPos, knockback, crit = false, kind = '') {
    const dealt = enemy.takeDamage(damage, fromPos, knockback);
    if (dealt <= 0) return;
    this.damageDealt += dealt;
    this.hud.damageNumber(enemy.position, damage, kind || (crit ? 'crit' : ''));
    if (crit) {
      this.setHitStop(40); // micro freeze for impact
      if (Math.random() < 0.3) this.hud.floatText(enemy.position, '暴擊!', 'crit-pop');
    }
    if (kind !== 'dot' && kind !== 'poison' && kind !== 'burn') this.fx.hitSpark(enemy.position);
    if (this.player.lifesteal > 0) this.player.heal(damage * this.player.lifesteal);
    if (enemy.isBoss) this.sfx.bossHit();
    if (enemy.dead) this.onEnemyKilled(enemy);
  }

  onEnemyKilled(enemy) {
    this.director.notifyKill(enemy);
    Save.recordKill(enemy.type);
    // combo + score
    this.combo++;
    this.comboTimer = 3;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.addScore(Math.round((enemy.def.xp ?? 10) * (1 + this.combo * 0.08)));
    // combo milestone reward
    if (this.combo > 0 && this.combo % 10 === 0) {
      this.player.heal(this.player.stats.maxHp * 0.06);
      this.hud.toast(`${this.combo} 連擊！`, '小幅回復生命');
      this.player.mp = Math.min(this.player.stats.maxMp, this.player.mp + 15);
    }
    // XP orbs
    const orbCount = Math.max(2, Math.round(enemy.def.xp / 8));
    for (let i = 0; i < orbCount; i++) this.fx.spawnOrb(enemy.position, enemy.def.xp / orbCount);
    // Treasure goblin hoard.
    if (enemy.def.goldDrop) {
      this.player.gold += enemy.def.goldDrop;
      this.addScore(enemy.def.goldDrop * 2);
      for (let i = 0; i < 12; i++) this.fx.spawnPickup(enemy.position, 'gold');
      this.hud.toast('寶藏！', `+${enemy.def.goldDrop} 金幣`);
      this.sfx.coin();
    } else {
      this.player.gold += Math.round((enemy.elite ? 12 : 3) * this.player.stats.goldMult);
      if (Math.random() < (enemy.elite ? 0.9 : 0.14)) this.fx.spawnPickup(enemy.position, Math.random() < 0.6 ? 'heal' : 'mana');
      if (Math.random() < 0.5) this.fx.spawnPickup(enemy.position, 'gold');
      // rare Soul Bomb that clears the screen when collected
      if (Math.random() < 0.018) this.fx.spawnPickup(enemy.position, 'bomb');
    }
    this.checkAchievements();
  }

  addScore(n) { this.score += n; }

  checkAchievements(victory = false) {
    const ctx = {
      kills: this.director?.kills ?? 0, bossKills: this.bossKills, combo: this.bestCombo,
      level: this.player?.level ?? 1, stage: this.stageIndex + 1, gold: this.player?.gold ?? 0, victory,
    };
    for (const a of Achievements.check(ctx)) this.hud.toast(`成就解鎖：${a.name}`, a.desc);
  }

  collectPickup(kind) {
    if (kind === 'heal') { this.player.heal(this.player.stats.maxHp * 0.12); this.sfx.pickup(); }
    else if (kind === 'mana') { this.player.mp = Math.min(this.player.stats.maxMp, this.player.mp + 25); this.sfx.pickup(); }
    else if (kind === 'gold') { this.player.gold += Math.round(5 * this.player.stats.goldMult); this.addScore(10); this.sfx.coin(); }
    else if (kind === 'bomb') this.detonateSoulBomb();
  }

  // Rare Soul Bomb pickup — nukes every enemy on screen.
  detonateSoulBomb() {
    this.hud.announce('靈魂爆發', '');
    this.fx.burst(this.player.position, 9, 0xb060ff);
    this.engine.addShake(0.5);
    this.setHitStop(120);
    this.sfx.bossRoar();
    for (const enemy of [...this.director.aliveEnemies]) {
      const dmg = enemy.isBoss ? 400 : 9999;
      this.applyDamage(enemy, dmg, this.player.position, 6, false);
    }
  }

  levelUp(level) {
    this.sfx.levelUp();
    this.hud.announce('升級！', `等級 ${level}`);
    if (this.player) this.fx.ringBurst(this.player.position, 3, 0xffe07a);
    this.checkAchievements();
    this.paused = true;
    const pool = this.player.unequippedSkills();
    const comps = this.availableCompanions();
    if (level % SLOTS_PER_MILESTONE === 0 && pool.length > 0) {
      this.hud.showSkillChoice(this.pickRandom(pool, Math.min(3, pool.length)), (skill) => {
        this.player.addSkill(skill.id); this.hud.setSkillBar(this.player.loadout); this.paused = false;
      });
    } else if (level % 4 === 3 && comps.length > 0) {
      // Companion recruitment milestone (levels 3, 7, 11, …).
      const choices = this.pickRandom(comps, Math.min(3, comps.length)).map((c) => ({
        icon: c.icon, name: c.name, desc: c.desc, apply: () => this.addCompanion(c.id),
      }));
      this.hud.showUpgradeChoices(choices, (choice) => { choice.apply(); this.paused = false; });
    } else {
      this.hud.showUpgradeChoices(rollUpgradeChoices(3), (choice) => { choice.apply(this.player); this.refreshPassives(); this.paused = false; });
    }
  }

  pickRandom(arr, n) {
    const pool = [...arr], out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  togglePause(force) {
    if (!this.started || this.over || this.paused) return; // don't pause over level/stage overlays
    const next = force ?? !this.menuOpen;
    this.menuOpen = next;
    this.hud.setPause(next, { score: this.score, kills: this.director?.kills ?? 0, stage: this.stageIndex + 1, gold: this.player?.gold ?? 0 });
  }

  onStageCleared() {
    this.totalKills = this.director.kills;
    Save.flush();
    if (this.stageIndex >= FINAL_STAGE_INDEX) { this.victory(); return; }
    // Shop between stages, then descend.
    this.paused = true;
    this.hud.showShop(this.player, this.SHOP_ITEMS(), () => {
      this.hud.hideShop();
      this.hud.announce('關卡完成', '深入下一層…');
      setTimeout(async () => { await this.loadStage(this.stageIndex + 1); this.paused = false; }, 700);
    });
  }

  SHOP_ITEMS() {
    return [
      { id: 'heal', icon: 'potion', name: '治療', desc: '回滿生命', cost: 30, apply: (p) => { p.hp = p.stats.maxHp; } },
      { id: 'maxhp', icon: 'up_vitality', name: '強健', desc: '最大生命 +30', cost: 60, apply: (p) => { p.stats.maxHp += 30; p.hp += 30; } },
      { id: 'dmg', icon: 'up_blade', name: '鋒利', desc: '傷害 +12%', cost: 70, apply: (p) => { p.stats.damageMult *= 1.12; } },
      { id: 'potion', icon: 'potion', name: '藥水 x3', desc: '補滿藥水', cost: 40, apply: (p) => { p.potions = 6; } },
    ];
  }

  defeat() {
    if (this.over) return;
    this.over = true;
    this.finishRun('你死了');
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.hud.setObjective('已通關');
    this.checkAchievements(true);
    this.finishRun('亡域制霸');
  }

  finishRun(title) {
    const secs = Math.round((performance.now() - this.runStart) / 1000);
    const best = Save.recordScore(this.score, this.stageIndex);
    // Bank 魂晶 for meta-progression.
    const souls = soulReward({ score: this.score, stage: this.stageIndex + 1, kills: this.director.kills, bossKills: this.bossKills });
    Save.addSouls(souls);
    Save.flush();
    setTimeout(() => {
      this.hud.showEnd(title, {
        stage: this.stageIndex + 1, kills: this.director.kills, level: this.player.level,
        score: this.score, bestCombo: this.bestCombo, time: secs, gold: this.player.gold,
        difficulty: this.difficulty.name, highScore: Save.highScore, newBest: best,
        damage: Math.round(this.damageDealt), bestiary: Save.bestiaryCount(), souls,
      });
    }, 1400);
  }

  setHitStop(ms) {
    const now = performance.now();
    if (now < (this._hitStopCd ?? 0)) return;
    this.hitStopUntil = now + ms;
    this._hitStopCd = now + ms + 110;
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.input.pollGamepad();
    if (this.input.padStartEdge) this.togglePause();
    const frozen = performance.now() < (this.hitStopUntil ?? 0); // hit-stop juice
    if (!this.paused && !this.menuOpen && !frozen) this.tick(dt);
    this.input.endFrame();
    this.engine.render();
  }

  tick(dt) {
    const { player, director, fx } = this;

    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }

    this.autoCombat();
    player.update(dt, this.input);
    this.updateSurvivors(dt);
    this.updateCompanions(dt);
    this.updateMeteors();
    if (player.state === 'roll') fx.trail(player.position);
    director.update(dt, player, (e) => {
      const target = e._target ?? player.position;
      fx.fireBolt(e.position, target, {
        color: e.def.projectile?.color, speed: e.def.projectile?.speed,
        damage: e.def.damage, status: e.def.onHitStatus,
      });
      this.sfx.swing();
    });
    this.physics.step();
    player.syncFromPhysics();
    for (const enemy of director.enemies) {
      if (!enemy.dead) enemy.syncFromPhysics();
      enemy.updateBar(this.engine.camera);
    }

    // DoTs (poison/burn) in 0.4s chunks.
    const now = performance.now();
    for (const enemy of director.aliveEnemies) {
      for (const dk of ['poison', 'burn']) {
        const s = enemy.status[dk];
        if (!s || !s.dps || now - s.last < 400) continue;
        const chunk = s.dps * ((now - s.last) / 1000);
        s.last = now;
        this.applyDamage(enemy, chunk, enemy.position.clone().setZ(enemy.position.z - 0.5), 0, false, dk);
      }
    }

    fx.update(dt);
    const mag = player.stats.magnet;
    fx.updateOrbs(dt, player.position, (xp) => { player.gainXp(xp); this.sfx.orb(); }, mag);
    fx.updatePickups(dt, player.position, (kind) => this.collectPickup(kind), mag);
    for (const hit of fx.updateBolts(dt, player.position)) {
      if (player.takeDamage(hit.damage)) {
        this.hud.damageNumber(player.position, hit.damage, 'player-hit');
        if (hit.status?.type === 'chill') player.applyChill(hit.status.factor, hit.status.duration);
        else if (hit.status?.type === 'poison') player.applyPoison(hit.status.dps, hit.status.duration);
        this.onPlayerHurt();
      }
    }
    fx.updatePlayerBolts(dt, director.aliveEnemies, (pos, effect) => {
      this.fx.burst(pos, effect.radius, effect.color);
      for (const enemy of director.aliveEnemies) {
        if (enemy.position.distanceTo(pos) <= effect.radius + enemy.def.radius) {
          const crit = Math.random() < player.stats.critChance;
          const dmg = effect.damage * player.damageMult * (crit ? player.stats.critMult : 1);
          this.applyDamage(enemy, dmg, pos, effect.knockback ?? 5, crit);
        }
      }
      this.sfx.hit();
    });

    this.torches.update(player.position, dt);
    fx.updateAmbient(dt, player.position);
    this.engine.followCamera(player.position, dt);
    this.hud.update(player, director, { score: this.score, combo: this.combo });
    if (this.bossRef && !this.bossRef.dead) this.hud.updateBossBar(this.bossRef.hp, this.bossRef.maxHp);
    this.hud.drawMinimap(this.rooms, this.layout.corridors, player.position, this.assets.gridSize);
  }

  onPlayerHurt() {
    this.hud.flashHurt();
    this.engine.addShake(0.18);
  }

  // Auto-attack + auto-cast (survivors-style): runs before player.update so the
  // buffered inputs resolve this frame. Respects the settings toggles.
  autoCombat() {
    const p = this.player, d = this.director;
    if (!p?.alive) return;
    const enemies = d.aliveEnemies.filter((e) => e.type !== 'goblin');
    if (!enemies.length) return;
    let near = null, best = 1e9;
    for (const e of enemies) {
      const dd = e.position.distanceToSquared(p.position);
      if (dd < best) { best = dd; near = e; }
    }
    const dist = Math.sqrt(best);
    if (Save.autoAttack && (p.state === 'idle' || p.state === 'move') && dist < 3.4) {
      p.char.snapFacing(Math.atan2(near.position.x - p.position.x, near.position.z - p.position.z));
      this.input.triggerAttack();
    }
    if (Save.autoCast && dist < 7) {
      const now = performance.now();
      if (now - (this._autoCastT ?? 0) > 450) {
        for (let i = 0; i < p.loadout.length; i++) {
          if (p.skillCd[i] <= 0 && p.mp >= p.loadout[i].mp) {
            this._autoCastT = now; this.input.triggerKey(SKILL_KEYS[i]); break;
          }
        }
      }
    }
  }

  // Passive auto-weapons + survival timers.
  updateSurvivors(dt) {
    const p = this.player, d = this.director, now = performance.now();
    // damage aura
    if (p.weapons.aura > 0) {
      this.fx.updateAuraDisc(p.position);
      this.auraTimer = (this.auraTimer ?? 0) - dt;
      if (this.auraTimer <= 0) {
        this.auraTimer = 0.5;
        const r = this.fx.auraRadius ?? 3;
        const dmg = (5 + p.weapons.aura * 4) * 0.25 * p.damageMult;
        for (const e of d.aliveEnemies) {
          if (e.position.distanceTo(p.position) <= r + e.def.radius) this.applyDamage(e, dmg, p.position, 1, false, 'burn');
        }
      }
    }
    // frost aura — chills nearby
    if (p.weapons.frost > 0) {
      const r = 3 + p.weapons.frost * 0.6;
      for (const e of d.aliveEnemies) if (e.position.distanceTo(p.position) < r) e.applySlow(0.5, 0.6);
    }
    // orbiting blades
    if (p.weapons.orbit > 0) {
      const pts = this.fx.updateOrbit(dt, p.position);
      const dmg = (8 + p.weapons.orbit * 6) * p.damageMult;
      for (const e of d.aliveEnemies) {
        e._orbCd = (e._orbCd ?? 0) - dt;
        if (e._orbCd > 0) continue;
        for (const pt of pts) {
          const dx = e.position.x - pt.x, dz = e.position.z - pt.z;
          if (dx * dx + dz * dz < (0.85 + e.def.radius) ** 2) { this.applyDamage(e, dmg, p.position, 4, false); e._orbCd = 0.4; break; }
        }
      }
    }
    // periodic treasure + health (survivors map events)
    this.chestTimer = (this.chestTimer ?? 22) - dt;
    if (this.chestTimer <= 0) {
      this.chestTimer = 24;
      for (let i = 0; i < 6; i++) this.fx.spawnPickup(p.position, 'gold');
      this.fx.spawnPickup(p.position, 'heal');
      this.hud.toast('寶箱', '補給湧現');
    }
    this.healthTimer = (this.healthTimer ?? 28) - dt;
    if (this.healthTimer <= 0) { this.healthTimer = 30; this.fx.spawnPickup(p.position, Math.random() < 0.5 ? 'heal' : 'mana'); }
  }

  onThorns(enemy) {
    const dmg = 6 + this.player.weapons.thorns * 6;
    this.applyDamage(enemy, dmg, this.player.position, 3, false);
  }

  // --- Companions (同伴) ---------------------------------------------------
  // Recruit a companion. ttl set ⇒ a temporary summoned ally (skill). A
  // permanent recruit of an already-owned companion levels it up instead.
  async addCompanion(id, ttl = null) {
    const def = COMPANIONS[id];
    if (!def) return;
    if (!ttl) {
      const existing = this.companions.find((c) => c.def.id === id && c.ttl == null);
      if (existing) { existing.level++; this.hud.toast(`${def.name} 強化`, `等級 ${existing.level}`); return; }
    }
    if (this.companions.length >= (ttl ? 9 : 6)) return;
    const charData = await this.assets.character(def.model);
    const comp = new Companion(def, charData, this.engine.scene, this.companions.length, 1, ttl);
    const p = this.player.position;
    comp.setPosition(p.x + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 2);
    this.companions.push(comp);
    Save.seeCompanion(id); // codex discovery
    this.fx.ringBurst(comp.position, 2.2, def.color ?? 0x88aaff);
    if (ttl) { this.hud.toast('亡魂召喚', `${def.name} (${ttl}s)`); }
    else { this.player.companionIds.push(id); this.hud.announce('同伴加入', def.name); this.hud.toast('召喚同伴', `${def.name} 加入戰鬥`); }
    this.sfx.levelUp?.();
  }

  // Companion defs not yet recruited (for the level-up offer).
  availableCompanions() {
    const owned = new Set(this.companions.map((c) => c.def.id));
    return Object.values(COMPANIONS).filter((c) => !owned.has(c.id));
  }

  updateCompanions(dt) {
    if (!this.companions?.length) return;
    const enemies = this.director.aliveEnemies;
    const ctx = {
      enemies,
      power: this.player.stats.companionPower,
      fx: this.fx,
      onHeal: (amt) => this.player.heal(amt),
      dealDamage: (enemy, dmg, from, knock) => {
        const crit = Math.random() < this.player.stats.critChance * 0.5;
        this.applyDamage(enemy, dmg * (crit ? this.player.stats.critMult : 1), from, knock, crit);
      },
    };
    for (const c of this.companions) c.update(dt, this.player.position, ctx);
    // retire expired temporary summons
    if (this.companions.some((c) => c.expired)) {
      for (const c of this.companions) if (c.expired) c.dispose(this.engine.scene);
      this.companions = this.companions.filter((c) => !c.expired);
    }
  }

  // Re-create the persistent passive-weapon visuals from current levels.
  refreshPassives() {
    this.fx.setOrbit(this.player.weapons.orbit);
    this.fx.setAuraDisc(this.player.weapons.aura);
  }
}

new Game().init().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading-text');
  if (el) el.textContent = `載入失敗：${err.message}`;
});
