// sky.js — Langit Nusantara: dunia kepulauan, terrain, awan, dan matahari.
// Semua gambar digambar dari kode (canvas vector), tanpa aset luar.
// Dunia deterministik: PRNG berseri (mulberry32) dengan seed tetap.

export const WORLD_W = 14000;
export const SEA_Y = 620;
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

/** PRNG deterministik mulberry32. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Membangun dunia: pulau-pulau, gunung, kota, dan dua landasan. */
export function buildWorld() {
  const rnd = mulberry32(20261126);
  const islands = [];
  // Pulau 1: landasan awal (datar, pantai)
  islands.push({ x0: 0, x1: 1000, peak: 26, kind: 'beach' });
  // Pulau-pulau berikutnya: campuran bukit, sawah, gunung, kota
  const kinds = ['hill', 'rice', 'mountain', 'town', 'mountain', 'rice'];
  let x = 1400;
  for (const kind of kinds) {
    const w = 900 + rnd() * 900;
    const peak = kind === 'mountain' ? 300 + rnd() * 130 : kind === 'hill' ? 120 + rnd() * 90 : 60 + rnd() * 60;
    islands.push({ x0: x, x1: x + w, peak, kind });
    x += w + 500 + rnd() * 700;
  }
  // Pulau terakhir: landasan akhir
  islands.push({ x0: 12600, x1: 14000, peak: 24, kind: 'beach' });
  // Awan (posisi tetap, parallax)
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({ x: rnd() * WORLD_W, y: 40 + rnd() * 220, s: 0.6 + rnd() * 1.1, v: 4 + rnd() * 8 });
  }
  // Burung-burung kecil di langit
  const birds = [];
  for (let i = 0; i < 10; i++) {
    birds.push({ x: 800 + rnd() * 12000, y: 120 + rnd() * 220, p: rnd() * Math.PI * 2, s: 0.7 + rnd() * 0.6 });
  }
  return { islands, clouds, birds, runways: [{ x0: 250, x1: 850 }, { x0: 12750, x1: 13550 }] };
}

/** Ketinggian permukaan tanah/laut pada x (y layar; makin kecil = makin tinggi). */
export function heightAt(world, x) {
  for (const isl of world.islands) {
    if (x >= isl.x0 && x <= isl.x1) {
      const t = (x - isl.x0) / (isl.x1 - isl.x0);
      const bump = Math.sin(t * Math.PI);
      if (isl.kind === 'mountain') {
        // Dua puncak runcing
        const p1 = Math.exp(-Math.pow((t - 0.35) * 4, 2));
        const p2 = Math.exp(-Math.pow((t - 0.7) * 4, 2));
        return SEA_Y - isl.peak * Math.max(p1, p2) - 20 * bump;
      }
      return SEA_Y - isl.peak * bump;
    }
  }
  return SEA_Y;
}

/** Apakah x berada di atas landasan (untuk pendaratan). */
export function runwayAt(world, x) {
  for (const r of world.runways) {
    if (x >= r.x0 && x <= r.x1) return r;
  }
  return null;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawCloud(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 20, 0, 0, Math.PI * 2);
  ctx.ellipse(-30, 6, 30, 15, 0, 0, Math.PI * 2);
  ctx.ellipse(32, 6, 32, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -12, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Menggambar langit, laut, dan terrain. camX = posisi kamera (dunia). */
export function drawWorld(ctx, world, camX, t) {
  // Langit: gradasi siang
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, '#2f7fd0');
  sky.addColorStop(0.45, '#7ec3ee');
  sky.addColorStop(0.62, '#cfeefb');
  sky.addColorStop(0.63, '#3f9fd8');
  sky.addColorStop(1, '#0b5e9e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Matahari
  ctx.save();
  ctx.translate(1080, 84);
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 90);
  glow.addColorStop(0, 'rgba(255,244,180,0.95)');
  glow.addColorStop(0.35, 'rgba(255,220,110,0.55)');
  glow.addColorStop(1, 'rgba(255,220,110,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gunung jauh (parallax 0.25)
  ctx.save();
  ctx.fillStyle = 'rgba(70,120,170,0.55)';
  const off = -camX * 0.25;
  for (let i = 0; i < 14; i++) {
    const bx = ((i * 1100 + off) % (WORLD_W * 0.25 + 1400) + WORLD_W * 0.25 + 1400) % (WORLD_W * 0.25 + 1400) - 700;
    const bh = 130 + ((i * 137) % 120);
    ctx.beginPath();
    ctx.moveTo(bx - 260, SEA_Y);
    ctx.lineTo(bx, SEA_Y - bh);
    ctx.lineTo(bx + 260, SEA_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Awan (parallax 0.5, bergerak pelan)
  for (const c of world.clouds) {
    const sx = ((c.x - camX * 0.5 + t * c.v) % (WORLD_W + 400)) - 200;
    if (sx > -160 && sx < CANVAS_W + 160) drawCloud(ctx, sx, c.y, c.s);
  }

  // Burung
  ctx.strokeStyle = 'rgba(40,60,80,0.8)';
  ctx.lineWidth = 2;
  for (const b of world.birds) {
    const sx = b.x - camX * 0.7;
    if (sx < -40 || sx > CANVAS_W + 40) continue;
    const flap = Math.sin(t * 6 + b.p) * 4 * b.s;
    ctx.beginPath();
    ctx.moveTo(sx - 9 * b.s, b.y - flap);
    ctx.quadraticCurveTo(sx, b.y + 3, sx + 9 * b.s, b.y - flap);
    ctx.stroke();
  }

  // Laut: permukaan + ombak
  ctx.fillStyle = '#1b7fb8';
  ctx.fillRect(0, SEA_Y, CANVAS_W, CANVAS_H - SEA_Y);
  const wave = ctx.createLinearGradient(0, SEA_Y, 0, CANVAS_H);
  wave.addColorStop(0, 'rgba(120,210,240,0.5)');
  wave.addColorStop(0.25, 'rgba(20,110,170,0.25)');
  wave.addColorStop(1, 'rgba(4,50,100,0.55)');
  ctx.fillStyle = wave;
  ctx.fillRect(0, SEA_Y, CANVAS_W, CANVAS_H - SEA_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let x = 0; x < CANVAS_W; x += 90) {
    const wx = x + ((t * 22) % 90);
    ctx.beginPath();
    ctx.arc(wx, SEA_Y + 14 + Math.sin(t * 2 + x) * 3, 12, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  // Pulau-pulau (terrain)
  for (const isl of world.islands) {
    const x0 = isl.x0 - camX;
    const x1 = isl.x1 - camX;
    if (x1 < -50 || x0 > CANVAS_W + 50) continue;
    ctx.beginPath();
    ctx.moveTo(x0, SEA_Y + 2);
    for (let sx = Math.max(0, x0); sx <= Math.min(CANVAS_W, x1); sx += 6) {
      const wx = sx + camX;
      ctx.lineTo(sx, heightAt(world, wx));
    }
    ctx.lineTo(x1, SEA_Y + 2);
    ctx.closePath();
    // Warna per jenis pulau
    if (isl.kind === 'beach') {
      ctx.fillStyle = '#e8d9a0';
    } else if (isl.kind === 'rice') {
      ctx.fillStyle = '#5da244';
    } else if (isl.kind === 'town') {
      ctx.fillStyle = '#6fa055';
    } else if (isl.kind === 'mountain') {
      ctx.fillStyle = '#4d7a45';
    } else {
      ctx.fillStyle = '#63a84e';
    }
    ctx.fill();
    // Garis pantai pasir
    ctx.strokeStyle = 'rgba(240,225,170,0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let sx = Math.max(0, x0); sx <= Math.min(CANVAS_W, x1); sx += 6) {
      const wx = sx + camX;
      const y = heightAt(world, wx);
      if (sx === Math.max(0, x0)) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.stroke();

    if (isl.kind === 'mountain') {
      // Salju di puncak
      for (const f of [0.35, 0.7]) {
        const px = isl.x0 + (isl.x1 - isl.x0) * f - camX;
        const py = SEA_Y - isl.peak;
        if (px < -60 || px > CANVAS_W + 60) continue;
        ctx.fillStyle = '#f4f8ff';
        ctx.beginPath();
        ctx.moveTo(px - 34, py + 34);
        ctx.lineTo(px, py - 6);
        ctx.lineTo(px + 34, py + 34);
        ctx.lineTo(px + 16, py + 22);
        ctx.lineTo(px, py + 30);
        ctx.lineTo(px - 16, py + 22);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (isl.kind === 'rice') {
      // Terasering sawah
      ctx.strokeStyle = 'rgba(30,90,40,0.55)';
      ctx.lineWidth = 2;
      const mid = (isl.x0 + isl.x1) / 2;
      for (let k = 1; k <= 4; k++) {
        const y = SEA_Y - (isl.peak * k) / 5;
        const half = ((isl.x1 - isl.x0) / 2) * Math.sqrt(1 - (k / 5) * (k / 5) * 0.9);
        ctx.beginPath();
        ctx.moveTo(mid - half - camX, y);
        ctx.lineTo(mid + half - camX, y);
        ctx.stroke();
      }
      // Pohon kelapa
      for (let k = 0; k < 5; k++) {
        const px = isl.x0 + 120 + k * 160 - camX;
        const py = heightAt(world, isl.x0 + 120 + k * 160);
        if (px < -20 || px > CANVAS_W + 20) continue;
        drawPalm(ctx, px, py);
      }
    }
    if (isl.kind === 'town') {
      // Kota kecil: rumah-rumah
      const rnd = mulberry32(99);
      for (let k = 0; k < 9; k++) {
        const hx = isl.x0 + 90 + k * ((isl.x1 - isl.x0 - 180) / 9) - camX;
        const hy = heightAt(world, isl.x0 + 90 + k * ((isl.x1 - isl.x0 - 180) / 9));
        if (hx < -30 || hx > CANVAS_W + 30) continue;
        const hw = 26 + rnd() * 14;
        const hh = 20 + rnd() * 12;
        const roofColors = ['#c0392b', '#d35400', '#7d3c98', '#2e86c1'];
        ctx.fillStyle = '#f5e6c8';
        ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
        ctx.fillStyle = roofColors[Math.floor(rnd() * roofColors.length)];
        ctx.beginPath();
        ctx.moveTo(hx - hw / 2 - 4, hy - hh);
        ctx.lineTo(hx, hy - hh - 14);
        ctx.lineTo(hx + hw / 2 + 4, hy - hh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3b2f2f';
        ctx.fillRect(hx - 3, hy - 12, 6, 12);
      }
    }
  }

  // Landasan pacu
  for (const r of world.runways) {
    const x0 = r.x0 - camX;
    const x1 = r.x1 - camX;
    if (x1 < 0 || x0 > CANVAS_W) continue;
    ctx.fillStyle = '#3a3f46';
    ctx.fillRect(x0, SEA_Y - 6, x1 - x0, 8);
    ctx.fillStyle = '#f7f7f7';
    const mid = (x0 + x1) / 2;
    for (let d = -2; d <= 2; d++) {
      ctx.fillRect(mid + d * 52 - 18, SEA_Y - 4, 36, 4);
    }
    ctx.fillStyle = '#ffcf3f';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.x0 < 2000 ? 'NUSANTARA INTL' : 'NUSANTARA EAST', mid, SEA_Y - 16);
  }
}

function drawPalm(ctx, x, y) {
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 4, y - 18, x + 8, y - 30);
  ctx.stroke();
  ctx.strokeStyle = '#2f8f3a';
  ctx.lineWidth = 2;
  for (let a = 0; a < 5; a++) {
    const ang = -Math.PI * (0.15 + a * 0.17);
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 30);
    ctx.quadraticCurveTo(x + 8 + Math.cos(ang) * 16, y - 30 + Math.sin(ang) * 10, x + 8 + Math.cos(ang) * 26, y - 30 + Math.sin(ang) * 18);
    ctx.stroke();
  }
}
