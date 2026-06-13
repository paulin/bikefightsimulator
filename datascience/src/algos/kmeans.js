"use strict";

// K-Means — alternate between assigning points to the nearest centroid and moving
// each centroid to the mean of its points. Main view: colored assignments +
// draggable centroids. Internal view: inertia falling each iteration.
DSP.register({
  id: "kmeans",
  name: "K-Means Clustering",
  phase: "Phase 1 — Foundations",
  status: "ready",
  blurb: "Find K cluster centers by repeatedly reassigning points and recentering.",
  intuition: "Clusters emerge from two steps repeated: assign every point to its nearest center, then move each center to the middle of its points. Inertia only ever goes down.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.blobs(3, 22, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 0.9 });
    points.forEach((p) => { p.cluster = -1; });
    let K = 3;
    let centroids = [];
    let phase = "assign";       // next step to perform
    let iterations = 0;
    let running = false;
    let history = [];
    let showLines = true;

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Drag the big ◆ centroids to seed them by hand · click to add a point · shift-click to remove.");

    const chartC = canvas(panels.internal, 480, 220);
    const cctx = chartC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Inertia per Iteration";
    ui.note(panels.internal, "Inertia = total squared distance from points to their centers. K-Means can only ever decrease it — when it flatlines, it has converged.");

    function color(c, alpha) {
      const hex = CLASS_COLORS[c % CLASS_COLORS.length];
      if (alpha === undefined) return hex;
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function seed() {
      centroids = [];
      const used = new Set();
      for (let c = 0; c < K; c++) {
        if (points.length) {
          let i; let guard = 0;
          do { i = Math.floor(Math.random() * points.length); guard++; } while (used.has(i) && guard < 50);
          used.add(i);
          centroids.push({ x: points[i].x + data.gauss() * 0.2, y: points[i].y + data.gauss() * 0.2 });
        } else {
          centroids.push({ x: ctx.lerp(xb.min + 1, xb.max - 1, Math.random()), y: ctx.lerp(xb.ymin + 1, xb.ymax - 1, Math.random()) });
        }
      }
      points.forEach((p) => { p.cluster = -1; });
      phase = "assign"; iterations = 0; history = []; running = false;
      if (typeof runBtn !== "undefined") runBtn.textContent = "Run";
    }

    function assign() {
      let changed = 0;
      for (const p of points) {
        let best = -1, bd = Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const d = (p.x - centroids[c].x) ** 2 + (p.y - centroids[c].y) ** 2;
          if (d < bd) { bd = d; best = c; }
        }
        if (p.cluster !== best) changed++;
        p.cluster = best;
      }
      return changed;
    }
    function update() {
      const sum = centroids.map(() => ({ x: 0, y: 0, n: 0 }));
      for (const p of points) if (p.cluster >= 0) { const s = sum[p.cluster]; s.x += p.x; s.y += p.y; s.n++; }
      let moved = 0;
      centroids.forEach((c, i) => {
        if (sum[i].n) { const nx = sum[i].x / sum[i].n, ny = sum[i].y / sum[i].n; moved += Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny; }
      });
      return moved;
    }
    function inertia() {
      let s = 0;
      for (const p of points) if (p.cluster >= 0) s += (p.x - centroids[p.cluster].x) ** 2 + (p.y - centroids[p.cluster].y) ** 2;
      return s;
    }

    function stepOnce() {
      if (phase === "assign") { assign(); phase = "update"; }
      else { update(); phase = "assign"; iterations++; history.push(inertia()); if (history.length > 200) history.shift(); }
    }

    const mK = ui.metric(panels.metrics, "K");
    const mIter = ui.metric(panels.metrics, "Iterations");
    const mPhase = ui.metric(panels.metrics, "Next step");
    const mInertia = ui.metric(panels.metrics, "Inertia");

    function drawMain() {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      if (showLines) {
        for (const p of points) if (p.cluster >= 0) plot.line(p.x, p.y, centroids[p.cluster].x, centroids[p.cluster].y, { color: color(p.cluster, 0.25), width: 1 });
      }
      for (const p of points) plot.point(p.x, p.y, { r: 4.5, color: p.cluster >= 0 ? color(p.cluster) : COLORS.gray, stroke: "#0e1014", width: 1 });
      // centroids as diamonds
      centroids.forEach((c, i) => {
        const sx = plot.px(c.x), sy = plot.py(c.y);
        plot.ctx.save();
        plot.ctx.translate(sx, sy); plot.ctx.rotate(Math.PI / 4);
        plot.ctx.fillStyle = color(i); plot.ctx.strokeStyle = "#fff"; plot.ctx.lineWidth = 2.5;
        plot.ctx.fillRect(-9, -9, 18, 18); plot.ctx.strokeRect(-9, -9, 18, 18);
        plot.ctx.restore();
      });
    }

    function drawChart() {
      const w = chartC.width, h = chartC.height, pad = 28;
      cctx.fillStyle = COLORS.panel; cctx.fillRect(0, 0, w, h);
      cctx.strokeStyle = COLORS.axis; cctx.strokeRect(pad, 10, w - pad - 10, h - pad - 10);
      if (history.length < 1) { cctx.fillStyle = COLORS.gray; cctx.font = "12px system-ui"; cctx.textAlign = "center"; cctx.fillText("step or run to record inertia", w / 2, h / 2); return; }
      const hi = Math.max(...history, 1e-6), lo = 0;
      const n = history.length;
      cctx.strokeStyle = COLORS.update; cctx.lineWidth = 2; cctx.beginPath();
      history.forEach((v, i) => {
        const x = pad + (w - pad - 10) * (n === 1 ? 0 : i / (n - 1));
        const y = 10 + (h - pad - 20) * (1 - (v - lo) / (hi - lo));
        i ? cctx.lineTo(x, y) : cctx.moveTo(x, y);
      });
      cctx.stroke();
      history.forEach((v, i) => {
        const x = pad + (w - pad - 10) * (n === 1 ? 0 : i / (n - 1));
        const y = 10 + (h - pad - 20) * (1 - (v - lo) / (hi - lo));
        cctx.fillStyle = COLORS.update; cctx.beginPath(); cctx.arc(x, y, 2.5, 0, 7); cctx.fill();
      });
      cctx.fillStyle = COLORS.text; cctx.font = "11px system-ui"; cctx.textAlign = "left"; cctx.textBaseline = "top";
      cctx.fillText("inertia", pad + 2, 12);
      cctx.textBaseline = "bottom"; cctx.fillText("iteration →", pad + 2, h - 4);
    }

    function metrics() {
      mK(K); mIter(iterations); mPhase(phase === "assign" ? "Assign points" : "Move centers");
      mInertia(points.length ? inertia().toFixed(1) : "–");
    }

    function render() { drawMain(); drawChart(); metrics(); }

    // pacing for auto-run
    let frame = 0, raf = null;
    function loop() {
      if (running) { frame++; if (frame % 24 === 0) stepOnce(); }
      render();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    // interaction: centroids drag first, then points
    let dragging = null; // {type:'cent'|'pt', i}
    const near = (m, x, y, r) => Math.hypot(plot.px(x) - m.px, plot.py(y) - m.py) <= r;
    function down(ev) {
      const m = plot.mouse(ev);
      for (let i = 0; i < centroids.length; i++) if (near(m, centroids[i].x, centroids[i].y, 13)) { dragging = { type: "cent", i }; return; }
      let hit = -1;
      for (let i = points.length - 1; i >= 0; i--) if (near(m, points[i].x, points[i].y, 9)) { hit = i; break; }
      if (ev.shiftKey || ev.button === 2) { if (hit >= 0) points.splice(hit, 1); ev.preventDefault(); return; }
      if (hit >= 0) { dragging = { type: "pt", i: hit }; return; }
      points.push({ x: ctx.clamp(plot.dx(m.px), xb.min, xb.max), y: ctx.clamp(plot.dy(m.py), xb.ymin, xb.ymax), cluster: -1 });
    }
    function move(ev) {
      if (!dragging) return;
      const m = plot.mouse(ev);
      const x = ctx.clamp(plot.dx(m.px), xb.min, xb.max), y = ctx.clamp(plot.dy(m.py), xb.ymin, xb.ymax);
      const t = dragging.type === "cent" ? centroids[dragging.i] : points[dragging.i];
      t.x = x; t.y = y;
    }
    function up() { dragging = null; }
    mainC.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    mainC.addEventListener("contextmenu", (e) => e.preventDefault());
    ctx.onCleanup(() => { mainC.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); });

    // controls
    ui.buttonRow(panels.data, [
      { label: "Randomize blobs", onClick: () => { points = data.blobs(K, 20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 0.9 }); points.forEach((p) => p.cluster = -1); seed(); } },
      { label: "Clear", kind: "danger", onClick: () => { points = []; seed(); } },
    ]);

    ui.slider(panels.hyper, { label: "K (clusters)", min: 1, max: 6, step: 1, value: K, onInput: (v) => { K = v; seed(); } });
    ui.toggle(panels.hyper, { label: "Show assignment lines", value: true, onChange: (v) => { showLines = v; } });
    var [runBtn, stepBtn] = ui.buttonRow(panels.hyper, [
      { label: "Run", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Run"; } },
      { label: phase === "assign" ? "Step" : "Step", onClick: () => { running = false; runBtn.textContent = "Run"; stepOnce(); } },
    ]);
    ui.buttonRow(panels.hyper, [{ label: "Reseed centroids", onClick: seed }]);
    ui.note(panels.hyper, "Reseed a few times with the same K — bad initial centers can settle into a worse clustering. That's why real K-Means restarts.");

    seed();
    render();
  },
});
