// Traffic: civilian cars that follow the road grid, keep to their lane, slow
// for the car ahead, and occasionally turn at intersections. Police cars
// reuse the same body but are steered by the wanted system instead.

import { ROAD_W } from './config.js';
import { collideCars, driveCar, makeCar } from './vehicles.js';
import { randomRoadPoint } from './city.js';

// Spawn a traffic car on a road near a point, already rolling.
export function spawnTrafficCar(rng, city, near, radius) {
  const spot = randomRoadPoint(city, rng, near, radius);
  const type = rng.int(0, 7);
  const car = makeCar(type, spot.x, spot.y, spot.vertical ? Math.PI / 2 : 0, { driver: 'traffic' });
  car.speed = rng.range(120, 210);
  car.cruise = rng.range(140, 230);
  car.laneSide = rng.chance(0.5) ? 1 : -1;
  return car;
}

// One traffic car follows its road. It keeps a target road line; at an
// intersection it may turn onto the crossing road.
export function updateTrafficCar(city, rng, car, dt, others, playerCar) {
  if (car.dead) return;
  // Find the road this car is on: nearest vertical or horizontal centre.
  let bestV = null;
  let bestVD = Infinity;
  for (const rx of city.roadsV) {
    const d = Math.abs(rx - car.x);
    if (d < bestVD) { bestVD = d; bestV = rx; }
  }
  let bestH = null;
  let bestHD = Infinity;
  for (const ry of city.roadsH) {
    const d = Math.abs(ry - car.y);
    if (d < bestHD) { bestHD = d; bestH = ry; }
  }
  const onVertical = bestVD < bestHD;
  const lane = ROAD_W / 4;
  let targetAngle;
  let tx;
  let ty;
  if (onVertical) {
    const dir = Math.sin(car.angle) >= 0 ? 1 : -1;
    tx = bestV + car.laneSide * lane * (dir > 0 ? 1 : -1) * -1;
    // Keep to the right: heading south uses the east lane, north the west.
    tx = bestV + (dir > 0 ? lane : -lane);
    ty = car.y + dir * 200;
    targetAngle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    // Maybe turn at an intersection.
    if (bestHD < 26 && rng.chance(0.012)) {
      car.angle = rng.chance(0.5) ? 0 : Math.PI;
      car.laneSide = rng.chance(0.5) ? 1 : -1;
    }
  } else {
    const dir = Math.cos(car.angle) >= 0 ? 1 : -1;
    tx = car.x + dir * 200;
    ty = bestH + (dir > 0 ? lane : -lane);
    targetAngle = dir > 0 ? 0 : Math.PI;
    if (bestVD < 26 && rng.chance(0.012)) {
      car.angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      car.laneSide = rng.chance(0.5) ? 1 : -1;
    }
  }
  // Steer toward the target angle.
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));

  // Slow down for the car ahead (traffic or the player).
  let throttle = 0.55;
  const ahead = Math.cos(car.angle);
  const aside = Math.sin(car.angle);
  for (const other of others) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = dx * ahead + dy * aside;
    const side = Math.abs(-dx * aside + dy * ahead);
    if (forward > 0 && forward < 95 && side < 42) {
      throttle = -0.7;
      break;
    }
  }
  if (playerCar && !playerCar.dead) {
    const dx = playerCar.x - car.x;
    const dy = playerCar.y - car.y;
    const forward = dx * ahead + dy * aside;
    const side = Math.abs(-dx * aside + dy * ahead);
    if (forward > 0 && forward < 110 && side < 46) throttle = -0.7;
  }
  // Ease toward cruise speed.
  if (car.speed > car.cruise) throttle = Math.min(throttle, 0);
  driveCar(city, car, throttle, steer, dt);
}

// Push traffic cars apart so they never overlap after a turn.
export function separateTraffic(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const impact = collideCars(a, b);
      if (impact > 200) {
        a.health -= 3;
        b.health -= 3;
      }
    }
  }
}
