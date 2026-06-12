// Phase 1 test page logic: connection diagnostics.
// Confirms the device can reach the dev server and that the page runs
// in a secure context (required by motion sensor APIs in phase 2).

function setStatus(id, ok, label) {
  const el = document.getElementById(id);
  el.textContent = label;
  el.className = ok ? 'ok' : 'fail';
}

function runDiagnostics() {
  document.getElementById('diag-url').textContent = window.location.href;

  setStatus(
    'diag-secure',
    window.isSecureContext,
    window.isSecureContext ? 'Sim' : 'Não — sensores não vão funcionar'
  );

  const hasMotionApis =
    'DeviceOrientationEvent' in window && 'DeviceMotionEvent' in window;
  setStatus(
    'diag-sensors',
    hasMotionApis,
    hasMotionApis ? 'APIs presentes' : 'APIs ausentes neste navegador'
  );

  document.getElementById('diag-device').textContent = navigator.userAgent;
}

runDiagnostics();
