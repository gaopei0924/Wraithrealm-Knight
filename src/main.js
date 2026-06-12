import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Assets } from './core/assets.js';
import { Input } from './core/input.js';
import { Physics } from './core/physics.js';
import { Sfx } from './core/audio.js';
import { generateLayout } from './dungeon/layout.js';
import { DungeonBuilder } from './dungeon/builder.js';
import { TorchLights } from './fx/lights.js';
import { Effects } from './fx/effects.js';
import { Player } from './entities/player.js';
import { WaveDirector } from './entities/spawner.js';
import { rollUpgradeChoices } from './combat/upgrades.js';
import { Hud } from './ui/hud.js';
import { TouchControls } from './core/touch.js';
import {
  isTouchDevice,
  suppressBrowserGestures,
  enterFullscreen,
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

    // Mobile ergonomics: tag the body, suppress page gestures, watch rotation.
    if (isTouchDevice()) {
      document.body.classList.add('touch');
      suppressBrowserGestures();
      watchOrientation(document.getElementById('rotate-prompt'));
    }
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else enterFullscreen();
    });

    this.hud.setLoading(0.05, '召喚物理之力…');
    this.physics = await Physics.create();

    this.hud.setLoading(0.15, '丈量石磚…');
    await this.assets.loadTileManifest();

    this.hud.setLoading(0.2, '搬運石材…');
    const layout = generateLayout(Math.floor(Math.random() * 1e9));
    this.layout = layout;
    this.builder = new DungeonBuilder(this.assets, this.physics, this.engine.scene);
    this.rooms = await this.builder.build(layout);

    this.hud.setLoading(0.55, '點燃火把…');
    this.torches = new TorchLights(this.engine.scene, this.builder.torchPoints);
    this.fx = new Effects(this.engine.scene);

    this.hud.setLoading(0.65, '喚醒騎士…');
    const knight = await this.assets.character('Knight');
    this.player = new Player(knight, this.engine.scene, this.physics, this.sfx);
    const start = this.rooms[0];
    this.player.actor.body.setTranslation({ x: start.centerX, y: 1.1, z: start.centerZ }, true);
    this.player.syncFromPhysics();
    this.engine.cameraTarget.set(start.centerX, 0, start.centerZ);
    this.wirePlayerEvents();

    this.hud.setLoading(0.8, '亡者甦醒中…');
    this.director = new WaveDirector({
      rooms: this.rooms,
      builder: this.builder,
      assets: this.assets,
      scene: this.engine.scene,
      physics: this.physics,
      sfx: this.sfx,
      events: {
        onWaveStart: (n) => {
          this.hud.setWave(n);
          this.hud.announce(`WAVE ${n}`);
        },
        onRoomCleared: () => {
          this.hud.announce('房間肅清', '前往下一個房間 →');
          this.player.heal(this.player.stats.maxHp * 0.3);
          this.player.potions = Math.min(5, this.player.potions + 1);
        },
        onAllCleared: () => this.victory(),
      },
    });
    await this.director.preloadCharacters();

    this.hud.setLoading(1, '完成');
    await this.hud.paintPortrait(this.engine.renderer, this.engine.scene, this.player.char.model);

    this.clock = new THREE.Clock();
    window.__game = this; // debug/testing handle

    // Gate the first frame behind a tap so audio can play and (on mobile)
    // fullscreen + landscape lock fire from a user gesture.
    const gate = document.getElementById('start-gate');
    document.getElementById('loading-text').textContent = '準備就緒';
    gate.classList.remove('hidden');
    gate.addEventListener('click', () => this.start(), { once: true });
  }

  async start() {
    if (this.started) return;
    this.started = true;
    this.sfx.ensure();
    if (this.sfx.ctx?.state === 'suspended') this.sfx.ctx.resume();
    if (isTouchDevice()) {
      await enterFullscreen();
      await lockLandscape();
    }
    this.hud.hideLoading();
    this.hud.show();
    this.hud.setWave(1);
    this.hud.announce('亡域騎士', '消滅所有敵人');
    this.engine.renderer.setAnimationLoop(() => this.frame());
  }

  wirePlayerEvents() {
    const player = this.player;

    player.events.onSwing = (swing) => this.resolveArcHit(swing, 0xffc878);
    player.events.onSlam = (swing) => {
      this.resolveArcHit(swing, 0x88bbff);
      this.engine.addShake(0.3);
    };
    player.events.onWhirlwind = ({ origin, range, damage }) => {
      this.fx.ringBurst(origin, range);
      this.engine.addShake(0.25);
      for (const enemy of this.director.aliveEnemies) {
        if (enemy.position.distanceTo(origin) <= range) {
          this.applyDamage(enemy, damage, origin, 8);
        }
      }
    };
    player.events.onLevelUp = () => this.levelUp();
    player.events.onDeath = () => this.defeat();
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
      this.applyDamage(enemy, damage, swing.origin, swing.finisher ? 7 : 4, crit);
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
    if (this.player.stats.lifesteal > 0) {
      this.player.heal(damage * this.player.stats.lifesteal);
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
      this.hud.showEnd('你死了', `擊殺 ${this.director.kills} · 等級 ${this.player.level}`);
    }, 1400);
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.hud.setObjective('已完成');
    setTimeout(() => {
      this.hud.showEnd('地城制霸', `擊殺 ${this.director.kills} · 等級 ${this.player.level} — 寶箱是你的了`);
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
      if (player.takeDamage(10)) {
        this.hud.damageNumber(player.position, 10, 'player-hit');
      }
    }

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
