// flight.js — Langit Nusantara: fisika pesawat dan gambar pesawat.
// Pesawat baling-baling kecil, livery merah-putih, digambar dari kode.

import { SEA_Y, WORLD_W } from './sky.js';

export const PLANE_RADIUS = 26;

/** Keadaan awal pesawat di landasan awal. */
export function newPlane() {
  return {
    x: 520,
    y: SEA_Y - 30,
    angle: 0, // radian, positif = menanjak (hidung ke atas)
    speed: 0, // px/detik
    throttle: 0.35, // 0..1
    onGround: true,
    prop: 0, // sudut baling-baling
  };
}

/**
 * Memajukan fisika pesawat satu langkah.
 * input: { climb: -1|0|1, throttle: -1|0|1 } — climb 1 = menanjak.
 * Mengembalikan peristiwa: 'stall' saat kecepatan jatuh di bawah ambang.
 */
export function stepPlane(plane, input, dt) {
  const MAX_PITCH = 0.55;
  const PITCH_RATE = 1.5;
  if (input.climb !== 0) {
    plane.angle += input.climb * PITCH_RATE * dt;
    plane.angle = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, plane.angle));
  } else {
    // Hidung kembali perlahan ke datar
    plane.angle += (0 - plane.angle) * 0.6 * dt;
  }
  if (input.throttle !== 0) {
    plane.throttle += input.throttle * 0.7 * dt;
    plane.throttle = Math.max(0, Math.min(1, plane.throttle));
  }

  const targetSpeed = 60 + plane.throttle * 190;
  const accel = plane.speed < targetSpeed ? 70 : 55;
  if (plane.speed < targetSpeed) plane.speed = Math.min(targetSpeed, plane.speed + accel * dt);
  else plane.speed = Math.max(targetSpeed, plane.speed - accel * dt);

  const wasSlow = plane.speed < 78;
  // Gerak: ke arah hidung
  plane.x += Math.cos(plane.angle) * plane.speed * dt;
  plane.y -= Math.sin(plane.angle) * plane.speed * dt;
  // Gravitasi: pesawat lambat akan melorot
  if (plane.speed < 95) {
    plane.y += (95 - plane.speed) * 0.55 * dt;
  }
  // Batas dunia
  if (plane.x < 60) plane.x = 60;
  if (plane.x > WORLD_W - 60) plane.x = WORLD_W - 60;
  if (plane.y < 40) {
    plane.y = 40;
    plane.angle = Math.min(plane.angle, 0);
  }
  plane.prop += (4 + plane.throttle * 26) * dt;
  // Catatan: onGround dimiliki oleh loop game (langit.js), bukan oleh fisika:
  // stepPlane tidak pernah mengubahnya, supaya pesawat yang sedang meluncur
  // di landasan tidak tiba-tiba dianggap mengudara lalu "mendarat" lagi.
  return wasSlow ? 'stall' : null;
}

/** Kecepatan dalam km/jam untuk HUD (1 px/detik ~ 0.9 km/jam). */
export function speedKmh(plane) {
  return Math.round(plane.speed * 0.9);
}

/** Ketinggian dalam meter untuk HUD (1 px = 1 m di atas permukaan laut). */
export function altitudeM(plane) {
  return Math.max(0, Math.round(SEA_Y - plane.y));
}

/** Arah kompas dalam derajat: 90 = timur, 0 = utara. */
export function headingDeg(plane) {
  const deg = (plane.angle * 180) / Math.PI;
  return Math.round(90 - deg);
}

/** Menggambar pesawat di posisi layar (sx, sy), menghadap kanan. */
export function drawPlane(ctx, sx, sy, plane, t) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-plane.angle);
  // Bayangan lembut di bawah pesawat
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, 34, 52, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sayap belakang (ekor horizontal)
  ctx.fillStyle = '#b02a2a';
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-50, -12);
  ctx.lineTo(-44, 2);
  ctx.closePath();
  ctx.fill();
  // Sirip vertikal
  ctx.fillStyle = '#d43d3d';
  ctx.beginPath();
  ctx.moveTo(-32, -4);
  ctx.lineTo(-44, -26);
  ctx.lineTo(-36, -26);
  ctx.lineTo(-24, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(-36, -16);
  ctx.rotate(-0.5);
  ctx.fillText('ID', 0, 0);
  ctx.restore();

  // Badan pesawat: livery merah-putih
  const body = ctx.createLinearGradient(0, -14, 0, 12);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.55, '#f3f3f3');
  body.addColorStop(0.56, '#d43d3d');
  body.addColorStop(1, '#a81f1f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(44, 0);
  ctx.quadraticCurveTo(30, -13, 2, -13);
  ctx.quadraticCurveTo(-30, -13, -42, -3);
  ctx.quadraticCurveTo(-46, 2, -38, 6);
  ctx.quadraticCurveTo(-10, 13, 18, 10);
  ctx.quadraticCurveTo(38, 7, 44, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,20,20,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Jendela kokpit
  ctx.fillStyle = '#bfe9ff';
  ctx.strokeStyle = '#274b63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(18, -8, 11, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(15, -10, 5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Sayap utama
  ctx.fillStyle = '#c22f2f';
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.lineTo(-14, 26);
  ctx.lineTo(-2, 28);
  ctx.lineTo(16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.moveTo(-2, 10);
  ctx.lineTo(-11, 26);
  ctx.lineTo(-5, 27);
  ctx.lineTo(4, 11);
  ctx.closePath();
  ctx.fill();

  // Baling-baling di hidung
  ctx.save();
  ctx.translate(46, 0);
  ctx.fillStyle = 'rgba(40,40,40,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(plane.prop);
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.ellipse(0, -16, 3.2, 15, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 16, 3.2, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lampu navigasi berkedip
  const blink = Math.sin(t * 6) > 0;
  ctx.fillStyle = blink ? '#ff4444' : '#881111';
  ctx.beginPath();
  ctx.arc(-42, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#33ff77';
  ctx.beginPath();
  ctx.arc(40, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
