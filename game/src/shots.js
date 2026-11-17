// Staged screenshot scenes. Each one sets the live world to a moment that
// shows the game at its best — same renderer, same HUD, no fake pixels —
// then the boot code paints it twice and flags window.__shotReady.
// ?shot=cover|drive|chase|mission with &seed=N.

import { makeCar } from './vehicles.js';
import { spawnEnemy } from './combat.js';
import { makePedestrian } from './people.js';
import { spawnTrafficCar } from './traffic.js';
import { randomRoadPoint } from './city.js';
import { MISSIONS } from './missions.js';

function clearWorld(world) {
  world.traffic.length = 0;
  world.parkedCars.length = 0;
  world.peds.length = 0;
  world.combat.enemies.length = 0;
  world.combat.bullets.length = 0;
  world.combat.pickups.length = 0;
  world.combat.particles.length = 0;
  world.wanted.policeCars.length = 0;
  world.wanted.officers.length = 0;
  world.wanted.level = 0;
  world.wanted.sirenOn = false;
  world.courier = null;
}

function seedStreet(world, rng, cx, cy, cars, peds) {
  for (let i = 0; i < cars; i += 1) {
    const car = spawnTrafficCar(rng, world.city, { x: cx, y: cy }, 900);
    if (Math.hypot(car.x - cx, car.y - cy) < 2400 && Math.hypot(car.x - cx, car.y - cy) > 230) world.traffic.push(car);
  }
  for (let i = 0; i < peds; i += 1) {
    const x = cx + rng.range(-500, 500);
    const y = cy + rng.range(-400, 400);
    world.peds.push(makePedestrian(rng, x, y));
  }
  // A few parked cars along the kerb for depth, kept clear of the hero.
  for (let i = 0; i < 4; i += 1) {
    const spot = randomRoadPoint(world.city, rng, { x: cx, y: cy }, 600);
    if (Math.hypot(spot.x - cx, spot.y - cy) < 230) continue;
    const car = makeCar(rng.int(0, 7), spot.x, spot.y, spot.vertical ? Math.PI / 2 : 0, { driver: null });
    world.parkedCars.push(car);
  }
}

function putPlayerInCar(world, typeIndex, x, y, angle, speed, color) {
  const car = makeCar(typeIndex, x, y, angle, { driver: 'player', color: color ?? '#e63229' });
  car.speed = speed;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  car.vx = c * speed;
  car.vy = s * speed;
  world.player.car = car;
  world.player.x = x;
  world.player.y = y;
  world.player.angle = angle;
  return car;
}

function addPoliceCar(world, x, y, angle, speed) {
  const car = makeCar(0, x, y, angle, { police: true, driver: 'police', color: '#16181d' });
  car.speed = speed;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  car.vx = c * speed;
  car.vy = s * speed;
  world.wanted.policeCars.push(car);
  return car;
}

function setMission(world, index, step) {
  world.mission.index = index;
  world.mission.step = step;
  world.mission.stepStarted = true;
  world.mission.timer = 0;
  world.mission.bannerTimer = 0;
  world.mission.failed = false;
  world.mission.done = false;
}

export function stageShot(name, world, rng) {
  const city = world.city;
  const p = world.player;
  clearWorld(world);
  p.health = 86;
  p.ammo = 32;
  p.cash = 2450;
  p.car = null;
  world.clock = 17 * 60 + 42;
  world.dayName = 'Day 1';
  world.dialogueTimer = 0;
  world.dialogueQueue.length = 0;

  if (name === 'cover') {
    // The money shot: a sunset chase through downtown, wanted level 3,
    // Mara's job on the HUD, the minimap lit up.
    const cx = city.roadsV[3];
    const cy = city.roadsH[2];
    putPlayerInCar(world, 6, cx, cy, 0, 320);
    addPoliceCar(world, cx - 190, cy + 8, 0, 340);
    addPoliceCar(world, cx - 260, cy - 40, 0, 330);
    addPoliceCar(world, cx + 320, cy + 160, Math.PI, 300);
    seedStreet(world, rng, cx, cy, 9, 8);
    setMission(world, 1, 2);
    world.wanted.level = 3;
    world.marker = { x: city.places.safehouse.x, y: city.places.safehouse.y, color: '#ffd23c', label: 'CASH RUN' };
    world.dialogue = 'MARA: Lose them before the safehouse, Daz. Three stars and counting.';
    world.dialogueTimer = 99;
    return { time: 1.35 };
  }

  if (name === 'drive') {
    // Cruising the beachfront boulevard at speed, traffic ahead, sea right.
    const beachRoad = city.roadsH[city.roadsH.length - 1];
    putPlayerInCar(world, 7, 1500, beachRoad, 0, 430);
    seedStreet(world, rng, 1500, beachRoad, 7, 10);
    setMission(world, 0, 1);
    world.marker = { x: city.places.chopShop.x, y: city.places.chopShop.y, color: '#ffd23c', label: 'FIRST WHEELS' };
    world.dialogue = 'MARA: Nice wheels. Now bring it to Rico — chop shop, north side.';
    world.dialogueTimer = 99;
    return { time: 2.1 };
  }

  if (name === 'chase') {
    // Full heat: four stars, police boxing the player in, downtown grid.
    const cx = city.roadsV[4];
    const cy = city.roadsH[3];
    putPlayerInCar(world, 7, cx, cy, Math.PI / 2, 380);
    addPoliceCar(world, cx - 30, cy - 240, Math.PI / 2, 420);
    addPoliceCar(world, cx + 60, cy - 320, Math.PI / 2, 400);
    addPoliceCar(world, cx - 200, cy + 120, 0, 380);
    addPoliceCar(world, cx + 240, cy + 60, Math.PI, 360);
    seedStreet(world, rng, cx, cy, 8, 6);
    setMission(world, 4, 0);
    world.mission.timer = 41;
    world.wanted.level = 4;
    world.marker = { x: city.places.respray.x, y: city.places.respray.y, color: '#ffd23c', label: 'HEAT WAVE' };
    world.dialogue = 'MARA: Four stars, Daz. Survive sixty seconds, then Lucky Spray!';
    world.dialogueTimer = 99;
    return { time: 0.7 };
  }

  // mission: on foot at the docks, Viper guards up, case to grab.
  const d = city.places.docks;
  p.x = d.x - 190;
  p.y = d.y + 90;
  p.angle = 0.3;
  p.ammo = 24;
  p.health = 78;
  spawnEnemy(world.combat, d.x - 60, d.y - 40, 'Viper');
  spawnEnemy(world.combat, d.x + 40, d.y - 70, 'Viper');
  spawnEnemy(world.combat, d.x - 20, d.y + 60, 'Viper');
  spawnEnemy(world.combat, d.x + 90, d.y + 30, 'Viper');
  seedStreet(world, rng, d.x, d.y, 3, 2);
  setMission(world, 3, 1);
  world.wanted.level = 1;
  world.marker = { x: d.x, y: d.y, color: '#e63229', label: 'DOCKSIDE DEAL' };
  world.dialogue = 'RICO: Four Vipers between you and the case. Shoot first, Daz.';
  world.dialogueTimer = 99;
  return { time: 1.8 };
}
