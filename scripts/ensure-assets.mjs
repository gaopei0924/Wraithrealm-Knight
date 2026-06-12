// Runs before `vite` in npm run dev: downloads assets and measures tiles
// only if missing, so the first `npm run dev` works from a fresh clone.
import { stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'public', 'assets', 'tile-manifest.json');
const PROBE = join(ROOT, 'public', 'assets', 'characters', 'Knight.glb');

async function exists(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

function runStep(script) {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', script)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!(await exists(PROBE))) runStep('download-assets.mjs');
if (!(await exists(MANIFEST))) runStep('measure-tiles.mjs');
console.log('Assets OK.');
