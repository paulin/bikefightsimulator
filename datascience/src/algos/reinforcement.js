"use strict";

// Reinforcement Learning via the multi-armed bandit — the cleanest place to see
// behavior emerge from reward. Main view: each arm's running value estimate vs
// its hidden truth, and how often it's been pulled. Internal view: cumulative
// regret and the share of pulls that hit the best arm.
DSP.register({
  id: "reinforcement-learning",
  name: "Reinforcement Learning",
  phase: "Phase 5 — Sequential",
  status: "ready",
  blurb: "Balance exploring unknown options against exploiting the best so far.",
  intuition: "Behavior emerges from maximizing reward — but you can only learn an option's value by trying it. Too little exploration locks onto a wrong guess; too much wastes pulls on options you already know are bad.",

  mount(ctx) {
    const { panels, ui, canvas, COLORS, CLASS_COLORS } = ctx;

    let K = 6, strategy = "epsilon", epsilon = 0.1, running = false;
    let arms = [], estimate = [], counts = [], t = 0, totalReward = 0, regret = 0;
    let regretHist = [], optimalHist = [], optimalPulls = 0, lastArm = -1;

    function newMachines() {
      arms = Array.from({ length: K }, () => 0.15 + 0.7 * Math.random()); // true win prob per arm
      resetAgent();
    }
    function resetAgent() {
      estimate = new Array(K).fill(0); counts = new Array(K).fill(0);
      t = 0; totalReward = 0; regret = 0; regretHist = []; optimalHist = []; optimalPulls = 0; lastArm = -1;
      running = false; if (typeof runBtn !== "undefined") runBtn.textContent = "Run";
    }
    const bestArm = () => { let bi = 0; for (let i = 1; i < K; i++) if (arms[i] > arms[bi]) bi = i; return bi; };
    const argmax = (a) => { let bi = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i; return bi; };

    function selectArm() {
      if (strategy === "greedy") return argmax(estimate);
      if (strategy === "epsilon") return Math.random() < epsilon ? Math.floor(Math.random() * K) : argmax(estimate);
      // UCB1
      const ucb = estimate.map((q, i) => counts[i] === 0 ? Infinity : q + Math.sqrt(2 * Math.log(t + 1) / counts[i]));
      return argmax(ucb);
    }
    function pull() {
      const a = selectArm();
      const reward = Math.random() < arms[a] ? 1 : 0;
      counts[a]++; estimate[a] += (reward - estimate[a]) / counts[a];
      t++; totalReward += reward; lastArm = a;
      const opt = bestArm();
      regret += arms[opt] - arms[a];
      if (a === opt) optimalPulls++;
      regretHist.push(regret); optimalHist.push(optimalPulls / t);
      if (regretHist.length > 600) { regretHist.shift(); optimalHist.shift(); }
    }

    const barC = canvas(panels.viz, 480, 420);
    const bctx = barC.getContext("2d");
    ui.note(panels.viz, "Each bar is one slot machine. Light bar = the agent's current estimate; the tick is the hidden true win-rate; the number is how many times it's been pulled.");

    const chartC = canvas(panels.internal, 480, 240);
    const cctx = chartC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Regret & % Optimal Pulls";
    ui.note(panels.internal, "Regret is reward lost vs always playing the best arm — good strategies flatten it. The green line is the fraction of pulls that hit the truly best arm; it should climb.");

    const mPulls = ui.metric(panels.metrics, "Pulls");
    const mReward = ui.metric(panels.metrics, "Total reward");
    const mRegret = ui.metric(panels.metrics, "Cumulative regret");
    const mOpt = ui.metric(panels.metrics, "% optimal pulls");
    const mBest = ui.metric(panels.metrics, "Best arm");

    function drawBars() {
      const w = barC.width, h = barC.height, pad = 30;
      bctx.fillStyle = COLORS.panel; bctx.fillRect(0, 0, w, h);
      const opt = bestArm();
      const bw = (w - 2 * pad) / K, gap = bw * 0.22;
      for (let i = 0; i < K; i++) {
        const x = pad + i * bw, barW = bw - gap;
        const baseY = h - pad;
        const col = CLASS_COLORS[i % CLASS_COLORS.length];
        // estimate bar
        const eh = (h - 2 * pad) * Math.min(1, estimate[i]);
        bctx.fillStyle = col + (i === lastArm ? "" : "aa"); bctx.fillRect(x, baseY - eh, barW, eh);
        if (i === lastArm) { bctx.strokeStyle = "#fff"; bctx.lineWidth = 2; bctx.strokeRect(x, baseY - eh, barW, eh); }
        // true value tick
        const ty = baseY - (h - 2 * pad) * arms[i];
        bctx.strokeStyle = i === opt ? COLORS.predict : COLORS.textBright; bctx.lineWidth = i === opt ? 3 : 1.5;
        bctx.beginPath(); bctx.moveTo(x - 2, ty); bctx.lineTo(x + barW + 2, ty); bctx.stroke();
        // labels
        bctx.fillStyle = COLORS.text; bctx.font = "11px system-ui"; bctx.textAlign = "center"; bctx.textBaseline = "top";
        bctx.fillText("pulls " + counts[i], x + barW / 2, baseY + 4);
        bctx.fillStyle = COLORS.textBright; bctx.textBaseline = "bottom";
        bctx.fillText(estimate[i].toFixed(2), x + barW / 2, baseY - eh - 3);
      }
      bctx.fillStyle = COLORS.gray; bctx.font = "11px system-ui"; bctx.textAlign = "left"; bctx.textBaseline = "top";
      bctx.fillText("value 1.0", 2, pad - 14); bctx.textBaseline = "bottom"; bctx.fillText("0", 2, h - pad);
    }

    function drawChart() {
      const w = chartC.width, h = chartC.height, pad = 30;
      cctx.fillStyle = COLORS.panel; cctx.fillRect(0, 0, w, h);
      cctx.strokeStyle = COLORS.axis; cctx.strokeRect(pad, 10, w - pad - 10, h - pad - 10);
      if (!regretHist.length) { cctx.fillStyle = COLORS.gray; cctx.font = "12px system-ui"; cctx.textAlign = "center"; cctx.fillText("run to record regret", w / 2, h / 2); return; }
      const n = regretHist.length, maxR = Math.max(1, regretHist[n - 1]);
      // regret (purple, scaled to its own max)
      cctx.strokeStyle = COLORS.update; cctx.lineWidth = 2; cctx.beginPath();
      regretHist.forEach((v, i) => { const x = pad + (w - pad - 10) * (n === 1 ? 0 : i / (n - 1)); const y = 10 + (h - pad - 20) * (1 - v / maxR); i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); });
      cctx.stroke();
      // % optimal (green, 0..1)
      cctx.strokeStyle = COLORS.predict; cctx.lineWidth = 2; cctx.beginPath();
      optimalHist.forEach((v, i) => { const x = pad + (w - pad - 10) * (n === 1 ? 0 : i / (n - 1)); const y = 10 + (h - pad - 20) * (1 - v); i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); });
      cctx.stroke();
      cctx.fillStyle = COLORS.update; cctx.font = "11px system-ui"; cctx.textAlign = "left"; cctx.textBaseline = "top"; cctx.fillText("regret", pad + 2, 12);
      cctx.fillStyle = COLORS.predict; cctx.fillText("% optimal", pad + 60, 12);
    }

    function metrics() {
      mPulls(t); mReward(totalReward); mRegret(regret.toFixed(2));
      mOpt(t ? (100 * optimalPulls / t).toFixed(1) + "%" : "–");
      mBest("arm " + (bestArm() + 1) + " (" + arms[bestArm()].toFixed(2) + ")");
    }

    function render() { drawBars(); drawChart(); metrics(); }

    let raf = requestAnimationFrame(function loop() {
      if (running) for (let k = 0; k < 3; k++) pull();
      render(); raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    ui.buttonRow(panels.data, [
      { label: "New machines", onClick: () => { newMachines(); render(); } },
      { label: "Reset agent", onClick: () => { resetAgent(); render(); } },
    ]);
    ui.slider(panels.data, { label: "Number of arms", min: 2, max: 8, step: 1, value: K, onInput: (v) => { K = v; newMachines(); render(); } });

    ui.select(panels.hyper, { label: "Strategy", options: [{ value: "epsilon", label: "ε-greedy" }, { value: "greedy", label: "Greedy (ε=0)" }, { value: "ucb", label: "UCB1" }], value: strategy, onChange: (v) => { strategy = v; } });
    ui.slider(panels.hyper, { label: "Exploration ε", min: 0, max: 1, step: 0.02, value: epsilon, format: (v) => v.toFixed(2), onInput: (v) => { epsilon = v; } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Run", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Run"; } },
      { label: "Pull +1", onClick: () => { running = false; runBtn.textContent = "Run"; pull(); } },
    ]);
    ui.note(panels.hyper, "Pure greedy often locks onto the first arm that got lucky. ε-greedy keeps sampling; UCB explores arms it's uncertain about and usually flattens regret fastest.");

    newMachines();
    render();
  },
});
