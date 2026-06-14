import * as THREE from 'three';

// Transient combat VFX: slash arcs, hit sparks, soul orbs (XP), magic bolts.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // { mesh, update(dt) → false when finished }
    this.orbs = [];
    this.bolts = [];
    this.playerBolts = [];
    this.pickups = [];

    this.arcMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sparkGeo = new THREE.SphereGeometry(0.09, 6, 6);
    this.orbGeo = new THREE.SphereGeometry(0.16, 8, 8);
    this.orbMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
    this.boltGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0x8844ff });
    this.playerBoltGeo = new THREE.SphereGeometry(0.32, 10, 10);
  }

  slashArc(origin, facing, range, arcAngle, color = 0xffc878) {
    // Sector centered on local +X, laid flat, then yawed toward `facing`
    // (world yaw measured from +Z, so the holder turns by facing - 90°).
    const geo = new THREE.RingGeometry(range * 0.45, range, 24, 1, -arcAngle, arcAngle * 2);
    const mat = this.arcMaterial.clone();
    mat.color.setHex(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(mesh);
    holder.position.copy(origin).setY(0.9);
    holder.rotation.y = facing - Math.PI / 2;
    this.scene.add(holder);
    let t = 0;
    this.items.push({
      mesh: holder,
      update: (dt) => {
        t += dt;
        mat.opacity = Math.max(0, 0.85 - t * 5);
        holder.scale.setScalar(1 + t * 1.6);
        return t < 0.2;
      },
    });
  }

  ringBurst(origin, range, color = 0xffe0a0) {
    const geo = new THREE.RingGeometry(range * 0.2, range * 0.35, 32);
    const mat = this.arcMaterial.clone();
    mat.color.setHex(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(origin).setY(0.35);
    this.scene.add(mesh);
    let t = 0;
    this.items.push({
      mesh,
      update: (dt) => {
        t += dt;
        mat.opacity = Math.max(0, 0.9 - t * 3.2);
        mesh.scale.setScalar(1 + t * 7);
        return t < 0.32;
      },
    });
  }

  hitSpark(pos) {
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffcc55, transparent: true });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.8 + Math.random() * 0.7, (Math.random() - 0.5) * 0.5),
      );
      const vel = new THREE.Vector3((Math.random() - 0.5) * 5, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 5);
      this.scene.add(mesh);
      let t = 0;
      this.items.push({
        mesh,
        update: (dt) => {
          t += dt;
          vel.y -= 14 * dt;
          mesh.position.addScaledVector(vel, dt);
          mat.opacity = Math.max(0, 1 - t * 2.6);
          return t < 0.4;
        },
      });
    }
  }

  spawnOrb(pos, xp) {
    const mesh = new THREE.Mesh(this.orbGeo, this.orbMat.clone());
    mesh.position.copy(pos).setY(0.7);
    const drift = new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    this.scene.add(mesh);
    this.orbs.push({ mesh, xp, age: 0, drift });
  }

  // Orbs scatter briefly, then home to the player and award XP on contact.
  updateOrbs(dt, playerPos, onCollect, magnet = 1) {
    this.orbs = this.orbs.filter((orb) => {
      orb.age += dt;
      if (orb.age < 0.35 / magnet) {
        orb.mesh.position.addScaledVector(orb.drift, dt);
      } else {
        const dir = new THREE.Vector3().subVectors(playerPos, orb.mesh.position).setY(0);
        const dist = dir.length();
        if (dist < 0.7) {
          this.scene.remove(orb.mesh);
          onCollect(orb.xp);
          return false;
        }
        const speed = Math.min(16, 4 + orb.age * 9) * magnet;
        orb.mesh.position.addScaledVector(dir.normalize(), speed * dt);
      }
      orb.mesh.position.y = 0.7 + Math.sin(orb.age * 6) * 0.12;
      return true;
    });
  }

  fireBolt(from, target, spec = {}) {
    const color = spec.color ?? 0x8844ff;
    // Additive unlit material reads as a glow without a real PointLight —
    // adding/removing scene lights forces a full shader recompile (frame hitch).
    const mat = this.boltMat.clone();
    mat.color.setHex(color);
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    const mesh = new THREE.Mesh(this.boltGeo, mat);
    mesh.position.copy(from).setY(1.4);
    const dir = new THREE.Vector3().subVectors(target, from).setY(0).normalize();
    this.scene.add(mesh);
    this.bolts.push({
      mesh, dir, speed: spec.speed ?? 9, age: 0,
      damage: spec.damage ?? 10, status: spec.status ?? null,
    });
  }

  // Returns {pos, damage, status} for bolts that hit the player this frame.
  updateBolts(dt, playerPos, playerRadius = 0.7) {
    const hits = [];
    this.bolts = this.bolts.filter((bolt) => {
      bolt.age += dt;
      bolt.mesh.position.addScaledVector(bolt.dir, bolt.speed * dt);
      const flat = bolt.mesh.position.clone().setY(0);
      const target = playerPos.clone().setY(0);
      if (flat.distanceTo(target) < playerRadius) {
        hits.push({ pos: bolt.mesh.position.clone(), damage: bolt.damage, status: bolt.status });
        this.scene.remove(bolt.mesh);
        return false;
      }
      if (bolt.age > 3.4) { this.scene.remove(bolt.mesh); return false; }
      return true;
    });
    return hits;
  }

  // Boss/AoE telegraph: a ground ring that fills over `duration`, then flashes.
  telegraph(pos, radius, color, duration) {
    const geo = new THREE.RingGeometry(radius * 0.92, radius, 40);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(0.12);
    const fillGeo = new THREE.CircleGeometry(radius, 40);
    const fillMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.copy(pos).setY(0.1);
    fill.scale.setScalar(0.01);
    this.scene.add(ring, fill);
    let t = 0;
    this.items.push({
      mesh: ring,
      update: (dt) => {
        t += dt;
        const p = Math.min(1, t / duration);
        fill.scale.setScalar(Math.max(0.01, p));
        fillMat.opacity = 0.12 + p * 0.25;
        if (t >= duration) { fillMat.opacity = Math.max(0, 0.5 - (t - duration) * 3); }
        const done = t > duration + 0.18;
        if (done) this.scene.remove(fill);
        return !done;
      },
    });
  }

  // Fading translucent disc left behind by the dodge roll.
  trail(pos, color = 0xbfa86a) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos).setY(0.15);
    this.scene.add(mesh);
    let t = 0;
    this.items.push({ mesh, update: (dt) => { t += dt; mat.opacity = Math.max(0, 0.4 - t * 2); return t < 0.2; } });
  }

  // Generic impact burst (boss attacks, explosions). No scene light — the
  // additive ring + sparks read as a flash without forcing a shader recompile.
  burst(pos, radius, color = 0xffa040) {
    this.ringBurst(pos, radius, color);
    this.hitSpark(pos);
  }

  // --- pickups (health / mana / gold) dropped by enemies & destructibles ---
  spawnPickup(pos, kind) {
    const colors = { heal: 0xff4d5e, mana: 0x4d8cff, gold: 0xf5c542, bomb: 0xb060ff };
    const mat = new THREE.MeshBasicMaterial({ color: colors[kind] ?? 0xffffff });
    if (kind === 'bomb') { mat.transparent = true; mat.blending = THREE.AdditiveBlending; }
    const mesh = new THREE.Mesh(this.orbGeo, mat);
    mesh.scale.setScalar(kind === 'gold' ? 0.9 : kind === 'bomb' ? 1.8 : 1.25);
    mesh.position.copy(pos).setY(0.7);
    const drift = new THREE.Vector3((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 2.5);
    this.scene.add(mesh);
    this.pickups = this.pickups ?? [];
    this.pickups.push({ mesh, kind, age: 0, drift });
  }

  updatePickups(dt, playerPos, onCollect, magnet = 1) {
    if (!this.pickups) return;
    this.pickups = this.pickups.filter((p) => {
      p.age += dt;
      if (p.age < 0.3 / magnet) {
        p.mesh.position.addScaledVector(p.drift, dt);
      } else {
        const dir = new THREE.Vector3().subVectors(playerPos, p.mesh.position).setY(0);
        const dist = dir.length();
        if (dist < 0.9) { this.scene.remove(p.mesh); onCollect(p.kind); return false; }
        p.mesh.position.addScaledVector(dir.normalize(), Math.min(15, 4 + p.age * 8) * magnet * dt);
      }
      p.mesh.position.y = 0.7 + Math.sin(p.age * 6) * 0.12;
      p.mesh.rotation.y += dt * 4;
      if (p.age > 14) { this.scene.remove(p.mesh); return false; }
      return true;
    });
  }

  // Player skill projectile (fireball). Travels straight; explodes on the
  // first enemy it reaches or at end of life. onExplode(pos, effect) handles AoE.
  firePlayerBolt(from, facing, effect) {
    const mat = new THREE.MeshBasicMaterial({
      color: effect.color ?? 0xff7a22, transparent: true, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(this.playerBoltGeo, mat);
    mesh.position.copy(from).setY(1.3);
    const dir = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)).normalize();
    this.scene.add(mesh);
    this.playerBolts.push({ mesh, dir, effect, age: 0 });
  }

  updatePlayerBolts(dt, enemies, onExplode) {
    this.playerBolts = this.playerBolts.filter((bolt) => {
      bolt.age += dt;
      bolt.mesh.position.addScaledVector(bolt.dir, bolt.effect.speed * dt);
      bolt.mesh.rotation.y += dt * 12;
      const flat = bolt.mesh.position.clone().setY(0);
      const hit = enemies.find(
        (e) => !e.dead && e.position.clone().setY(0).distanceTo(flat) < (e.def.radius + 0.5),
      );
      if (hit || bolt.age > 2.2) {
        onExplode(bolt.mesh.position.clone(), bolt.effect);
        this.scene.remove(bolt.mesh);
        return false;
      }
      return true;
    });
  }

  // Clear all transient effects (used on stage transitions).
  reset() {
    for (const o of this.orbs) this.scene.remove(o.mesh);
    for (const b of this.bolts) this.scene.remove(b.mesh);
    for (const b of this.playerBolts) this.scene.remove(b.mesh);
    for (const it of this.items) this.scene.remove(it.mesh);
    for (const p of this.pickups ?? []) this.scene.remove(p.mesh);
    this.stopAmbient();
    this.orbs = [];
    this.bolts = [];
    this.playerBolts = [];
    this.pickups = [];
    this.items = [];
  }

  // Lightning polyline through a list of world points (chain lightning).
  chainLightning(points, color = 0x9fe6ff) {
    if (points.length < 2) return;
    const verts = [];
    for (const p of points) verts.push(p.x, 1.1, p.z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    // a glow spark at each struck point (additive sprite — no scene light)
    for (const p of points.slice(1)) {
      const sm = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(this.sparkGeo, sm);
      glow.scale.setScalar(3);
      glow.position.set(p.x, 1.2, p.z);
      this.scene.add(glow);
      let gt = 0;
      this.items.push({ mesh: glow, update: (dt) => { gt += dt; sm.opacity = Math.max(0, 1 - gt * 5); return gt < 0.2; } });
    }
    let t = 0;
    this.items.push({
      mesh: line,
      update: (dt) => { t += dt; mat.opacity = Math.max(0, 1 - t * 5); return t < 0.2; },
    });
  }

  // Drifting biome motes (embers / snow / dust) — a single Points cloud around
  // the player, recoloured per stage. Cheap atmosphere, one draw call.
  startAmbient(color, playerPos) {
    this.stopAmbient();
    const N = 90;
    const pos = new Float32Array(N * 3);
    this.ambientBase = [];
    for (let i = 0; i < N; i++) {
      const x = playerPos.x + (Math.random() - 0.5) * 44;
      const y = Math.random() * 9 + 0.5;
      const z = playerPos.z + (Math.random() - 0.5) * 30;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      this.ambientBase.push({ vy: 0.2 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.3, ph: Math.random() * 6 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size: 0.16, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.ambient = new THREE.Points(geo, mat);
    this.ambient.frustumCulled = false;
    this.scene.add(this.ambient);
  }

  stopAmbient() {
    if (this.ambient) { this.scene.remove(this.ambient); this.ambient.geometry.dispose(); this.ambient.material.dispose(); this.ambient = null; }
  }

  updateAmbient(dt, playerPos) {
    if (!this.ambient) return;
    const arr = this.ambient.geometry.attributes.position.array;
    this.ambientTime = (this.ambientTime ?? 0) + dt;
    for (let i = 0; i < this.ambientBase.length; i++) {
      const b = this.ambientBase[i];
      arr[i * 3 + 1] += b.vy * dt;
      arr[i * 3] += Math.sin(this.ambientTime + b.ph) * b.vx * dt;
      if (arr[i * 3 + 1] > 10) { // recycle to the floor near the player
        arr[i * 3] = playerPos.x + (Math.random() - 0.5) * 44;
        arr[i * 3 + 1] = 0.3;
        arr[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 30;
      }
    }
    this.ambient.geometry.attributes.position.needsUpdate = true;
  }

  // --- passive survivors weapons ---
  // Orbiting blades: returns each blade's world XZ each frame for damage checks.
  setOrbit(level, color = 0xfff0a0) {
    if (this.orbitGroup) { this.scene.remove(this.orbitGroup); this.orbitGroup = null; }
    this.orbitBlades = [];
    if (level <= 0) return;
    const n = 1 + level;
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.14, 0.2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      g.add(m);
      this.orbitBlades.push({ mesh: m, ang: (i / n) * Math.PI * 2 });
    }
    this.scene.add(g);
    this.orbitGroup = g;
    this.orbitRadius = 2.5;
  }

  updateOrbit(dt, playerPos) {
    if (!this.orbitGroup) return [];
    this.orbitT = (this.orbitT ?? 0) + dt * 2.6;
    const pts = [];
    for (const b of this.orbitBlades) {
      const a = b.ang + this.orbitT;
      const x = playerPos.x + Math.cos(a) * this.orbitRadius;
      const z = playerPos.z + Math.sin(a) * this.orbitRadius;
      b.mesh.position.set(x, 1.0, z);
      b.mesh.rotation.y = -a;
      pts.push({ x, z });
    }
    return pts;
  }

  // Persistent damage-aura disc that follows the player.
  setAuraDisc(level, color = 0xff7a3a) {
    if (this.auraDisc) { this.scene.remove(this.auraDisc); this.auraDisc = null; }
    if (level <= 0) return;
    const radius = (2.6 + level * 0.5) * 2;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), mat);
    disc.rotation.x = -Math.PI / 2;
    this.scene.add(disc);
    this.auraDisc = disc;
    this.auraRadius = radius;
  }

  updateAuraDisc(playerPos) {
    if (!this.auraDisc) return;
    this.auraDisc.position.set(playerPos.x, 0.16, playerPos.z);
    this.auraDisc.material.opacity = 0.1 + 0.05 * Math.sin((this.orbitT ?? 0) * 3);
  }

  clearPassives() {
    if (this.orbitGroup) { this.scene.remove(this.orbitGroup); this.orbitGroup = null; }
    if (this.auraDisc) { this.scene.remove(this.auraDisc); this.auraDisc = null; }
    this.orbitBlades = [];
  }

  update(dt) {
    this.items = this.items.filter((item) => {
      const alive = item.update(dt);
      if (!alive) this.scene.remove(item.mesh);
      return alive;
    });
  }
}
