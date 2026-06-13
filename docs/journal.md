# Project Journal

Most recent entries first. Notes on what was done each day — decisions, ideas,
and changes.

## 2026-06-12

### Workflow
- Started keeping this journal (newest date at top).
- Established practice: commit after each request.

### Gameplay rules
- **Turning requires motion.** A bike can't pivot while stopped; turn rate
  scales with speed and reaches full agility at ~35% of top speed
  (`turnFullSpeedFrac`) so it can still swerve without being at full throttle.
- **Reverse.** The brake control now carries speed negative, capped at 1/3 of
  top speed (`reverseSpeedFactor`), so a stuck bike can back out. Steering works
  in reverse (scaled by speed magnitude); coasting drag always bleeds toward 0.

### Obstacles
- **Green obstacles** placeable by clicking the arena (`obstacle.radius`, 28).
  They block projectiles and the bikes physically collide with them. Persist
  across episodes. **Clear Obstacles** button removes them all.

### Collision avoidance
- Bikes **sense** obstacles: the front/left/right clearance sensors now report
  the nearest of wall-or-obstacle (ray-vs-circle), folded into the existing
  15-value observation (no size change, exported brains still load). The
  scripted bot steers around obstacles using the same `clearance()`.
- Bikes **slide** along walls and obstacles instead of grinding to a halt: on
  contact the heading is redirected along the surface tangent (`slideHeading`)
  and most speed is retained (`slideSpeedRetain`, 0.92). Walls previously hard-
  stopped at 0.4 — now unified with the obstacle slide.

### Stats
- Added a **Record (W–L–D)** stat tracking blue's all-time wins/losses/draws,
  alongside the rolling Win Rate (last 100). Resets with Reset Brain.

### Reward rebalance (why blue kept fleeing)
- Diagnosis: the old `+0.05/tick` alive bonus paid ~+36 per episode just for
  surviving, so with a competent red bot the optimal policy was to flee and
  bank survival points. Blue learned cowardice and never won.
- Fix: removed the alive bonus, made stalling cost (`timeTick` −0.03), raised
  the aim reward (`enemyInCone` +0.5), softened the fear of fighting
  (`hitByEnemy` −15, `eliminated` −50), and bumped offense (`hitEnemy` +30,
  `enemyEliminated` +120). Requires Reset Brain + retrain to take effect.
- Open question: if blue now over-rushes and dies a lot, ease `eliminated`
  toward −70 / drop `enemyInCone` to ~0.3. If it engages but still loses, the
  red bot may simply be too strong → ease the bot instead of the rewards.
