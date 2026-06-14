// Curated CC0 asset list (KayKit by Kay Lousberg, https://kaylousberg.com, CC0 license).
// Downloaded from the official KayKit-Game-Assets GitHub mirrors.

const GH = 'https://raw.githubusercontent.com/KayKit-Game-Assets';

const DUNGEON_BASE = `${GH}/KayKit-Dungeon-Remastered-1.0/main/addons/kaykit_dungeon_remastered/Assets/gltf`;
const ADV_BASE = `${GH}/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf`;
const SKEL_BASE = `${GH}/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf`;

// Dungeon modules. Most files use the `<name>.gltf.glb` suffix; a few are plain `.glb`.
const dungeonTiles = [
  // floors
  'floor_tile_large.gltf.glb',
  'floor_tile_large_rocks.gltf.glb',
  'floor_tile_small.gltf.glb',
  'floor_tile_small_broken_A.gltf.glb',
  'floor_tile_small_broken_B.gltf.glb',
  'floor_tile_small_decorated.gltf.glb',
  'floor_tile_small_weeds_A.gltf.glb',
  'floor_tile_big_grate.gltf.glb',
  'floor_dirt_large.gltf.glb',
  'floor_dirt_large_rocky.gltf.glb',
  // walls
  'wall.gltf.glb',
  'wall_cracked.gltf.glb',
  'wall_broken.gltf.glb',
  'wall_corner.gltf.glb',
  'wall_corner_small.gltf.glb',
  'wall_endcap.gltf.glb',
  'wall_doorway.glb',
  'wall_arched.gltf.glb',
  'wall_archedwindow_gated.gltf.glb',
  'wall_gated.gltf.glb',
  'wall_half.gltf.glb',
  'wall_pillar.gltf.glb',
  'wall_shelves.gltf.glb',
  // structure & decor
  'pillar.gltf.glb',
  'pillar_decorated.gltf.glb',
  'column.gltf.glb',
  'stairs_wide.gltf.glb',
  'torch_mounted.gltf.glb',
  'torch_lit.gltf.glb',
  'banner_patternA_red.gltf.glb',
  'banner_shield_red.gltf.glb',
  'barrel_large.gltf.glb',
  'barrel_small_stack.gltf.glb',
  'box_large.gltf.glb',
  'box_stacked.gltf.glb',
  'crates_stacked.gltf.glb',
  'keg.gltf.glb',
  'chest.glb',
  'chest_gold.glb',
  'table_medium_broken.gltf.glb',
  'rubble_half.gltf.glb',
  'rubble_large.gltf.glb',
  'coin_stack_small.gltf.glb',
  'bottle_A_brown.gltf.glb',
  'candle_lit.gltf.glb',
];

const characters = [
  { url: `${ADV_BASE}/Knight.glb`, out: 'characters/Knight.glb' },
  { url: `${ADV_BASE}/Barbarian.glb`, out: 'characters/Barbarian.glb' },
  { url: `${ADV_BASE}/Mage.glb`, out: 'characters/Mage.glb' },
  { url: `${ADV_BASE}/Rogue.glb`, out: 'characters/Rogue.glb' },
  { url: `${ADV_BASE}/Rogue_Hooded.glb`, out: 'characters/Rogue_Hooded.glb' },
  { url: `${SKEL_BASE}/Skeleton_Minion.glb`, out: 'characters/Skeleton_Minion.glb' },
  { url: `${SKEL_BASE}/Skeleton_Warrior.glb`, out: 'characters/Skeleton_Warrior.glb' },
  { url: `${SKEL_BASE}/Skeleton_Rogue.glb`, out: 'characters/Skeleton_Rogue.glb' },
  { url: `${SKEL_BASE}/Skeleton_Mage.glb`, out: 'characters/Skeleton_Mage.glb' },
];

const licenses = [
  {
    url: `${GH}/KayKit-Dungeon-Remastered-1.0/main/addons/kaykit_dungeon_remastered/Assets/LICENSE.txt`,
    out: 'LICENSE-kaykit-dungeon.txt',
  },
  {
    url: `${GH}/KayKit-Character-Pack-Adventures-1.0/main/LICENSE.txt`,
    out: 'LICENSE-kaykit-adventurers.txt',
  },
  {
    url: `${GH}/KayKit-Character-Pack-Skeletons-1.0/main/LICENSE.txt`,
    out: 'LICENSE-kaykit-skeletons.txt',
  },
];

// Normalized output name: strip the redundant ".gltf" from ".gltf.glb".
const tileOut = (file) => `dungeon/${file.replace(/\.gltf\.glb$/, '.glb')}`;

export const ASSETS = [
  ...dungeonTiles.map((file) => ({ url: `${DUNGEON_BASE}/${file}`, out: tileOut(file) })),
  ...characters,
  ...licenses,
];
