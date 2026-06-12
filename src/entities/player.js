import * as THREE from 'three';
import { Character } from './character.js';
import { SKILLS, DEFAULT_LOADOUT } from '../combat/skills.js';

const HIDDEN_MESHES = ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', '2H_Sword'];

const COMBO = [
  { anim: '1H_Melee_Attack_Chop', damage: 18, range: 3.0, arc: 1.2, hitAt: 0.38, speed: 1.65 },
  { anim: '1H_Melee_Attack_Slice_Diagonal', damage: 20, range: 3.0, arc: 1.3, hitAt: 0.36, speed: 1.65 },
  { anim: '1H_Melee_Attack_Slice_Horizontal', damage: 34, range: 3.4, arc: 1.7, hitAt: 0.4, speed: 1.45 },
];

const ROLL_TIME = 0.42;
const ROLL_SPEED = 14;
const IFRAME_START = 0.02;
const IFRAME_END = 0.34;

export class Player {
  constructor(charData, scene, physics, sfx) {
    this.char = new Character(charData, scene, 1.0);
    this.char.model.traverse((o) => {
      if (HIDDEN_MESHES.includes(o.name)) o.visible = false;
    });
    this.physics = physics;
    this.sfx = sfx;
    this.actor = physics.addActor(0, 0, 0.55, 0.55);

    this.stats = {
      maxHp: 100, maxMp: 100,
      damageMult: 1, moveSpeed: 7.2,
      rollCooldown: 1.0, mpRegen: 7,
      lifesteal: 0, critChance: 0.06, critMult: 1.8,
      xpMult: 1, comboFinisherBonus: 1,
    };
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
    this.potions = 3;

    this.state = 'idle';
    this.stateTime = 0;
    this.comboStage = 0;
    this.comboHitDone = false;
    this.rollCooldownLeft = 0;
    this.invincible = false; // roll i-frames
    this.hitInvulnLeft = 0; // post-hit grace so enemies can't stun-lock
    this.rollDir = { x: 0, z: 1 };
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 60;

    // Two-skill loadout bound to slots 0 (K) and 1 (L).
    this.loadout = DEFAULT_LOADOUT.map((id) => SKILLS[id]);
    this.skillCd = [0, 0];
    this.buff = null; // { damageMult, lifesteal, until }

    this.events = { onSwing: null, onSkill: null, onDeath: null, onLevelUp: null };
    this.char.play('Idle');

    // Player carries a faint warm light so they're always readable in the dark.
    this.light = new THREE.PointLight(0xffb070, 9, 9, 1.6);
    this.light.position.set(0, 2.6, 0);
    this.char.root.add(this.light);
  }

  get position() {
    return this.char.position;
  }

  get alive() {
    return this.state !== 'dead';
  }

  // Effective stats fold in the active buff (bloodlust).
  get damageMult() {
    return this.stats.damageMult * (this.buff?.damageMult ?? 1);
  }

  get lifesteal() {
    return this.stats.lifesteal + (this.buff?.lifesteal ?? 0);
  }

  setLoadout(ids) {
    this.loadout = ids.map((id) => SKILLS[id]).filter(Boolean);
    this.skillCd = this.loadout.map(() => 0);
  }

  syncFromPhysics() {
    const pos = this.actor.body.translation();
    this.char.setPosition(pos.x, pos.z);
  }

  update(dt, input) {
    if (this.state === 'dead') {
      this.char.update(dt);
      return;
    }
    this.stateTime += dt;
    this.rollCooldownLeft = Math.max(0, this.rollCooldownLeft - dt);
    for (let i = 0; i < this.skillCd.length; i++) {
      this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
    }
    this.mp = Math.min(this.stats.maxMp, this.mp + this.stats.mpRegen * dt);
    if (this.buff && performance.now() > this.buff.until) this.buff = null;

    if (this.hitInvulnLeft > 0) {
      this.hitInvulnLeft -= dt;
      // blink while in post-hit grace
      this.char.model.visible = Math.floor(this.hitInvulnLeft * 14) % 2 === 0;
      if (this.hitInvulnLeft <= 0) this.char.model.visible = true;
    }

    switch (this.state) {
      case 'idle':
      case 'move':
        this.updateLocomotion(dt, input);
        break;
      case 'attack':
        this.updateAttack(dt, input);
        break;
      case 'roll':
        this.updateRoll(dt);
        break;
      case 'skill':
        this.updateSkill(dt);
        break;
    }

    this.char.update(dt);
  }

  enterState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  tryConsumeActions(input, move) {
    if (input.consumeRoll() && this.rollCooldownLeft <= 0) {
      this.startRoll(move);
      return true;
    }
    if (input.consumeAttack()) {
      this.startAttack(0);
      return true;
    }
    if (input.wasPressed('KeyK') && this.useSkill(0)) return true;
    if (input.wasPressed('KeyL') && this.useSkill(1)) return true;
    if (input.wasPressed('KeyQ')) this.drinkPotion();
    return false;
  }

  updateLocomotion(dt, input) {
    const move = input.moveVector;
    if (this.tryConsumeActions(input, move)) return;

    if (move.x !== 0 || move.z !== 0) {
      const speed = this.stats.moveSpeed;
      this.physics.moveActor(this.actor, move.x * speed * dt, move.z * speed * dt);
      this.char.faceToward(Math.atan2(move.x, move.z), dt);
      this.char.play('Running_A', { timeScale: 1.15 });
      this.state = 'move';
    } else {
      this.char.play('Idle');
      this.state = 'idle';
    }
  }

  startAttack(stage) {
    this.comboStage = stage;
    this.comboHitDone = false;
    this.enterState('attack');
    const def = COMBO[stage];
    this.attackDuration = this.char.clipDuration(def.anim) / def.speed;
    this.char.play(def.anim, { fade: 0.08, loop: false, timeScale: def.speed, force: true });
    this.sfx.swing();
  }

  updateAttack(dt, input) {
    const def = COMBO[this.comboStage];
    const progress = this.stateTime / this.attackDuration;

    // small forward step during the swing
    if (progress > 0.15 && progress < 0.5) {
      this.physics.moveActor(
        this.actor,
        Math.sin(this.char.facing) * 2.6 * dt,
        Math.cos(this.char.facing) * 2.6 * dt,
      );
    }

    if (!this.comboHitDone && progress >= def.hitAt) {
      this.comboHitDone = true;
      const isFinisher = this.comboStage === COMBO.length - 1;
      const damage = def.damage * this.damageMult * (isFinisher ? this.stats.comboFinisherBonus : 1);
      this.events.onSwing?.({
        origin: this.position.clone(),
        facing: this.char.facing,
        range: def.range,
        arc: def.arc,
        damage,
        finisher: isFinisher,
      });
    }

    // combo chaining window
    if (progress > 0.55 && input.consumeAttack() && this.comboStage < COMBO.length - 1) {
      this.startAttack(this.comboStage + 1);
      return;
    }
    if (input.consumeRoll() && this.rollCooldownLeft <= 0 && progress > 0.3) {
      this.startRoll(input.moveVector);
      return;
    }
    if (progress >= 1) this.enterState('idle');
  }

  startRoll(move) {
    const hasDir = move.x !== 0 || move.z !== 0;
    this.rollDir = hasDir
      ? { ...move }
      : { x: Math.sin(this.char.facing), z: Math.cos(this.char.facing) };
    this.enterState('roll');
    this.rollCooldownLeft = this.stats.rollCooldown;
    this.char.snapFacing(Math.atan2(this.rollDir.x, this.rollDir.z));
    const dur = this.char.clipDuration('Dodge_Forward');
    this.char.play('Dodge_Forward', { fade: 0.05, loop: false, timeScale: dur / ROLL_TIME, force: true });
    this.sfx.roll();
  }

  updateRoll(dt) {
    const t = this.stateTime;
    this.invincible = t >= IFRAME_START && t <= IFRAME_END;
    const ease = 1 - (t / ROLL_TIME) * 0.45;
    this.physics.moveActor(
      this.actor,
      this.rollDir.x * ROLL_SPEED * ease * dt,
      this.rollDir.z * ROLL_SPEED * ease * dt,
    );
    if (t >= ROLL_TIME) {
      this.invincible = false;
      this.enterState('idle');
    }
  }

  // Returns true if the skill in `slot` fired (enough MP, off cooldown).
  useSkill(slot) {
    const skill = this.loadout[slot];
    if (!skill || this.skillCd[slot] > 0 || this.mp < skill.mp) return false;
    this.mp -= skill.mp;
    this.skillCd[slot] = skill.cooldown;
    this.enterState('skill');
    this.activeSkill = skill;
    this.skillHitDone = false;
    this.skillDuration = this.char.clipDuration(skill.anim) / skill.animSpeed;
    this.char.play(skill.anim, { fade: 0.08, loop: false, timeScale: skill.animSpeed, force: true });
    this.sfx[skill.sfx]?.();
    return true;
  }

  updateSkill(dt) {
    const skill = this.activeSkill;
    const progress = this.stateTime / this.skillDuration;

    // Dash skills lunge the player forward during the wind-up.
    if (skill.effect.dash && progress < 0.55) {
      const v = skill.effect.dash;
      this.physics.moveActor(
        this.actor,
        Math.sin(this.char.facing) * v * dt,
        Math.cos(this.char.facing) * v * dt,
      );
    }

    if (!this.skillHitDone && progress >= skill.hitAt) {
      this.skillHitDone = true;
      if (skill.effect.type === 'buff') {
        this.buff = {
          damageMult: skill.effect.damageMult,
          lifesteal: skill.effect.lifesteal,
          until: performance.now() + skill.effect.duration * 1000,
        };
      }
      this.events.onSkill?.({
        skill,
        origin: this.position.clone(),
        facing: this.char.facing,
        damageMult: this.damageMult,
      });
    }
    if (progress >= 1) this.enterState('idle');
  }

  drinkPotion() {
    if (this.potions <= 0 || this.hp >= this.stats.maxHp) return;
    this.potions--;
    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.55);
    this.sfx.potion();
  }

  takeDamage(amount) {
    if (!this.alive || this.invincible || this.state === 'roll' || this.hitInvulnLeft > 0) {
      return false;
    }
    this.hp -= amount;
    this.hitInvulnLeft = 0.7;
    this.char.flash();
    this.sfx.hurt();
    if (this.hp <= 0) {
      this.hp = 0;
      this.char.model.visible = true;
      this.enterState('dead');
      this.char.play('Death_A', { fade: 0.1, loop: false, force: true });
      this.events.onDeath?.();
    }
    return true;
  }

  gainXp(amount) {
    this.xp += amount * this.stats.xpMult;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.events.onLevelUp?.(this.level);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }
}
