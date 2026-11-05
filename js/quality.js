// Hysteresis avoids repeated resolution/geometry changes on a busy phone.
export function createQualityController() {
  let level = 1, elapsed = 0, samples = 0, sum = 0, cooldown = 0;
  return {
    get detail() { return level < 0.85 ? 'low' : 'high'; },
    get scale() { return level; },
    reset(mode) { level = mode === 'low' ? 0.65 : 1; elapsed = samples = sum = cooldown = 0; },
    sample(dt, mode) {
      if (mode !== 'auto' || dt <= 0 || dt > 0.25) return false;
      elapsed += dt; cooldown += dt; samples++; sum += dt;
      if (elapsed < 4) return false;
      const average = sum / samples;
      elapsed = samples = sum = 0;
      let next = level;
      if (average > 0.029 && cooldown >= 4) next = Math.max(0.65, level - 0.15);
      else if (average < 0.019 && cooldown >= 16) next = Math.min(1, level + 0.15);
      if (Math.abs(next - level) < 0.01) return false;
      level = next; cooldown = 0; return true;
    },
  };
}
