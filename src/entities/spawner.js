import { Enemy, ENEMY_TYPES } from './enemy.js';

// Per-room wave director: locks gates when the player enters an uncleared
// combat room, spawns waves until the plan is exhausted, then unlocks.
export class WaveDirector {
  constructor({ rooms, builder, assets, scene, physics, sfx, events, mods }) {
    this.rooms = rooms;
    this.builder = builder;
    this.assets = assets;
    this.scene = scene;
    this.physics = physics;
    this.sfx = sfx;
    this.events = events; // { onWaveStart, onRoomCleared, onAllCleared, onEnemySpawned }
    this.mods = mods ?? { hp: 1, damage: 1, speed: 1 };

    this.enemies = [];
    this.activeRoom = null;
    this.waveIndex = 0;
    this.globalWave = 0;
    this.kills = 0;
    this.charCache = new Map();
    this.pendingSpawns = [];
  }

  async preloadCharacters() {
    const models = ['Skeleton_Minion', 'Skeleton_Rogue', 'Skeleton_Warrior', 'Skeleton_Mage'];
    for (const m of models) await this.assets.loadGltf(`/assets/characters/${m}.glb`);
  }

  roomAt(pos) {
    return this.rooms.find(
      (r) => pos.x >= r.minX && pos.x <= r.maxX && pos.z >= r.minZ && pos.z <= r.maxZ,
    );
  }

  update(dt, player, fireProjectile) {
    // Engage room when the player is fully inside an uncleared combat room.
    if (!this.activeRoom && player.alive) {
      const room = this.roomAt(player.position);
      const margin = 1.5;
      if (
        room && room.waves && !room.cleared &&
        player.position.x > room.minX + margin && player.position.x < room.maxX - margin &&
        player.position.z > room.minZ + margin && player.position.z < room.maxZ - margin
      ) {
        this.engageRoom(room, player);
      }
    }

    // Timed spawn queue (staggered appearance feels better than a burst).
    const now = performance.now();
    this.pendingSpawns = this.pendingSpawns.filter((spawn) => {
      if (now >= spawn.at) {
        this.spawnEnemy(spawn.type, spawn.x, spawn.z, player);
        return false;
      }
      return true;
    });

    for (const enemy of this.enemies) {
      enemy.update(dt, player.position, player.alive, fireProjectile);
    }

    // Cull finished corpses.
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.dead && now >= enemy.removeAt) {
        enemy.dispose(this.scene);
        return false;
      }
      return true;
    });

    // Wave progression.
    if (this.activeRoom && this.pendingSpawns.length === 0 && !this.enemies.some((e) => !e.dead)) {
      this.advanceWave(player);
    }
  }

  engageRoom(room, player) {
    this.activeRoom = room;
    this.waveIndex = 0;
    this.builder.setRoomLocked(room.id, true);
    this.sfx.gate();
    this.startWave(room, player);
  }

  startWave(room, player) {
    const wave = room.waves[this.waveIndex];
    this.globalWave++;
    this.events.onWaveStart?.(this.globalWave);
    const count = wave.count;
    for (let i = 0; i < count; i++) {
      const type = wave.types[i % wave.types.length];
      const { x, z } = this.pickSpawnPoint(room, player);
      this.pendingSpawns.push({ type, x, z, at: performance.now() + 250 + i * 320 });
    }
  }

  pickSpawnPoint(room, player) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = room.minX + 3 + Math.random() * (room.maxX - room.minX - 6);
      const z = room.minZ + 3 + Math.random() * (room.maxZ - room.minZ - 6);
      const dx = x - player.position.x;
      const dz = z - player.position.z;
      if (dx * dx + dz * dz > 16) return { x, z };
    }
    return { x: room.centerX, z: room.centerZ };
  }

  async spawnEnemy(type, x, z, player) {
    const def = ENEMY_TYPES[type];
    const charData = await this.assets.character(def.model);
    const enemy = new Enemy(type, charData, this.scene, this.physics, this.sfx, this.mods);
    enemy.setPosition(x, z);
    enemy.onHitPlayer = (damage) => {
      const hit = player.takeDamage(damage);
      if (hit) this.events.onPlayerHit?.(damage);
    };
    this.enemies.push(enemy);
    this.events.onEnemySpawned?.(enemy);
  }

  advanceWave(player) {
    const room = this.activeRoom;
    this.waveIndex++;
    if (this.waveIndex < room.waves.length) {
      this.startWave(room, player);
    } else {
      room.cleared = true;
      this.builder.setRoomLocked(room.id, false);
      this.activeRoom = null;
      this.sfx.gate();
      this.events.onRoomCleared?.(room);
      if (this.rooms.every((r) => !r.waves || r.cleared)) {
        this.events.onAllCleared?.();
      }
    }
  }

  notifyKill(enemy) {
    this.kills++;
  }

  get aliveEnemies() {
    return this.enemies.filter((e) => !e.dead);
  }

  // Tear down every enemy (corpses included) and any pending spawns.
  disposeAll() {
    for (const enemy of this.enemies) {
      if (!enemy.dead) this.physics.removeBody(enemy.actor.body);
      enemy.dispose(this.scene);
    }
    this.enemies = [];
    this.pendingSpawns = [];
    this.activeRoom = null;
  }
}
