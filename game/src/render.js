// Rendering: the city ground is painted once to an offscreen canvas
// (roads, blocks, buildings, beach, sea, park, docks), then each frame the
// camera draws the visible slice plus every moving thing on top.

import { PALETTE, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { DOCK_X, SAND_TOP, WATER_TOP } from './city.js';
import { carCircles } from './vehicles.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintGround(city) {
  const ground = document.createElement('canvas');
  ground.width = WORLD_W;
  ground.height = WORLD_H;
  const g = ground.getContext('2d');

  // Base grass.
  g.fillStyle = PALETTE.grass;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Sea and sand along the south edge.
  const sea = g.createLinearGradient(0, WATER_TOP, 0, WORLD_H);
  sea.addColorStop(0, PALETTE.water);
  sea.addColorStop(1, PALETTE.waterDeep);
  g.fillStyle = sea;
  g.fillRect(0, WATER_TOP + 60, WORLD_W, WORLD_H - WATER_TOP - 60);
  g.fillStyle = PALETTE.sand;
  g.fillRect(0, SAND_TOP, WORLD_W, WATER_TOP + 60 - SAND_TOP);
  // Wet sand band and wave lines.
  g.fillStyle = PALETTE.sandWet;
  g.fillRect(0, WATER_TOP + 30, WORLD_W, 30);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  for (let x = 0; x < WORLD_W; x += 140) {
    g.beginPath();
    g.moveTo(x, WATER_TOP + 62 + ((x / 140) % 2) * 8);
    g.quadraticCurveTo(x + 35, WATER_TOP + 52, x + 70, WATER_TOP + 62);
    g.stroke();
  }
  // Beach umbrellas.
  for (let x = 200; x < WORLD_W - 200; x += 260) {
    g.fillStyle = '#e86a6a';
    g.beginPath();
    g.arc(x, SAND_TOP + 46, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f5efe0';
    g.beginPath();
    g.arc(x, SAND_TOP + 46, 14, Math.PI, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8a6f4d';
    g.fillRect(x - 1, SAND_TOP + 46, 2, 16);
  }

  // Sidewalk slabs: a lighter border around every road.
  g.fillStyle = PALETTE.sidewalk;
  for (const rx of city.roadsV) {
    g.fillRect(rx - ROAD_W / 2 - 16, 0, ROAD_W + 32, SAND_TOP);
  }
  for (const ry of city.roadsH) {
    g.fillRect(0, ry - ROAD_W / 2 - 16, WORLD_W, ROAD_W + 32);
  }

  // Asphalt.
  g.fillStyle = PALETTE.asphalt;
  for (const rx of city.roadsV) {
    g.fillRect(rx - ROAD_W / 2, 0, ROAD_W, SAND_TOP);
  }
  for (const ry of city.roadsH) {
    g.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  }

  // Lane dashes.
  g.fillStyle = PALETTE.lane;
  for (const rx of city.roadsV) {
    for (let y = 20; y < SAND_TOP; y += 64) {
      const onCross = city.roadsH.some((ry) => Math.abs(ry - y) < ROAD_W);
      if (!onCross) g.fillRect(rx - 3, y, 6, 30);
    }
  }
  for (const ry of city.roadsH) {
    for (let x = 20; x < WORLD_W; x += 64) {
      const onCross = city.roadsV.some((rx) => Math.abs(rx - x) < ROAD_W);
      if (!onCross) g.fillRect(x, ry - 3, 30, 6);
    }
  }

  // Park: green lawn, paths, pond.
  const park = city.places.park;
  g.fillStyle = PALETTE.grassDark;
  g.fillRect(park.x - 190, park.y - 190, 380, 380);
  g.fillStyle = PALETTE.parkPath;
  g.fillRect(park.x - 8, park.y - 190, 16, 380);
  g.fillRect(park.x - 190, park.y - 8, 380, 16);
  g.fillStyle = '#5fa8c9';
  g.beginPath();
  g.arc(park.x + 90, park.y + 90, 42, 0, Math.PI * 2);
  g.fill();

  // Dock ground: concrete apron.
  g.fillStyle = '#8d8578';
  g.fillRect(DOCK_X, 300, WORLD_W - DOCK_X, WORLD_H - 700);
  g.fillStyle = '#7a7266';
  for (let y = 340; y < WORLD_H - 420; y += 120) {
    g.fillRect(DOCK_X + 8, y, WORLD_W - DOCK_X - 16, 4);
  }
  // Containers.
  for (const c of city.containers) {
    g.fillStyle = '#00000030';
    g.fillRect(c.x + 5, c.y + 6, c.w, c.h);
    g.fillStyle = c.color;
    g.fillRect(c.x, c.y, c.w, c.h);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 1; i < 5; i += 1) g.fillRect(c.x + i * 18, c.y + 3, 3, c.h - 6);
  }

  // Buildings: soft shadow, roof colour, parapet edge, windows, tall towers.
  for (const b of city.buildings) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    g.fillStyle = b.roof;
    g.fillRect(b.x, b.y, b.w, b.h);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 3;
    g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // Inner courtyard line for bigger roofs.
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2;
    g.strokeRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    if (b.tall) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(b.x + b.w / 2 - 14, b.y + b.h / 2 - 14, 28, 28);
    }
    // Rooftop AC boxes.
    g.fillStyle = 'rgba(0,0,0,0.3)';
    const n = 1 + (b.windows % 3);
    for (let i = 0; i < n; i += 1) {
      g.fillRect(b.x + 14 + i * 26, b.y + 14, 16, 12);
    }
  }

  // Trees.
  for (const t of city.trees) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath();
    g.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4e7d3a';
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#6aa84f';
    g.beginPath();
    g.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
    g.fill();
  }

  return ground;
}

export function createRenderer(canvas, city) {
  const ctx = canvas.getContext('2d');
  const ground = paintGround(city);
  let shake = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawCar(car, time) {
    const t = car.type;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, -t.len / 2 + 3, -t.wid / 2 + 4, t.len, t.wid, 10);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#14141a';
    const wy = t.wid / 2 - 2;
    const wx = t.len / 2 - 14;
    ctx.fillRect(-wx - 8, -wy - 3, 16, 7);
    ctx.fillRect(wx - 8, -wy - 3, 16, 7);
    ctx.fillRect(-wx - 8, wy - 4, 16, 7);
    ctx.fillRect(wx - 8, wy - 4, 16, 7);
    // Body.
    ctx.fillStyle = car.color;
    roundRect(ctx, -t.len / 2, -t.wid / 2, t.len, t.wid, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Police livery: white doors + light bar.
    if (car.police) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-6, -t.wid / 2, 22, t.wid);
      const flash = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff2d2d' : '#2d7dff';
      ctx.fillRect(-4, -t.wid / 2 - 3, 8, 7);
      ctx.fillStyle = flash ? '#2d7dff' : '#ff2d2d';
      ctx.fillRect(-4, t.wid / 2 - 4, 8, 7);
      ctx.fillStyle = '#16181d';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 5, 3);
    }
    // Taxi sign and checker band.
    if (car.taxi) {
      ctx.fillStyle = '#16181d';
      ctx.fillRect(-t.len / 2 + 6, -t.wid / 2, 6, t.wid);
      ctx.fillRect(-t.len / 2 + 6, -2, t.len - 12, 4);
      ctx.fillStyle = '#f2c200';
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = '#16181d';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    // Windshield + roof + rear window.
    ctx.fillStyle = 'rgba(20,28,38,0.85)';
    roundRect(ctx, t.len / 2 - 20, -t.wid / 2 + 5, 12, t.wid - 10, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, -8, -t.wid / 2 + 6, 18, t.wid - 12, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,28,38,0.7)';
    roundRect(ctx, -t.len / 2 + 6, -t.wid / 2 + 5, 10, t.wid - 10, 4);
    ctx.fill();
    // Headlights and brake lights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(t.len / 2 - 2, -t.wid / 2 + 4, 3, 6);
    ctx.fillRect(t.len / 2 - 2, t.wid / 2 - 10, 3, 6);
    if (car.brakeLights) {
      ctx.fillStyle = '#ff2d2d';
      ctx.fillRect(-t.len / 2 - 1, -t.wid / 2 + 4, 3, 6);
      ctx.fillRect(-t.len / 2 - 1, t.wid / 2 - 10, 3, 6);
    }
    // Damage smoke.
    if (car.health < 45) {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(-t.len / 2 + 6, 0, 5 + Math.sin(time * 9) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(p, time, isPlayer) {
    const bob = Math.sin(p.walkPhase) * 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(p.angle);
    // Body.
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Head.
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(4, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick + gun for armed people.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    if (p.kind === 'officer') {
      ctx.fillStyle = '#f2c200';
      ctx.beginPath();
      ctx.arc(-4, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.kind === 'enemy' || p.kind === 'officer') {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(10, 3);
      ctx.lineTo(20, 5);
      ctx.stroke();
    }
    ctx.restore();
    if (isPlayer) {
      // Ring so the player is always findable in a crowd.
      ctx.strokeStyle = 'rgba(255,210,60,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.scared) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', p.x, p.y - 20 + bob);
    }
  }

  function drawPickup(p, time) {
    const y = p.y + Math.sin(p.bob) * 3;
    ctx.save();
    ctx.translate(p.x, y);
    if (p.kind === 'health') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#e63229';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else if (p.kind === 'ammo') {
      ctx.fillStyle = '#2e2e33';
      ctx.fillRect(-10, -7, 20, 14);
      ctx.fillStyle = '#f2c200';
      ctx.fillRect(-8, -7, 4, 14);
      ctx.fillRect(0, -7, 4, 14);
    } else {
      ctx.fillStyle = '#2fae5f';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    ctx.restore();
  }

  function drawMarker(x, y, time, color, label) {
    const pulse = 1 + Math.sin(time * 5) * 0.15;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-9 * pulse, -9 * pulse, 18 * pulse, 18 * pulse);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9 * pulse, -9 * pulse, 18 * pulse, 18 * pulse);
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 26 + Math.sin(time * 5) * 5, 0, Math.PI * 2);
    ctx.stroke();
    if (label) {
      ctx.font = 'bold 12px sans-serif';
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x - w / 2, y - 52, w, 20);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 38);
    }
  }

  return {
    addShake(amount) {
      shake = Math.min(14, shake + amount);
    },
    // Convert a canvas pixel to world coordinates using the last camera.
    screenToWorld(sx, sy) {
      const last = this._cam ?? { camX: 0, camY: 0, zoom: 1, w: 1280, h: 800 };
      return {
        x: (sx - last.w / 2) / last.zoom + last.camX,
        y: (sy - last.h / 2) / last.zoom + last.camY,
      };
    },
    draw(world, screen, time) {
      const w = canvas.width;
      const h = canvas.height;
      const player = world.player;
      const focus = player.car ?? player;
      const zoom = player.car ? 0.92 : 1.05;
      const camX = Math.max(w / 2 / zoom, Math.min(WORLD_W - w / 2 / zoom, focus.x));
      const camY = Math.max(h / 2 / zoom, Math.min(WORLD_H - h / 2 / zoom, focus.y));
      shake = Math.max(0, shake - 0.6);
      const shX = shake ? (Math.random() - 0.5) * shake : 0;
      const shY = shake ? (Math.random() - 0.5) * shake : 0;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#1a1210';
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(zoom, 0, 0, zoom, w / 2 - camX * zoom + shX, h / 2 - camY * zoom + shY);
      this._cam = { camX, camY, zoom, w, h };

      // Ground slice.
      const vx = camX - w / 2 / zoom - 20;
      const vy = camY - h / 2 / zoom - 20;
      const vw = w / zoom + 40;
      const vh = h / zoom + 40;
      ctx.drawImage(ground, vx, vy, vw, vh, vx, vy, vw, vh);

      // Mission + courier markers under the entities.
      if (world.marker) drawMarker(world.marker.x, world.marker.y, time, world.marker.color, world.marker.label);
      if (world.courier && world.courier.active) {
        const c = world.courier;
        const pt = c.stage === 'pickup' ? c.pickup : c.dropoff;
        drawMarker(pt.x, pt.y, time, '#2fae5f', c.stage === 'pickup' ? 'PICKUP' : 'DROP OFF');
      }
      // Cash stashes glint.
      for (const s of world.city.stashes) {
        if (s.taken) continue;
        const d = Math.hypot(s.x - player.x, s.y - player.y);
        if (d < 500) drawPickup({ x: s.x, y: s.y, kind: 'cash', bob: time * 2 }, time);
      }

      // Pickups, cars, people, bullets, particles — roughly back to front.
      for (const p of world.combat.pickups) drawPickup(p, time);
      const cars = [...world.traffic, ...world.wanted.policeCars];
      if (player.car) cars.push(player.car);
      for (const car of world.parkedCars) cars.push(car);
      cars.sort((a, b) => a.y - b.y);
      for (const car of cars) {
        if (car.dead) continue;
        if (Math.abs(car.x - camX) > w / 2 / zoom + 120) continue;
        if (Math.abs(car.y - camY) > h / 2 / zoom + 120) continue;
        drawCar(car, time);
      }
      for (const ped of world.peds) {
        if (ped.dead) continue;
        if (Math.abs(ped.x - camX) > w / 2 / zoom + 60) continue;
        if (Math.abs(ped.y - camY) > h / 2 / zoom + 60) continue;
        drawPerson(ped, time, false);
      }
      for (const o of world.wanted.officers) drawPerson(o, time, false);
      for (const e of world.combat.enemies) drawPerson(e, time, false);
      // Player on foot.
      if (!player.car) drawPerson(player, time, true);

      // Bullets as tracers.
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 2.5;
      for (const b of world.combat.bullets) {
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Muzzle flash.
      if (world.combat.muzzle > 0 && !player.car) {
        const mx = player.x + Math.cos(player.angle) * 26;
        const my = player.y + Math.sin(player.angle) * 26;
        ctx.fillStyle = '#ffdf4d';
        ctx.beginPath();
        ctx.arc(mx, my, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      // Particles.
      for (const p of world.combat.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Golden-hour tint + vignette.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const tint = ctx.createLinearGradient(0, 0, 0, h);
      tint.addColorStop(0, 'rgba(255,170,80,0.05)');
      tint.addColorStop(1, 'rgba(255,120,40,0.10)');
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
    get canvas() {
      return canvas;
    },
  };
}
