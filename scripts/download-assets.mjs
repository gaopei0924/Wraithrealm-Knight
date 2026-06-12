// Downloads all CC0 assets listed in asset-manifest.mjs into public/assets/.
// Idempotent: skips files that already exist with non-zero size.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './asset-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'assets');
const CONCURRENCY = 8;
const RETRIES = 3;

async function exists(path) {
  try {
    const s = await stat(path);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      if (attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastError;
}

async function downloadOne(asset) {
  const outPath = join(OUT_DIR, asset.out);
  if (await exists(outPath)) return { ...asset, status: 'cached' };
  const data = await fetchWithRetry(asset.url);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, data);
  return { ...asset, status: 'downloaded', bytes: data.length };
}

async function run() {
  console.log(`Downloading ${ASSETS.length} assets to ${OUT_DIR} ...`);
  const queue = [...ASSETS];
  const failures = [];
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const asset = queue.shift();
      try {
        const result = await downloadOne(asset);
        done++;
        const note = result.status === 'cached' ? '(cached)' : `${result.bytes} bytes`;
        console.log(`  [${done}/${ASSETS.length}] ${asset.out} ${note}`);
      } catch (err) {
        failures.push({ asset, err });
        console.error(`  FAILED ${asset.out}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failures.length > 0) {
    console.error(`\n${failures.length} downloads failed.`);
    process.exit(1);
  }
  console.log('All assets ready.');
}

run();
