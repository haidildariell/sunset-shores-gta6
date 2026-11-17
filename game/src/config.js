// Tuning, palette and shared constants for Sunset Shores.
// One job: every number the rest of the game agrees on lives here.
// v4: nine jobs ending in the Sunset Showdown, a fifth radio station,
// a limo and a city bus in traffic, a casino on the plaza.

export const GAME_VERSION = 'v4';

// World geometry (world units are roughly metres).
export const WORLD_W = 3600;
export const WORLD_H = 2800;
export const ROAD_STEP = 420; // distance between parallel roads
export const ROAD_W = 92; // road surface width
export const BLOCK = ROAD_STEP - ROAD_W; // building block size

export const STEP = 1 / 60; // fixed simulation step
export const SAVE_KEY = 'sunset-shores-save-v2';

// Sun-soaked coastal palette.
export const PALETTE = {
  asphalt: '#3a3a40',
  asphaltEdge: '#2c2c31',
  lane: '#e8d27a',
  sidewalk: '#b9a98c',
  sidewalkEdge: '#9c8c72',
  sand: '#e9cf9a',
  sandWet: '#d9b878',
  water: '#2e7f9e',
  waterDeep: '#1f5f7d',
  grass: '#7fae5a',
  grassDark: '#6b9a4c',
  roofA: '#c96f4a',
  roofB: '#7d8aa0',
  roofC: '#d9a441',
  roofD: '#8a6f5c',
  roofE: '#b85c8a',
  buildingEdge: '#00000033',
  parkPath: '#cbb98d',
};

// Player / car tuning.
export const PLAYER = {
  walkSpeed: 165,
  runSpeed: 265,
  radius: 13,
  maxHealth: 100,
  punchDamage: 18,
  punchRange: 34,
  punchArc: 1.1,
  pistolDamage: 34,
  pistolRange: 430,
  pistolCooldown: 0.22,
  startAmmo: 48,
  startCash: 120,
};

export const CAR = {
  accel: 520,
  brake: 900,
  reverseAccel: 300,
  maxSpeed: 560,
  maxReverse: 170,
  steer: 2.6,
  grip: 6.5,
  drag: 0.55,
  // Nitro: hold Shift while driving. Burns fast, refills slowly, and the
  // top speed jumps while it is lit — the getaway tool, not a free cruise.
  nitroMax: 100,
  nitroDrain: 38, // per second while boosting
  nitroRefill: 7, // per second while not boosting
  nitroTopBoost: 1.45, // top-speed multiplier while boosting
};

// Weapons: Q cycles them on foot.
export const WEAPONS = {
  pistol: { name: 'PISTOL', damage: 34, range: 430, cooldown: 0.22, pellets: 1, spread: 0, ammoCost: 1 },
  shotgun: { name: 'SHOTGUN', damage: 17, range: 300, cooldown: 0.7, pellets: 5, spread: 0.16, ammoCost: 1 },
  smg: { name: 'SMG', damage: 22, range: 380, cooldown: 0.09, pellets: 1, spread: 0.03, ammoCost: 1 },
};

// Radio stations: five procedural grooves, C cycles them.
export const RADIO_STATIONS = [
  { name: 'SUNSET FM', bpm: 112, bass: [55, 0, 55, 65.41, 55, 0, 49, 58.27], lead: [220, 0, 0, 0, 220, 0, 262, 0] },
  { name: 'PALM ROCK', bpm: 132, bass: [82.41, 82.41, 0, 98, 82.41, 0, 73.42, 98], lead: [330, 0, 392, 0, 330, 0, 294, 0] },
  { name: 'BAY BEATS', bpm: 96, bass: [49, 0, 0, 58.27, 0, 49, 0, 65.41], lead: [0, 262, 0, 330, 0, 0, 392, 0] },
  { name: 'NEON NIGHTS', bpm: 120, bass: [65.41, 0, 65.41, 0, 82.41, 0, 98, 0], lead: [392, 0, 0, 330, 0, 392, 0, 440] },
  { name: 'COAST CRUISE', bpm: 100, bass: [65.41, 0, 0, 82.41, 0, 65.41, 0, 98], lead: [0, 0, 330, 0, 392, 0, 0, 330] },
];

// Wanted: how much heat each crime adds, and how the police answer.
export const WANTED = {
  stealCar: 1,
  hitPedestrian: 1,
  shoot: 1,
  killPedestrian: 2,
  killPolice: 2,
  max: 5,
  decayDelay: 14, // seconds unseen before a star starts to fall
  decayStep: 9, // seconds per star once decaying
  // Police cars on the street at each wanted level (on top of the two patrol cars).
  // v3: the top end hits harder — five stars brings a seventh cruiser.
  pursuitCars: [0, 1, 2, 3, 5, 7],
  footOfficers: [0, 0, 1, 2, 4, 5],
};

// Car types the city spawns: name, length, width, top speed factor, colour set.
export const CAR_TYPES = [
  { name: 'Sedan', len: 74, wid: 36, speed: 1.0, colors: ['#c23b2e', '#3f6fb5', '#d8d3c8', '#2e2e33'] },
  { name: 'Coupe', len: 70, wid: 34, speed: 1.12, colors: ['#e8b73c', '#7a2e8f', '#c23b2e', '#1f8a70'] },
  { name: 'Hatchback', len: 62, wid: 34, speed: 0.95, colors: ['#5aa9e6', '#e6e1d3', '#8a9a5b', '#d97b29'] },
  { name: 'Pickup', len: 82, wid: 38, speed: 0.92, colors: ['#8a4a2b', '#3f6fb5', '#5b6770', '#b5b0a4'] },
  { name: 'Van', len: 88, wid: 40, speed: 0.85, colors: ['#d8d3c8', '#7d8aa0', '#a03b2e'] },
  { name: 'Taxi', len: 74, wid: 36, speed: 1.02, colors: ['#f2c200'] },
  { name: 'Sports', len: 72, wid: 35, speed: 1.3, colors: ['#e63229', '#f2c200', '#1f8a70', '#22222a'] },
  { name: 'Muscle', len: 78, wid: 38, speed: 1.18, colors: ['#2e5d8a', '#c23b2e', '#3a3a3a'] },
  { name: 'Lowrider', len: 80, wid: 38, speed: 1.05, colors: ['#7a2e8f', '#e6e1d3', '#1f8a70', '#c96f4a'] },
  { name: 'SUV', len: 84, wid: 40, speed: 0.98, colors: ['#2e2e33', '#d8d3c8', '#3f6fb5', '#5b6770'] },
  { name: 'Convertible', len: 72, wid: 35, speed: 1.22, colors: ['#e63229', '#f2c200', '#e67ba8', '#5aa9e6'] },
  { name: 'Classic', len: 80, wid: 38, speed: 1.08, colors: ['#8a6f5c', '#2e5d8a', '#d8d3c8', '#5b6770'] },
  { name: 'Limo', len: 100, wid: 38, speed: 1.05, colors: ['#1a1a20', '#d8d3c8', '#2e5d8a'] },
  { name: 'Bus', len: 106, wid: 42, speed: 0.78, colors: ['#2e6b8a', '#c98a2e', '#5b6770'] },
];

// Steering sharpness per body type: sports cars bite, vans wallow.
export const HANDLING = {
  Sports: 1.15,
  Convertible: 1.12,
  Coupe: 1.08,
  Classic: 1.05,
  Sedan: 1,
  Hatchback: 1,
  Lowrider: 0.95,
  Muscle: 0.95,
  Taxi: 1,
  Pickup: 0.9,
  SUV: 0.9,
  Van: 0.85,
  Limo: 0.92,
  Bus: 0.8,
};

// Pedestrian first names the city reuses (flavour only, no real people).
export const PED_NAMES = [
  'Ana', 'Bruno', 'Celia', 'Dante', 'Elsa', 'Felix', 'Greta', 'Hugo',
  'Iris', 'Jonas', 'Kira', 'Leo', 'Mina', 'Nico', 'Olga', 'Pablo',
  'Rosa', 'Sven', 'Tara', 'Umar', 'Vera', 'Walt', 'Yara', 'Zeke',
  'Alba', 'Boris', 'Carmen', 'Diego', 'Emilia', 'Fabian', 'Luna', 'Marco',
];

export const PED_SHIRTS = [
  '#e8e4d8', '#3f6fb5', '#c23b2e', '#e8b73c', '#1f8a70', '#7a2e8f',
  '#d97b29', '#5aa9e6', '#8a9a5b', '#e67ba8', '#6b4a8a', '#2e2e33',
];

// Mission cash rewards, in order (nine jobs now — the Sunset Showdown pays $8,000).
export const MISSION_REWARDS = [300, 500, 700, 900, 1200, 2500, 3500, 5000, 8000];

export const RESPRAY_COST = 200;
export const PITSTOP_COST = 100; // full repair at the Pit Stop garage
export const STASH_VALUE = 100;
export const COURIER_PAY = [150, 200, 250, 300, 350];

// Time of day: the clock starts at golden hour and the light follows it —
// sunset, dusk, night with headlights, then dawn. Minutes are game minutes.
export const DAYLIGHT = {
  sunsetStart: 17 * 60, // full golden hour from here
  duskStart: 19 * 60 + 30, // light falls fast
  nightStart: 20 * 60 + 30, // headlights on
  dawnStart: 6 * 60, // morning light returns
};

// HUD layout.
export const HUD = {
  minimapSize: 172,
  minimapMargin: 14,
  starSize: 20,
};
