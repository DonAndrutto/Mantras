// VR, where the browser offers it (a headset's browser, or a desktop browser
// with a headset attached). The button stays hidden everywhere else.

export async function vrSupported() {
  try {
    return !!(navigator.xr && window.isSecureContext && await navigator.xr.isSessionSupported('immersive-vr'));
  } catch { return false; }
}

// Starts a session and hands it to three.js. Standing ('local-floor') puts
// the garland at chest height; without it the garland is placed relative to
// the head instead.
export async function enterVR(renderer) {
  const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  const floor = !session.enabledFeatures || session.enabledFeatures.includes('local-floor');
  renderer.xr.setReferenceSpaceType(floor ? 'local-floor' : 'local');
  await renderer.xr.setSession(session);
  return { session, floor };
}
