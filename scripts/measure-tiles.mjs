// Measures the world-space bounding box of every dungeon GLB by parsing the
// glTF JSON chunk directly (accessor min/max + node transform hierarchy).
// Output: public/assets/tile-manifest.json, consumed by the dungeon generator
// so tiles snap together regardless of their authored size.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DUNGEON_DIR = join(ROOT, 'public', 'assets', 'dungeon');
const OUT_PATH = join(ROOT, 'public', 'assets', 'tile-manifest.json');

function parseGlbJson(buffer) {
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('not a GLB file');
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) throw new Error('first chunk is not JSON');
  return JSON.parse(buffer.subarray(20, 20 + chunkLength).toString('utf8'));
}

// --- minimal 4x4 column-major matrix math (glTF convention) ---
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function nodeLocalMatrix(node) {
  if (node.matrix) return node.matrix;
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  // rotation matrix from quaternion, then scale columns, then translation
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function expandBox(box, point) {
  for (let i = 0; i < 3; i++) {
    box.min[i] = Math.min(box.min[i], point[i]);
    box.max[i] = Math.max(box.max[i], point[i]);
  }
}

function measureGltf(gltf) {
  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

  function walk(nodeIndex, parentMatrix) {
    const node = gltf.nodes[nodeIndex];
    const world = multiply(parentMatrix, nodeLocalMatrix(node));
    if (node.mesh !== undefined) {
      for (const prim of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[prim.attributes.POSITION];
        if (!accessor?.min || !accessor?.max) continue;
        // transform all 8 corners of the local AABB
        for (let i = 0; i < 8; i++) {
          const corner = [
            (i & 1 ? accessor.max : accessor.min)[0],
            (i & 2 ? accessor.max : accessor.min)[1],
            (i & 4 ? accessor.max : accessor.min)[2],
          ];
          expandBox(box, transformPoint(world, corner));
        }
      }
    }
    for (const child of node.children ?? []) walk(child, world);
  }

  const scene = gltf.scenes[gltf.scene ?? 0];
  for (const root of scene.nodes) walk(root, IDENTITY);
  if (!Number.isFinite(box.min[0])) throw new Error('no measurable geometry');
  return box;
}

async function run() {
  const files = (await readdir(DUNGEON_DIR)).filter((f) => f.endsWith('.glb')).sort();
  const tiles = {};
  for (const file of files) {
    const gltf = parseGlbJson(await readFile(join(DUNGEON_DIR, file)));
    const { min, max } = measureGltf(gltf);
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const round = (v) => Math.round(v * 10000) / 10000;
    tiles[file.replace(/\.glb$/, '')] = {
      min: min.map(round),
      max: max.map(round),
      size: size.map(round),
    };
    console.log(`  ${file}: size ${size.map((v) => v.toFixed(3)).join(' x ')}`);
  }

  // Derive the dungeon grid unit from the canonical floor tile.
  const floor = tiles['floor_tile_large'];
  const gridSize = Math.round(Math.max(floor.size[0], floor.size[2]) * 1000) / 1000;
  const manifest = { gridSize, tiles };
  await writeFile(OUT_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nGrid unit: ${gridSize}m. Wrote ${Object.keys(tiles).length} entries to ${OUT_PATH}`);
}

run();
