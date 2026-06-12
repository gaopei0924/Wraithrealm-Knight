import * as THREE from 'three';
import { Character } from './character.js';

export const ENEMY_TYPES = {
  minion: {
    model: 'Skeleton_Minion', hp: 30, damage: 7, speed: 3.6, attackRange: 1.9,
    windup: 0.5, attackAnim: '1H_Melee_Attack_Slice_Diagonal', xp: 15, scale: 1.0, radius: 0.5,
  },
  rogue: {
    model: 'Skeleton_Rogue', hp: 22, damage: 5, speed: 5.2, attackRange: 1.8,
    windup: 0.35, attackAnim: 'Dualwield_Melee_Attack_Stab', xp: 17, scale: 0.95, radius: 0.45,
  },
  warrior: {
    model: 'Skeleton_Warrior', hp: 55, damage: 12, speed: 2.9, attackRange: 2.2,
    windup: 0.7, attackAnim: '2H_Melee_Attack_Chop', xp: 28, scale: 1.12, radius: 0.6,
  },
  mage: {
    model: 'Skeleton_Mage', hp: 24, damage: 8, speed: 2.6, attackRange: 8.5,
    windup: 0.9, attackAnim: 'Spellcast_Shoot', xp: 24, scale: 1.0, radius: 0.5, ranged: true,
  },
};

let nextId = 1;

export class Enemy {
  constructor(type, charData, scene, physics, sfx, mods = { hp: 1, damage: 1, speed: 1 }) {
    this.id = nextId++;
    this.type = type;
    const base = ENEMY_TYPES[type];
    // Per-instance scaled def (never mutate the shared ENEMY_TYPES entry).
    this.def = {
      ...base,
      hp: Math.round(base.hp * mods.hp),
      damage: +(base.damage * mods.damage).toFixed(1),
      speed: base.speed * mods.speed,
    };
    this.char = new Character(charData, scene, this.def.scale);
    this.physics = physics;
    this.sfx = sfx;
    this.actor = physics.addActor(0, 0, this.def.radius, 0.55);

    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.state = 'spawn';
    this.stateTime = 0;
    this.attackHitDone = false;
    this.knockback = null;
    this.dead = false;
    this.removeAt = Infinity;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.dot = null; // { dps, until, last } damage-over-time, applied by main

    const spawnAnim = this.char.has('Spawn_Ground_Skeletons') ? 'Spawn_Ground_Skeletons' : 'Spawn_Ground';
    this.spawnDuration = Math.min(1.2, this.char.clipDuration(spawnAnim) / 1.4);
    this.char.play(spawnAnim, { loop: false, timeScale: 1.4, force: true });
  }

  setPosition(x, z) {
    this.actor.body.setTranslation({ x, y: 1.05, z }, true);
    this.char.setPosition(x, z);
  }

  get position() {
    return this.char.position;
  }

  syncFromPhysics() {
    const pos = this.actor.body.translation();
    this.char.setPosition(pos.x, pos.z);
  }

  update(dt, playerPos, playerAlive, fireProjectile) {
    this.stateTime += dt;
    this.char.update(dt);
    if (this.state === 'dead') return;

    if (this.knockback) {
      this.physics.moveActor(this.actor, this.knockback.x * dt, this.knockback.z * dt);
      this.knockback.x *= 1 - 8 * dt;
      this.knockback.z *= 1 - 8 * dt;
      this.knockback.t -= dt;
      if (this.knockback.t <= 0) this.knockback = null;
    }

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const yaw = Math.atan2(toPlayer.x, toPlayer.z);

    switch (this.state) {
      case 'spawn':
        if (this.stateTime >= this.spawnDuration) this.enterState('chase');
        break;
      case 'chase':
        this.updateChase(dt, dist, yaw, toPlayer, playerAlive);
        break;
      case 'windup':
        this.char.faceToward(yaw, dt, 5);
        if (this.stateTime >= this.def.windup) this.startStrike();
        break;
      case 'strike':
        this.updateStrike(dt, dist, yaw, playerAlive, fireProjectile);
        break;
      case 'recover':
        if (this.stateTime > 0.5) this.enterState('chase');
        break;
      case 'hurt':
        if (this.stateTime > 0.28) this.enterState('chase');
        break;
    }
  }

  enterState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  get effectiveSpeed() {
    return performance.now() < this.slowUntil ? this.def.speed * this.slowFactor : this.def.speed;
  }

  applySlow(factor, duration) {
    this.slowFactor = factor;
    this.slowUntil = performance.now() + duration * 1000;
  }

  applyDot(dps, duration) {
    const now = performance.now();
    this.dot = { dps, until: now + duration * 1000, last: now };
  }

  updateChase(dt, dist, yaw, toPlayer, playerAlive) {
    if (!playerAlive) {
      this.char.play('Idle');
      return;
    }
    const inRange = this.def.ranged ? dist < this.def.attackRange && dist > 3 : dist < this.def.attackRange;
    if (inRange) {
      this.enterState('windup');
      // jitter so packs don't strike in perfect sync
      this.stateTime = -Math.random() * 0.4;
      this.char.play(this.def.attackAnim, { fade: 0.08, loop: false, timeScale: 0.55, force: true });
      return;
    }
    const dir = toPlayer.normalize();
    const speed = this.effectiveSpeed;
    this.physics.moveActor(this.actor, dir.x * speed * dt, dir.z * speed * dt);
    this.char.faceToward(yaw, dt, 8);
    const run = this.char.has('Walking_D_Skeletons') && this.def.speed < 4 ? 'Walking_D_Skeletons' : 'Running_A';
    this.char.play(run, { timeScale: Math.max(0.4, speed / 3.5) });
  }

  startStrike() {
    this.enterState('strike');
    this.attackHitDone = false;
    const dur = this.char.clipDuration(this.def.attackAnim);
    this.strikeDuration = dur * 0.5; // second half of clip, sped up
    this.char.play(this.def.attackAnim, { fade: 0.05, loop: false, timeScale: 2.0, force: true });
  }

  updateStrike(dt, dist, yaw, playerAlive, fireProjectile) {
    const progress = this.stateTime / this.strikeDuration;
    if (!this.attackHitDone && progress >= 0.5) {
      this.attackHitDone = true;
      if (this.def.ranged) {
        fireProjectile?.(this);
      } else if (playerAlive && dist < this.def.attackRange + 0.6) {
        this.onHitPlayer?.(this.def.damage);
      }
    }
    if (progress >= 1) this.enterState('recover');
  }

  takeDamage(amount, fromPos, knockbackForce = 4) {
    if (this.state === 'dead') return 0;
    this.hp -= amount;
    this.char.flash();
    const dir = new THREE.Vector3().subVectors(this.position, fromPos).setY(0).normalize();
    this.knockback = { x: dir.x * knockbackForce, z: dir.z * knockbackForce, t: 0.25 };
    if (this.hp <= 0) {
      this.die();
      return amount;
    }
    if (this.state !== 'windup' && this.state !== 'strike') {
      this.enterState('hurt');
      this.char.play('Hit_A', { fade: 0.05, loop: false, timeScale: 1.4, force: true });
    }
    return amount;
  }

  die() {
    this.enterState('dead');
    this.dead = true;
    this.removeAt = performance.now() + 2600;
    const anim = this.char.has('Death_C_Skeletons') ? 'Death_C_Skeletons' : 'Death_A';
    this.char.play(anim, { fade: 0.08, loop: false, force: true });
    this.physics.removeBody(this.actor.body);
    this.sfx.kill();
  }

  dispose(scene) {
    this.char.dispose(scene);
  }
}
