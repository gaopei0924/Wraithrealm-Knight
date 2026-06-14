import * as THREE from 'three';
import { Enemy } from './enemy.js';

// A boss reuses Enemy's body/status/damage plumbing but runs its own attack
// pattern: approach → telegraph → execute → recover, picking from def.attacks.
// It emits onAttack(spec, ctx) at the impact frame (main resolves damage + VFX),
// onTelegraph(spec, ctx) when a wind-up begins, and onSummonWave() for adds.
// Enrages below def.enrageAt (faster, harder-hitting).
export class Boss extends Enemy {
  constructor(def, charData, scene, physics, sfx, mods) {
    // Bosses scale HP/damage with stage+difficulty but ignore the speed mod.
    super(def.id, charData, scene, physics, sfx, { hp: mods.hp, damage: mods.damage, speed: 1 }, { def });
    this.isBoss = true;
    this.bossDef = def;
    this.attackTimer = 1.6;
    this.attackIndex = 0;
    this.enraged = false;
    this.activeSpec = null;
    this.onAttack = null;
    this.onTelegraph = null;
    this.onSummonWave = null;
    this.onEnrage = null;
    this.state = 'intro';
    this.stateTime = 0;
    this.char.play(this.char.has('Taunt') ? 'Taunt' : 'Cheer', { loop: false, timeScale: 1, force: true });
  }

  update(dt, playerPos, playerAlive, fireProjectile) {
    this.stateTime += dt;
    this.char.update(dt);
    this.updateStatus(performance.now());
    if (this.state === 'dead') return;
    this.fireProjectile = fireProjectile;

    if (this.knockback) {
      this.physics.moveActor(this.actor, this.knockback.x * dt * 0.3, this.knockback.z * dt * 0.3);
      this.knockback.t -= dt;
      if (this.knockback.t <= 0) this.knockback = null;
    }

    // Enrage transition.
    if (!this.enraged && this.hp / this.maxHp <= this.bossDef.enrageAt) {
      this.enraged = true;
      this.onEnrage?.(this);
    }

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position).setY(0);
    const dist = toPlayer.length();
    const yaw = Math.atan2(toPlayer.x, toPlayer.z);

    if (this.controlled && this.state !== 'intro') { this.char.play('Idle'); return; }

    switch (this.state) {
      case 'intro':
        if (this.stateTime > 1.2) this.enterState('idle');
        break;
      case 'idle': {
        this.char.faceToward(yaw, dt, 4);
        // Drift toward a preferred mid-range.
        if (dist > 5.5) {
          const dir = toPlayer.normalize();
          const sp = this.def.speed * (this.enraged ? 1.4 : 1);
          this.physics.moveActor(this.actor, dir.x * sp * dt, dir.z * sp * dt);
          this.char.play('Running_A', { timeScale: 1 });
        } else {
          this.char.play('Idle');
        }
        this.attackTimer -= dt * (this.enraged ? 1.5 : 1);
        if (this.attackTimer <= 0) this.chooseAttack(dist, yaw);
        break;
      }
      case 'tele':
        this.char.faceToward(yaw, dt, 3);
        if (this.stateTime >= this.activeSpec.telegraph) this.execAttack(yaw, playerPos);
        break;
      case 'exec':
        if (this.activeSpec?.type === 'charge') {
          this.physics.moveActor(this.actor, this.chargeDir.x * 16 * dt, this.chargeDir.z * 16 * dt);
          if (!this.chargeHit && playerAlive && dist < this.def.radius + 1.4) {
            this.chargeHit = true;
            this.onHitPlayer?.(this.activeSpec.damage);
          }
        }
        if (this.stateTime > 0.5) this.enterState('recover');
        break;
      case 'recover':
        this.char.play('Idle');
        if (this.stateTime > (this.enraged ? 0.4 : 0.8)) this.enterState('idle');
        break;
    }
  }

  chooseAttack(dist, yaw) {
    const attacks = this.bossDef.attacks;
    // Prefer cleave/charge when close, ranged options when far; else random.
    let spec;
    if (dist < 5) spec = attacks.find((a) => a.type === 'cleave') ?? attacks[this.attackIndex % attacks.length];
    else spec = attacks[this.attackIndex % attacks.length];
    this.attackIndex++;
    this.activeSpec = spec;
    this.enterState('tele');
    this.faceYaw = yaw;
    this.char.snapFacing(yaw);
    const anim = this.telegraphAnim(spec.type);
    this.char.play(anim, { loop: false, timeScale: 1, force: true });
    this.onTelegraph?.(spec, { origin: this.position.clone(), facing: yaw, radius: spec.range, color: this.bossDef.color });
  }

  telegraphAnim(type) {
    if (type === 'volley' || type === 'nova') return this.char.has('Spellcast_Raise') ? 'Spellcast_Raise' : 'Idle';
    if (type === 'summon') return this.char.has('Spellcast_Long') ? 'Spellcast_Long' : 'Cheer';
    return this.char.has('2H_Melee_Attack_Chop') ? '2H_Melee_Attack_Chop' : 'Idle';
  }

  execAttack(yaw, playerPos) {
    const spec = this.activeSpec;
    this.enterState('exec');
    if (spec.type === 'summon') { this.onSummonWave?.(); return; }
    if (spec.type === 'charge') {
      this.chargeDir = { x: Math.sin(yaw), z: Math.cos(yaw) };
      this.chargeHit = false;
      this.char.snapFacing(yaw);
      this.char.play('Running_A', { timeScale: 1.6, force: true });
    }
    if (spec.type === 'volley') {
      const base = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
      const n = spec.count ?? 6;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.18;
        const a = base + spread;
        const target = this.position.clone().add(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(12));
        this.fireProjectile?.({
          position: this.position, def: { damage: spec.damage, projectile: { speed: 11, color: this.bossDef.color }, onHitStatus: this.statusSpec(spec) },
          _target: target,
        });
      }
    }
    this.onAttack?.(spec, { origin: this.position.clone(), facing: yaw, color: this.bossDef.color, status: this.statusSpec(spec) });
  }

  statusSpec(spec) {
    if (!spec.status) return null;
    if (spec.status === 'chill') return { type: 'chill', factor: 0.45, duration: 2.2 };
    if (spec.status === 'poison') return { type: 'poison', dps: 10, duration: 4 };
    return null; // burn/shock handled as plain extra damage on the player
  }

  // Bosses have super armor: damage never interrupts their attack pattern
  // (no 'hurt' state — the base Enemy.takeDamage would freeze the boss AI,
  // which has no 'hurt' case) and they are barely knocked back.
  takeDamage(amount, fromPos, knockbackForce = 4) {
    if (this.state === 'dead') return 0;
    const dealt = amount * this.damageTakenMult;
    this.hp -= dealt;
    this.char.flash();
    if (this.hp <= 0) { this.die(); return dealt; }
    return dealt;
  }

  die() {
    super.die();
    this.onDefeated?.(this);
  }
}
