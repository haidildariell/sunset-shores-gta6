// HUD, minimap and menus: everything drawn on top of the world — cash,
// health, wanted stars, the mission objective, the minimap with its blips,
// the dialogue line, the start/pause/busted screens and the edge arrow that
// points at an off-screen objective.

import { HUD, WEAPONS } from './config.js';
import { MISSIONS } from './missions.js';

function drawStars(ctx, level, x, y, time) {
  // Four stars and up pulse: the heat is visibly urgent.
  const pulse = level >= 4 ? 1 + Math.sin(time * 8) * 0.12 : 1;
  ctx.font = `${Math.round(HUD.starSize * pulse)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < level ? '#ffd23c' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * (HUD.starSize + 2), y);
  }
  ctx.textBaseline = 'alphabetic';
}

function drawMinimap(ctx, world, w, h, time) {
  const size = HUD.minimapSize;
  const mx = w - size - HUD.minimapMargin;
  const my = HUD.minimapMargin;
  const scale = size / 3600;
  const cw = 3600 * scale;
  const ch = 2800 * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,16,0.78)';
  ctx.fillRect(mx - 6, my - 6, cw + 12, ch + 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx - 6, my - 6, cw + 12, ch + 12);
  // Sea + sand.
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(mx, my + (2470 - 0) * scale, cw, ch - 2470 * scale);
  ctx.fillStyle = '#e9cf9a';
  ctx.fillRect(mx, my + 2380 * scale, cw, 90 * scale);
  // Roads.
  ctx.fillStyle = '#8a8a90';
  for (const rx of world.city.roadsV) ctx.fillRect(mx + (rx - 46) * scale, my, 92 * scale, ch);
  for (const ry of world.city.roadsH) ctx.fillRect(mx, my + (ry - 46) * scale, cw, 92 * scale);
  // Park.
  ctx.fillStyle = '#6b9a4c';
  ctx.fillRect(mx + 1590 * scale, my + 990 * scale, 380 * scale, 380 * scale);
  // Places.
  ctx.fillStyle = '#fff';
  for (const key of Object.keys(world.city.places)) {
    const p = world.city.places[key];
    ctx.fillRect(mx + p.x * scale - 2, my + p.y * scale - 2, 4, 4);
  }
  // Mission marker.
  if (world.marker) {
    const pulse = 1 + Math.sin(time * 5) * 0.3;
    ctx.fillStyle = world.marker.color;
    ctx.beginPath();
    ctx.arc(mx + world.marker.x * scale, my + world.marker.y * scale, 5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Courier marker.
  if (world.courier && world.courier.active) {
    const c = world.courier;
    const pt = c.stage === 'pickup' ? c.pickup : c.dropoff;
    ctx.fillStyle = '#2fae5f';
    ctx.beginPath();
    ctx.arc(mx + pt.x * scale, my + pt.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police blips.
  ctx.fillStyle = '#2d7dff';
  for (const car of world.wanted.policeCars) {
    if (!car.dead) ctx.fillRect(mx + car.x * scale - 2, my + car.y * scale - 2, 4, 4);
  }
  // Player arrow.
  const p = world.player;
  ctx.save();
  ctx.translate(mx + p.x * scale, my + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // "N" compass tick.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', mx + cw / 2, my + ch + 20);
}

export function drawHud(ctx, world, screen, time) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const p = world.player;
  const ms = world.mission;

  // Top-left: cash, health, ammo.
  ctx.fillStyle = 'rgba(10,12,16,0.72)';
  ctx.fillRect(12, 12, 250, 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, 250, 86);
  ctx.fillStyle = '#2fae5f';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, 24, 40);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  const weapon = WEAPONS[p.weapon ?? 'pistol'] ?? WEAPONS.pistol;
  ctx.fillText(`AMMO ${p.ammo}  •  ${weapon.name}`, 150, 38);
  // Health bar.
  ctx.fillStyle = '#3a1515';
  ctx.fillRect(24, 52, 200, 12);
  ctx.fillStyle = p.health > 30 ? '#e63229' : '#ff7a1a';
  ctx.fillRect(24, 52, 200 * Math.max(0, p.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 24, 84);
  if (p.car) {
    ctx.fillStyle = '#3a3a15';
    ctx.fillRect(120, 76, 104, 8);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(120, 76, 104 * Math.max(0, p.car.health / 100), 8);
  }

  // Top-right: wanted stars + clock, under the minimap.
  drawStars(ctx, world.wanted.level, w - 250, HUD.minimapMargin + HUD.minimapSize + 34, time);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  const clock = world.clock;
  const hh = Math.floor(clock / 60) % 24;
  const mm = Math.floor(clock % 60);
  ctx.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  ${world.dayName}`, w - 14, HUD.minimapMargin + HUD.minimapSize + 56);

  drawMinimap(ctx, world, w, h, time);

  // Mission objective bar, top-centre.
  const mission = MISSIONS[ms.index];
  if (mission && !ms.done) {
    const step = mission.steps[ms.step];
    const lines = [
      `${mission.title}  •  ${ms.index + 1}/${MISSIONS.length}`,
      step ? step.text : 'Job done',
    ];
    if (step && (step.type === 'timed' || step.type === 'survive')) {
      lines[1] += `  —  ${Math.max(0, Math.ceil(ms.timer))}s`;
    }
    ctx.font = 'bold 15px sans-serif';
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(w / 2 - tw / 2, 12, tw, 52);
    ctx.strokeStyle = 'rgba(255,210,60,0.6)';
    ctx.strokeRect(w / 2 - tw / 2, 12, tw, 52);
    ctx.fillStyle = '#ffd23c';
    ctx.textAlign = 'center';
    ctx.fillText(lines[0], w / 2, 32);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(lines[1], w / 2, 52);
  } else if (ms.done) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(w / 2 - 150, 12, 300, 30);
    ctx.fillStyle = '#ffd23c';
    ctx.textAlign = 'center';
    ctx.fillText('STORY COMPLETE — FREE ROAM', w / 2, 32);
  }

  // Courier job line.
  if (world.courier && world.courier.active) {
    const c = world.courier;
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(12, 108, 250, 30);
    ctx.fillStyle = '#2fae5f';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.stage === 'pickup' ? `COURIER: pick up at ${c.pickup.name}` : `COURIER: deliver to ${c.dropoff.name}  $${c.pay}`, 22, 128);
  }

  // Dialogue line, bottom-centre.
  if (world.dialogue && world.dialogueTimer > 0) {
    ctx.font = '15px sans-serif';
    const lines = wrapText(ctx, world.dialogue, w - 240);
    const bh = lines.length * 20 + 16;
    ctx.fillStyle = 'rgba(10,12,16,0.78)';
    ctx.fillRect(w / 2 - 320, h - bh - 76, 640, bh);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h - bh - 76 + 22 + i * 20));
  }

  // Mission banner, centre.
  if (ms.bannerTimer > 0 && ms.banner) {
    ctx.globalAlpha = Math.min(1, ms.bannerTimer);
    ctx.fillStyle = 'rgba(10,12,16,0.8)';
    ctx.fillRect(w / 2 - 260, h / 2 - 90, 520, 64);
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 260, h / 2 - 90, 520, 64);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ms.banner.toUpperCase(), w / 2, h / 2 - 52);
    ctx.globalAlpha = 1;
  }

  // Off-screen objective arrow.
  if (world.marker && screen === 'play') {
    const focus = p.car ?? p;
    const dx = world.marker.x - focus.x;
    const dy = world.marker.y - focus.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 420) {
      const ang = Math.atan2(dy, dx);
      const cx = w / 2 + Math.cos(ang) * Math.min(w / 2 - 60, dist * 0.4);
      const cy = h / 2 + Math.sin(ang) * Math.min(h / 2 - 60, dist * 0.4);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = world.marker.color;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(dist)}m`, cx, cy + 26);
    }
  }

  // Driving speed + nitro + radio, bottom-right; controls hint bottom-left.
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.24);
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(w - 130, h - 96, 118, 84);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, w - 40, h - 62);
    ctx.font = '12px sans-serif';
    ctx.fillText('km/h', w - 22, h - 62);
    // Nitro meter under the speedo, full orange while boosting.
    ctx.fillStyle = '#3a3a15';
    ctx.fillRect(w - 118, h - 52, 94, 8);
    ctx.fillStyle = p.car.boosting ? '#ff9a3c' : '#ffd23c';
    ctx.fillRect(w - 118, h - 52, 94 * Math.max(0, p.car.nitro / 100), 8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(p.car.boosting ? 'NITRO!' : 'NITRO', w - 22, h - 36);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`♪ ${world.radioName ?? 'SUNSET FM'}`, w - 22, h - 20);
  } else {
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(w - 130, h - 64, 118, 52);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`♪ ${world.radioName ?? 'SUNSET FM'}`, w - 22, h - 30);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(p.car ? 'WASD drive  •  Shift nitro  •  E exit car  •  H horn  •  C radio  •  M mute  •  Esc pause' : 'WASD move  •  Shift run  •  E enter car  •  Click shoot  •  Q weapon  •  F punch  •  C radio  •  M mute  •  Esc pause', 14, h - 14);

  // Low-health vignette: the screen bleeds red at the edges when hurt.
  if (p.health < 35 && p.health > 0) {
    const hurt = (35 - p.health) / 35;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(230,50,41,0)');
    vg.addColorStop(1, `rgba(230,50,41,${(0.35 + hurt * 0.3).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // Wanted flash when the heat rises.
  if (world.wantedFlash > 0) {
    ctx.fillStyle = `rgba(230,50,41,${world.wantedFlash * 0.25})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawTitleScreen(ctx, world, best) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(12,8,10,0.82)';
  ctx.fillRect(0, 0, w, h);
  // Sun.
  const sx = w / 2;
  const sy = h * 0.32;
  const sun = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180);
  sun.addColorStop(0, '#ffe9a8');
  sun.addColorStop(0.5, '#ff9a3c');
  sun.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUNSET SHORES', w / 2, h * 0.32 + 8);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime story in Palmera Bay', w / 2, h * 0.32 + 44);
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('DAZ COLE  •  MARA QUINN  •  SEVEN JOBS  •  ONE SUNSET', w / 2, h * 0.32 + 72);

  const lines = [
    'WASD / Arrows — move & drive      Shift — run / nitro in a car',
    'E — steal / enter a car           H — horn        C — radio',
    'Mouse — aim & shoot               Q — pistol / shotgun     F — punch',
    'Steal cars, run jobs for Mara, outrun the Palmera PD.',
    'Missions pay cash. Wanted stars bring the police — and roadblocks at four.',
    'Lucky Spray clears your wanted level for $200. Pit Stop repairs your car for $100.',
  ];
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h * 0.52 + i * 26));

  ctx.fillStyle = '#2fae5f';
  ctx.fillRect(w / 2 - 130, h * 0.52 + lines.length * 26 + 18, 260, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(world.hasSave ? 'CONTINUE  —  press Space' : 'START  —  press Space', w / 2, h * 0.52 + lines.length * 26 + 52);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Best cash: $${best.toLocaleString('en-US')}   •   M — mute   •   progress saves automatically`, w / 2, h * 0.52 + lines.length * 26 + 92);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '12px sans-serif';
  ctx.fillText('A fully original game. No real places, people or brands — Palmera Bay is invented.', w / 2, h - 24);
}

export function drawPausedScreen(ctx) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(10,10,14,0.7)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('Esc / P — resume      R — retry mission      M — mute', w / 2, h / 2 + 26);
}

export function drawEndScreen(ctx, kind, cash) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,30,60,0.82)' : 'rgba(40,10,10,0.82)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = kind === 'busted' ? '#7db4ff' : '#ff6a5e';
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', w / 2, h / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '17px sans-serif';
  ctx.fillText(
    kind === 'busted'
      ? 'The Palmera PD caught you. Bail cost you $150 — the crew is not happy.'
      : 'You went down in Palmera Bay. The hospital patched you up for $150.',
    w / 2,
    h / 2 + 18,
  );
  ctx.fillText(`Cash: $${cash.toLocaleString('en-US')}   —   press Space to get back out there`, w / 2, h / 2 + 48);
}
