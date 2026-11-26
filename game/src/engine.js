// engine.js — Langit Nusantara: suara mesin dan efek, disintesis via Web Audio.
// Semua suara original, dibuat dari osilator — tanpa file audio.

/** Membuat pengontrol suara. Panggil ensure() setelah gestur pengguna pertama. */
export function createSound() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let started = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    } catch {
      return false;
    }
    // Mesin: dua osilator sawtooth berdetak + filter lowpass
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 35;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    engineOsc2.start();
    started = true;
    return true;
  }

  function setEngine(throttle, speed, flying) {
    if (!ctx || !started) return;
    const t = ctx.currentTime;
    const base = 55 + throttle * 55 + speed * 0.06;
    engineOsc.frequency.setTargetAtTime(base, t, 0.08);
    engineOsc2.frequency.setTargetAtTime(base / 2, t, 0.08);
    engineFilter.frequency.setTargetAtTime(300 + throttle * 700, t, 0.1);
    engineGain.gain.setTargetAtTime(flying ? 0.05 + throttle * 0.05 : 0, t, 0.1);
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    ensure,
    setEngine,
    /** Denting saat melewati ring: dua nada naik. */
    ring() {
      blip(660, 0.16, 'sine', 0.22);
      blip(990, 0.24, 'sine', 0.22, 0.09);
    },
    /** Bunyi mendarat: nada rendah yang tenang. */
    land() {
      blip(220, 0.3, 'triangle', 0.25);
      blip(330, 0.35, 'triangle', 0.2, 0.12);
    },
    /** Bunyi tabrakan: deru kasar. */
    crash() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.6);
    },
    /** Fanfare kecil saat misi selesai. */
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => blip(f, 0.3, 'triangle', 0.22, i * 0.13));
    },
    /** Klik tombol menu. */
    click() {
      blip(880, 0.07, 'square', 0.08);
    },
  };
}
