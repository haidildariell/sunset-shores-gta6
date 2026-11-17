// Cars: creation, arcade driving physics, and simple collisions.
// A car is an oriented rectangle; physics runs on a velocity vector with
// steering, grip and drag, so driving feels weighty but forgiving.

import { CAR, CAR_TYPES } from './config.js';
import { collideSolids } from './city.js';

let nextCarId = 1;

export function makeCar(typeIndex, x, y, angle, opts = {}) {
  const type = CAR_TYPES[typeIndex % CAR_TYPES.length];
  const color = opts.color ?? type.colors[Math.floor(Math.random() * type.colors.length)];
  return {
    id: nextCarId,
    typeIndex,
    type,
    color,
    x,
    y,
    angle,
    speed: 0, // signed forward speed
    vx: 0,
    vy: 0,
    health: 100,
    police: !!opts.police,
    taxi: type.name === 'Taxi',
    driver: opts.driver ?? null, // 'traffic' | 'police' | 'player' | null (parked)
    stolen: false,
    honkTimer: 0,
    brakeLights: false,
    // Two collision circles along the body.
    radius: type.len / 2,
    dead: false,
  };
}

export function carCircles(car) {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const off = car.type.len * 0.26;
  return [
    { x: car.x + c * off, y: car.y + s * off, r: car.type.wid * 0.62 },
    { x: car.x - c * off, y: car.y - s * off, r: car.type.wid * 0.62 },
  ];
}

// Drive one car with throttle (-1..1) and steering (-1..1) for dt seconds.
// Returns true when it scraped something solid.
export function driveCar(city, car, throttle, steer, dt) {
  const top = CAR.maxSpeed * car.type.speed;
  const forwardX = Math.cos(car.angle);
  const forwardY = Math.sin(car.angle);

  // Steering only bites while moving, and sharper at low speed.
  const speedFactor = Math.min(1, Math.abs(car.speed) / 140 + 0.25);
  const steerRate = CAR.steer * speedFactor * Math.sign(car.speed || 1);
  car.angle += steer * steerRate * dt * (car.speed >= 0 ? 1 : -1);

  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 12) car.speed += CAR.brake * throttle * dt; // brake
    else car.speed += CAR.reverseAccel * throttle * dt; // reverse
  }
  // Drag + rolling resistance.
  car.speed -= car.speed * CAR.drag * dt;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-CAR.maxReverse, Math.min(top, car.speed));

  const nx = Math.cos(car.angle);
  const ny = Math.sin(car.angle);
  // Blend velocity toward the heading: grip kills sideways slide.
  const targetVx = nx * car.speed;
  const targetVy = ny * car.speed;
  const grip = Math.min(1, CAR.grip * dt);
  car.vx += (targetVx - car.vx) * grip;
  car.vy += (targetVy - car.vy) * grip;

  const oldX = car.x;
  const oldY = car.y;
  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // World edge: bounce softly back inside.
  if (car.x < 30 || car.x > 3570 || car.y < 30 || car.y > 2770) {
    car.x = Math.max(30, Math.min(3570, car.x));
    car.y = Math.max(30, Math.min(2770, car.y));
    car.speed *= 0.4;
    car.vx *= 0.4;
    car.vy *= 0.4;
  }

  // Buildings and containers: resolve against both body circles.
  let scraped = false;
  for (const circle of carCircles(car)) {
    const p = { x: circle.x, y: circle.y };
    if (collideSolids(city, p, circle.r)) {
      // Push the whole car by the circle's correction.
      car.x += p.x - circle.x;
      car.y += p.y - circle.y;
      const impact = Math.abs(car.speed);
      car.speed *= 0.55;
      car.vx *= 0.55;
      car.vy *= 0.55;
      if (impact > 120) scraped = true;
      if (impact > 260) car.health -= (impact - 260) * 0.06;
    }
  }
  // Water stops a car cold (and hurts it).
  if (car.y > 2500 && car.x < 3570) {
    // Beach driving is allowed; the sea itself is not.
    if (car.y > 2620) {
      car.x = oldX;
      car.y = oldY;
      car.speed *= -0.3;
      car.health -= 2;
      scraped = true;
    }
  }
  car.brakeLights = throttle < 0 && car.speed > 12;
  if (car.health <= 0 && !car.dead) {
    car.dead = true;
  }
  return scraped;
}

// Circle-circle push between two cars; returns the impact speed.
export function collideCars(a, b) {
  let impact = 0;
  const ca = carCircles(a);
  const cb = carCircles(b);
  for (const pa of ca) {
    for (const pb of cb) {
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy);
      const min = pa.r + pb.r;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = Math.abs(a.speed - b.speed);
        impact = Math.max(impact, rel);
        a.speed *= 0.86;
        b.speed *= 0.86;
      }
    }
  }
  return impact;
}

// A car is worth stealing when it is parked or driven by traffic.
export function isStealable(car) {
  return !car.police && (car.driver === null || car.driver === 'traffic');
}
