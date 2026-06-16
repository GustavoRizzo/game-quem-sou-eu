// Shared sensory feedback for gesture results: a short beep (Web Audio), a
// vibration pattern and a full-screen color flash (CSS classes flash-hit /
// flash-skip, see assets/styles.css). Used by both the game and the
// gesture-counter calibration page — kept here once so the two never drift
// apart.
//
// Best-effort: a missing or blocked API (no AudioContext, no Vibration API)
// must never throw out to the caller — feedback is a nice-to-have, the game
// logic must keep running regardless.

let audioCtx = null;

export function beep(frequency) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {
    /* audio is best-effort */
  }
}

export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export function flash(kind) {
  const cls = `flash-${kind}`;
  document.body.classList.add(cls);
  setTimeout(() => document.body.classList.remove(cls), 250);
}
