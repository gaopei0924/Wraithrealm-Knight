import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();

export class Assets {
  constructor() {
    this.gltfCache = new Map();
    this.tileManifest = null;
  }

  async loadTileManifest() {
    const res = await fetch('/assets/tile-manifest.json');
    if (!res.ok) throw new Error('tile-manifest.json missing — run npm run assets:measure');
    this.tileManifest = await res.json();
    return this.tileManifest;
  }

  async loadGltf(path) {
    if (this.gltfCache.has(path)) return this.gltfCache.get(path);
    const promise = loader.loadAsync(path).then((gltf) => {
      gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      return gltf;
    });
    this.gltfCache.set(path, promise);
    return promise;
  }

  async preload(paths, onProgress) {
    let done = 0;
    await Promise.all(
      paths.map(async (p) => {
        await this.loadGltf(p);
        done++;
        onProgress?.(done / paths.length);
      }),
    );
  }

  // Static dungeon piece: cheap clone sharing geometry & materials.
  async tile(name) {
    const gltf = await this.loadGltf(`/assets/dungeon/${name}.glb`);
    return gltf.scene.clone(true);
  }

  tileSync(name) {
    // preloaded promise is resolved; caller must have preloaded
    const cached = this._resolved?.get(name);
    if (cached) return cached.scene.clone(true);
    throw new Error(`tile ${name} not preloaded`);
  }

  async resolveTiles(names) {
    this._resolved = new Map();
    for (const name of names) {
      const gltf = await this.loadGltf(`/assets/dungeon/${name}.glb`);
      this._resolved.set(name, gltf);
    }
  }

  // Skinned character: needs SkeletonUtils clone; returns scene + animation clips.
  async character(name) {
    const gltf = await this.loadGltf(`/assets/characters/${name}.glb`);
    const scene = cloneSkinned(gltf.scene);
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
        if (obj.material) obj.frustumCulled = false;
      }
    });
    return { scene, animations: gltf.animations };
  }

  tileInfo(name) {
    return this.tileManifest?.tiles?.[name] ?? null;
  }

  get gridSize() {
    return this.tileManifest?.gridSize ?? 4;
  }
}

export { THREE };
