import * as THREE from 'three';
import { mulberry32 } from './layout.js';

// Turns a layout (grid cells) into meshes + colliders, using measured tile
// sizes from tile-manifest.json. Nothing here assumes a tile is 4m — the
// grid unit comes from the manifest.

// Fallback palettes if a stage theme isn't supplied.
const DEFAULT_FLOORS = [
  ['floor_tile_large', 62],
  ['floor_tile_large_rocks', 14],
  ['floor_dirt_large', 12],
  ['floor_dirt_large_rocky', 12],
];

const DEFAULT_WALLS = [
  ['wall', 64],
  ['wall_cracked', 16],
  ['wall_broken', 10],
  ['wall_arched', 10],
];

const EDGE_PROPS = [
  ['barrel_large', 18, true],
  ['box_large', 16, true],
  ['crates_stacked', 12, true],
  ['barrel_small_stack', 14, true],
  ['keg', 10, true],
  ['table_medium_broken', 8, true],
  ['rubble_half', 10, false],
  ['coin_stack_small', 6, false],
  ['bottle_A_brown', 6, false],
];

function pickWeighted(rand, options) {
  const total = options.reduce((sum, o) => sum + o[1], 0);
  let roll = rand() * total;
  for (const option of options) {
    roll -= option[1];
    if (roll <= 0) return option;
  }
  return options[0];
}

// dir: 0=+x 1=-x 2=+z 3=-z ; rotation so the wall's face points into the room
const DIR_ROT = [Math.PI / 2, -Math.PI / 2, 0, Math.PI];
const DIR_VEC = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class DungeonBuilder {
  constructor(assets, physics, scene) {
    this.assets = assets;
    this.physics = physics;
    this.scene = scene;
    this.G = assets.gridSize;
    this.torchPoints = [];
    this.staticBodies = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  cellCenter(x, z) {
    return [x * this.G + this.G / 2, z * this.G + this.G / 2];
  }

  // Track every static collider so the whole stage can be torn down on transition.
  trackBox(cx, cy, cz, hx, hy, hz) {
    const body = this.physics.addStaticBox(cx, cy, cz, hx, hy, hz);
    this.staticBodies.push(body);
    return body;
  }

  async build(layout, theme = {}) {
    this.theme = theme;
    this.floorVariants = theme.floors ?? DEFAULT_FLOORS;
    this.wallVariants = theme.walls ?? DEFAULT_WALLS;
    this.torchChance = theme.torchChance ?? 0.22;

    const rand = mulberry32(layout.seed * 7919 + 13);
    const names = [
      ...this.floorVariants.map((v) => v[0]),
      ...this.wallVariants.map((v) => v[0]),
      ...EDGE_PROPS.map((v) => v[0]),
      'wall_gated', 'wall_doorway', 'pillar', 'torch_mounted',
      'banner_patternA_red', 'banner_shield_red', 'chest_gold', 'wall_corner_small',
    ];
    await this.assets.resolveTiles([...new Set(names)]);

    this.buildFloors(layout, rand);
    this.buildWalls(layout, rand);
    this.buildGates(layout);
    this.buildRoomDressing(layout, rand);
    return this.roomBounds(layout);
  }

  // Remove all meshes + colliders for this stage so the next can be built clean.
  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      }
    });
    for (const body of this.staticBodies) this.physics.removeBody(body);
    this.staticBodies = [];
    for (const list of this.gatesByRoom?.values() ?? []) {
      for (const gate of list) if (gate.body) this.physics.removeBody(gate.body);
    }
  }

  buildFloors(layout, rand) {
    for (const key of layout.floor.keys()) {
      const [x, z] = key.split(',').map(Number);
      const [name] = pickWeighted(rand, this.floorVariants);
      const tile = this.assets.tileSync(name);
      const info = this.assets.tileInfo(name);
      const [cx, cz] = this.cellCenter(x, z);
      // Anchor so the tile's top surface sits at y=0 regardless of thickness.
      tile.position.set(
        cx - (info.min[0] + info.max[0]) / 2,
        -info.max[1],
        cz - (info.min[2] + info.max[2]) / 2,
      );
      tile.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = true;
        }
      });
      this.group.add(tile);
    }
  }

  placeWallPiece(name, x, z, dir, { collider = true } = {}) {
    const tile = this.assets.tileSync(name);
    const info = this.assets.tileInfo(name);
    const [cx, cz] = this.cellCenter(x, z);
    const depth = info.size[2];
    const [dx, dz] = DIR_VEC[dir];
    // Wall sits on the cell edge, body extending outward from the floor.
    const ex = cx + dx * (this.G / 2 + depth / 2 - 0.02);
    const ez = cz + dz * (this.G / 2 + depth / 2 - 0.02);

    const holder = new THREE.Group();
    const centerOffset = new THREE.Vector3(
      -(info.min[0] + info.max[0]) / 2,
      -info.min[1],
      -(info.min[2] + info.max[2]) / 2,
    );
    tile.position.copy(centerOffset);
    holder.add(tile);
    holder.rotation.y = DIR_ROT[dir];
    holder.position.set(ex, 0, ez);
    this.group.add(holder);

    if (collider) {
      this.trackBox(ex, info.size[1] / 2, ez,
        dir < 2 ? depth / 2 : this.G / 2,
        info.size[1] / 2,
        dir < 2 ? this.G / 2 : depth / 2,
      );
    }
    return holder;
  }

  buildWalls(layout, rand) {
    for (const wall of layout.walls) {
      const [name] = pickWeighted(rand, this.wallVariants);
      const holder = this.placeWallPiece(name, wall.x, wall.z, wall.dir);

      // South-edge walls sit between the camera and the floor — squash them
      // so they never occlude the action (collider stays full height).
      if (wall.dir === 2) {
        holder.scale.y = 0.3;
        continue;
      }

      // Mounted torch on some inner walls — recorded as light anchor points.
      if (rand() < this.torchChance) {
        const [cx, cz] = this.cellCenter(wall.x, wall.z);
        const [dx, dz] = DIR_VEC[wall.dir];
        const tx = cx + dx * (this.G / 2 - 0.45);
        const tz = cz + dz * (this.G / 2 - 0.45);
        const torch = this.assets.tileSync('torch_mounted');
        torch.position.set(tx, 2.2, tz);
        torch.rotation.y = DIR_ROT[wall.dir] + Math.PI;
        this.group.add(torch);
        this.torchPoints.push(new THREE.Vector3(tx + dx * -0.15, 3.1, tz + dz * -0.15));
      } else if (rand() < 0.08) {
        const [cx, cz] = this.cellCenter(wall.x, wall.z);
        const [dx, dz] = DIR_VEC[wall.dir];
        const banner = this.assets.tileSync(rand() < 0.5 ? 'banner_patternA_red' : 'banner_shield_red');
        banner.position.set(cx + dx * (this.G / 2 - 0.25), 3.6, cz + dz * (this.G / 2 - 0.25));
        banner.rotation.y = DIR_ROT[wall.dir] + Math.PI;
        this.group.add(banner);
      }
    }
  }

  buildGates(layout) {
    this.gatesByRoom = new Map();
    for (const gate of layout.gates) {
      const holder = this.placeWallPiece('wall_gated', gate.x, gate.z, gate.dir, { collider: false });
      holder.visible = false;
      if (gate.dir === 2) holder.scale.y = 0.3;
      const [cx, cz] = this.cellCenter(gate.x, gate.z);
      const [dx, dz] = DIR_VEC[gate.dir];
      const entry = {
        holder,
        body: null,
        pos: {
          x: cx + dx * this.G / 2,
          z: cz + dz * this.G / 2,
          hx: gate.dir < 2 ? 0.5 : this.G / 2,
          hz: gate.dir < 2 ? this.G / 2 : 0.5,
        },
      };
      if (!this.gatesByRoom.has(gate.roomId)) this.gatesByRoom.set(gate.roomId, []);
      this.gatesByRoom.get(gate.roomId).push(entry);
    }
  }

  setRoomLocked(roomId, locked) {
    for (const gate of this.gatesByRoom.get(roomId) ?? []) {
      gate.holder.visible = locked;
      if (locked && !gate.body) {
        gate.body = this.physics.addStaticBox(gate.pos.x, 2, gate.pos.z, gate.pos.hx, 2, gate.pos.hz);
      } else if (!locked && gate.body) {
        this.physics.removeBody(gate.body);
        gate.body = null;
      }
    }
  }

  buildRoomDressing(layout, rand) {
    for (const room of layout.rooms) {
      this.dressRoom(layout, room, rand);
    }
  }

  dressRoom(layout, room, rand) {
    const isDoorAdjacent = (x, z) =>
      layout.gates.some((g) => g.roomId === room.id && Math.abs(g.x - x) + Math.abs(g.z - z) <= 1);

    // Pillars inset from corners of larger rooms (with colliders).
    if (room.w >= 6 && room.h >= 6) {
      const spots = [
        [room.gx + 1, room.gz + 1],
        [room.gx + room.w - 2, room.gz + 1],
        [room.gx + 1, room.gz + room.h - 2],
        [room.gx + room.w - 2, room.gz + room.h - 2],
      ];
      for (const [x, z] of spots) {
        if (rand() < 0.7 && !isDoorAdjacent(x, z)) {
          const [cx, cz] = this.cellCenter(x, z);
          const pillar = this.assets.tileSync('pillar');
          const info = this.assets.tileInfo('pillar');
          pillar.position.set(cx - (info.min[0] + info.max[0]) / 2, 0, cz - (info.min[2] + info.max[2]) / 2);
          this.group.add(pillar);
          this.trackBox(cx, 2, cz, 0.75, 2, 0.75);
        }
      }
    }

    // Props along interior edge cells.
    for (let x = room.gx; x < room.gx + room.w; x++) {
      for (let z = room.gz; z < room.gz + room.h; z++) {
        const onEdge =
          x === room.gx || x === room.gx + room.w - 1 || z === room.gz || z === room.gz + room.h - 1;
        if (!onEdge || rand() > 0.18 || isDoorAdjacent(x, z)) continue;
        const [name, , solid] = pickWeighted(rand, EDGE_PROPS);
        const info = this.assets.tileInfo(name);
        const prop = this.assets.tileSync(name);
        const [cx, cz] = this.cellCenter(x, z);
        const jx = cx + (rand() - 0.5) * 1.2;
        const jz = cz + (rand() - 0.5) * 1.2;
        prop.position.set(jx - (info.min[0] + info.max[0]) / 2, 0, jz - (info.min[2] + info.max[2]) / 2);
        prop.rotation.y = rand() * Math.PI * 2;
        this.group.add(prop);
        if (solid) {
          this.trackBox(jx, info.size[1] / 2, jz,
            Math.min(1.1, info.size[0] / 2), info.size[1] / 2, Math.min(1.1, info.size[2] / 2));
        }
      }
    }

    // Reward chest in the final room.
    if (room.type === 'final') {
      const [cx, cz] = this.cellCenter(room.gx + room.w - 2, room.gz + Math.floor(room.h / 2));
      const chest = this.assets.tileSync('chest_gold');
      chest.position.set(cx, 0, cz);
      chest.rotation.y = -Math.PI / 2;
      this.group.add(chest);
      this.chestPos = new THREE.Vector3(cx, 0, cz);
    }
  }

  roomBounds(layout) {
    return layout.rooms.map((room) => {
      const minX = room.gx * this.G;
      const minZ = room.gz * this.G;
      return {
        ...room,
        minX,
        minZ,
        maxX: minX + room.w * this.G,
        maxZ: minZ + room.h * this.G,
        centerX: minX + (room.w * this.G) / 2,
        centerZ: minZ + (room.h * this.G) / 2,
      };
    });
  }
}
