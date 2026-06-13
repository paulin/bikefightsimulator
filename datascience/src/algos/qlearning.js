"use strict";

// Q-Learning — tabular control on an editable gridworld. Main view: every cell's
// four action-values as colored wedges, the greedy arrow, and the greedy path
// from the start. Internal view: return per episode as the policy improves.
DSP.register({
  id: "q-learning",
  name: "Q-Learning",
  phase: "Phase 5 — Sequential",
  status: "ready",
  blurb: "Learn the long-term value of each action in each state from reward.",
  intuition: "Actions have long-term value, not just immediate reward. Q-learning bootstraps: it nudges each action-value toward the reward plus the best value reachable next, and a greedy policy falls out of the table.",

  mount(ctx) {
    const { panels, ui, canvas, COLORS } = ctx;

    const R = 8, C = 8;
    let grid = [];           // 0 empty, 1 wall, 2 goal, 3 pit
    let start = { r: R - 1, c: 0 };
    let Q = [];              // Q[r][c][a]
    let alpha = 0.4, gamma = 0.95, epsilon = 0.2;
    let running = false, episodes = 0, returns = [], tool = "wall";
    const A = 4; // 0 up,1 right,2 down,3 left
    const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];

    const gridC = canvas(panels.viz, 480, 480);
    const gctx = gridC.getContext("2d");
    ui.note(panels.viz, "Pick a tool, then click/drag cells to paint. Wedges = action-values (green good, red bad); the arrow is the greedy action; the gold line is the greedy path from S.");

    const chartC = canvas(panels.internal, 480, 220);
    const cctx = chartC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Return per Episode";
    ui.note(panels.internal, "Total reward the agent collected each episode. As Q-values settle it should climb toward ~+1 (reaching the goal quickly) and stop diving into pits.");

    function reset(full) {
      if (full) {
        grid = Array.from({ length: R }, () => new Array(C).fill(0));
        grid[0][C - 1] = 2;             // goal top-right
        grid[2][C - 2] = 3; grid[3][3] = 3; // a couple of pits
        for (let r = 2; r <= 4; r++) grid[r][2] = 1; // a wall
        start = { r: R - 1, c: 0 };
      }
      Q = Array.from({ length: R }, () => Array.from({ length: C }, () => new Array(A).fill(0)));
      episodes = 0; returns = []; running = false; if (typeof runBtn !== "undefined") runBtn.textContent = "Train";
    }

    const cellType = (r, c) => (r < 0 || c < 0 || r >= R || c >= C) ? 1 : grid[r][c];

    function step(r, c, a) {
      let nr = r + DR[a], nc = c + DC[a];
      if (cellType(nr, nc) === 1) { nr = r; nc = c; }       // wall/edge → stay
      const t = cellType(nr, nc);
      if (t === 2) return { nr, nc, reward: 1, done: true };
      if (t === 3) return { nr, nc, reward: -1, done: true };
      return { nr, nc, reward: -0.02, done: false };
    }
    const argmax = (arr) => { let bi = 0; for (let i = 1; i < arr.length; i++) if (arr[i] > arr[bi]) bi = i; return bi; };

    function runEpisode() {
      let { r, c } = start;
      if (cellType(r, c) === 1) return;
      let ret = 0;
      for (let s = 0; s < 120; s++) {
        const a = Math.random() < epsilon ? Math.floor(Math.random() * A) : argmax(Q[r][c]);
        const { nr, nc, reward, done } = step(r, c, a);
        const target = done ? reward : reward + gamma * Math.max(...Q[nr][nc]);
        Q[r][c][a] += alpha * (target - Q[r][c][a]);
        ret += reward; r = nr; c = nc;
        if (done) break;
      }
      episodes++; returns.push(ret); if (returns.length > 400) returns.shift();
    }

    const mEp = ui.metric(panels.metrics, "Episodes");
    const mEps = ui.metric(panels.metrics, "Epsilon");
    const mAvg = ui.metric(panels.metrics, "Avg return (last 50)");
    const mSucc = ui.metric(panels.metrics, "Success (last 50)");

    function valColor(q, maxAbs) {
      const t = Math.min(1, Math.abs(q) / (maxAbs || 1));
      if (q >= 0) return `rgba(143,209,143,${0.12 + 0.7 * t})`;
      return `rgba(229,115,107,${0.12 + 0.7 * t})`;
    }
    function maxAbsQ() { let m = 0.1; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] === 0) for (let a = 0; a < A; a++) m = Math.max(m, Math.abs(Q[r][c][a])); return m; }

    function drawGrid() {
      const cs = gridC.width / C;
      gctx.fillStyle = COLORS.panel; gctx.fillRect(0, 0, gridC.width, gridC.height);
      const mx = maxAbsQ();
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const x0 = c * cs, y0 = r * cs, x1 = x0 + cs, y1 = y0 + cs, cx = x0 + cs / 2, cy = y0 + cs / 2;
        const t = grid[r][c];
        if (t === 1) { gctx.fillStyle = "#2a2f3d"; gctx.fillRect(x0, y0, cs, cs); }
        else if (t === 2) { gctx.fillStyle = "rgba(143,209,143,0.85)"; gctx.fillRect(x0, y0, cs, cs); gctx.fillStyle = "#101319"; gctx.font = "14px system-ui"; gctx.textAlign = "center"; gctx.textBaseline = "middle"; gctx.fillText("+1", cx, cy); }
        else if (t === 3) { gctx.fillStyle = "rgba(229,115,107,0.85)"; gctx.fillRect(x0, y0, cs, cs); gctx.fillStyle = "#101319"; gctx.font = "14px system-ui"; gctx.textAlign = "center"; gctx.textBaseline = "middle"; gctx.fillText("−1", cx, cy); }
        else {
          const corners = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
          for (let a = 0; a < A; a++) {
            gctx.fillStyle = valColor(Q[r][c][a], mx); gctx.beginPath();
            gctx.moveTo(corners[a][0][0], corners[a][0][1]); gctx.lineTo(corners[a][1][0], corners[a][1][1]); gctx.lineTo(cx, cy); gctx.closePath(); gctx.fill();
          }
          // greedy arrow
          const best = argmax(Q[r][c]);
          if (Math.max(...Q[r][c]) !== Math.min(...Q[r][c])) {
            gctx.strokeStyle = COLORS.textBright; gctx.lineWidth = 2;
            const ax = cx + DC[best] * cs * 0.3, ay = cy + DR[best] * cs * 0.3;
            gctx.beginPath(); gctx.moveTo(cx, cy); gctx.lineTo(ax, ay); gctx.stroke();
            gctx.beginPath(); gctx.arc(ax, ay, 2.5, 0, 6.283); gctx.fillStyle = COLORS.textBright; gctx.fill();
          }
        }
        gctx.strokeStyle = "#0e1014"; gctx.lineWidth = 1; gctx.strokeRect(x0, y0, cs, cs);
      }
      // start marker
      gctx.fillStyle = COLORS.train; gctx.font = "bold 14px system-ui"; gctx.textAlign = "center"; gctx.textBaseline = "middle";
      gctx.fillText("S", start.c * cs + cs / 2, start.r * cs + cs / 2);
      // greedy path from start
      let r = start.r, c = start.c; const path = [[r, c]]; const seen = new Set();
      for (let s = 0; s < R * C; s++) {
        if (grid[r][c] === 1) break;
        const k = r + "," + c; if (seen.has(k)) break; seen.add(k);
        if (grid[r][c] === 2 || grid[r][c] === 3) break;
        const a = argmax(Q[r][c]); const nr = r + DR[a], nc = c + DC[a];
        if (cellType(nr, nc) === 1) break; r = nr; c = nc; path.push([r, c]);
      }
      gctx.strokeStyle = "rgba(229,201,107,0.9)"; gctx.lineWidth = 3; gctx.beginPath();
      path.forEach(([pr, pc], i) => { const x = pc * cs + cs / 2, y = pr * cs + cs / 2; i ? gctx.lineTo(x, y) : gctx.moveTo(x, y); });
      gctx.stroke();
    }

    function drawChart() {
      const w = chartC.width, h = chartC.height, pad = 28;
      cctx.fillStyle = COLORS.panel; cctx.fillRect(0, 0, w, h);
      cctx.strokeStyle = COLORS.axis; cctx.strokeRect(pad, 10, w - pad - 10, h - pad - 10);
      cctx.strokeStyle = COLORS.gray; cctx.setLineDash([3, 3]); const zy = 10 + (h - pad - 20) * (1 - (0 - (-3)) / (1.5 - (-3)));
      cctx.beginPath(); cctx.moveTo(pad, zy); cctx.lineTo(w - 10, zy); cctx.stroke(); cctx.setLineDash([]);
      if (!returns.length) { cctx.fillStyle = COLORS.gray; cctx.font = "12px system-ui"; cctx.textAlign = "center"; cctx.fillText("train to record episode returns", w / 2, h / 2); return; }
      const lo = -3, hi = 1.5, n = returns.length;
      cctx.strokeStyle = COLORS.update; cctx.lineWidth = 1.5; cctx.beginPath();
      returns.forEach((v, i) => { const x = pad + (w - pad - 10) * (n === 1 ? 0 : i / (n - 1)); const y = 10 + (h - pad - 20) * (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)); i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); });
      cctx.stroke();
      cctx.fillStyle = COLORS.text; cctx.font = "11px system-ui"; cctx.textAlign = "left"; cctx.textBaseline = "top"; cctx.fillText("return", pad + 2, 12); cctx.textBaseline = "bottom"; cctx.fillText("episode →", pad + 2, h - 4);
    }

    function metrics() {
      mEp(episodes); mEps(epsilon.toFixed(2));
      const recent = returns.slice(-50);
      mAvg(recent.length ? (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(2) : "–");
      mSucc(recent.length ? (100 * recent.filter((r) => r > 0).length / recent.length).toFixed(0) + "%" : "–");
    }

    function render() { drawGrid(); drawChart(); metrics(); }

    let raf = requestAnimationFrame(function loop() {
      if (running) for (let k = 0; k < 8; k++) runEpisode();
      render(); raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    // painting
    let painting = false;
    function paintAt(ev) {
      const rect = gridC.getBoundingClientRect(), cs = gridC.width / C;
      const c = Math.floor((ev.clientX - rect.left) * (gridC.width / rect.width) / cs);
      const r = Math.floor((ev.clientY - rect.top) * (gridC.height / rect.height) / cs);
      if (r < 0 || c < 0 || r >= R || c >= C) return;
      if (tool === "start") { if (grid[r][c] === 0) start = { r, c }; }
      else if (tool === "wall") grid[r][c] = grid[r][c] === 1 ? 0 : 1;
      else if (tool === "goal") grid[r][c] = 2;
      else if (tool === "pit") grid[r][c] = 3;
      else grid[r][c] = 0;
      render();
    }
    const onUp = () => { painting = false; };
    gridC.addEventListener("mousedown", (e) => { painting = true; paintAt(e); });
    gridC.addEventListener("mousemove", (e) => { if (painting && tool !== "start") paintAt(e); });
    window.addEventListener("mouseup", onUp);
    ctx.onCleanup(() => window.removeEventListener("mouseup", onUp));

    const toolBtns = ui.buttonRow(panels.data, [
      { label: "Wall", onClick: () => setTool("wall") },
      { label: "Goal", onClick: () => setTool("goal") },
      { label: "Pit", onClick: () => setTool("pit") },
    ]);
    const toolBtns2 = ui.buttonRow(panels.data, [
      { label: "Start", onClick: () => setTool("start") },
      { label: "Erase", onClick: () => setTool("erase") },
    ]);
    const allTools = toolBtns.concat(toolBtns2);
    const toolOrder = ["wall", "goal", "pit", "start", "erase"];
    function setTool(t) { tool = t; allTools.forEach((b, i) => b.classList.toggle("active", toolOrder[i] === t)); }
    setTool("wall");
    ui.buttonRow(panels.data, [{ label: "New gridworld", kind: "danger", onClick: () => { reset(true); render(); } }]);

    ui.slider(panels.hyper, { label: "Learning rate α", min: 0.05, max: 1, step: 0.05, value: alpha, format: (v) => v.toFixed(2), onInput: (v) => { alpha = v; } });
    ui.slider(panels.hyper, { label: "Discount γ", min: 0.5, max: 0.99, step: 0.01, value: gamma, format: (v) => v.toFixed(2), onInput: (v) => { gamma = v; } });
    ui.slider(panels.hyper, { label: "Exploration ε", min: 0, max: 1, step: 0.02, value: epsilon, format: (v) => v.toFixed(2), onInput: (v) => { epsilon = v; } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Train", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Train"; } },
      { label: "Episode +1", onClick: () => { running = false; runBtn.textContent = "Train"; runEpisode(); } },
    ]);
    ui.buttonRow(panels.hyper, [{ label: "Reset Q-values", onClick: () => { reset(false); render(); } }]);
    ui.note(panels.hyper, "Drop γ toward 0.5 and the agent gets short-sighted — it won't path around far pits. Set ε to 0 too early and it exploits a bad route it never escapes.");

    reset(true);
    render();
  },
});
