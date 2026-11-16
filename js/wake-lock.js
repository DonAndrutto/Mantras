// Only one request may be pending. Its result belongs to the latest desired
// state, so a lock granted after pausing/hiding must immediately be released.
export function createWakeLockController(request) {
  let wanted = false, held = null, pending = null;
  const release = async lock => { try { await lock.release(); } catch { /* already released */ } };

  function update(want) {
    wanted = !!want;
    if (!wanted && held) {
      const lock = held;
      held = null;
      return release(lock);
    }
    if (!wanted || held || pending || !request) return pending || Promise.resolve();
    pending = (async () => {
      let discarded = false;
      try {
        // The microtask also handles a synchronous throw without leaving a
        // completed request stuck in `pending`.
        const lock = await Promise.resolve().then(request);
        if (lock.released) return;
        if (!wanted) {
          discarded = true;
          await release(lock);
          return;
        }
        held = lock;
        lock.addEventListener('release', () => {
          if (held === lock) held = null;
        }, { once: true });
      } catch { /* unsupported, denied, hidden or low battery: try on the next update */ }
      finally {
        pending = null;
        // Playback may have resumed while the discarded lock was releasing.
        if (discarded && wanted) await update(true);
      }
    })();
    return pending;
  }
  return { update };
}
