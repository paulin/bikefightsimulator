# Bikefight RL Simulator

A one-page browser app where two vehicles fight in an arena, and the blue
driver learns from repeated matches using a TensorFlow.js DQN. The red
opponent is a scripted bot. See `docs/Bikefight_RL_Simulator_Spec.md` for the
full specification.

## Run it

No build step. Serve the folder and open it in a browser:

```sh
npx serve .          # or: python3 -m http.server 8000
```

Then open the printed URL (e.g. http://localhost:8000). TensorFlow.js loads
from the jsdelivr CDN; for offline use, copy `dist/tf.min.js` from the
`@tensorflow/tfjs` npm package into `vendor/tf.min.js` and the page will fall
back to it automatically.

Opening `index.html` directly via `file://` also works in most browsers.

## Using it

- **Start Training** — runs episodes of learner (blue) vs scripted bot (red),
  training the DQN from a replay buffer as it goes.
- **Speed 1x / 10x / 50x** — simulation ticks per rendered frame. Use 50x to
  train fast; expect meaningful behavior to emerge over a few hundred episodes
  as epsilon decays toward 0.05.
- **Run Best Brain** — plays greedy (no exploration) matches using the
  weights snapshot with the best rolling win rate seen during training.
- **Reset Brain** — discards the network, replay buffer, and statistics.
- **Export / Import Brain** — saves the model as `bikefight-dqn.json` +
  `bikefight-dqn.weights.bin` downloads; import expects both files selected
  together.

The chart shows per-episode total reward (blue) and its 20-episode moving
average (orange).

## Project layout

```
index.html          page layout, loads scripts
style.css
src/config.js       tunable constants, action space, observation size
src/sim.js          physics + combat simulation (no rendering dependency)
src/scriptedBot.js  the rule-based opponent
src/dqn.js          replay buffer + DQN agent (model, target net, training)
src/renderer.js     canvas drawing
src/main.js         training loop, UI wiring, stats, persistence
test/smoke.js       headless sim test: node test/smoke.js
test/e2e.js         browser test (Playwright): node test/e2e.js
```

## RL setup (per spec)

- 15-value observation: own pose/speed, relative enemy position/angle,
  firing-cone and reload flags, wall distances (front/left/right)
- 11 discrete actions combining throttle, steering, and fire
- Rewards: +25 hit, +100 elimination, −25 hit taken, −100 eliminated,
  −5 wall collision, −1 wasted shot, +0.2 enemy in cone, +0.05/tick alive,
  −0.01/tick
- DQN: 15 → 64 → 64 → 11 MLP, Adam lr 0.001, γ 0.95, batch 32, replay
  buffer 10k, ε 1.0 → 0.05, target network synced every 500 gradient steps
