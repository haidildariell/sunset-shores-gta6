// The wanted system: heat from crimes, police cars that hunt the player,
// officers on foot, and the slow cool-down when the player stays unseen.
// The police answer scales with the star level, 0 (calm) to 5 (full heat).

import { WANTED } from './config.js';
import { driveCar, makeCar } from './vehicles.js';
import { makeOfficer, updateOfficer } from './people.js';
import { randomRoadPoint } from './city.js';

export function createWanted() {
  return {
    level: 0,
    heat: 0, // fractional heat inside the current level
    unseenTimer: 0,
    decayTimer: 0,
    policeCars: [],
    officers: [],
    spawnTimer: 0,
    officerTimer: 0,
    sirenOn: false,
    roadblockUp: false, // a roadblock is standing while the heat is 4+
  };
}

export function addHeat(wanted, amount) {
  wanted.level = Math.min(WANTED.max, wanted.level + amount);
  wanted.unseenTimer = 0;
  wanted.decayTimer = 0;
}

export function clearWanted(wanted) {
  wanted.level = 0;
  wanted.heat = 0;
  wanted.unseenTimer = 0;
  wanted.decayTimer = 0;
}

// A police car: black body, white doors, light bar. Built from the generic
// car maker so it drives with the same physics.
export function spawnPoliceCar(rng, city, near) {
  const spot = randomRoadPoint(city, rng, near, 900);
  const car = makeCar(0, spot.x, spot.y, spot.vertical ? Math.PI / 2 : 0, {
    police: true,
    driver: 'police',
    color: '#16181d',
  });
  car.speed = 240;
  car.cruise = 430;
  return car;
}

function steerToward(car, tx, ty, dt) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * 2.4));
}

// At four stars the PD blocks the road ahead of the player: two cruisers
// parked nose-to-tail across the nearest road, lights flashing.
export function spawnRoadblock(rng, city, player) {
  const vertical = Math.abs(player.vx ?? 0) < Math.abs(player.vy ?? 0);
  const ahead = 420;
  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  const bx = player.x + fx * ahead;
  const by = player.y + fy * ahead;
  const blocked = [];
  for (let i = 0; i < 2; i += 1) {
    const side = i === 0 ? -34 : 34;
    const car = makeCar(0, bx - fy * side, by + fx * side, player.angle + Math.PI / 2, {
      police: true,
      driver: 'police',
      color: '#16181d',
    });
    car.speed = 0;
    car.cruise = 0;
    car.roadblock = true;
    blocked.push(car);
  }
  return blocked;
}

// Chase: police cars ram the player's car, or pull up beside the player on
// foot so an officer can get out. Officers on foot run the player down.
export function updateWanted(city, rng, wanted, dt, player, playerCar, events) {
  const target = playerCar ?? player;
  const px = target.x;
  const py = target.y;

  // How close is the nearest police? That decides whether heat decays.
  let nearest = Infinity;
  for (const c of wanted.policeCars) {
    if (!c.dead) nearest = Math.min(nearest, Math.hypot(c.x - px, c.y - py));
  }
  for (const o of wanted.officers) {
    if (!o.dead) nearest = Math.min(nearest, Math.hypot(o.x - px, o.y - py));
  }
  const seen = nearest < 520;
  if (wanted.level > 0 && !seen) {
    wanted.unseenTimer += dt;
    if (wanted.unseenTimer > WANTED.decayDelay) {
      wanted.decayTimer += dt;
      if (wanted.decayTimer > WANTED.decayStep) {
        wanted.decayTimer = 0;
        wanted.level = Math.max(0, wanted.level - 1);
        wanted.unseenTimer = 0;
        events.push({ type: 'wanted-down', level: wanted.level });
      }
    }
  } else {
    wanted.unseenTimer = 0;
    wanted.decayTimer = 0;
  }

  // Keep the right number of pursuit cars on the street (roadblock cars
  // hold their ground and do not count toward the pursuit pack).
  const wantCars = WANTED.pursuitCars[wanted.level] ?? 0;
  wanted.spawnTimer -= dt;
  if (wanted.policeCars.filter((c) => !c.dead && !c.roadblock).length < wantCars && wanted.spawnTimer <= 0) {
    wanted.policeCars.push(spawnPoliceCar(rng, city, { x: px, y: py }));
    wanted.spawnTimer = 2.2;
  }
  // Foot officers join at wanted 2 and up.
  const wantOfficers = WANTED.footOfficers[wanted.level] ?? 0;
  wanted.officerTimer -= dt;
  if (wanted.officers.filter((o) => !o.dead).length < wantOfficers && wanted.officerTimer <= 0) {
    const spot = randomRoadPoint(city, rng, { x: px, y: py }, 500);
    wanted.officers.push(makeOfficer(spot.x, spot.y));
    wanted.officerTimer = 3;
  }

  // Siren follows the wanted level.
  const siren = wanted.level >= 1;
  if (siren && !wanted.sirenOn) events.push({ type: 'siren-on' });
  if (!siren && wanted.sirenOn) events.push({ type: 'siren-off' });
  wanted.sirenOn = siren;

  // Four stars and up: one roadblock ahead of the player, rebuilt when the
  // player smashes through it or the heat falls back.
  if (wanted.level >= 4 && !wanted.roadblockUp) {
    const block = spawnRoadblock(rng, city, player);
    wanted.policeCars.push(...block);
    wanted.roadblockUp = true;
    events.push({ type: 'roadblock' });
  }
  if (wanted.level < 4) wanted.roadblockUp = false;

  // Pursuit steering. Roadblock cars hold their ground instead of chasing.
  for (const car of wanted.policeCars) {
    if (car.dead) continue;
    if (car.roadblock) continue;
    // Predict where the player will be, and aim a little past them to ram.
    const lead = 0.45;
    const tx = px + (playerCar ? playerCar.vx * lead : 0);
    const ty = py + (playerCar ? playerCar.vy * lead : 0);
    const steer = steerToward(car, tx, ty, dt);
    const dist = Math.hypot(px - car.x, py - car.y);
    const throttle = dist > 60 ? 1 : 0.4;
    driveCar(city, car, throttle, steer, dt);
  }
  for (const officer of wanted.officers) {
    if (officer.dead) continue;
    const call = updateOfficer(city, officer, player, dt);
    if (call === 'called-in' && wanted.level < 2) {
      addHeat(wanted, 1);
      events.push({ type: 'called-in' });
    }
    if (officer.bustTimer > 0.9) {
      events.push({ type: 'busted' });
      officer.bustTimer = 0;
    }
  }

  // Drop dead units (a wrecked police car is towed away at once).
  wanted.policeCars = wanted.policeCars.filter((c) => !c.dead);
  wanted.officers = wanted.officers.filter((o) => !o.dead);
}

// A police car ramming the player's car: damage + camera shake, via events.
export function policeRamDamage(wanted, playerCar, events) {
  if (!playerCar) return;
  for (const car of wanted.policeCars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - playerCar.x, car.y - playerCar.y);
    if (d < 62 && Math.abs(car.speed) > 180) {
      events.push({ type: 'ram', strength: Math.abs(car.speed) / 500 });
    }
  }
}
