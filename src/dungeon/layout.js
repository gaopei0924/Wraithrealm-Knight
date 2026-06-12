// Pure dungeon layout generation in grid-cell space (no three.js here).
// A run is a Hades-style chain: start room → combat rooms → final room,
// connected by 1-cell-wide corridors. All sizes in grid cells; the builder
// multiplies by the measured tile size.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cellKey = (x, z) => `${x},${z}`;

function rectCells(rect) {
  const cells = [];
  for (let x = rect.gx; x < rect.gx + rect.w; x++) {
    for (let z = rect.gz; z < rect.gz + rect.h; z++) {
      cells.push([x, z]);
    }
  }
  return cells;
}

const WAVE_PLANS = [
  null, // start room: no waves
  [{ count: 3, types: ['minion'] }, { count: 4, types: ['minion', 'rogue'] }],
  [{ count: 4, types: ['minion', 'rogue'] }, { count: 5, types: ['minion', 'rogue', 'mage'] }],
  [
    { count: 4, types: ['minion', 'warrior'] },
    { count: 4, types: ['rogue', 'mage'] },
    { count: 5, types: ['minion', 'warrior', 'mage'] },
  ],
  [
    { count: 4, types: ['warrior', 'rogue'] },
    { count: 5, types: ['minion', 'warrior', 'mage'] },
    { count: 6, types: ['warrior', 'rogue', 'mage'] },
  ],
];

export function generateLayout(seed = 1) {
  const rand = mulberry32(seed);
  const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  const rooms = [];
  const corridors = [];

  let prev = { gx: 0, gz: -3, w: 5, h: 6 };
  rooms.push({ ...prev, id: 0, type: 'start', waves: null });

  const combatCount = 4;
  for (let i = 1; i <= combatCount + 1; i++) {
    const isFinal = i === combatCount + 1;
    const w = isFinal ? 9 : randInt(6, 8);
    const h = isFinal ? 8 : randInt(5, 7);

    // Door row on prev room's east wall (interior, away from corners).
    const doorZ = prev.gz + 1 + randInt(0, prev.h - 3);
    const corridorLen = randInt(2, 3);
    const corridor = { gx: prev.gx + prev.w, gz: doorZ, w: corridorLen, h: 1 };
    corridors.push(corridor);

    // New room positioned so the corridor row is inside its west wall.
    const gz = doorZ - 1 - randInt(0, h - 3);
    const room = {
      id: i,
      gx: corridor.gx + corridorLen,
      gz,
      w,
      h,
      type: isFinal ? 'final' : 'combat',
      waves: WAVE_PLANS[Math.min(i, WAVE_PLANS.length - 1)],
    };
    rooms.push(room);
    prev = room;
  }

  // Global floor-cell set + cell → owner map.
  const floor = new Map(); // key → { owner: 'room'|'corridor', id }
  for (const room of rooms) {
    for (const [x, z] of rectCells(room)) {
      floor.set(cellKey(x, z), { owner: 'room', id: room.id });
    }
  }
  corridors.forEach((c, idx) => {
    for (const [x, z] of rectCells(c)) {
      floor.set(cellKey(x, z), { owner: 'corridor', id: idx });
    }
  });

  // Walls: any floor cell edge whose neighbor is not floor.
  // dir: 0=+x(east) 1=-x(west) 2=+z(south) 3=-z(north)
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const walls = [];
  for (const key of floor.keys()) {
    const [x, z] = key.split(',').map(Number);
    DIRS.forEach(([dx, dz], dir) => {
      if (!floor.has(cellKey(x + dx, z + dz))) {
        walls.push({ x, z, dir });
      }
    });
  }

  // Gates: room-cell edges that border a corridor cell. Grouped per room so a
  // room can seal every entrance while its waves are active.
  const gates = [];
  for (const room of rooms) {
    for (const [x, z] of rectCells(room)) {
      DIRS.forEach(([dx, dz], dir) => {
        const neighbor = floor.get(cellKey(x + dx, z + dz));
        if (neighbor?.owner === 'corridor') {
          gates.push({ roomId: room.id, x, z, dir });
        }
      });
    }
  }

  return { seed, rooms, corridors, floor, walls, gates };
}
