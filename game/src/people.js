// People on foot: pedestrians who stroll the sidewalks and flee from danger,
// and police officers who chase the player on foot. Everyone is a small
// circle with a heading, a walk speed and a mood.

import { PED_NAMES, PED_SHIRTS } from './config.js';
import { clampToWorld, collideSolids, nearestRoad, randomBeachPoint } from './city.js';

export function makePedestrian(rng, x, y) {
  // Roles give the street life: joggers run the beach, tourists stand and
  // stare at the sea, vendors hold a spot by the Sunset Bar, everyone else
  // strolls the sidewalks.
  const role = rng.weightedPick([
    { value: 'stroller', weight: 6 },
    { value: 'jogger', weight: 2 },
    { value: 'tourist', weight: 2 },
    { value: 'vendor', weight: 1 },
  ]);
  const spot = role === 'jogger' ? randomBeachPoint(null, rng) : null;
  return {
    kind: 'ped',
    name: rng.pick(PED_NAMES),
    x: spot ? spot.x : x,
    y: spot ? spot.y : y,
    angle: rng.range(0, Math.PI * 2),
    speed: role === 'jogger' ? rng.range(110, 140) : rng.range(38, 62),
    shirt: rng.pick(PED_SHIRTS),
    skin: rng.pick(['#e8b98a', '#c98d5f', '#8a5a3a', '#f0c8a0']),
    role,
    target: null,
    standTimer: role === 'tourist' ? rng.range(4, 10) : 0,
    flee: 0, // seconds of panic left
    panicFrom: null,
    dead: false,
    walkPhase: rng.range(0, Math.PI * 2),
    scared: false,
  };
}

export function makeOfficer(x, y) {
  return {
    kind: 'officer',
    name: 'Officer',
    x,
    y,
    angle: 0,
    speed: 195,
    shirt: '#1e2a3a',
    skin: '#e8b98a',
    target: null,
    flee: 0,
    panicFrom: null,
    dead: false,
    walkPhase: 0,
    scared: false,
    bustTimer: 0,
    calledIn: false, // has this officer already radioed the player in?
  };
}

// Pick a new stroll target: a point on a nearby sidewalk (just off a road).
function pickStrollTarget(city, rng, ped) {
  const road = nearestRoad(city, ped.x, ped.y);
  const along = rng.range(-260, 260);
  if (road.distV < road.distH) {
    return {
      x: road.vx + (rng.chance(0.5) ? 1 : -1) * 62,
      y: ped.y + along,
    };
  }
  return {
    x: ped.x + along,
    y: road.hy + (rng.chance(0.5) ? 1 : -1) * 62,
  };
}

export function updatePedestrian(city, rng, ped, dt, danger, policeCars) {
  if (ped.dead) return;
  ped.walkPhase += dt * (ped.role === 'jogger' ? 14 : 9);
  // Panic: run away from the danger point.
  if (danger && Math.hypot(ped.x - danger.x, ped.y - danger.y) < 320) {
    ped.flee = 2.5;
    ped.panicFrom = danger;
  }
  // A screaming cruiser sends the sidewalk scattering too.
  if (policeCars) {
    for (const c of policeCars) {
      if (c.dead) continue;
      if (Math.hypot(ped.x - c.x, ped.y - c.y) < 260 && Math.abs(c.speed) > 120) {
        ped.flee = 2;
        ped.panicFrom = { x: c.x, y: c.y };
        break;
      }
    }
  }
  if (ped.flee > 0) {
    ped.flee -= dt;
    const away = Math.atan2(ped.y - ped.panicFrom.y, ped.x - ped.panicFrom.x);
    ped.angle = away;
    ped.x += Math.cos(away) * 150 * dt;
    ped.y += Math.sin(away) * 150 * dt;
    ped.scared = true;
  } else if (ped.role === 'tourist' || ped.role === 'vendor') {
    // Tourists stand on the sand, face the sea, then wander on. Vendors
    // hold their spot by the Sunset Bar and watch the street instead.
    ped.standTimer -= dt;
    ped.scared = false;
    ped.angle += (Math.PI / 2 - ped.angle) * Math.min(1, dt * 2);
    if (ped.standTimer <= 0) {
      if (ped.role === 'vendor') {
        ped.target = {
          x: city.places.beachBar.x + rng.range(-90, 90),
          y: city.places.beachBar.y + rng.range(-50, 50),
        };
      } else {
        ped.target = randomBeachPoint(city, rng);
      }
      ped.standTimer = rng.range(4, 10);
    }
  } else if (ped.role === 'jogger') {
    // Joggers run the beach line, turning at the pier and the docks.
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 24) {
      ped.target = randomBeachPoint(city, rng);
    }
    const want = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    let diff = want - ped.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    ped.scared = false;
  } else {
    ped.scared = false;
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 18) {
      ped.target = pickStrollTarget(city, rng, ped);
    }
    const want = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    let diff = want - ped.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
  }
  collideSolids(city, ped, 12);
  clampToWorld(ped, 24);
}

// Officers run straight at the player; if they stay close, the bust begins.
// Returns 'called-in' the first time an officer gets close enough to radio
// the player in while the heat is still low, so the street can escalate.
export function updateOfficer(city, officer, player, dt) {
  if (officer.dead) return null;
  officer.walkPhase += dt * 11;
  const dx = player.x - officer.x;
  const dy = player.y - officer.y;
  const d = Math.hypot(dx, dy);
  // Sprint burst when the officer is almost on the player: the last few
  // metres are the dangerous ones.
  const spd = officer.speed * (d < 150 ? 1.12 : 1);
  if (d > 4) {
    officer.angle = Math.atan2(dy, dx);
    officer.x += (dx / d) * spd * dt;
    officer.y += (dy / d) * spd * dt;
  }
  collideSolids(city, officer, 12);
  clampToWorld(officer, 24);
  if (d < 30) officer.bustTimer += dt;
  else officer.bustTimer = Math.max(0, officer.bustTimer - dt * 2);
  if (d < 130 && !officer.calledIn) {
    officer.calledIn = true;
    return 'called-in';
  }
  return null;
}
