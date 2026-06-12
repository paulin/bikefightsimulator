"use strict";

class Vehicle {
  constructor(cfg) {
    this.cfg = cfg;
    this.reset(0, 0, 0);
  }

  reset(x, y, heading) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.speed = 0;
    this.health = this.cfg.vehicle.maxHealth;
    this.reloadTimer = 0;
    this.alive = true;
    this.touchingWall = false;
  }
}

class Projectile {
  constructor(x, y, angle, speed, owner, ttl) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.owner = owner;
    this.ttl = ttl;
    this.alive = true;
  }
}

function emptyEvents() {
  return {
    hitsDealt: 0,
    hitsTaken: 0,
    wallHit: false,
    wastedShots: 0,
    fired: false,
    eliminatedEnemy: false,
    eliminated: false,
    enemyInCone: false,
  };
}

class Simulation {
  constructor(cfg) {
    this.cfg = cfg;
    this.vehicles = [new Vehicle(cfg), new Vehicle(cfg)];
    this.projectiles = [];
    this.maxTicks = Math.round(cfg.episodeSeconds / cfg.dt);
    this.reset();
  }

  reset() {
    const { width: W, height: H } = this.cfg.arena;
    const jitter = () => (Math.random() - 0.5) * 0.3;
    const y0 = H * (0.35 + Math.random() * 0.3);
    const y1 = H * (0.35 + Math.random() * 0.3);
    this.vehicles[0].reset(W * 0.2, y0, jitter());
    this.vehicles[1].reset(W * 0.8, y1, Math.PI + jitter());
    this.projectiles = [];
    this.tick = 0;
    this.needsReset = false;
  }

  step(controls0, controls1) {
    const events = [emptyEvents(), emptyEvents()];
    const controls = [controls0, controls1];
    this.tick++;

    for (let i = 0; i < 2; i++) {
      const v = this.vehicles[i];
      if (!v.alive) continue;
      this.stepVehicle(v, controls[i], events[i], i);
    }

    this.separateVehicles();
    this.updateProjectiles(events);

    events[0].enemyInCone = this.inFiringCone(this.vehicles[0], this.vehicles[1]);
    events[1].enemyInCone = this.inFiringCone(this.vehicles[1], this.vehicles[0]);

    const done =
      !this.vehicles[0].alive ||
      !this.vehicles[1].alive ||
      this.tick >= this.maxTicks;
    let winner = null;
    if (done) {
      this.needsReset = true;
      if (this.vehicles[0].alive && !this.vehicles[1].alive) winner = 0;
      else if (this.vehicles[1].alive && !this.vehicles[0].alive) winner = 1;
    }
    return { events, done, winner };
  }

  stepVehicle(v, c, ev, ownerIdx) {
    const { dt } = this.cfg;
    const vc = this.cfg.vehicle;
    const gun = this.cfg.gun;

    v.heading = wrapAngle(v.heading + c.steer * vc.turnRate * dt);

    if (c.throttle > 0) v.speed += vc.accel * dt;
    else if (c.throttle < 0) v.speed -= vc.brakeDecel * dt;
    else v.speed -= vc.drag * dt;
    v.speed = Math.max(0, Math.min(vc.maxSpeed, v.speed));

    v.x += Math.cos(v.heading) * v.speed * dt;
    v.y += Math.sin(v.heading) * v.speed * dt;

    // Wall collision: clamp inside arena, penalize on first contact
    const r = vc.radius;
    const { width: W, height: H } = this.cfg.arena;
    let hitWall = false;
    if (v.x < r) { v.x = r; hitWall = true; }
    if (v.x > W - r) { v.x = W - r; hitWall = true; }
    if (v.y < r) { v.y = r; hitWall = true; }
    if (v.y > H - r) { v.y = H - r; hitWall = true; }
    if (hitWall) {
      v.speed *= 0.4;
      if (!v.touchingWall) ev.wallHit = true;
    }
    v.touchingWall = hitWall;

    // Weapon
    v.reloadTimer = Math.max(0, v.reloadTimer - dt);
    if (c.fire && v.reloadTimer <= 0) {
      const noseX = v.x + Math.cos(v.heading) * (r + gun.projectileRadius + 2);
      const noseY = v.y + Math.sin(v.heading) * (r + gun.projectileRadius + 2);
      this.projectiles.push(
        new Projectile(noseX, noseY, v.heading, gun.projectileSpeed, ownerIdx, gun.projectileTtl)
      );
      v.reloadTimer = gun.reloadTime;
      ev.fired = true;
    }
  }

  separateVehicles() {
    const [a, b] = this.vehicles;
    if (!a.alive || !b.alive) return;
    const r = this.cfg.vehicle.radius;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = r * 2;
    if (dist >= minDist || dist === 0) return;
    const push = (minDist - dist) / 2;
    const nx = dx / dist;
    const ny = dy / dist;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    a.speed *= 0.8;
    b.speed *= 0.8;
    const { width: W, height: H } = this.cfg.arena;
    for (const v of this.vehicles) {
      v.x = Math.max(r, Math.min(W - r, v.x));
      v.y = Math.max(r, Math.min(H - r, v.y));
    }
  }

  updateProjectiles(events) {
    const { dt } = this.cfg;
    const { width: W, height: H } = this.cfg.arena;
    const hitRadius = this.cfg.vehicle.radius + this.cfg.gun.projectileRadius;

    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;

      const target = this.vehicles[1 - p.owner];
      if (target.alive && Math.hypot(target.x - p.x, target.y - p.y) < hitRadius) {
        p.alive = false;
        target.health--;
        events[p.owner].hitsDealt++;
        events[1 - p.owner].hitsTaken++;
        if (target.health <= 0) {
          target.alive = false;
          events[p.owner].eliminatedEnemy = true;
          events[1 - p.owner].eliminated = true;
        }
        continue;
      }

      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.ttl <= 0) {
        p.alive = false;
        events[p.owner].wastedShots++;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  inFiringCone(shooter, target) {
    if (!shooter.alive || !target.alive) return false;
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.cfg.gun.coneRange) return false;
    const relAngle = wrapAngle(Math.atan2(dy, dx) - shooter.heading);
    return Math.abs(relAngle) < this.cfg.gun.coneAngle;
  }

  // Distance from a vehicle to the arena wall along heading + relAngle
  wallDistance(v, relAngle) {
    const angle = v.heading + relAngle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const { width: W, height: H } = this.cfg.arena;
    let t = Infinity;
    if (dx > 1e-9) t = Math.min(t, (W - v.x) / dx);
    else if (dx < -1e-9) t = Math.min(t, -v.x / dx);
    if (dy > 1e-9) t = Math.min(t, (H - v.y) / dy);
    else if (dy < -1e-9) t = Math.min(t, -v.y / dy);
    return t === Infinity ? Math.hypot(W, H) : Math.max(0, t);
  }

  getObservation(i) {
    const v = this.vehicles[i];
    const e = this.vehicles[1 - i];
    const { width: W, height: H } = this.cfg.arena;
    const diag = Math.hypot(W, H);
    const dx = e.x - v.x;
    const dy = e.y - v.y;
    const dist = Math.hypot(dx, dy);
    const relAngle = wrapAngle(Math.atan2(dy, dx) - v.heading);
    return [
      v.x / W,
      v.y / H,
      Math.sin(v.heading),
      Math.cos(v.heading),
      v.speed / this.cfg.vehicle.maxSpeed,
      dx / W,
      dy / H,
      dist / diag,
      Math.sin(relAngle),
      Math.cos(relAngle),
      this.inFiringCone(v, e) ? 1 : 0,
      v.reloadTimer <= 0 ? 1 : 0,
      this.wallDistance(v, 0) / diag,
      this.wallDistance(v, -Math.PI / 2) / diag,
      this.wallDistance(v, Math.PI / 2) / diag,
    ];
  }

  computeReward(i, stepResult) {
    const e = stepResult.events[i];
    const R = this.cfg.rewards;
    const v = this.vehicles[i];
    let r = R.timeTick;
    if (v.alive) r += R.aliveTick;
    if (e.enemyInCone) r += R.enemyInCone;
    r += e.hitsDealt * R.hitEnemy;
    r += e.hitsTaken * R.hitByEnemy;
    r += e.wastedShots * R.wastedShot;
    if (e.wallHit) r += R.wallCollision;
    if (e.eliminatedEnemy) r += R.enemyEliminated;
    if (e.eliminated) r += R.eliminated;
    return r;
  }
}

if (typeof module !== "undefined") {
  module.exports = { Simulation, Vehicle, Projectile };
}
