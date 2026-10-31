// mulberry32: a small seeded generator that stays in 32-bit integer maths.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
export const between = (rnd, lo, hi) => lo + (hi - lo) * rnd();
export const logBetween = (rnd, lo, hi) => Math.exp(between(rnd, Math.log(lo), Math.log(hi)));

// Standard normal from two uniforms (Box-Muller).
export function gauss(rnd) {
  const u = Math.max(rnd(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

export function shuffle(rnd, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
