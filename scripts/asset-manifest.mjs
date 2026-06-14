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
  // --- expanded decor / furniture / structure (50+ more CC0 props) ---
  'bed_decorated.gltf.glb', 'bed_frame.gltf.glb', 'chair.gltf.glb', 'stool.gltf.glb',
  'shelf_large.gltf.glb', 'shelf_small.gltf.glb', 'shelf_small_candles.gltf.glb', 'shelves.gltf.glb',
  'table_long.gltf.glb', 'table_long_decorated_A.gltf.glb', 'table_long_tablecloth.gltf.glb',
  'table_medium.gltf.glb', 'table_medium_decorated_A.gltf.glb', 'table_medium_tablecloth.gltf.glb',
  'table_small.gltf.glb', 'table_small_decorated_A.gltf.glb', 'table_small_decorated_B.gltf.glb',
  'barrel_large_decorated.gltf.glb', 'barrel_small.gltf.glb', 'keg_decorated.gltf.glb',
  'box_small.gltf.glb', 'box_small_decorated.gltf.glb',
  'candle.gltf.glb', 'candle_triple.gltf.glb', 'candle_thin_lit.gltf.glb',
  'plate_stack.gltf.glb', 'plate_food_A.gltf.glb',
  'bottle_A_green.gltf.glb', 'bottle_B_brown.gltf.glb', 'bottle_C_green.gltf.glb',
  'coin_stack_large.gltf.glb', 'coin_stack_medium.gltf.glb',
  'sword_shield.gltf.glb', 'sword_shield_gold.gltf.glb', 'sword_shield_broken.gltf.glb',
  'trunk_large_A.gltf.glb', 'trunk_medium_A.gltf.glb', 'trunk_small_A.gltf.glb',
  'barrier.gltf.glb', 'barrier_column.gltf.glb', 'barrier_corner.gltf.glb',
  'key.gltf.glb', 'keyring_hanging.gltf.glb',
  // structure / wall variants
  'wall_window_open.gltf.glb', 'wall_window_closed.gltf.glb', 'wall_archedwindow_open.gltf.glb',
  'wall_crossing.gltf.glb', 'wall_Tsplit.gltf.glb', 'wall_sloped.gltf.glb', 'wall_doorway_sides.gltf.glb',
  'stairs.gltf.glb', 'stairs_wood.gltf.glb', 'stairs_wood_decorated.gltf.glb',
  // new floor families (wood / grates) for biome variety
  'floor_wood_large.gltf.glb', 'floor_wood_large_dark.gltf.glb', 'floor_wood_small.gltf.glb',
  'floor_tile_grate.gltf.glb', 'floor_tile_big_spikes.glb',
  // extra banners (more colors)
  'banner_blue.gltf.glb', 'banner_green.gltf.glb', 'banner_yellow.gltf.glb', 'banner_white.gltf.glb',
  'banner_thin_red.gltf.glb', 'banner_triple_green.gltf.glb',
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
