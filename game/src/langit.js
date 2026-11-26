// langit.js — Langit Nusantara: loop utama, keadaan game, tabrakan, skor.
// Mode: menu → playing → (crashed → playing) / (landed → playing|win) → over.

import { buildWorld, drawWorld, heightAt, runwayAt, WORLD_W, SEA_Y, CANVAS_W, CANVAS_H } from './sky.js';
import { newPlane, stepPlane, drawPlane } from './flight.js';
import { buildRings, nextRing, checkRing, drawRings } from './targets.js';
import { drawHud } from './instruments.js';
import { createSound } from './engine.js';
import { createInput } from './controls.js';

const START_TIME = 240;
const START_LIVES = 3;

function readParams() {
  const q = new URLSearchParams(window.location.search);
  return { scene: q.get('scene') || '', demo: q.get('demo') === '1' };
}

function newState() {
  const world = buildWorld();
  const rings = buildRings();
  return {
    mode: 'menu',
    world,
    rings,
    ringsTotal: rings.length,
    ringsPassed: 0,
    plane: newPlane(),
    score: 0,
    fuel: 1,
    lives: START_LIVES,
    timeLeft: START_TIME,
    camX: 0,
    t: 0,
    message: '',
    messageT: 0,
    stallWarn: false,
    crashT: 0,
    landT: 0,
    shake: 0,
    demo: false,
    sound: createSound(),
  };
}

function setMessage(state, text) {
  state.message = text;
  state.messageT = 2.2;
}

function respawn(state) {
  const passed = state.rings.filter((r) => r.passed);
  const cp = passed.length > 0 ? passed[passed.length - 1] : null;
  const plane = state.plane;
  if (cp) {
    plane.x = cp.x - 260;
    // Muncul 40 px di atas permukaan tanah agar tidak langsung menabrak lagi.
    plane.y = Math.min(cp.y, heightAt(state.world, cp.x - 260) - 40);
  } else {
    plane.x = 520;
    plane.y = heightAt(state.world, 520) - 40;
  }
  plane.angle = 0;
  plane.speed = 120;
  plane.throttle = 0.6;
  plane.onGround = false;
  state.fuel = Math.max(state.fuel, 0.55);
  state.camX = Math.max(0, Math.min(WORLD_W - CANVAS_W, plane.x - 420));
  state.mode = 'playing';
}

/** Autopilot demo: mengarahkan pesawat ke ring berikutnya (atau landasan bila bahan bakar menipis). */
function autopilot(state) {
  const plane = state.plane;
  let target = nextRing(state.rings);
  if (state.fuel < 0.25 || !target) {
    // Menuju landasan terdekat
    const rw = state.world.runways.reduce((a, b) => (Math.abs(b.x0 - plane.x) < Math.abs(a.x0 - plane.x) ? b : a));
    target = { x: (rw.x0 + rw.x1) / 2, y: SEA_Y - 40 };
  }
  const dx = target.x - plane.x;
  const dy = plane.y - target.y;
  const desired = Math.max(-0.5, Math.min(0.5, Math.atan2(dy, Math.max(40, dx))));
  const climb = desired > plane.angle + 0.04 ? 1 : desired < plane.angle - 0.04 ? -1 : 0;
  let throttle = 0;
  if (plane.speed < 150) throttle = 1;
  else if (plane.speed > 205) throttle = -1;
  return { climb, throttle };
}

function tryLand(state) {
  const plane = state.plane;
  const rw = runwayAt(state.world, plane.x);
  if (!rw) return false;
  if (plane.y + 16 < SEA_Y - 8 || plane.y + 16 > SEA_Y + 8) return false;
  if (Math.abs(plane.angle) > 0.16 || plane.speed > 215) return false;
  return true;
}

function onCrash(state) {
  state.lives -= 1;
  state.shake = 0.5;
  state.sound.crash();
  state.sound.setEngine(0, 0, false);
  if (state.lives <= 0) {
    state.mode = 'over';
    setMessage(state, 'GAME OVER');
  } else {
    state.mode = 'crashed';
    state.crashT = 1.6;
    setMessage(state, `TERJATUH! SISA NYAWA ${state.lives}`);
  }
}

function onLand(state) {
  const plane = state.plane;
  const rw = runwayAt(state.world, plane.x);
  const isEast = rw && rw.x0 > 10000;
  plane.onGround = true;
  plane.speed = Math.min(plane.speed, 120);
  state.sound.land();
  state.fuel = 1;
  if (isEast) {
    const bonus = Math.round(state.timeLeft * 5 + state.score * 0.1);
    state.score += 250 + bonus;
    state.mode = 'win';
    state.sound.win();
    setMessage(state, `MISI SELESAI! BONUS +${250 + bonus}`);
  } else {
    state.score += 250;
    state.mode = 'landed';
    state.landT = 2.2;
    setMessage(state, 'MENDARAT! +250 • BAHAN BAKAR PENUH');
  }
}

function updatePlaying(state, input, dt) {
  const plane = state.plane;
  // Bahan bakar habis → mesin mati, hanya meluncur
  const fuelOut = state.fuel <= 0;
  const effInput = fuelOut ? { climb: input.climb, throttle: -1 } : input;
  const stall = stepPlane(plane, effInput, dt);
  state.stallWarn = stall === 'stall';

  // Bahan bakar: makin besar throttle makin boros (~0,9%/detik pada throttle penuh)
  if (!fuelOut) {
    state.fuel -= 0.009 * (0.3 + plane.throttle) * dt;
    state.fuel = Math.max(0, state.fuel);
  }
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.mode = 'over';
    setMessage(state, 'WAKTU HABIS!');
    return;
  }

  // Lepas landas dari landasan awal; bila meluncur keluar pulau tanpa lepas landas, pesawat jatuh ke laut
  if (plane.onGround) {
    const gy = heightAt(state.world, plane.x);
    plane.y = gy - 14;
    if (gy >= SEA_Y - 2 && plane.speed > 40) {
      plane.onGround = false;
    } else if (plane.speed > 115 && plane.angle > 0.03) {
      plane.onGround = false;
    }
  }

  // Ring
  const hit = checkRing(plane, state.rings);
  if (hit) {
    state.ringsPassed += 1;
    state.score += 100;
    state.fuel = Math.min(1, state.fuel + 0.12);
    state.timeLeft += 5;
    state.sound.ring();
    setMessage(state, `RING ${hit.index + 1}! +100`);
  }

  // Pendaratan
  if (!plane.onGround && tryLand(state)) {
    onLand(state);
    return;
  }

  // Tabrakan dengan tanah / laut
  if (!plane.onGround && plane.speed > 55) {
    const gy = heightAt(state.world, plane.x);
    const overLand = gy < SEA_Y - 2;
    // Tabrakan saat pusat pesawat sudah 8 px di atas permukaan (toleransi
    // untuk lepas landas: di landasan pesawat diam di gy-14).
    if (overLand && plane.y + 8 >= gy) {
      onCrash(state);
      return;
    }
    if (!overLand && plane.y + 6 >= SEA_Y - 6) {
      onCrash(state);
      return;
    }
  }

  // Kamera mengikuti pesawat
  const targetCam = Math.max(0, Math.min(WORLD_W - CANVAS_W, plane.x - 420));
  state.camX += (targetCam - state.camX) * Math.min(1, 5 * dt);
}

function applyScene(state, scene) {
  const plane = state.plane;
  if (scene === 'cover') {
    state.mode = 'playing';
    plane.x = 2050;
    plane.y = 310;
    plane.angle = 0.1;
    plane.speed = 165;
    plane.throttle = 0.75;
    plane.onGround = false;
    state.camX = 1690;
    state.demo = true;
  } else if (scene === 'ring') {
    state.mode = 'playing';
    state.rings[0].passed = true;
    state.rings[1].passed = true;
    state.ringsPassed = 2;
    state.score = 200;
    plane.x = 4950;
    plane.y = 330;
    plane.angle = 0.05;
    plane.speed = 170;
    plane.throttle = 0.7;
    plane.onGround = false;
    state.camX = 4530;
    state.demo = true;
  } else if (scene === 'landing') {
    state.mode = 'playing';
    for (let i = 0; i < 7; i++) state.rings[i].passed = true;
    state.ringsPassed = 7;
    state.score = 700;
    plane.x = 12200;
    plane.y = 360;
    plane.angle = -0.08;
    plane.speed = 150;
    plane.throttle = 0.45;
    plane.onGround = false;
    state.camX = 11820;
    state.demo = true;
  } else if (scene === 'menu') {
    state.mode = 'menu';
    state.camX = 0;
  }
}

function drawOverlay(ctx, state) {
  ctx.save();
  if (state.mode === 'menu') {
    ctx.fillStyle = 'rgba(6,18,32,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcf3f';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(6,18,32,0.85)';
    ctx.lineWidth = 8;
    ctx.strokeText('LANGIT NUSANTARA', CANVAS_W / 2, 190);
    ctx.fillText('LANGIT NUSANTARA', CANVAS_W / 2, 190);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Terbang melintasi kepulauan Indonesia — lewati semua ring,', CANVAS_W / 2, 240);
    ctx.fillText('lalu mendarat di landasan timur!', CANVAS_W / 2, 272);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText('↑ / W  menanjak      ↓ / S  menurun', CANVAS_W / 2, 330);
    ctx.fillText('→ / D  tambah throttle      ← / A  kurangi throttle', CANVAS_W / 2, 360);
    ctx.fillText('Mendarat di landasan = isi bahan bakar • Ring = +100 poin', CANVAS_W / 2, 390);
    const pulse = 0.75 + Math.sin(state.t * 4) * 0.25;
    ctx.fillStyle = `rgba(255,207,63,${pulse})`;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('TEKAN ENTER ATAU KLIK UNTUK TERBANG', CANVAS_W / 2, 460);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('8 ring • 3 nyawa • 4 menit • hati-hati gunung dan laut', CANVAS_W / 2, 500);
  } else if (state.mode === 'win') {
    ctx.fillStyle = 'rgba(6,30,16,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('MISI SELESAI!', CANVAS_W / 2, 280);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SKOR AKHIR: ${state.score}`, CANVAS_W / 2, 340);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`Ring dilewati: ${state.ringsPassed}/${state.ringsTotal} • Nyawa tersisa: ${state.lives}`, CANVAS_W / 2, 380);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Tekan R untuk terbang lagi', CANVAS_W / 2, 440);
  } else if (state.mode === 'over') {
    ctx.fillStyle = 'rgba(30,6,6,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 280);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SKOR: ${state.score} • RING ${state.ringsPassed}/${state.ringsTotal}`, CANVAS_W / 2, 340);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Tekan R untuk mencoba lagi', CANVAS_W / 2, 400);
  } else if (state.mode === 'crashed') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(6,18,32,0.85)';
    ctx.lineWidth = 6;
    ctx.strokeText('TERJATUH!', CANVAS_W / 2, 300);
    ctx.fillText('TERJATUH!', CANVAS_W / 2, 300);
  }
  ctx.restore();
}

export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const state = newState();
  // Test hook: biarkan alat uji membaca keadaan game (tidak memengaruhi permainan).
  window.__langit = state;
  const params = readParams();
  const input = createInput();
  if (params.demo) state.demo = true;
  if (params.scene) applyScene(state, params.scene);

  input.onStart = () => {
    state.sound.ensure();
    state.sound.click();
    if (state.mode === 'menu') {
      state.mode = 'playing';
      setMessage(state, 'SELAMAT TERBANG!');
    }
  };
  input.onRestart = () => {
    if (state.mode === 'over' || state.mode === 'win') {
      const fresh = newState();
      Object.assign(state, fresh);
      if (params.demo) state.demo = true;
      if (params.scene) applyScene(state, params.scene);
    }
  };
  input.onAnyKey = () => state.sound.ensure();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    if (state.messageT > 0) state.messageT -= dt;
    if (state.shake > 0) state.shake -= dt;

    if (state.mode === 'playing') {
      const inp = state.demo ? autopilot(state) : input.flightInput();
      updatePlaying(state, inp, dt);
      state.sound.setEngine(state.plane.throttle, state.plane.speed, true);
    } else if (state.mode === 'crashed') {
      state.crashT -= dt;
      if (state.crashT <= 0) respawn(state);
    } else if (state.mode === 'landed') {
      state.landT -= dt;
      state.plane.speed = Math.max(0, state.plane.speed - 60 * dt);
      if (state.landT <= 0) {
        state.mode = 'playing';
        setMessage(state, 'LEPAS LANDAS LAGI!');
      }
    } else {
      state.sound.setEngine(0, 0, false);
    }

    // Gambar
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * 10 * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * 8 * state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawWorld(ctx, state.world, state.camX, state.t);
    drawRings(ctx, state.rings, state.camX, state.t);
    const sx = state.plane.x - state.camX;
    const sy = state.plane.y;
    if (sx > -80 && sx < CANVAS_W + 80) drawPlane(ctx, sx, sy, state.plane, state.t);
    if (state.mode !== 'menu') drawHud(ctx, state, state.t);
    drawOverlay(ctx, state);
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
