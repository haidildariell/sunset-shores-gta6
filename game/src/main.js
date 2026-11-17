// Boot and the one loop: input every frame, the world advances in fixed
// 1/60 s steps, and the renderer + HUD paint what is there. The game moves
// between four screens: title, play, paused, and busted/wasted.
//
// ?seed=N fixes the city. ?shot=cover|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { CAR, PITSTOP_COST, PLAYER, STEP, WORLD_H, WORLD_W } from './config.js';
import { createRandom } from './random.js';
import { buildCity, clampToWorld, collideSolids, isWater, randomRoadPoint } from './city.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_HORN, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RADIO, ACTION_RESTART, ACTION_RUN, ACTION_WEAPON, createInput } from './input.js';
import { createRenderer } from './render.js';
import { drawEndScreen, drawHud, drawPausedScreen, drawTitleScreen } from './hud.js';
import { addHeat, clearWanted, createWanted, policeRamDamage, updateWanted } from './police.js';
import { collideCars, driveCar, isStealable, makeCar, repairCar } from './vehicles.js';
import { makePedestrian, updatePedestrian } from './people.js';
import { separateTraffic, spawnTrafficCar, updateTrafficCar } from './traffic.js';
import { createCombat, switchWeapon, tryPunch, tryShoot, updateBullets, updateEnemies, updateParticles, updatePickups } from './combat.js';
import { MISSIONS, createMissionState, currentMission, currentStep, makeCourierJob, retryMission, startMission, updateMission } from './missions.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const TRAFFIC_TARGET = 13;
const PED_TARGET = 16;
const PARKED_TARGET = 9;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const city = buildCity(rng);
const audio = createAudio();
const renderer = createRenderer(canvas, city);

function makePlayer(x, y) {
  return {
    kind: 'player',
    x,
    y,
    angle: 0,
    speed: 0,
    health: PLAYER.maxHealth,
    cash: PLAYER.startCash,
    ammo: PLAYER.startAmmo,
    weapon: 'pistol', // Q switches to the shotgun
    car: null,
    walkPhase: 0,
    shirt: '#e86a2e',
    skin: '#e8b98a',
    scared: false,
    dead: false,
    lastDamage: -99,
  };
}

function createWorld() {
  const save = loadSave();
  const player = makePlayer(940, 700);
  if (save) {
    player.cash = save.cash;
    player.weapon = save.weapon ?? 'pistol';
    for (const i of save.stashesTaken) {
      if (city.stashes[i]) city.stashes[i].taken = true;
    }
  }
  const world = {
    rng,
    city,
    player,
    traffic: [],
    parkedCars: [],
    peds: [],
    wanted: createWanted(),
    combat: createCombat(),
    mission: createMissionState(),
    courier: null,
    courierTimer: 40,
    courierDone: save ? save.courierDone : 0,
    radioStation: save ? save.radioStation : 0,
    radioName: 'SUNSET FM',
    clock: 17 * 60 + 20, // golden hour
    day: 1,
    dayName: 'Day 1',
    marker: null,
    dialogue: '',
    dialogueTimer: 0,
    dialogueQueue: [],
    wantedFlash: 0,
    bestCash: save ? save.bestCash : 0,
    hasSave: !!save,
    events: [],
    saveTimer: 0,
    time: 0,
    shake: 0,
  };
  if (save) {
    world.mission.index = Math.min(save.missionIndex, MISSIONS.length);
    audio.setStation(save.radioStation ?? 0);
    world.radioName = audio.radioName;
  }
  return world;
}

const world = createWorld();
const player = world.player;

function say(text) {
  world.dialogue = text;
  world.dialogueTimer = 4.5;
}
function sayLines(lines) {
  world.dialogueQueue.push(...lines);
}

function missionMarker() {
  const ms = world.mission;
  const mission = currentMission(ms);
  if (!mission || ms.done || ms.failed) return null;
  const step = currentStep(ms);
  if (!step) return null;
  if (step.place && city.places[step.place]) {
    const pt = city.places[step.place];
    return { x: pt.x, y: pt.y, color: '#ffd23c', label: mission.title.toUpperCase() };
  }
  return null;
}

function nearestStealableCar() {
  let best = null;
  let bestD = 60;
  const cars = [...world.traffic, ...world.parkedCars];
  for (const car of cars) {
    if (car.dead || !isStealable(car)) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  // A traffic driver bails out and runs.
  if (car.driver === 'traffic') {
    const ped = makePedestrian(rng, car.x + 30, car.y + 10);
    ped.flee = 3;
    ped.panicFrom = { x: player.x, y: player.y };
    world.peds.push(ped);
    addHeat(world.wanted, 1);
    world.wantedFlash = 1;
    say('You stole the car! The cops noticed.');
  }
  car.driver = 'player';
  car.stolen = true;
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  audio.engineStart();
  audio.horn();
}

function exitCar() {
  const car = player.car;
  if (!car) return;
  car.driver = null;
  const side = car.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 34;
  player.y = car.y + Math.sin(side) * 34;
  player.angle = car.angle;
  player.car = null;
  audio.engineStop();
}

function damagePlayer(amount, source) {
  if (player.health <= 0) return;
  player.health -= amount;
  player.lastDamage = world.time;
  renderer.addShake(Math.min(8, amount / 6));
  if (source === 'ram' || source === 'hit') audio.crash();
  if (player.health <= 0) {
    player.health = 0;
    endScreen('wasted');
  }
}

let screen = 'title';
let endKind = 'busted';

function endScreen(kind) {
  endKind = kind;
  screen = 'over';
  player.cash = Math.max(0, player.cash - 150);
  clearWanted(world.wanted);
  world.wanted.policeCars.length = 0;
  world.wanted.officers.length = 0;
  audio.sirenStop();
  audio.engineStop();
  audio.busted();
  if (player.car) {
    player.car.driver = null;
    player.car = null;
  }
  const spot = kind === 'busted' ? city.places.policeStation : city.places.hospital;
  player.x = spot.x + 40;
  player.y = spot.y + 40;
  player.health = PLAYER.maxHealth;
  writeSave(world);
  status.textContent = kind === 'busted' ? 'Busted. You lost $150 bail.' : 'Wasted. The hospital charged $150.';
}

function respawnAfterEnd() {
  screen = 'play';
  status.textContent = 'Playing. Back on the streets of Palmera Bay.';
}

function startGame() {
  screen = 'play';
  audio.unlock();
  audio.startMusic();
  if (world.mission.index < MISSIONS.length && !world.mission.startedOnce) {
    world.mission.startedOnce = true;
    startMission(missionCtx(), world.mission);
  }
  status.textContent = 'Playing. Explore Palmera Bay.';
}

function missionCtx() {
  return {
    city,
    combat: world.combat,
    wanted: world.wanted,
    player,
    audio,
    events: world.events,
    say,
    sayLines,
    addHeat: (n) => {
      addHeat(world.wanted, n);
      world.wantedFlash = 1;
    },
  };
}

function spawnNearbyTraffic() {
  while (world.traffic.length < TRAFFIC_TARGET) {
    const car = spawnTrafficCar(rng, city, player, 1100);
    if (Math.hypot(car.x - player.x, car.y - player.y) > 320) world.traffic.push(car);
    else break;
  }
  world.traffic = world.traffic.filter((c) => {
    if (c.dead) return false;
    return Math.hypot(c.x - player.x, c.y - player.y) < 1500;
  });
}

function spawnNearbyParked() {
  let guard = 0;
  while (world.parkedCars.length < PARKED_TARGET && guard < 12) {
    guard += 1;
    const spot = randomRoadPoint(city, rng, player, 1000);
    if (Math.hypot(spot.x - player.x, spot.y - player.y) < 260) continue;
    const car = makeCar(rng.int(0, 7), spot.x, spot.y, spot.vertical ? Math.PI / 2 : 0, { driver: null });
    world.parkedCars.push(car);
  }
  world.parkedCars = world.parkedCars.filter((c) => {
    if (c.dead) return false;
    return Math.hypot(c.x - player.x, c.y - player.y) < 1500;
  });
}

function spawnNearbyPeds() {
  let guard = 0;
  while (world.peds.length < PED_TARGET && guard < 20) {
    guard += 1;
    const spot = randomRoadPoint(city, rng, player, 800);
    if (Math.hypot(spot.x - player.x, spot.y - player.y) < 200) continue;
    world.peds.push(makePedestrian(rng, spot.x + rng.range(-60, 60), spot.y + rng.range(-60, 60)));
  }
  world.peds = world.peds.filter((p) => {
    if (p.dead) return false;
    return Math.hypot(p.x - player.x, p.y - player.y) < 1200;
  });
}

function updatePlayerOnFoot(dt, input, actions) {
  const mx = input.moveX();
  const my = input.moveY();
  const running = (actions & ACTION_RUN) !== 0;
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    player.x += (mx / len) * speed * dt;
    player.y += (my / len) * speed * dt;
    player.walkPhase += dt * (running ? 13 : 9);
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  // Aim at the mouse.
  const mouse = input.mouse;
  const mw = renderer.screenToWorld(mouse.x, mouse.y);
  player.angle = Math.atan2(mw.y - player.y, mw.x - player.x);
  // Stay out of the sea and out of buildings.
  if (player.y > 2580) player.y = 2580;
  collideSolids(city, player, PLAYER.radius);
  clampToWorld(player, 24);

  // Punch and shoot.
  if ((actions & ACTION_INTERACT) !== 0) tryPunch(world.combat, player, audio);
  if (mouse.down) tryShoot(world.combat, player, audio);
  if (input.takeClick() && player.ammo <= 0) tryPunch(world.combat, player, audio);

  // Enter a car.
  if ((actions & ACTION_ENTER) !== 0) {
    const car = nearestStealableCar();
    if (car) enterCar(car);
  }
}

function updatePlayerDriving(dt, input, actions) {
  const car = player.car;
  const throttle = -input.moveY(); // W is forward (moveY is -1 up)
  const steer = input.moveX();
  const boosting = (actions & ACTION_RUN) !== 0 && car.nitro > 0 && throttle > 0;
  if (boosting && !car.boosting) audio.nitro();
  const scraped = driveCar(city, car, throttle, steer, dt, { boost: boosting });
  if (scraped) {
    audio.crash();
    renderer.addShake(4);
  }
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  audio.engineSet(Math.abs(car.speed) / CAR.maxSpeed, true);
  if ((actions & ACTION_HORN) !== 0) audio.horn();
  if ((actions & ACTION_ENTER) !== 0) exitCar();

  // Running over pedestrians.
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < 34 && Math.abs(car.speed) > 70) {
      ped.dead = true;
      addHeat(world.wanted, 1);
      world.wantedFlash = 1;
      audio.crash();
      renderer.addShake(6);
      say('You hit a pedestrian! The cops are coming.');
    }
  }
  // Ramming traffic: damage both, and the law notices.
  for (const other of [...world.traffic, ...world.parkedCars]) {
    if (other === car || other.dead) continue;
    const impact = collideCars(car, other);
    if (impact > 260) {
      audio.crash();
      renderer.addShake(5);
      car.health -= 4;
      other.health -= 6;
      if (Math.abs(car.speed) > 200) addHeat(world.wanted, 1);
    }
  }
  if (car.health <= 0) {
    car.dead = true;
    audio.crash();
    renderer.addShake(10);
    exitCar();
    player.health = Math.max(10, player.health - 20);
    say('Your car is wrecked. Find another one.');
  }
}

function updateCourier(dt) {
  if (world.mission.index === 0) return; // courier work opens after the first job
  if (!world.courier) {
    world.courierTimer -= dt;
    if (world.courierTimer <= 0) {
      world.courier = makeCourierJob(rng, city);
      say(`Courier job: pick up at ${world.courier.pickup.name} — $${world.courier.pay}`);
    }
    return;
  }
  const c = world.courier;
  const target = c.stage === 'pickup' ? c.pickup : c.dropoff;
  if (Math.hypot(player.x - target.x, player.y - target.y) < 60) {
    if (c.stage === 'pickup') {
      c.stage = 'dropoff';
      audio.pickup();
      say(`Package picked up. Deliver to ${c.dropoff.name}.`);
    } else {
      player.cash += c.pay;
      world.courierDone += 1;
      audio.cash();
      say(`Courier done. +$${c.pay}.`);
      world.courier = null;
      world.courierTimer = 30;
      writeSave(world);
    }
  }
}

// Pit Stop Garage: a wrecked car gets a full repair for $100, no questions.
function updatePitStop() {
  const r = city.places.pitStop;
  if (!player.car || player.car.health >= 100) return;
  if (player.cash < PITSTOP_COST) return;
  if (Math.hypot(player.x - r.x, player.y - r.y) > 110) return;
  player.cash -= PITSTOP_COST;
  repairCar(player.car);
  audio.cash();
  say(`Pit Stop: good as new, full nitro. -$${PITSTOP_COST}.`);
  writeSave(world);
}

function updateRespray() {
  const r = city.places.respray;
  if (player.car && world.wanted.level > 0 && player.cash >= 200
    && Math.hypot(player.x - r.x, player.y - r.y) < 110) {
    player.cash -= 200;
    clearWanted(world.wanted);
    world.wanted.policeCars.length = 0;
    world.wanted.officers.length = 0;
    audio.sirenStop();
    audio.cash();
    say('Fresh paint, clean record. -$200. The cops lost you.');
  }
}

function updateStashes() {
  for (const s of city.stashes) {
    if (s.taken) continue;
    if (Math.hypot(player.x - s.x, player.y - s.y) < 28) {
      s.taken = true;
      player.cash += 100;
      audio.cash();
      say('Found a stash: +$100.');
      writeSave(world);
    }
  }
}

function handleEvents() {
  for (const e of world.events) {
    if (e.type === 'siren-on') audio.sirenStart();
    if (e.type === 'siren-off') audio.sirenStop();
    if (e.type === 'busted') endScreen('busted');
    if (e.type === 'roadblock') say('Roadblock ahead! The PD is boxing you in.');
    if (e.type === 'called-in') {
      world.wantedFlash = 1;
      say('An officer radioed you in. The heat is rising.');
    }
    if (e.type === 'ram') {
      renderer.addShake(e.strength * 8);
      if (player.car) {
        player.car.health -= e.strength * 8;
        audio.crash();
      }
    }
    if (e.type === 'mission-complete') writeSave(world);
  }
  world.events.length = 0;
}

function step(dt, input, actions) {
  world.time += dt;
  world.clock += dt * 0.5; // one game minute every two seconds
  if (world.clock >= 24 * 60) {
    world.clock -= 24 * 60;
    world.day += 1;
    world.dayName = `Day ${world.day}`;
  }
  world.wantedFlash = Math.max(0, world.wantedFlash - dt * 1.4);
  if (world.dialogueTimer > 0) {
    world.dialogueTimer -= dt;
    if (world.dialogueTimer <= 0 && world.dialogueQueue.length > 0) {
      world.dialogue = world.dialogueQueue.shift();
      world.dialogueTimer = 4.5;
    }
  } else if (world.dialogueQueue.length > 0) {
    world.dialogue = world.dialogueQueue.shift();
    world.dialogueTimer = 4.5;
  }

  // Player.
  if (player.car) updatePlayerDriving(dt, input, actions);
  else updatePlayerOnFoot(dt, input, actions);

  // Traffic and pedestrians near the player.
  spawnNearbyTraffic();
  spawnNearbyParked();
  spawnNearbyPeds();
  const allCars = [...world.traffic, ...world.parkedCars, ...world.wanted.policeCars];
  if (player.car) allCars.push(player.car);
  for (const car of world.traffic) updateTrafficCar(city, rng, car, dt, allCars, player.car);
  separateTraffic(allCars);
  const danger = world.combat.bullets.length > 0
    ? { x: world.combat.bullets[0].x, y: world.combat.bullets[0].y }
    : null;
  for (const ped of world.peds) updatePedestrian(city, rng, ped, dt, danger);

  // Wanted + police.
  updateWanted(city, rng, world.wanted, dt, player, player.car, world.events);
  policeRamDamage(world.wanted, player.car, world.events);

  // Combat.
  updateBullets(city, world.combat, dt, player, (dmg) => damagePlayer(dmg, 'shot'));
  updateEnemies(city, world.combat, dt, player, (dmg) => damagePlayer(dmg, 'shot'));
  updateParticles(world.combat, dt);
  updatePickups(world.combat, player, dt, (p) => {
    if (p.kind === 'health') {
      player.health = Math.min(PLAYER.maxHealth, player.health + p.value);
      say('Health +40.');
    } else if (p.kind === 'ammo') {
      player.ammo += p.value;
      say(`Ammo +${p.value}.`);
    }
    audio.pickup();
  });

  // Slow health regen out of danger.
  if (world.time - player.lastDamage > 6 && player.health > 0) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 2 * dt);
  }

  // Traffic horns: a blocked driver leans on it, but only when close
  // enough for the player to hear.
  for (const car of world.traffic) {
    if (car.honkTimer > 0 && !car.honkDone) {
      car.honkDone = true;
      if (Math.hypot(car.x - player.x, car.y - player.y) < 600) audio.honk();
    }
  }

  // Missions, courier, respray, pit stop, stashes.
  updateMission(missionCtx(), world.mission, dt);
  updateCourier(dt);
  updateRespray();
  updatePitStop();
  updateStashes();
  world.marker = missionMarker();

  // Busted by a cop on foot is handled by updateWanted's events.
  handleEvents();

  // Autosave.
  world.saveTimer += dt;
  if (world.saveTimer > 12) {
    world.saveTimer = 0;
    writeSave(world);
  }
}

function runShot(name) {
  const scene = stageShot(name, world, rng);
  let painted = 0;
  function paint() {
    renderer.draw(world, 'play', scene.time);
    drawHud(renderer.canvas.getContext('2d'), world, 'play', scene.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function handleActions() {
    const actions = input.takeActions();
    if ((actions & ACTION_MUTE) !== 0) {
      const muted = audio.toggleMute();
      say(muted ? 'Sound muted.' : 'Sound on.');
    }
    if ((actions & ACTION_WEAPON) !== 0 && screen === 'play' && !player.car) {
      const w = switchWeapon(player, audio);
      say(w === 'shotgun' ? 'Shotgun out. Up close and personal.' : 'Pistol out.');
    }
    if ((actions & ACTION_RADIO) !== 0 && screen === 'play') {
      world.radioName = audio.cycleRadio();
      world.radioStation = (world.radioStation + 1) % 3;
      say(`Radio: ${world.radioName}.`);
      writeSave(world);
    }
    if ((actions & ACTION_CONFIRM) !== 0 && (screen === 'title' || screen === 'over')) {
      if (screen === 'title') startGame();
      else respawnAfterEnd();
      return actions;
    }
    if ((actions & ACTION_PAUSE) !== 0 && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
      return actions;
    }
    if ((actions & ACTION_PAUSE) !== 0 && screen === 'paused') {
      screen = 'play';
      announce('Playing.');
      return actions;
    }
    if ((actions & ACTION_RESTART) !== 0 && screen === 'play' && world.mission.failed) {
      retryMission(missionCtx(), world.mission);
    }
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === 'play') {
      while (accumulator >= STEP) {
        step(STEP, input, actions);
        accumulator -= STEP;
        if (screen !== 'play') break;
      }
    } else {
      accumulator = 0;
    }
    const time = now / 1000;
    if (screen === 'title') {
      // A living backdrop: traffic rolls behind the title.
      world.time += 1 / 60;
      spawnNearbyTraffic();
      spawnNearbyParked();
      const allCars = [...world.traffic, ...world.parkedCars];
      for (const car of world.traffic) updateTrafficCar(city, rng, car, 1 / 60, allCars, null);
      renderer.draw(world, 'title', time);
      drawTitleScreen(renderer.canvas.getContext('2d'), world, world.bestCash);
    } else if (screen === 'play') {
      renderer.draw(world, 'play', time);
      drawHud(renderer.canvas.getContext('2d'), world, 'play', time);
    } else if (screen === 'paused') {
      renderer.draw(world, 'play', time);
      drawHud(renderer.canvas.getContext('2d'), world, 'play', time);
      drawPausedScreen(renderer.canvas.getContext('2d'));
    } else {
      renderer.draw(world, 'play', time);
      drawEndScreen(renderer.canvas.getContext('2d'), endKind, player.cash);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  announce('Sunset Shores. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
