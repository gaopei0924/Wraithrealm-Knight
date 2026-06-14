import { Enemy, ENEMY_TYPES, ELITE_AFFIXES } from './enemy.js';
import { Boss } from './boss.js';
import { BOSSES } from '../combat/bosses.js';

const BASE_MODELS = [
  'Skeleton_Minion', 'Skeleton_Rogue', 'Skeleton_Warrior', 'Skeleton_Mage',
  'Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded',
];

// Per-room wave director: locks gates when the player enters an uncleared
// combat room, spawns waves, then a boss in the final room, then unlocks.
export class WaveDirector {
  constructor({ rooms, builder, assets, scene, physics, sfx, events, mods, eliteChance, bossType }) {
    this.rooms = rooms;
    this.builder = builder;
    this.assets = assets;
    this.scene = scene;
    this.physics = physics;
    this.sfx = sfx;
    this.events = events;
    this.mods = mods ?? { hp: 1, damage: 1, speed: 1 };
    this.eliteChance = eliteChance ?? 0;
    this.bossType = bossType ?? null;

    this.enemies = [];
    this.activeRoom = null;
    this.waveIndex = 0;
    this.globalWave = 0;
    this.kills = 0;
    this.pendingSpawns = [];
    this.bossSpawned = false;
    this.boss = null;
    this.player = null;
  }

  async preloadCharacters() {
    const models = new Set(BASE_MODELS);
    if (this.bossType && BOSSES[this.bossType]) models.add(BOSSES[this.bossType].model);
    for (const m of models) await this.assets.loadGltf(`/assets/characters/${m}.glb`);
  }

  roomAt(pos) {
    return this.rooms.find(
      (r) => pos.x >= r.minX && pos.x <= r.maxX && pos.z >= r.minZ && pos.z <= r.maxZ,
    );
  }

  update(dt, player, fireProjectile) {
    this.player = player;
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

    const now = performance.now();
    this.pendingSpawns = this.pendingSpawns.filter((spawn) => {
      if (now >= spawn.at) {
        const affix = spawn.elite ? ELITE_AFFIXES[Math.floor(Math.random() * ELITE_AFFIXES.length)] : null;
        this.spawnEnemy(spawn.type, spawn.x, spawn.z, player, { elite: spawn.elite, affix, waveHp: 50 * Math.max(0, (spawn.wave ?? 1) - 1) });
        return false;
      }
      return true;
    });

    for (const enemy of this.enemies) {
      enemy.update(dt, player.position, player.alive, fireProjectile);
    }

    this.enemies = this.enemies.filter((enemy) => {
      // Treasure goblin escapes (despawns, no reward) if not killed in time.
      if (!enemy.dead && enemy.type === 'goblin' && enemy.escapeAt && now >= enemy.escapeAt) {
        this.physics.removeBody(enemy.actor.body);
        enemy.dispose(this.scene);
        return false;
      }
      if (enemy.dead && now >= enemy.removeAt) {
        if (enemy === this.boss) this.boss = null;
        enemy.dispose(this.scene);
        return false;
      }
      return true;
    });

    // Goblins never block room completion.
    if (this.activeRoom && this.pendingSpawns.length === 0 &&
        !this.enemies.some((e) => !e.dead && e.type !== 'goblin')) {
      this.advanceWave(player);
    }
  }

  engageRoom(room, player) {
    this.activeRoom = room;
    this.waveIndex = 0;
    this.bossSpawned = false;
    this.builder.setRoomLocked(room.id, true);
    this.sfx.gate();
    this.startWave(room, player);
    // ~10% chance a treasure goblin scurries in.
    if (Math.random() < 0.1) {
      const { x, z } = this.pickSpawnPoint(room, player);
      this.spawnEnemy('goblin', x, z, player, {}).then((g) => { if (g) g.escapeAt = performance.now() + 13000; });
    }
  }

  startWave(room, player) {
    const wave = room.waves[this.waveIndex];
    this.globalWave++;
    this.events.onWaveStart?.(this.globalWave);
    for (let i = 0; i < wave.count; i++) {
      const type = wave.types[i % wave.types.length];
      const { x, z } = this.pickSpawnPoint(room, player);
      const elite = this.eliteChance > 0 && Math.random() < this.eliteChance;
      this.pendingSpawns.push({ type, x, z, elite, wave: this.globalWave, at: performance.now() + 250 + i * 300 });
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

  async spawnEnemy(type, x, z, player, opts = {}) {
    const def = ENEMY_TYPES[type];
    const charData = await this.assets.character(def.model);
    const enemy = new Enemy(type, charData, this.scene, this.physics, this.sfx, this.mods, opts);
    enemy.setPosition(x, z);
    this.wireEnemy(enemy, player);
    if (opts.elite) this.events.onEliteSpawned?.(enemy);
    this.enemies.push(enemy);
    this.events.onEnemySpawned?.(enemy);
    return enemy;
  }

  wireEnemy(enemy, player) {
    enemy.onHitPlayer = (damage, statusSpec) => {
      const hit = player.takeDamage(damage);
      if (!hit) return;
      this.events.onPlayerHit?.(damage);
      if (player.weapons?.thorns > 0) this.events.onThorns?.(enemy); // reflect
      if (statusSpec?.type === 'chill') player.applyChill(statusSpec.factor, statusSpec.duration);
      else if (statusSpec?.type === 'poison') player.applyPoison(statusSpec.dps, statusSpec.duration);
    };
    enemy.onSummon = (e) => this.summonFrom(e);
    enemy.onHealAllies = (e) => this.healAllies(e);
    enemy.onExplode = (e, spec) => this.events.onEnemyExplode?.(e, spec);
    enemy.onBlink = (pos) => this.events.onBlink?.(pos);
  }

  summonFrom(e) {
    if (this.aliveEnemies.length > 36) return;
    const count = e.def.summonCount ?? 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawnEnemy(e.def.summonType ?? 'minion',
        e.position.x + Math.cos(a) * 2.2, e.position.z + Math.sin(a) * 2.2, this.player, {});
    }
    this.events.onSummon?.(e);
  }

  healAllies(e) {
    const range = e.def.healRange ?? 9;
    for (const o of this.aliveEnemies) {
      if (o !== e && o.position.distanceTo(e.position) < range) {
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (e.def.healAmount ?? 0.2));
      }
    }
    this.events.onHeal?.(e);
  }

  async spawnBoss(player) {
    const def = BOSSES[this.bossType];
    const charData = await this.assets.character(def.model);
    const boss = new Boss(def, charData, this.scene, this.physics, this.sfx, this.mods);
    const room = this.activeRoom;
    boss.setPosition(room.centerX, room.centerZ);
    this.wireEnemy(boss, player);
    boss.onSummonWave = () => this.summonForBoss(boss);
    this.enemies.push(boss);
    this.boss = boss;
    this.events.onBossSpawn?.(boss);
  }

  summonForBoss(boss) {
    if (this.aliveEnemies.length > 30) return;
    const pool = boss.def.adds ?? ['minion'];
    for (let i = 0; i < (boss.def.addCount ?? 3); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawnEnemy(pool[i % pool.length],
        boss.position.x + Math.cos(a) * 4, boss.position.z + Math.sin(a) * 4, this.player, {});
    }
  }

  advanceWave(player) {
    const room = this.activeRoom;
    // Final room with a boss: after the waves, spawn the boss and wait for it.
    if (this.bossType && room.type === 'final' && this.waveIndex >= room.waves.length && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnBoss(player);
      return;
    }
    this.waveIndex++;
    if (this.waveIndex < room.waves.length) {
      this.startWave(room, player);
    } else if (this.bossType && room.type === 'final' && !this.bossSpawned) {
      this.spawnBoss(player);
    } else {
      room.cleared = true;
      this.builder.setRoomLocked(room.id, false);
      this.activeRoom = null;
      this.sfx.gate();
      this.events.onRoomCleared?.(room);
      if (this.rooms.every((r) => !r.waves || r.cleared)) this.events.onAllCleared?.();
    }
  }

  // Push overlapping enemies apart so they don't clip into each other (穿模).
  // Cheap O(n²) over the small live set; movement still respects walls via the
  // character controller.
  separate() {
    const list = this.aliveEnemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.isBoss || a.dead) continue;
      let px = 0, pz = 0;
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        const dx = a.position.x - b.position.x, dz = a.position.z - b.position.z;
        const min = a.def.radius + b.def.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        if (d2 < 1e-4) {
          // exact overlap: deterministic jitter so coincident bodies can split
          const ang = a.id * 2.3994;
          px += Math.cos(ang) * min; pz += Math.sin(ang) * min;
        } else {
          const d = Math.sqrt(d2);
          const push = (min - d) / d;
          px += dx * push; pz += dz * push;
        }
      }
      if (px !== 0 || pz !== 0) {
        // clamp the per-frame shove so dense piles ease apart rather than teleport
        let sx = px * 0.5, sz = pz * 0.5;
        const mag = Math.hypot(sx, sz), cap = 0.4;
        if (mag > cap) { sx = sx / mag * cap; sz = sz / mag * cap; }
        this.physics.shoveActor(a.actor, sx, sz);
      }
    }
  }

  notifyKill() { this.kills++; }

  get aliveEnemies() { return this.enemies.filter((e) => !e.dead); }

  disposeAll() {
    for (const enemy of this.enemies) {
      if (!enemy.dead) this.physics.removeBody(enemy.actor.body);
      enemy.dispose(this.scene);
    }
    this.enemies = [];
    this.pendingSpawns = [];
    this.activeRoom = null;
    this.boss = null;
  }
}
