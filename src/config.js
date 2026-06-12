"use strict";

const CONFIG = {
  arena: { width: 800, height: 600 },
  dt: 1 / 30,
  episodeSeconds: 30,
  vehicle: {
    radius: 18,
    maxSpeed: 220,
    accel: 320,
    brakeDecel: 420,
    drag: 60,
    turnRate: 2.6,
    maxHealth: 4,
  },
  gun: {
    reloadTime: 0.6,
    projectileSpeed: 420,
    projectileRadius: 4,
    projectileTtl: 1.6,
    coneAngle: 0.22, // radians, half-angle of the firing cone
    coneRange: 420,
  },
  rewards: {
    hitEnemy: 25,
    enemyEliminated: 100,
    hitByEnemy: -25,
    eliminated: -100,
    wallCollision: -5,
    wastedShot: -1,
    enemyInCone: 0.2,
    aliveTick: 0.05,
    timeTick: -0.01,
  },
  dqn: {
    bufferSize: 10000,
    batchSize: 32,
    gamma: 0.95,
    learningRate: 0.001,
    epsilonStart: 1.0,
    epsilonMin: 0.05,
    epsilonDecay: 0.99995, // multiplicative, per environment step
    targetUpdateEvery: 500, // in gradient steps
    trainEvery: 4, // environment steps between gradient steps
    minBufferToTrain: 500,
    hidden: [64, 64],
  },
  // Episodes a rolling window must cover before "best brain" snapshots start
  bestWindow: 25,
};

// Discrete action space: throttle (1 forward, 0 coast, -1 brake), steer (-1 left, 1 right), fire
const ACTIONS = [
  { name: "forward",            throttle: 1,  steer: 0,  fire: false },
  { name: "forward_left",       throttle: 1,  steer: -1, fire: false },
  { name: "forward_right",      throttle: 1,  steer: 1,  fire: false },
  { name: "coast",              throttle: 0,  steer: 0,  fire: false },
  { name: "brake",              throttle: -1, steer: 0,  fire: false },
  { name: "left",               throttle: 0,  steer: -1, fire: false },
  { name: "right",              throttle: 0,  steer: 1,  fire: false },
  { name: "fire",               throttle: 0,  steer: 0,  fire: true },
  { name: "forward_fire",       throttle: 1,  steer: 0,  fire: true },
  { name: "forward_left_fire",  throttle: 1,  steer: -1, fire: true },
  { name: "forward_right_fire", throttle: 1,  steer: 1,  fire: true },
];

const OBS_SIZE = 15;

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

if (typeof module !== "undefined") {
  module.exports = { CONFIG, ACTIONS, OBS_SIZE, wrapAngle };
}
