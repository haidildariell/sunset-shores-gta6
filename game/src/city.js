// The city of Palmera Bay: a seeded grid of roads and blocks, a beach and
// ocean along the south edge, a container dock on the east edge, a park in
// the middle, and the named places missions point at. Everything the game
// needs to know about the map — collisions, road lookups, spawn points —
// comes from the object buildCity returns.

import { BLOCK, PALETTE, ROAD_STEP, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { hash2 } from './random.js';

export const WATER_TOP = WORLD_H - 330; // everything below this line is sand, then sea
export const SAND_TOP = WATER_TOP - 90;
export const DOCK_X = WORLD_W - 300; // container dock strip on the east edge
export const PIER_X = 1500; // wooden pier jutting into the sea from the beach
export const LIGHTHOUSE_X = 330; // the old lighthouse on the west headland

// Named places, in world coordinates. Missions and the minimap read these.
export const PLACES = {
  chopShop: { x: 640, y: 300, name: "Rico's Chop Shop" },
  safehouse: { x: 1780, y: 1180, name: 'Mara Safehouse' },
  docks: { x: 3300, y: 1500, name: 'Palmera Docks' },
  bank: { x: 1380, y: 740, name: 'Palmera Bay Bank' },
  hospital: { x: 2320, y: 560, name: 'St. Sol Hospital' },
  policeStation: { x: 940, y: 1620, name: 'Palmera PD Central' },
  respray: { x: 2720, y: 2050, name: 'Lucky Spray Garage' },
  beachBar: { x: 900, y: 2560, name: 'Sunset Bar' },
  park: { x: 1780, y: 1180, name: 'Palmera Park' },
  motel: { x: 2760, y: 980, name: 'Tide Motel' },
  lighthouse: { x: LIGHTHOUSE_X, y: 2450, name: 'Old Lighthouse' },
  stadium: { x: 3100, y: 560, name: 'Palmera Bowl' },
  pitStop: { x: 2320, y: 2050, name: 'Pit Stop Garage' },
  pier: { x: PIER_X, y: 2560, name: 'Palmera Pier' },
  marina: { x: 2900, y: 2500, name: 'Palmera Marina' },
  casino: { x: 1900, y: 1580, name: 'Palmera Casino' },
};

const ROOF_COLORS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

export function buildCity(rng) {
  const roadsV = []; // x centres of vertical roads
  const roadsH = []; // y centres of horizontal roads
  for (let x = ROAD_STEP; x < WORLD_W - 120; x += ROAD_STEP) roadsV.push(x);
  for (let y = ROAD_STEP; y < SAND_TOP - 60; y += ROAD_STEP) roadsH.push(y);

  const buildings = [];
  const trees = [];
  const containers = [];
  const parkingSpots = [];

  // Park block: the block around the safehouse stays green.
  const parkBlock = { bx: 4, by: 2 };
  // Park lawn block: the green lawn, paths, pond and fountain the
  // renderer paints around the safehouse — a generated building here
  // used to grow straight through the fountain.
  const parkLawnBlock = { bx: 3, by: 1 };
  // Casino block: the Palmera Casino owns this block outright, so no
  // generated building, street tree or parking lot ever grows through
  // its walls, its plaza or its fountain.
  const casinoBlock = { bx: 3, by: 2 };

  for (let by = 0; by < roadsH.length; by += 1) {
    for (let bx = 0; bx < roadsV.length; bx += 1) {
      const x0 = roadsV[bx] + ROAD_W / 2 + 14;
      const y0 = roadsH[by] + ROAD_W / 2 + 14;
      const x1 = (bx + 1 < roadsV.length ? roadsV[bx + 1] : WORLD_W - 140) - ROAD_W / 2 - 14;
      const y1 = (by + 1 < roadsH.length ? roadsH[by + 1] : SAND_TOP) - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      if (bx === parkBlock.bx && by === parkBlock.by) {
        // Park: paths and trees instead of buildings.
        for (let i = 0; i < 14; i += 1) {
          trees.push({
            x: x0 + rng.range(30, x1 - x0 - 30),
            y: y0 + rng.range(30, y1 - y0 - 30),
            r: rng.range(9, 15),
          });
        }
        continue;
      }
      if (bx === casinoBlock.bx && by === casinoBlock.by) continue;
      if (bx === parkLawnBlock.bx && by === parkLawnBlock.by) continue;
      // One or two buildings per block, with a gap for an alley / lot.
      const split = rng.chance(0.55);
      const lots = split
        ? [
            { x: x0, y: y0, w: (x1 - x0) * 0.52, h: y1 - y0 },
            { x: x0 + (x1 - x0) * 0.6, y: y0, w: (x1 - x0) * 0.4, h: (y1 - y0) * 0.62 },
          ]
        : [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
      for (const lot of lots) {
        const inset = 8;
        const bw = lot.w - inset * 2;
        const bh = lot.h - inset * 2;
        if (bw < 50 || bh < 50) continue;
        const h = hash2(bx * 7 + lots.indexOf(lot), by * 13);
        buildings.push({
          x: lot.x + inset,
          y: lot.y + inset,
          w: bw,
          h: bh,
          roof: ROOF_COLORS[Math.floor(h * ROOF_COLORS.length)],
          tall: h > 0.72,
          windows: Math.floor(h * 5),
        });
      }
      // A couple of street trees on the block corners.
      if (rng.chance(0.6)) {
        trees.push({ x: x0 + 8, y: y0 + 8, r: rng.range(8, 12) });
      }
      if (rng.chance(0.5)) {
        trees.push({ x: x1 - 8, y: y1 - 8, r: rng.range(8, 12) });
      }
      // Some blocks get a small parking lot with parked cars.
      if (rng.chance(0.35)) {
        const px = x0 + (x1 - x0) / 2;
        const py = y0 + (y1 - y0) / 2;
        parkingSpots.push({ x: px, y: py, angle: rng.chance(0.5) ? 0 : Math.PI / 2 });
      }
    }
  }

  // Container dock: stacked boxes on the east strip.
  for (let y = 420; y < WORLD_H - 500; y += 96) {
    for (let k = 0; k < 2; k += 1) {
      if (rng.chance(0.75)) {
        containers.push({
          x: DOCK_X + 30 + k * 110,
          y,
          w: 96,
          h: 40,
          color: rng.pick(['#b5542e', '#2e6b8a', '#7a8a3a', '#8a2e4a', '#c98a2e']),
        });
      }
    }
  }

  // Cash stash spots: ten tucked-away corners, fixed per seed.
  const stashes = [];
  for (let i = 0; i < 10; i += 1) {
    const bx = rng.int(0, roadsV.length - 1);
    const by = rng.int(0, roadsH.length - 1);
    stashes.push({
      x: roadsV[bx] + ROAD_W / 2 + 26,
      y: roadsH[by] + ROAD_W / 2 + 26,
      taken: false,
    });
  }

  // Yachts moored at the marina, and the fountains: one in the park, one
  // on the casino plaza — the renderer paints every fountain in this list.
  const boats = [];
  for (let i = 0; i < 3; i += 1) {
    boats.push({
      x: 2720 + i * 130,
      y: WATER_TOP + 150 + (i % 2) * 70,
      angle: rng.range(-0.2, 0.2),
      len: 110 + i * 14,
    });
  }
  const fountains = [
    { x: PLACES.park.x, y: PLACES.park.y, r: 34 },
    { x: PLACES.casino.x, y: PLACES.casino.y, r: 20 },
  ];

  // The Palmera Casino: a real building in the list (so it collides like
  // any other) on its own cleared block — no generated building shares
  // the plot. Its plaza front is the meeting point couriers and the
  // minimap use.
  buildings.push({
    x: 1820, y: 1400, w: 160, h: 130,
    roof: '#c9a227', tall: false, windows: 3, casino: true,
  });

  const city = {
    roadsV,
    roadsH,
    buildings,
    trees,
    containers,
    parkingSpots,
    stashes,
    boats,
    fountains,
    places: PLACES,
  };

  return city;
}

// --- Queries the simulation uses -------------------------------------------

export function isWater(city, x, y) {
  return y > WATER_TOP + 60;
}

export function isSand(city, x, y) {
  return y > SAND_TOP && y <= WATER_TOP + 60;
}

// The marina basin: moored yachts, walkable docks, no driving into the sea.
export function isMarina(city, x, y) {
  return x > 2620 && x < 3080 && y > WATER_TOP + 40 && y < WORLD_H - 40;
}

export function isDock(city, x, y) {
  return x > DOCK_X && y < WORLD_H - 380;
}

// The wooden pier: a walkable strip over the water at PIER_X.
export function isPier(city, x, y) {
  return Math.abs(x - PIER_X) < 26 && y > SAND_TOP && y < WORLD_H - 40;
}

// A random point on the sand for joggers and beachgoers, clustered near
// the bars and the pier instead of spread evenly along the whole beach.
export function randomBeachPoint(city, rng) {
  const hotspots = [900, PIER_X, 2100, 2900];
  const cx = rng.weightedPick(hotspots.map((x) => ({ value: x, weight: x === PIER_X ? 3 : 2 })));
  return {
    x: rng.gaussian(cx - 220, cx + 220),
    y: rng.range(SAND_TOP + 30, WATER_TOP + 20),
  };
}

// Circle vs building/containers: push the circle out, return true on hit.
export function collideSolids(city, p, r) {
  let hit = false;
  for (const b of city.buildings) {
    if (resolveRect(p, r, b.x, b.y, b.w, b.h)) hit = true;
  }
  for (const c of city.containers) {
    if (resolveRect(p, r, c.x, c.y, c.w, c.h)) hit = true;
  }
  return hit;
}

function resolveRect(p, r, x, y, w, h) {
  const cx = Math.max(x, Math.min(p.x, x + w));
  const cy = Math.max(y, Math.min(p.y, y + h));
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * r;
    p.y = cy + (dy / d) * r;
  } else {
    // Centre inside the rect: push out along the smallest overlap.
    const left = p.x - x;
    const right = x + w - p.x;
    const top = p.y - y;
    const bottom = y + h - p.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) p.x = x - r;
    else if (m === right) p.x = x + w + r;
    else if (m === top) p.y = y - r;
    else p.y = y + h + r;
  }
  return true;
}

// Nearest road centre to a point, and whether the point is on a road.
export function nearestRoad(city, x, y) {
  let bestV = city.roadsV[0];
  let bestD = Infinity;
  for (const rx of city.roadsV) {
    const d = Math.abs(rx - x);
    if (d < bestD) { bestD = d; bestV = rx; }
  }
  let bestH = city.roadsH[0];
  let bestHD = Infinity;
  for (const ry of city.roadsH) {
    const d = Math.abs(ry - y);
    if (d < bestHD) { bestHD = d; bestH = ry; }
  }
  const onV = bestD < ROAD_W / 2;
  const onH = bestHD < ROAD_W / 2;
  return { vx: bestV, hy: bestH, onRoad: onV || onH, distV: bestD, distH: bestHD };
}

export function clampToWorld(p, margin = 20) {
  p.x = Math.max(margin, Math.min(WORLD_W - margin, p.x));
  p.y = Math.max(margin, Math.min(WORLD_H - margin, p.y));
}

// A random point on a road, for spawning traffic and police.
export function randomRoadPoint(city, rng, near, radius) {
  for (let tries = 0; tries < 24; tries += 1) {
    const vertical = rng.chance(0.5);
    const x = vertical
      ? rng.pick(city.roadsV) + rng.range(-ROAD_W / 4, ROAD_W / 4)
      : rng.range(120, WORLD_W - 320);
    const y = vertical
      ? rng.range(120, SAND_TOP - 80)
      : rng.pick(city.roadsH) + rng.range(-ROAD_W / 4, ROAD_W / 4);
    if (near && Math.hypot(x - near.x, y - near.y) > radius) continue;
    if (near && Math.hypot(x - near.x, y - near.y) < 220) continue;
    if (isWater(city, x, y)) continue;
    return { x, y, vertical };
  }
  return { x: city.roadsV[2], y: city.roadsH[1], vertical: true };
}
