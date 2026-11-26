// instruments.js — Langit Nusantara: HUD dan panel instrumen.
// Menampilkan altitude, speed, heading, bahan bakar, skor, waktu, nyawa,
// plus panel instrumen (horizon buatan, altimeter, kompas) yang menyala.

import { altitudeM, speedKmh, headingDeg } from './flight.js';
import { CANVAS_W, CANVAS_H } from './sky.js';
import { ringDirection } from './targets.js';

function panel(ctx, x, y, w, h, title) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,34,0.72)';
  ctx.strokeStyle = 'rgba(140,220,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, x + 10, y + 16);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2);
  ctx.fill();
  ctx.restore();
}

/** Menggambar HUD lengkap. state: { plane, score, rings, ringsTotal, fuel, lives, timeLeft, mode, message, messageT }. */
export function drawHud(ctx, state, t) {
  const plane = state.plane;
  const alt = altitudeM(plane);
  const spd = speedKmh(plane);
  const hdg = headingDeg(plane);

  // --- Bar atas kiri: skor & ring ---
  panel(ctx, 14, 12, 250, 64, 'PENERBANGAN');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score).padStart(4, '0'), 26, 52);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`RING ${state.ringsPassed}/${state.ringsTotal}`, 132, 40);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`WAKTU ${fmtTime(state.timeLeft)}`, 132, 60);

  // --- Bar atas tengah: kompas ---
  const cx = CANVAS_W / 2;
  panel(ctx, cx - 190, 12, 380, 64, 'KOMPAS');
  const points = [
    { d: 0, label: 'U' },
    { d: 45, label: 'TL' },
    { d: 90, label: 'T' },
    { d: 135, label: 'TG' },
    { d: 180, label: 'S' },
    { d: 225, label: 'BD' },
    { d: 270, label: 'B' },
    { d: 315, label: 'BL' },
  ];
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 180, 30, 360, 38);
  ctx.clip();
  ctx.textAlign = 'center';
  for (const p of points) {
    let rel = p.d - hdg;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    const sx = cx + rel * 2.1;
    if (sx < cx - 200 || sx > cx + 200) continue;
    ctx.fillStyle = p.d % 90 === 0 ? '#ffffff' : '#9fd8ff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(p.label, sx, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(sx - 1, 30, 2, 10);
  }
  ctx.restore();
  // Penanda tengah kompas
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath();
  ctx.moveTo(cx - 6, 30);
  ctx.lineTo(cx + 6, 30);
  ctx.lineTo(cx, 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hdg}°`, cx, 72);

  // --- Bar atas kanan: bahan bakar & nyawa ---
  panel(ctx, CANVAS_W - 264, 12, 250, 64, 'BAHAN BAKAR & NYAWA');
  const fuelColor = state.fuel > 0.5 ? '#58d68d' : state.fuel > 0.25 ? '#f5b041' : '#e74c3c';
  bar(ctx, CANVAS_W - 252, 36, 150, 12, state.fuel, fuelColor);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(state.fuel * 100)}%`, CANVAS_W - 94, 47);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.lives ? '#ff5a5a' : 'rgba(255,255,255,0.25)';
    drawMiniPlane(ctx, CANVAS_W - 252 + i * 30, 62);
  }
  if (state.fuel <= 0.25 && state.mode === 'playing') {
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff6b6b' : '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BAHAN BAKAR MENIPIS!', CANVAS_W - 16, 92);
  }

  // --- Panel instrumen bawah kiri: horizon buatan ---
  drawHorizon(ctx, 64, CANVAS_H - 64, 46, plane.angle, plane.throttle);
  // --- Panel instrumen bawah tengah-kiri: altimeter ---
  drawDial(ctx, 150, CANVAS_H - 64, 46, alt, 1000, 'ALT', 'm');
  // --- Panel instrumen bawah tengah: speedometer ---
  drawDial(ctx, 236, CANVAS_H - 64, 46, spd, 300, 'SPD', 'km/h');
  // --- Panel bawah kanan: throttle ---
  panel(ctx, CANVAS_W - 190, CANVAS_H - 84, 176, 70, 'THROTTLE');
  bar(ctx, CANVAS_W - 178, CANVAS_H - 56, 152, 12, plane.throttle, '#58a6ff');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, CANVAS_W - 178, CANVAS_H - 26);

  // --- Penunjuk ring berikutnya (panah tepi layar) ---
  const dir = ringDirection(plane, state.rings);
  if (dir && state.mode === 'playing') {
    const px = 640;
    const py = 120;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(dir.angle);
    ctx.fillStyle = 'rgba(255,207,63,0.9)';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RING ${state.ringsPassed + 1} • ${Math.round(dir.dist)} m`, px, py + 34);
  }

  // --- Pesan tengah layar (mis. "RING! +100") ---
  if (state.message && state.messageT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.messageT);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(8,20,34,0.8)';
    ctx.lineWidth = 5;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(state.message, CANVAS_W / 2, 210);
    ctx.fillText(state.message, CANVAS_W / 2, 210);
    ctx.restore();
  }

  // --- Peringatan stall ---
  if (state.stallWarn && state.mode === 'playing') {
    ctx.fillStyle = Math.sin(t * 10) > 0 ? '#ff6b6b' : '#ffd76a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STALL! TAMBAH THROTTLE (→)', CANVAS_W / 2, 250);
  }
}

function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function drawMiniPlane(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-2, -9, 4, 18);
  ctx.restore();
}

/** Horizon buatan: cakram dengan garis horizon yang berputar mengikuti pitch. */
function drawHorizon(ctx, x, y, r, angle, throttle) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  // Langit & tanah
  ctx.fillStyle = '#2f7fd0';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r, -1.5, r * 2, 3);
  ctx.restore();
  // Pesawat mini di tengah
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x - 12, y);
  ctx.lineTo(x - 12, y - 3);
  ctx.lineTo(x + 12, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Bingkai menyala
  ctx.strokeStyle = '#9fd8ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', x, y + r + 13);
}

/** Dial bundar dengan jarum (altimeter / speedometer). */
function drawDial(ctx, x, y, r, value, max, label, unit) {
  ctx.save();
  // Latar dial
  const g = ctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, '#12324a');
  g.addColorStop(1, '#081826');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9fd8ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Tanda-tanda skala
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 24) * (Math.PI / 180);
    const x1 = x + Math.cos(a) * (r - 6);
    const y1 = y + Math.sin(a) * (r - 6);
    const x2 = x + Math.cos(a) * (r - 14);
    const y2 = y + Math.sin(a) * (r - 14);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Jarum
  const frac = Math.max(0, Math.min(1, value / max));
  const a = (-210 + frac * 240) * (Math.PI / 180);
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10));
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  // Angka
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(value)), x, y + 22);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText(`${label} ${unit}`, x, y + r + 13);
  ctx.restore();
}
