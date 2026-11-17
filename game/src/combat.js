// Combat: fists and the pistol, bullets, armed enemies, and the pickups
// (health, ammo, cash) the city leaves around. Enemies only exist inside
// missions; the street itself stays a place to walk, not a warzone.

import { PLAYER } from './config.js';

export function createCombat() {
  return {
    bullets: [], // {x, y, vx, vy, life, fromPlayer, damage}
    enemies: [], // {x, y, angle, health, speed, state, shootTimer, name}
    pickups: [], // {x, y, kind: 'health'|'ammo'|'cash', value, bob}
    particles: [], // {x, y, vx, vy, life, maxLife, color, size}
    punchTimer: 0,
    shootTimer: 0,
    muzzle: 0,
  };
}

export function spawnEnemy(combat, x, y, name) {
  combat.enemies.push({
    kind: 'enemy',
    x,
    y,
    angle: 0,
    health: 70,
    speed: 150,
    state: 'guard',
    shootTimer: 1 + Math.random() * 1.5,
    name: name ?? 'Rival',
    dead: false,
    walkPhase: Math.random() * 6,
  });
}

export function spawnPickup(combat, x, y, kind, value) {
  combat.pickups.push({ x, y, kind, value, bob: Math.random() * 6 });
}

export function fireBullet(combat, x, y, angle, fromPlayer, damage) {
  const speed = 900;
  combat.bullets.push({
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.9,
    fromPlayer,
    damage,
  });
  combat.muzzle = 0.06;
}

export function addParticles(combat, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    combat.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

// Player punch: a short arc in front of the player.
export function tryPunch(combat, player, audio) {
  if (combat.punchTimer > 0) return false;
  combat.punchTimer = 0.34;
  audio.punch();
  for (const e of combat.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d > PLAYER.punchRange) continue;
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    let diff = Math.abs(ang - player.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < PLAYER.punchArc) {
      e.health -= PLAYER.punchDamage;
      e.state = 'chase';
      addParticles(combat, e.x, e.y, '#ffd23c', 6, 120);
    }
  }
  return true;
}

export function tryShoot(combat, player, audio) {
  if (combat.shootTimer > 0 || player.ammo <= 0) return false;
  combat.shootTimer = PLAYER.pistolCooldown;
  player.ammo -= 1;
  fireBullet(combat, player.x, player.y, player.angle, true, PLAYER.pistolDamage);
  audio.gunshot();
  return true;
}

// Bullets fly, hit enemies / the player / buildings, and die.
export function updateBullets(city, combat, dt, player, onPlayerHit) {
  combat.punchTimer = Math.max(0, combat.punchTimer - dt);
  combat.shootTimer = Math.max(0, combat.shootTimer - dt);
  combat.muzzle = Math.max(0, combat.muzzle - dt);
  for (const b of combat.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    // Buildings stop bullets.
    const p = { x: b.x, y: b.y };
    let blocked = false;
    for (const bd of city.buildings) {
      if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) { blocked = true; break; }
    }
    if (blocked) {
      b.life = 0;
      addParticles(combat, b.x, b.y, '#c9c9c9', 4, 90);
      continue;
    }
    if (b.fromPlayer) {
      for (const e of combat.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < 16) {
          e.health -= b.damage;
          e.state = 'chase';
          b.life = 0;
          addParticles(combat, b.x, b.y, '#e63229', 8, 140);
          break;
        }
      }
    } else if (Math.hypot(player.x - b.x, player.y - b.y) < 15) {
      b.life = 0;
      onPlayerHit(b.damage);
      addParticles(combat, b.x, b.y, '#e63229', 8, 140);
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
}

// Enemies: guard their post, chase the player once alerted, shoot in bursts.
export function updateEnemies(city, combat, dt, player, onPlayerHit) {
  for (const e of combat.enemies) {
    if (e.dead) continue;
    e.walkPhase += dt * 8;
    if (e.health <= 0) {
      e.dead = true;
      addParticles(combat, e.x, e.y, '#e63229', 16, 180);
      continue;
    }
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (d < 420) e.state = 'chase';
    const ox = e.x;
    const oy = e.y;
    if (e.state === 'chase') {
      const want = Math.atan2(player.y - e.y, player.x - e.x);
      let diff = want - e.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      e.angle += Math.max(-4 * dt, Math.min(4 * dt, diff));
      if (d > 130) {
        e.x += Math.cos(e.angle) * e.speed * dt;
        e.y += Math.sin(e.angle) * e.speed * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 380) {
        fireBullet(combat, e.x, e.y, e.angle + (Math.random() - 0.5) * 0.14, false, 9);
        e.shootTimer = 0.9 + Math.random() * 0.7;
      }
    }
    // Stay out of buildings: revert to the pre-move position on overlap.
    for (const bd of city.buildings) {
      if (e.x > bd.x - 12 && e.x < bd.x + bd.w + 12 && e.y > bd.y - 12 && e.y < bd.y + bd.h + 12) {
        e.x = ox;
        e.y = oy;
        break;
      }
    }
  }
  combat.enemies = combat.enemies.filter((e) => !e.dead || e.health > -40);
}

export function updateParticles(combat, dt) {
  for (const p of combat.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  combat.particles = combat.particles.filter((p) => p.life > 0);
}

// Pickups: walk over one to take it.
export function updatePickups(combat, player, dt, onTake) {
  for (const p of combat.pickups) {
    p.bob += dt * 3;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 26) {
      p.taken = true;
      onTake(p);
    }
  }
  combat.pickups = combat.pickups.filter((p) => !p.taken);
}
