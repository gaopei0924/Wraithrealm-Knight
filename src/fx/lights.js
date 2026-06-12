import * as THREE from 'three';

// A fixed pool of point lights reassigned each frame to the torches nearest
// the player. Keeps the forward-renderer light count constant (no shader
// recompiles) while the whole dungeon appears torch-lit.
const POOL_SIZE = 7;

export class TorchLights {
  constructor(scene, torchPoints, color = 0xff7a2a) {
    this.scene = scene;
    this.torchPoints = torchPoints;
    this.lights = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = new THREE.PointLight(color, 0, 11, 1.8);
      scene.add(light);
      this.lights.push(light);
    }
    this.time = Math.random() * 100;
  }

  dispose() {
    for (const light of this.lights) this.scene.remove(light);
    this.lights = [];
  }

  update(playerPos, dt) {
    this.time += dt;
    const nearest = [...this.torchPoints]
      .map((p) => ({ p, d: p.distanceToSquared(playerPos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, POOL_SIZE);

    this.lights.forEach((light, i) => {
      const slot = nearest[i];
      if (!slot) {
        light.intensity = 0;
        return;
      }
      light.position.copy(slot.p);
      const flicker = 0.85 + 0.15 * Math.sin(this.time * 9 + i * 17) * Math.sin(this.time * 23 + i * 7);
      light.intensity = 28 * flicker;
    });
  }
}
