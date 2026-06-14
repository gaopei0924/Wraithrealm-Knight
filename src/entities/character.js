import * as THREE from 'three';

// Shared skinned-character wrapper: animation mixer + crossfade state machine.
export class Character {
  // `aliases` maps the KayKit clip names the game requests (Idle, Running_A,
  // Death_A, 1H_Melee_Attack_Chop, …) to whatever this rig actually ships, so a
  // non-KayKit rig (e.g. a Quaternius CC0 character) can be used as a hero.
  constructor({ scene: model, animations }, worldScene, scale = 1, aliases = null) {
    this.model = model;
    this.aliases = aliases;
    this.model.scale.setScalar(scale);
    this.root = new THREE.Group();
    this.root.add(this.model);
    worldScene.add(this.root);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    for (const clip of animations) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
    this.current = null;
    this.currentName = null;
    this.facing = 0; // yaw radians

    // Clone materials once so hit-flashes don't bleed across instances.
    this.flashTargets = [];
    this.model.traverse((o) => {
      if (o.isMesh && o.material?.emissive) {
        o.material = o.material.clone();
        this.flashTargets.push(o.material);
      }
    });
    this.flashTimeout = null;
  }

  // Resolve a requested clip name through the alias map.
  resolve(name) {
    if (this.actions.has(name)) return name;
    const a = this.aliases?.[name];
    return a && this.actions.has(a) ? a : null;
  }

  has(name) {
    return this.resolve(name) !== null;
  }

  play(name, { fade = 0.15, loop = true, timeScale = 1, force = false } = {}) {
    if (this.currentName === name && !force) return this.current;
    let resolved = this.resolve(name);
    // fall back to an idle so an unmapped rig never freezes in a T-pose
    if (!resolved) resolved = this.resolve('Idle') ?? this.actions.keys().next().value;
    const action = this.actions.get(resolved);
    if (!action) return null;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;
    if (this.current && this.current !== action) {
      action.crossFadeFrom(this.current, fade, false);
    }
    action.play();
    this.current = action;
    this.currentName = name;
    return action;
  }

  clipDuration(name) {
    const r = this.resolve(name);
    return r ? this.actions.get(r).getClip().duration ?? 0 : 0;
  }

  setPosition(x, z) {
    this.root.position.set(x, 0, z);
  }

  get position() {
    return this.root.position;
  }

  faceToward(yaw, dt, speed = 14) {
    let delta = yaw - this.facing;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.facing += delta * Math.min(1, speed * dt);
    this.root.rotation.y = this.facing;
  }

  snapFacing(yaw) {
    this.facing = yaw;
    this.root.rotation.y = yaw;
  }

  update(dt) {
    this.mixer.update(dt);
  }

  // Tint every material toward a colour (used to differentiate monster variants
  // and bosses from the same base rig). amount 0..1 = how strongly to pull.
  setTint(hex, amount = 0.6) {
    const tint = new THREE.Color(hex);
    this.model.traverse((o) => {
      if (o.isMesh && o.material?.color) {
        o.material = o.material.clone();
        o.material.color.lerp(tint, amount);
        if (o.material.emissive) {
          o.material.emissive.setHex(hex);
          o.material.emissiveIntensity = 0.18;
        }
      }
    });
    // refresh flash targets to point at the new cloned materials
    this.flashTargets = [];
    this.model.traverse((o) => {
      if (o.isMesh && o.material?.emissive) this.flashTargets.push(o.material);
    });
  }

  // Persistent overlay colour (status aura) — set emissive without clobbering tint.
  setAura(hex, intensity) {
    for (const mat of this.flashTargets) {
      mat.emissive.setHex(hex);
      mat.emissiveIntensity = intensity;
    }
  }

  // Brief red flash on hit.
  flash() {
    for (const mat of this.flashTargets) {
      mat.emissive.setHex(0xff2211);
      mat.emissiveIntensity = 0.9;
    }
    clearTimeout(this.flashTimeout);
    this.flashTimeout = setTimeout(() => {
      for (const mat of this.flashTargets) mat.emissiveIntensity = 0;
    }, 110);
  }

  dispose(worldScene) {
    worldScene.remove(this.root);
  }
}
