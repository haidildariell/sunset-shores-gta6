// Missions and the story of Sunset Shores. Dario "Daz" Cole, a delivery
// driver who owes the wrong people money, gets pulled into Mara Quinn's
// crew. Seven jobs, each a chain of small steps the runner checks every
// frame: reach a place, steal a car, survive the heat, clear the guards.

import { MISSION_REWARDS } from './config.js';
import { spawnEnemy, spawnPickup } from './combat.js';

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    giver: 'Mara Quinn',
    intro: [
      'MARA: Daz. You owe the crew, and I collect.',
      'MARA: Steal a car. Any car. Bring it to Rico\'s Chop Shop.',
      'MARA: Press E next to a car to take it. Don\'t get cute.',
    ],
    reward: MISSION_REWARDS[0],
    steps: [
      { type: 'steal', text: 'Steal any car (walk up to one, press E)' },
      { type: 'gotoCar', place: 'chopShop', radius: 110, text: "Drive to Rico's Chop Shop" },
    ],
  },
  {
    id: 'cash-run',
    title: 'Cash Run',
    giver: 'Mara Quinn',
    intro: [
      'MARA: The docks. A package is waiting in container row C.',
      'MARA: Grab it, bring it to the safehouse. Cops will notice.',
      'MARA: If they chase you, lose them. Don\'t bring them home.',
    ],
    reward: MISSION_REWARDS[1],
    steps: [
      { type: 'goto', place: 'docks', radius: 130, text: 'Reach the Palmera Docks' },
      { type: 'pickup', place: 'docks', radius: 40, text: 'Pick up the package', heat: 1 },
      { type: 'gotoCar', place: 'safehouse', radius: 110, text: 'Deliver the package to the safehouse' },
    ],
  },
  {
    id: 'the-getaway',
    title: 'The Getaway',
    giver: 'Mara Quinn',
    intro: [
      'MARA: I\'m in the car with you now. Drive, Daz.',
      'MARA: Two stars already. Get me to the safehouse in 90 seconds.',
      'MARA: And Daz? Don\'t scratch the paint. It\'s mine.',
    ],
    reward: MISSION_REWARDS[2],
    steps: [
      {
        type: 'timed', place: 'safehouse', radius: 110, seconds: 90,
        text: 'Drive Mara to the safehouse — 90 seconds',
        start: (ctx) => { ctx.addHeat(2); ctx.say('MARA: Go go go!'); },
      },
    ],
  },
  {
    id: 'dockside-deal',
    title: 'Dockside Deal',
    giver: 'Rico',
    intro: [
      'RICO: The Vipers took our case. Four of them, dockside.',
      'RICO: Take it back. On foot. They shoot first, so you shoot faster.',
      'RICO: Bring the case to the safehouse. Then we talk money.',
    ],
    reward: MISSION_REWARDS[3],
    steps: [
      { type: 'goto', place: 'docks', radius: 150, text: 'Reach the Palmera Docks' },
      {
        type: 'killAll', text: 'Take out the Vipers (4 guards)',
        start: (ctx) => {
          const d = ctx.city.places.docks;
          spawnEnemy(ctx.combat, d.x - 60, d.y - 40, 'Viper');
          spawnEnemy(ctx.combat, d.x + 40, d.y - 70, 'Viper');
          spawnEnemy(ctx.combat, d.x - 20, d.y + 60, 'Viper');
          spawnEnemy(ctx.combat, d.x + 90, d.y + 30, 'Viper');
          spawnPickup(ctx.combat, d.x - 120, d.y + 100, 'health', 40);
          spawnPickup(ctx.combat, d.x + 130, d.y - 110, 'ammo', 24);
        },
      },
      { type: 'pickup', place: 'docks', radius: 44, text: 'Grab the case', heat: 0 },
      { type: 'goto', place: 'safehouse', radius: 110, text: 'Bring the case to the safehouse' },
    ],
  },
  {
    id: 'heat-wave',
    title: 'Heat Wave',
    giver: 'Mara Quinn',
    intro: [
      'MARA: The whole PD is awake tonight. Three stars, Daz.',
      'MARA: Survive sixty seconds, then shake them at Lucky Spray.',
      'MARA: Sixty seconds. Try not to die.',
    ],
    reward: MISSION_REWARDS[4],
    steps: [
      {
        type: 'survive', seconds: 60, text: 'Survive the heat — 60 seconds',
        start: (ctx) => { ctx.addHeat(3); },
      },
      { type: 'goto', place: 'respray', radius: 110, text: 'Lose the cops at Lucky Spray Garage' },
    ],
  },
  {
    id: 'sunset-score',
    title: 'The Sunset Score',
    giver: 'Mara Quinn',
    intro: [
      'MARA: One last job. The Palmera Bay Bank. In and out.',
      'MARA: Grab the cash, get in a car, and vanish into the sunset.',
      'MARA: Do this right and your debt is gone. All of it.',
    ],
    reward: MISSION_REWARDS[5],
    steps: [
      { type: 'goto', place: 'bank', radius: 120, text: 'Reach the Palmera Bay Bank' },
      {
        type: 'killAll', text: 'Clear the bank guards (3)',
        start: (ctx) => {
          const b = ctx.city.places.bank;
          spawnEnemy(ctx.combat, b.x - 50, b.y - 30, 'Guard');
          spawnEnemy(ctx.combat, b.x + 60, b.y - 20, 'Guard');
          spawnEnemy(ctx.combat, b.x + 10, b.y + 60, 'Guard');
          spawnPickup(ctx.combat, b.x - 110, b.y + 90, 'health', 40);
          spawnPickup(ctx.combat, b.x + 120, b.y + 80, 'ammo', 24);
        },
      },
      { type: 'pickup', place: 'bank', radius: 44, text: 'Grab the bank cash', heat: 3 },
      { type: 'gotoCar', place: 'safehouse', radius: 110, text: 'Escape to the safehouse' },
    ],
  },
  {
    id: 'lighthouse-run',
    title: 'The Lighthouse Run',
    giver: 'Mara Quinn',
    intro: [
      'MARA: Debt is gone, Daz — but the PD just lit up the whole city.',
      'MARA: Five stars. Every cruiser in Palmera Bay is coming for you.',
      'MARA: Drive to the Old Lighthouse. My boat is waiting at the pier.',
      'MARA: One hundred seconds. Nitro is your friend. Go.',
    ],
    reward: MISSION_REWARDS[6],
    steps: [
      {
        type: 'timed', place: 'lighthouse', radius: 130, seconds: 100,
        text: 'Outrun five stars — reach the Old Lighthouse in 100 seconds',
        start: (ctx) => {
          ctx.addHeat(5);
          ctx.say('MARA: Five stars! Drive like the sunset depends on it!');
        },
      },
    ],
  },
];

// --- Runner ---------------------------------------------------------------

export function createMissionState() {
  return {
    index: 0, // mission in MISSIONS, or MISSIONS.length when the story is done
    step: 0,
    timer: 0,
    stepStarted: false,
    done: false,
    failed: false,
    failReason: '',
    banner: '',
    bannerTimer: 0,
  };
}

function placePoint(ctx, step) {
  if (step.place) return ctx.city.places[step.place];
  return step.point ?? { x: 0, y: 0 };
}

export function currentMission(state) {
  return MISSIONS[state.index] ?? null;
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.step] ?? null : null;
}

export function startMission(ctx, state) {
  const m = currentMission(state);
  if (!m) return;
  state.step = 0;
  state.stepStarted = false;
  state.timer = 0;
  state.failed = false;
  state.banner = m.title;
  state.bannerTimer = 4;
  ctx.sayLines(m.intro);
}

export function updateMission(ctx, state, dt) {
  const m = currentMission(state);
  if (!m || state.done || state.failed) return;
  const step = currentStep(state);
  if (!step) {
    // Mission complete.
    state.index += 1;
    ctx.player.cash += m.reward;
    ctx.audio.missionComplete();
    ctx.say(`Job done. +$${m.reward}.`);
    ctx.events.push({ type: 'mission-complete', mission: m.id, reward: m.reward });
    if (state.index >= MISSIONS.length) {
      state.done = true;
      ctx.say('Story complete. Palmera Bay is yours — free roam.');
      ctx.events.push({ type: 'story-complete' });
    } else {
      startMission(ctx, state);
    }
    return;
  }
  if (!state.stepStarted) {
    state.stepStarted = true;
    state.timer = step.seconds ?? 0;
    if (step.start) step.start(ctx);
    ctx.say(step.text);
  }
  const p = ctx.player;
  let finished = false;
  switch (step.type) {
    case 'steal':
      finished = !!p.car;
      break;
    case 'goto': {
      const pt = placePoint(ctx, step);
      finished = Math.hypot(p.x - pt.x, p.y - pt.y) < (step.radius ?? 100);
      break;
    }
    case 'gotoCar': {
      const pt = placePoint(ctx, step);
      finished = !!p.car && Math.hypot(p.x - pt.x, p.y - pt.y) < (step.radius ?? 100);
      break;
    }
    case 'pickup': {
      const pt = placePoint(ctx, step);
      if (Math.hypot(p.x - pt.x, p.y - pt.y) < (step.radius ?? 44)) {
        finished = true;
        if (step.heat) ctx.addHeat(step.heat);
        ctx.audio.cash();
      }
      break;
    }
    case 'killAll':
      finished = ctx.combat.enemies.length === 0;
      break;
    case 'survive':
      state.timer -= dt;
      if (state.timer <= 0) finished = true;
      break;
    case 'timed': {
      const pt = placePoint(ctx, step);
      state.timer -= dt;
      if (p.car && Math.hypot(p.x - pt.x, p.y - pt.y) < (step.radius ?? 100)) finished = true;
      else if (state.timer <= 0) {
        state.failed = true;
        state.failReason = 'Out of time';
        ctx.audio.missionFail();
        ctx.say('Mission failed: out of time. Press R to retry.');
        ctx.events.push({ type: 'mission-failed', mission: m.id });
      }
      break;
    }
    default:
      finished = false;
  }
  if (finished) {
    state.step += 1;
    state.stepStarted = false;
    ctx.audio.pickup();
  }
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
}

export function retryMission(ctx, state) {
  if (!state.failed) return;
  ctx.combat.enemies.length = 0;
  ctx.wanted.level = 0;
  startMission(ctx, state);
}

// --- Courier side jobs ----------------------------------------------------
// A quick paid errand: pick up at A, drop at B. Spawned in free roam.

export function makeCourierJob(rng, city) {
  const spots = [
    city.places.docks, city.places.bank, city.places.beachBar,
    city.places.motel, city.places.hospital, city.places.chopShop,
    city.places.lighthouse, city.places.stadium, city.places.pier,
  ];
  const a = spots[rng.int(0, spots.length - 1)];
  let b = spots[rng.int(0, spots.length - 1)];
  if (b === a) b = city.places.safehouse;
  return {
    pickup: { x: a.x + rng.range(-40, 40), y: a.y + rng.range(-40, 40), name: a.name },
    dropoff: { x: b.x + rng.range(-40, 40), y: b.y + rng.range(-40, 40), name: b.name },
    pay: 150 + rng.int(0, 3) * 50,
    stage: 'pickup',
    active: true,
  };
}
