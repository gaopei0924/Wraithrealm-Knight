import * as THREE from 'three';
import { Character } from './character.js';

const MAX_SLOTS = 6;
const FOLLOW_RADIUS = 2.7;
const AGGRO_RANGE = 12;

// A summoned ally that follows the player and auto-attacks the nearest enemy.
// Pure-kinematic (no physics body) — floats/walks toward its target and lerps
// back to an orbit slot around the player when idle.
export class Companion {
  constructor(def, charData, scene, slotIndex = 0, level = 1) {
    this.def = def;
    this.level = level;
    this.slot = slotIndex;
    this.char = new Character(charData, scene, def.scale ?? 1, def.aliases ?? null);
    if (def.color) this.char.setTint(def.color, 0.35);
    this.char.setAura(def.color ?? 0x88aaff, 0.25); // ghostly glow so allies read as friendly
    this.cooldown = 0;
    this.animLock = 0;
    this._pos = new THREE.Vector3();
    this.alive = true;
    this.char.play('Idle');
  }

  get position() { return this.char.position; }

  setPosition(x, z) { this.char.setPosition(x, z); }

  // damage scales with the companion's level + the player's companionPower stat.
  damageOf(power = 1) {
    return this.def.damage * (1 + 0.3 * (this.level - 1)) * power;
  }

  // ctx: { enemies, dealDamage(enemy, dmg, from, knock), fx, onHeal(amount), power }
  update(dt, playerPos, ctx) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.animLock = Math.max(0, this.animLock - dt);
    const pos = this.position;

    // pick nearest living enemy in range
    let target = null, bestSq = AGGRO_RANGE * AGGRO_RANGE;
    for (const e of ctx.enemies) {
      if (e.type === 'goblin') continue;
      const dsq = e.position.distanceToSquared(pos);
      if (dsq < bestSq) { bestSq = dsq; target = e; }
    }

    const speed = (this.def.moveSpeed ?? 7) * dt;
    let moving = false;

    if (target) {
      const dist = Math.sqrt(bestSq);
      const range = this.def.range ?? 2;
      if (dist > range) {
        this._stepToward(target.position.x, target.position.z, speed);
        moving = true;
      } else if (this.cooldown <= 0) {
        this._attack(target, ctx);
      }
      this.char.faceToward(Math.atan2(target.position.x - pos.x, target.position.z - pos.z), dt, 18);
    } else {
      // return to an orbit slot around the player
      const ang = (this.slot / MAX_SLOTS) * Math.PI * 2;
      const fx = playerPos.x + Math.cos(ang) * FOLLOW_RADIUS;
      const fz = playerPos.z + Math.sin(ang) * FOLLOW_RADIUS;
      if ((fx - pos.x) ** 2 + (fz - pos.z) ** 2 > 0.25) {
        this._stepToward(fx, fz, speed);
        moving = true;
        this.char.faceToward(Math.atan2(fx - pos.x, fz - pos.z), dt, 18);
      }
    }

    if (this.animLock <= 0) this.char.play(moving ? 'Running_A' : 'Idle', { timeScale: 1.1 });
    this.char.update(dt);
  }

  _stepToward(x, z, step) {
    const pos = this.position;
    const dx = x - pos.x, dz = z - pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const s = Math.min(step, len);
    this.char.setPosition(pos.x + (dx / len) * s, pos.z + (dz / len) * s);
  }

  _attack(target, ctx) {
    this.cooldown = this.def.cooldown ?? 1;
    this.animLock = 0.45;
    this.char.play(this.def.attackAnim ?? 'Idle', { loop: false, timeScale: 1.4, force: true });
    const dmg = this.damageOf(ctx.power ?? 1);
    const from = this.position.clone();
    if (this.def.attack === 'ranged') {
      ctx.fx?.chainLightning?.([from.clone().setY(1.1), target.position.clone().setY(1.1)], this.def.boltColor ?? this.def.color);
    }
    ctx.dealDamage(target, dmg, from, this.def.attack === 'ranged' ? 2 : 5);
    if (this.def.slow) target.applySlow?.(this.def.slow.factor, this.def.slow.duration);
    if (this.def.healPlayer && ctx.onHeal) ctx.onHeal(dmg * this.def.healPlayer);
  }

  dispose(scene) { this.char.dispose(scene); this.alive = false; }
}
