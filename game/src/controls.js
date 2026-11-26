// controls.js — Langit Nusantara: input keyboard (dan klik mouse untuk menu).
// Panah/WASD: naik-turun & throttle. Enter/Space: mulai. R: ulangi.

/** Membuat pelacak tombol. */
export function createInput() {
  const keys = new Set();
  let onStart = null;
  let onRestart = null;
  let onAnyKey = null;

  function key(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(k);
    if (onAnyKey) onAnyKey();
    if ((k === 'Enter' || k === ' ') && onStart) onStart();
    if (k === 'r' && onRestart) onRestart();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(key(e));
  });
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousedown', () => {
    if (onAnyKey) onAnyKey();
    if (onStart) onStart();
  });

  return {
    keys,
    set onStart(fn) {
      onStart = fn;
    },
    set onRestart(fn) {
      onRestart = fn;
    },
    set onAnyKey(fn) {
      onAnyKey = fn;
    },
    /** Input penerbangan dari tombol yang sedang ditekan. */
    flightInput() {
      const up = keys.has('ArrowUp') || keys.has('w');
      const down = keys.has('ArrowDown') || keys.has('s');
      const right = keys.has('ArrowRight') || keys.has('d');
      const left = keys.has('ArrowLeft') || keys.has('a');
      return {
        climb: up ? 1 : down ? -1 : 0,
        throttle: right ? 1 : left ? -1 : 0,
      };
    },
  };
}
