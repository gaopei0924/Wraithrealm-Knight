import * as THREE from 'three';
import { Character } from './character.js';
import { STATUS } from '../combat/status.js';

// Monster roster. Variety comes from 8 base rigs (KayKit skeletons + adventurers,
// shared animation set) combined with tint, scale, and a `behavior`:
//   melee    — walk up and swing
//   ranged   — keep distance, fire a bolt (projectile spec)
//   charger  — telegraph then dash through the player
//   summoner — periodically spawn lesser minions
//   healer   — periodically pulse-heal nearby allies
// onHitStatus applies a status to the PLAYER on a successful hit.
// explodeOnDeath bursts an AoE when killed.
export const ENEMY_TYPES = {
  minion: {
    model: 'Skeleton_Minion', behavior: 'melee', hp: 30, damage: 7, speed: 3.6, attackRange: 1.9,
    windup: 0.5, attackAnim: '1H_Melee_Attack_Slice_Diagonal', xp: 15, scale: 1.0, radius: 0.5,
    name: '骷髏兵',
  },
  rogue: {
    model: 'Skeleton_Rogue', behavior: 'melee', hp: 22, damage: 5, speed: 5.2, attackRange: 1.8,
    windup: 0.35, attackAnim: 'Dualwield_Melee_Attack_Stab', xp: 17, scale: 0.95, radius: 0.45,
    name: '骷髏盜賊',
  },
  warrior: {
    model: 'Skeleton_Warrior', behavior: 'melee', hp: 55, damage: 12, speed: 2.9, attackRange: 2.2,
    windup: 0.7, attackAnim: '2H_Melee_Attack_Chop', xp: 28, scale: 1.12, radius: 0.6,
    name: '骷髏戰士',
  },
  mage: {
    model: 'Skeleton_Mage', behavior: 'ranged', hp: 24, damage: 8, speed: 2.6, attackRange: 8.5,
    windup: 0.9, attackAnim: 'Spellcast_Shoot', xp: 24, scale: 1.0, radius: 0.5,
    projectile: { speed: 9, color: 0x8844ff }, name: '骷髏法師',
  },
  archer: {
    model: 'Rogue', behavior: 'ranged', hp: 26, damage: 9, speed: 3.4, attackRange: 10,
    windup: 0.6, attackAnim: '1H_Ranged_Shoot', xp: 26, scale: 0.95, radius: 0.45,
    tint: 0x3c6e3c, projectile: { speed: 14, color: 0xbfe08a }, name: '黑森弓手',
  },
  brute: {
    model: 'Barbarian', behavior: 'charger', hp: 90, damage: 16, speed: 2.6, attackRange: 2.4,
    windup: 0.8, attackAnim: '2H_Melee_Attack_Chop', xp: 42, scale: 1.35, radius: 0.75,
    tint: 0x9a3322, chargeSpeed: 15, name: '蠻血巨漢',
  },
  cultist: {
    model: 'Rogue_Hooded', behavior: 'summoner', hp: 40, damage: 8, speed: 2.8, attackRange: 2.0,
    windup: 0.6, attackAnim: 'Dualwield_Melee_Attack_Slice', xp: 38, scale: 1.05, radius: 0.5,
    tint: 0x5a2c8a, summonEvery: 6, summonType: 'minion', summonCount: 2, name: '亡靈祭司',
  },
  frostmage: {
    model: 'Mage', behavior: 'ranged', hp: 30, damage: 9, speed: 2.5, attackRange: 9,
    windup: 1.0, attackAnim: 'Spellcast_Shoot', xp: 32, scale: 1.0, radius: 0.5,
    tint: 0x4a8ad0, projectile: { speed: 8, color: 0x8fd0ff },
    onHitStatus: { type: 'chill', duration: 2.2, factor: 0.45 }, name: '寒霜術士',
  },
  venom: {
    model: 'Skeleton_Rogue', behavior: 'melee', hp: 28, damage: 6, speed: 5.0, attackRange: 1.8,
    windup: 0.35, attackAnim: 'Dualwield_Melee_Attack_Stab', xp: 26, scale: 0.98, radius: 0.45,
    tint: 0x4e8a2e, onHitStatus: { type: 'poison', duration: 4, dps: 8 }, name: '劇毒刺客',
  },
  shaman: {
    model: 'Mage', behavior: 'healer', hp: 36, damage: 6, speed: 2.4, attackRange: 8,
    windup: 1.0, attackAnim: 'Spellcast_Shoot', xp: 36, scale: 1.0, radius: 0.5,
    tint: 0x2ea98a, projectile: { speed: 8, color: 0x66ddbb },
    healEvery: 5, healAmount: 0.25, healRange: 9, name: '枯骨薩滿',
  },
  revenant: {
    model: 'Skeleton_Warrior', behavior: 'melee', hp: 60, damage: 12, speed: 3.0, attackRange: 2.1,
    windup: 0.6, attackAnim: '2H_Melee_Attack_Chop', xp: 40, scale: 1.12, radius: 0.6,
    tint: 0xd0641e, explodeOnDeath: { radius: 3.6, damage: 24, color: 0xff7a1e }, name: '亡爆復生者',
  },
  wraith: {
    model: 'Rogue_Hooded', behavior: 'teleporter', hp: 34, damage: 11, speed: 6.0, attackRange: 1.9,
    windup: 0.3, attackAnim: 'Dualwield_Melee_Attack_Stab', xp: 38, scale: 1.0, radius: 0.45,
    tint: 0x7fa8c8, opacity: 0.55, blinkEvery: 4, name: '虛影遊魂',
  },
};

export const MONSTER_KEYS = Object.keys(ENEMY_TYPES);
let nextId = 1;

export class Enemy {
  constructor(type, charData, scene, physics, sfx, mods = { hp: 1, damage: 1, speed: 1 }, opts = {}) {
    this.id = nextId++;
    this.type = type;
    this.elite = opts.elite ?? false;
    const base = ENEMY_TYPES[type] ?? opts.def;
    const eliteMul = this.elite ? { hp: 2.4, dmg: 1.5, xp: 3, scale: 1.25 } : { hp: 1, dmg: 1, xp: 1, scale: 1 };
    this.def = {
      ...base,
      hp: Math.round(base.hp * mods.hp * eliteMul.hp),
      damage: +(base.damage * mods.damage * eliteMul.dmg).toFixed(1),
      speed: base.speed * mods.speed,
      xp: Math.round(base.xp * eliteMul.xp),
      scale: base.scale * eliteMul.scale,
    };
    this.char = new Character(charData, scene, this.def.scale);
    if (base.tint) this.char.setTint(base.tint, 0.6);
    if (this.elite) this.char.setTint(0xffd24a, 0.35);
    if (base.opacity) {
      this.char.model.traverse((o) => {
        if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = base.opacity; }
      });
    }
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
    this.status = {}; // type → { until, ...data }
    this.specialTimer = (base.summonEvery || base.healEvery || base.blinkEvery || 3) * (0.5 + Math.random() * 0.5);

    // Callbacks wired by the spawner/main.
    this.onHitPlayer = null;
    this.onSummon = null;
    this.onHealAllies = null;
    this.onExplode = null;

    const spawnAnim = this.char.has('Spawn_Ground_Skeletons') ? 'Spawn_Ground_Skeletons'
      : this.char.has('Spawn_Ground') ? 'Spawn_Ground' : null;
    if (spawnAnim) {
      this.spawnDuration = Math.min(1.2, this.char.clipDuration(spawnAnim) / 1.4);
      this.char.play(spawnAnim, { loop: false, timeScale: 1.4, force: true });
    } else {
      this.spawnDuration = 0.35;
      this.char.play('Idle');
    }
  }

  setPosition(x, z) {
    this.actor.body.setTranslation({ x, y: 1.05, z }, true);
    this.char.setPosition(x, z);
  }

  get position() { return this.char.position; }

  syncFromPhysics() {
    const pos = this.actor.body.translation();
    this.char.setPosition(pos.x, pos.z);
  }

  // --- status effects ---
  applyStatus(type, durationSec, data = {}) {
    const now = performance.now();
    this.status[type] = { until: now + durationSec * 1000, last: now, ...data };
  }

  // Back-compat helpers used by skills.
  applySlow(factor, duration) { this.applyStatus('chill', duration, { factor }); }
  applyDot(dps, duration) { this.applyStatus('poison', duration, { dps }); }
  applyBurn(dps, duration) { this.applyStatus('burn', duration, { dps }); }

  hasStatus(type) { return this.status[type] && performance.now() < this.status[type].until; }
  get controlled() { return this.hasStatus('freeze') || this.hasStatus('stun'); }
  get damageTakenMult() { return this.hasStatus('shock') ? STATUS.shock.vulnerable : 1; }

  get effectiveSpeed() {
    let s = this.def.speed;
    if (this.hasStatus('chill')) s *= this.status.chill.factor ?? 0.5;
    return s;
  }

  updateStatus(now) {
    // expire
    for (const k of Object.keys(this.status)) {
      if (now >= this.status[k].until) delete this.status[k];
    }
    // aura: strongest active status tints the body
    const order = ['freeze', 'stun', 'shock', 'burn', 'poison', 'chill'];
    const active = order.find((k) => this.status[k]);
    if (active) {
      const flick = 0.4 + 0.25 * Math.sin(now * 0.012);
      this.char.setAura(STATUS[active].color, STATUS[active].aura * flick);
    }
  }

  update(dt, playerPos, playerAlive, fireProjectile) {
    this.stateTime += dt;
    this.char.update(dt);
    const now = performance.now();
    this.updateStatus(now);
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

    // Hard CC: hold in place (but still animate + take DoTs).
    if (this.controlled && this.state !== 'spawn') {
      this.char.play('Hit_A', { fade: 0.1 });
      return;
    }

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
      case 'charge':
        this.updateCharge(dt, dist, playerAlive);
        break;
      case 'cast':
        if (this.stateTime >= 0.8) { this.fireSpecial(); this.enterState('recover'); }
        break;
      case 'recover':
        if (this.stateTime > 0.5) this.enterState('chase');
        break;
      case 'hurt':
        if (this.stateTime > 0.28) this.enterState('chase');
        break;
    }
  }

  enterState(state) { this.state = state; this.stateTime = 0; }

  updateChase(dt, dist, yaw, toPlayer, playerAlive) {
    if (!playerAlive) { this.char.play('Idle'); return; }
    const b = this.def.behavior;

    // periodic specials
    this.specialTimer -= dt;
    if (this.specialTimer <= 0) {
      if (b === 'summoner') { this.specialTimer = this.def.summonEvery; this.beginCast(); return; }
      if (b === 'healer') { this.specialTimer = this.def.healEvery; this.beginCast(); return; }
      if (b === 'teleporter' && dist > 4) { this.specialTimer = this.def.blinkEvery; this.blink(toPlayer); }
      else this.specialTimer = 2;
    }

    // charger: dash when in mid-range
    if (b === 'charger' && dist < 9 && dist > 2.6) {
      this.beginCharge(yaw);
      return;
    }

    const ranged = b === 'ranged' || b === 'healer';
    const inRange = ranged ? dist < this.def.attackRange && dist > 3 : dist < this.def.attackRange;
    if (inRange) {
      this.enterState('windup');
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

  beginCast() {
    this.enterState('cast');
    this.char.play('Spellcast_Raise', { fade: 0.1, loop: false, timeScale: 1.2, force: true });
  }

  fireSpecial() {
    if (this.def.behavior === 'summoner') this.onSummon?.(this);
    else if (this.def.behavior === 'healer') this.onHealAllies?.(this);
  }

  blink(toPlayer) {
    const dir = toPlayer.clone().normalize();
    const target = this.position.clone().add(dir.multiplyScalar(Math.min(5, toPlayer.length() - 2)));
    this.actor.body.setTranslation({ x: target.x, y: 1.05, z: target.z }, true);
    this.char.setPosition(target.x, target.z);
    this.onBlink?.(this.position.clone());
  }

  beginCharge(yaw) {
    this.enterState('charge');
    this.char.snapFacing(yaw);
    this.chargeDir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    this.chargeHit = false;
    this.char.play('Running_A', { timeScale: 1.6, force: true });
  }

  updateCharge(dt, dist, playerAlive) {
    const v = this.def.chargeSpeed ?? 14;
    this.physics.moveActor(this.actor, this.chargeDir.x * v * dt, this.chargeDir.z * v * dt);
    if (!this.chargeHit && playerAlive && dist < this.def.attackRange + 0.4) {
      this.chargeHit = true;
      this.dealHit();
    }
    if (this.stateTime > 0.55) this.enterState('recover');
  }

  startStrike() {
    this.enterState('strike');
    this.attackHitDone = false;
    const dur = this.char.clipDuration(this.def.attackAnim);
    this.strikeDuration = dur * 0.5;
    this.char.play(this.def.attackAnim, { fade: 0.05, loop: false, timeScale: 2.0, force: true });
  }

  updateStrike(dt, dist, yaw, playerAlive, fireProjectile) {
    const progress = this.stateTime / this.strikeDuration;
    if (!this.attackHitDone && progress >= 0.5) {
      this.attackHitDone = true;
      const ranged = this.def.behavior === 'ranged' || this.def.behavior === 'healer';
      if (ranged) {
        fireProjectile?.(this);
      } else if (playerAlive && dist < this.def.attackRange + 0.6) {
        this.dealHit();
      }
    }
    if (progress >= 1) this.enterState('recover');
  }

  // Melee/charge contact: damage + optional status on the player.
  dealHit() {
    this.onHitPlayer?.(this.def.damage, this.def.onHitStatus);
  }

  takeDamage(amount, fromPos, knockbackForce = 4) {
    if (this.state === 'dead') return 0;
    const dealt = amount * this.damageTakenMult;
    this.hp -= dealt;
    this.char.flash();
    const dir = new THREE.Vector3().subVectors(this.position, fromPos).setY(0).normalize();
    const kb = this.def.behavior === 'charger' && this.state === 'charge' ? knockbackForce * 0.3 : knockbackForce;
    this.knockback = { x: dir.x * kb, z: dir.z * kb, t: 0.25 };
    if (this.hp <= 0) { this.die(); return dealt; }
    if (this.state !== 'windup' && this.state !== 'strike' && this.state !== 'charge' && this.state !== 'cast') {
      this.enterState('hurt');
      this.char.play('Hit_A', { fade: 0.05, loop: false, timeScale: 1.4, force: true });
    }
    return dealt;
  }

  die() {
    this.enterState('dead');
    this.dead = true;
    this.removeAt = performance.now() + 2400;
    const anim = this.char.has('Death_C_Skeletons') ? 'Death_C_Skeletons' : 'Death_A';
    this.char.play(anim, { fade: 0.08, loop: false, force: true });
    this.physics.removeBody(this.actor.body);
    this.sfx.kill();
    if (this.def.explodeOnDeath) this.onExplode?.(this, this.def.explodeOnDeath);
  }

  dispose(scene) { this.char.dispose(scene); }
}
