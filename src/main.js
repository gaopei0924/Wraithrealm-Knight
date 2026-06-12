import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Assets } from './core/assets.js';
import { Input } from './core/input.js';
import { Physics } from './core/physics.js';
import { Sfx } from './core/audio.js';
import { generateLayout } from './dungeon/layout.js';
import { DungeonBuilder } from './dungeon/builder.js';
import { STAGES, FINAL_STAGE_INDEX } from './dungeon/themes.js';
import { TorchLights } from './fx/lights.js';
import { Effects } from './fx/effects.js';
import { Player } from './entities/player.js';
import { WaveDirector } from './entities/spawner.js';
import { rollUpgradeChoices } from './combat/upgrades.js';
import { DIFFICULTIES, enemyMods, buildWavePlans } from './combat/difficulty.js';
import { Hud } from './ui/hud.js';
import { TouchControls } from './core/touch.js';
import {
  isTouchDevice,
  suppressBrowserGestures,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  lockLandscape,
  watchOrientation,
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
    this.over = false;
    this.started = false;
    this.totalKills = 0;
    this.waveNumber = 0;

    if (isTouchDevice()) {
      document.body.classList.add('touch');
      suppressBrowserGestures();
      watchOrientation(document.getElementById('rotate-prompt'));
    }
    const fsBtn = document.getElementById('fullscreen-btn');
    fsBtn.addEventListener('click', () => {
      if (isFullscreen()) exitFullscreen();
      else enterFullscreen();
    });
    // Keep the toggle icon in sync and re-fit the canvas when fullscreen flips.
    const onFsChange = () => {
      const full = isFullscreen();
      fsBtn.textContent = full ? '🗕' : '⛶';
      fsBtn.classList.toggle('nudge', !full && this.started);
      this.engine.onResize();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    this.hud.setLoading(0.05, '召喚物理之力…');
    this.physics = await Physics.create();

    this.hud.setLoading(0.2, '丈量石磚…');
    await this.assets.loadTileManifest();

    this.fx = new Effects(this.engine.scene);

    this.hud.setLoading(0.4, '喚醒騎士…');
    const knight = await this.assets.character('Knight');
    this.player = new Player(knight, this.engine.scene, this.physics, this.sfx);
    this.wirePlayerEvents();

    this.hud.setLoading(0.7, '亡者甦醒中…');
    // Preload all enemy meshes once so stage transitions are instant.
    for (const m of ['Skeleton_Minion', 'Skeleton_Rogue', 'Skeleton_Warrior', 'Skeleton_Mage']) {
      await this.assets.loadGltf(`/assets/characters/${m}.glb`);
    }

    this.hud.setLoading(0.95, '雕琢肖像…');
    await this.hud.paintPortrait(this.engine.renderer, this.engine.scene, this.player.char.model);

    this.clock = new THREE.Clock();
    window.__game = this;

    this.hud.setLoading(1, '準備就緒');
    // Setup screen: choose difficulty + 2 skills, then begin the run.
    this.hud.showSetup(DIFFICULTIES, (difficulty, loadoutIds) => {
      this.beginRun(difficulty, loadoutIds);
    });
  }

  async beginRun(difficulty, loadoutIds) {
    if (this.started) return;
    this.started = true;
    this.difficulty = difficulty;
    this.player.setLoadout(loadoutIds);
    this.hud.setSkillButtons(this.player.loadout);

    this.sfx.ensure();
    if (this.sfx.ctx?.state === 'suspended') this.sfx.ctx.resume();

    // Request fullscreen on EVERY platform while the start-button gesture is
    // still active, so the browser address/tab bar can't cover the play area.
    // (Desktop Chrome needs this just as much as mobile.) If the user declines
    // or the browser blocks it, the ⛶ button stays available.
    const wentFull = await enterFullscreen();
    if (isTouchDevice()) await lockLandscape();
    if (!wentFull) document.getElementById('fullscreen-btn').classList.add('nudge');

    this.hud.hideLoading();
    this.hud.show();

    this.stageIndex = -1;
    await this.loadStage(0);

    this.engine.renderer.setAnimationLoop(() => this.frame());
  }

  async loadStage(index) {
    this.stageIndex = index;
    const stage = STAGES[index];

    // Tear down the previous stage (meshes, colliders, lights, enemies, fx).
    if (this.builder) this.builder.dispose();
    if (this.torches) this.torches.dispose();
    if (this.director) this.director.disposeAll();
    this.fx.reset();

    const wavePlans = buildWavePlans(stage, this.difficulty);
    this.layout = generateLayout(Math.floor(Math.random() * 1e9), {
      combatCount: stage.combatCount,
      sizeScale: stage.sizeScale,
      wavePlans,
    });

    this.builder = new DungeonBuilder(this.assets, this.physics, this.engine.scene);
    this.rooms = await this.builder.build(this.layout, stage.theme);
    this.engine.applyTheme(stage.theme);
    this.torches = new TorchLights(this.engine.scene, this.builder.torchPoints, stage.theme.torch);

    // Place the player in the start room.
    const start = this.rooms[0];
    this.player.actor.body.setTranslation({ x: start.centerX, y: 1.1, z: start.centerZ }, true);
    this.player.syncFromPhysics();
    this.engine.cameraTarget.set(start.centerX, 0, start.centerZ);

    this.director = new WaveDirector({
      rooms: this.rooms,
      builder: this.builder,
      assets: this.assets,
      scene: this.engine.scene,
      physics: this.physics,
      sfx: this.sfx,
      mods: enemyMods(this.difficulty, stage),
      events: {
        onWaveStart: () => {
          this.waveNumber++;
          this.hud.setWave(this.waveNumber);
          this.hud.announce(`WAVE ${this.waveNumber}`);
        },
        onRoomCleared: () => {
          this.hud.announce('房間肅清', '前往下一個房間 →');
          this.player.heal(this.player.stats.maxHp * 0.3);
          this.player.potions = Math.min(5, this.player.potions + 1);
        },
        onAllCleared: () => this.onStageCleared(),
      },
    });
    this.director.kills = this.totalKills; // carry the running total

    this.hud.setObjective(`${stage.name}：消滅所有敵人`);
    this.hud.setStageTag(index + 1, STAGES.length, stage.name);
    this.hud.announce(`第 ${index + 1} 關 · ${stage.name}`, stage.subtitle);
    this.sfx.gate();
  }

  onStageCleared() {
    this.totalKills = this.director.kills;
    if (this.stageIndex >= FINAL_STAGE_INDEX) {
      this.victory();
      return;
    }
    // Brief beat, then descend to the next biome.
    this.paused = true;
    this.hud.announce('關卡完成', '深入下一層…');
    setTimeout(async () => {
      await this.loadStage(this.stageIndex + 1);
      this.paused = false;
    }, 1800);
  }

  wirePlayerEvents() {
    const player = this.player;
    player.events.onSwing = (swing) => this.resolveArcHit(swing, 0xffc878);
    player.events.onSkill = (ctx) => this.resolveSkill(ctx);
    player.events.onLevelUp = () => this.levelUp();
    player.events.onDeath = () => this.defeat();
  }

  // Dispatch a skill's effect spec into concrete damage + VFX.
  resolveSkill({ skill, origin, facing, damageMult }) {
    const fx = skill.effect;
    const damage = (fx.damage ?? 0) * damageMult;
    switch (fx.type) {
      case 'nova':
        this.applyNova(origin, fx, damage);
        break;
      case 'arc':
        this.resolveArcHit(
          { origin, facing, range: fx.range, arc: fx.arc, damage, finisher: true, knock: fx.knockback },
          fx.color,
        );
        this.engine.addShake(fx.shake ?? 0.2);
        break;
      case 'projectile':
        this.fx.firePlayerBolt(origin, facing, fx);
        break;
      case 'buff':
        this.fx.ringBurst(origin, 2.4, fx.color);
        this.hud.announce('狂暴', '');
        break;
    }
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
        hit = true;
      }
    }
    if (hit) this.sfx.hit();
  }

  resolveArcHit(swing, color) {
    this.fx.slashArc(swing.origin, swing.facing, swing.range, swing.arc, color);
    const forward = new THREE.Vector2(Math.sin(swing.facing), Math.cos(swing.facing));
    let hitAny = false;
    for (const enemy of this.director.aliveEnemies) {
      const to = new THREE.Vector2(
        enemy.position.x - swing.origin.x,
        enemy.position.z - swing.origin.z,
      );
      const dist = to.length();
      if (dist > swing.range + enemy.def.radius) continue;
      const angle = Math.abs(forward.angleTo(to));
      if (dist > 0.8 && angle > swing.arc) continue;

      const crit = Math.random() < this.player.stats.critChance;
      const damage = swing.damage * (crit ? this.player.stats.critMult : 1);
      const knock = swing.knock ?? (swing.finisher ? 7 : 4);
      this.applyDamage(enemy, damage, swing.origin, knock, crit);
      hitAny = true;
    }
    if (hitAny) {
      this.sfx.hit();
      this.engine.addShake(swing.finisher ? 0.22 : 0.1);
    }
  }

  applyDamage(enemy, damage, fromPos, knockback, crit = false) {
    const dealt = enemy.takeDamage(damage, fromPos, knockback);
    if (dealt <= 0) return;
    this.hud.damageNumber(enemy.position, damage, crit ? 'crit' : '');
    this.fx.hitSpark(enemy.position);
    if (this.player.lifesteal > 0) {
      this.player.heal(damage * this.player.lifesteal);
    }
    if (enemy.dead) {
      this.director.notifyKill(enemy);
      const orbCount = Math.max(2, Math.round(enemy.def.xp / 8));
      for (let i = 0; i < orbCount; i++) {
        this.fx.spawnOrb(enemy.position, enemy.def.xp / orbCount);
      }
    }
  }

  levelUp() {
    this.sfx.levelUp();
    this.paused = true;
    this.hud.showUpgradeChoices(rollUpgradeChoices(3), (choice) => {
      choice.apply(this.player);
      this.paused = false;
    });
  }

  defeat() {
    if (this.over) return;
    this.over = true;
    setTimeout(() => {
      this.hud.showEnd('你死了', `第 ${this.stageIndex + 1} 關 · 擊殺 ${this.director.kills} · 等級 ${this.player.level}`);
    }, 1400);
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.hud.setObjective('已通關');
    setTimeout(() => {
      this.hud.showEnd('亡域制霸', `擊殺 ${this.director.kills} · 等級 ${this.player.level} · ${this.difficulty.name}難度`);
    }, 1600);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (!this.paused) this.tick(dt);
    this.input.endFrame();
    this.engine.render();
  }

  tick(dt) {
    const { player, director, fx } = this;

    player.update(dt, this.input);
    director.update(dt, player, (mage) => {
      this.fx.fireBolt(mage.position, player.position);
      this.sfx.swing();
    });
    this.physics.step();
    player.syncFromPhysics();
    for (const enemy of director.enemies) {
      if (!enemy.dead) enemy.syncFromPhysics();
    }

    fx.update(dt);
    fx.updateOrbs(dt, player.position, (xp) => {
      player.gainXp(xp);
      this.sfx.orb();
    });
    for (const hitPos of fx.updateBolts(dt, player.position)) {
      if (player.takeDamage(10)) this.hud.damageNumber(player.position, 10, 'player-hit');
    }
    // Player fireballs explode into an AoE on impact.
    fx.updatePlayerBolts(dt, director.aliveEnemies, (pos, effect) => {
      this.fx.ringBurst(pos, effect.radius, effect.color);
      this.fx.hitSpark(pos);
      this.engine.addShake(0.2);
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
    this.engine.followCamera(player.position, dt);
    this.hud.update(player, director);
    this.hud.drawMinimap(this.rooms, this.layout.corridors, player.position, this.assets.gridSize);
  }
}

new Game().init().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading-text');
  if (el) el.textContent = `載入失敗：${err.message}`;
});
