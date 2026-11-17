// Deterministic randomness for Sunset Shores: a small seeded generator plus
// the helpers the city, traffic and missions use. No library, no Math.random
// in world building, so ?seed=N replays the same city every time.

export function createRandom(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    chance(p) {
      return this.next() < p;
    },
    // A stable id for a seeded pick, so the same seed names the same things.
    pickIndex(n) {
      return Math.floor(this.next() * n);
    },
    // Bell-curved pick around the middle of [min, max]: crowds cluster
    // around the beach bars and the park instead of spreading evenly.
    gaussian(min, max) {
      const u = (this.next() + this.next() + this.next()) / 3;
      return min + u * (max - min);
    },
    // Box-Muller bell curve around a mean: spray, spread and wobble that
    // cluster instead of scattering flat.
    normal(mean, sd) {
      const u1 = Math.max(this.next(), 1e-9);
      const u2 = this.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
      return mean + z * sd;
    },
    // Fisher-Yates on a copy: the same seed shuffles the same way.
    shuffle(list) {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // Pick an entry with a weight: [{value, weight}, ...].
    weightedPick(entries) {
      let total = 0;
      for (const e of entries) total += e.weight;
      let roll = this.next() * total;
      for (const e of entries) {
        roll -= e.weight;
        if (roll <= 0) return e.value;
      }
      return entries[entries.length - 1].value;
    },
  };
}

// Cheap hash of two grid coordinates, used to vary building colours per block
// without storing a colour per building.
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// FNV-1a hash of a string into a seed: ?seed=palmera replays one city.
export function seedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
