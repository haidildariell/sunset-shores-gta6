// Tuning, palette and shared constants for Sunset Shores.
// One job: every number the rest of the game agrees on lives here.

// World geometry (world units are roughly metres).
export const WORLD_W = 3600;
export const WORLD_H = 2800;
export const ROAD_STEP = 420; // distance between parallel roads
export const ROAD_W = 92; // road surface width
export const BLOCK = ROAD_STEP - ROAD_W; // building block size

export const STEP = 1 / 60; // fixed simulation step
export const SAVE_KEY = 'sunset-shores-save-v1';

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
};

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
  pursuitCars: [0, 1, 2, 3, 4, 6],
  footOfficers: [0, 0, 1, 2, 3, 4],
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
];

// Pedestrian first names the city reuses (flavour only, no real people).
export const PED_NAMES = [
  'Ana', 'Bruno', 'Celia', 'Dante', 'Elsa', 'Felix', 'Greta', 'Hugo',
  'Iris', 'Jonas', 'Kira', 'Leo', 'Mina', 'Nico', 'Olga', 'Pablo',
  'Rosa', 'Sven', 'Tara', 'Umar', 'Vera', 'Walt', 'Yara', 'Zeke',
];

export const PED_SHIRTS = [
  '#e8e4d8', '#3f6fb5', '#c23b2e', '#e8b73c', '#1f8a70', '#7a2e8f',
  '#d97b29', '#5aa9e6', '#8a9a5b', '#e67ba8', '#6b4a8a', '#2e2e33',
];

// Mission cash rewards, in order.
export const MISSION_REWARDS = [300, 500, 700, 900, 1200, 2500];

export const RESPRAY_COST = 200;
export const STASH_VALUE = 100;
export const COURIER_PAY = [150, 200, 250, 300];

// HUD layout.
export const HUD = {
  minimapSize: 172,
  minimapMargin: 14,
  starSize: 20,
};
