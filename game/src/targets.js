// targets.js — Langit Nusantara: ring target berurutan.
// Delapan ring di ketinggian berbeda; ring berikutnya menyala emas.

export const RING_COUNT = 8;

/** Posisi ring tetap (deterministik, tersebar di sepanjang dunia). */
export function buildRings() {
  const spots = [
    { x: 2300, y: 300 },
    { x: 3700, y: 210 },
    { x: 5200, y: 330 },
    { x: 6900, y: 190 },
    { x: 8400, y: 300 },
    { x: 9900, y: 230 },
    { x: 11400, y: 320 },
    { x: 12400, y: 240 },
  ];
  return spots.map((s, i) => ({ x: s.x, y: s.y, r: 62, index: i, passed: false }));
}

/** Ring berikutnya yang belum dilewati (atau null bila semua sudah). */
export function nextRing(rings) {
  return rings.find((r) => !r.passed) ?? null;
}

/** Cek apakah pesawat melewati ring aktif. Mengembalikan ring yang dilewati atau null. */
export function checkRing(plane, rings) {
  const ring = nextRing(rings);
  if (!ring) return null;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  if (dx * dx + dy * dy < ring.r * ring.r) {
    ring.passed = true;
    return ring;
  }
  return null;
}

/** Panah penunjuk ke ring berikutnya (untuk HUD): arah relatif terhadap pesawat. */
export function ringDirection(plane, rings) {
  const ring = nextRing(rings);
  if (!ring) return null;
  const dx = ring.x - plane.x;
  const dy = ring.y - plane.y;
  return { dx, dy, dist: Math.hypot(dx, dy), angle: Math.atan2(-dy, dx) };
}

/** Menggambar semua ring di dunia (koordinat layar via camX). */
export function drawRings(ctx, rings, camX, t) {
  for (const ring of rings) {
    const sx = ring.x - camX;
    if (sx < -120 || sx > 1400) continue;
    const isNext = !ring.passed && nextRing(rings) === ring;
    const pulse = isNext ? 1 + Math.sin(t * 4) * 0.06 : 1;
    ctx.save();
    ctx.translate(sx, ring.y);
    ctx.scale(pulse, pulse);
    if (ring.passed) {
      // Ring yang sudah dilewati: hijau pudar
      ctx.strokeStyle = 'rgba(80,220,120,0.55)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,220,120,0.10)';
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (isNext) {
      // Ring aktif: emas menyala + panah
      const glow = ctx.createRadialGradient(0, 0, ring.r * 0.4, 0, 0, ring.r * 1.25);
      glow.addColorStop(0, 'rgba(255,210,80,0)');
      glow.addColorStop(1, 'rgba(255,200,60,0.35)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffcf3f';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      // Label nomor ring
      ctx.fillStyle = '#7a5200';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ring.index + 1), 0, 1);
    } else {
      // Ring berikutnya yang belum aktif: biru redup
      ctx.strokeStyle = 'rgba(160,200,235,0.75)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(160,200,235,0.35)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ring.index + 1), 0, 1);
    }
    ctx.restore();
  }
}
