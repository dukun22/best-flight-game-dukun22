// main.ts — Langit Nusantara: menyerahkan game ke /output.
// Menyalin game/ dan screenshots/ dari repo, lalu menulis dossier.json
// dengan buildDossier dari vendor/makefun-game.ts (salinan kit, tanpa diubah).
// Node 22, stdlib saja. Dua kali jalan harus menulis byte yang sama.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(src: string, dest: string): void {
  if (!existsSync(src)) throw new Error(`tidak ada: ${src}`);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  // Ringkasan isi /output untuk memudahkan verifikasi (deterministik: urutan nama).
  const listing: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      const r = rel === '' ? name : `${rel}/${name}`;
      if (statSync(p).isDirectory()) walk(p, r);
      else listing.push(`${r} (${statSync(p).size} bytes)`);
    }
  };
  walk(outDir, '');
  console.log(`Langit Nusantara -> ${outDir} (dossier ${dossier.length} bytes)`);
  for (const line of listing) console.log(`  ${line}`);
}

main();
