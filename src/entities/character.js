import * as THREE from 'three';

// Shared skinned-character wrapper: animation mixer + crossfade state machine.
export class Character {
  constructor({ scene: model, animations }, worldScene, scale = 1) {
    this.model = model;
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

  has(name) {
    return this.actions.has(name);
  }

  play(name, { fade = 0.15, loop = true, timeScale = 1, force = false } = {}) {
    if (this.currentName === name && !force) return this.actions.get(name);
    const action = this.actions.get(name);
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
    return this.actions.get(name)?.getClip().duration ?? 0;
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
