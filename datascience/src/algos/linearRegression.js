"use strict";

// Linear Regression — drag points, watch gradient descent walk down the loss
// surface, see residuals shrink. Main view: scatter + fitted line + residuals.
// Internal view: the loss landscape over (slope, intercept) with the descent path.
DSP.register({
  id: "linear-regression",
  name: "Linear Regression",
  phase: "Phase 1 — Foundations",
  status: "ready",
  blurb: "Fit a straight line to data by minimizing squared error.",
  intuition: "Regression slides a line until the squared distance to every point is as small as it can be. Gradient descent is just rolling downhill on the error surface.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS } = ctx;

    let points = data.linear(25, { slope: 1.1, intercept: 1, noise: 1.4 });
    // Parameters live in standardized space for a clean, stable loss surface.
    let m = 0, b = 0;            // normalized slope / intercept
    let steps = 0;
    let running = false;
    let showResiduals = true;
    let lr = 0.08;
    let surface = null;          // cached ImageData of the loss landscape

    const xb = { min: 0, max: 12, ymin: -2, ymax: 16 };

    // --- canvases ---
    const mainC = canvas(panels.viz, 560, 380);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Drag points to move them · click empty space to add · shift-click to remove.");

    const lossC = canvas(panels.internal, 560, 300);
    const lossPlot = new Plot(lossC, { xMin: -3, xMax: 3, yMin: -3, yMax: 3, pad: 30 });
    ctx.titles.internal.textContent = "Internal — Loss Landscape & Descent Path";
    ui.note(panels.internal, "Each pixel is one possible line; brighter = lower error. The purple dot is the current line; the trail is the descent path.");

    // --- standardization helpers ---
    let stats = null;
    function recomputeStats() {
      const n = points.length || 1;
      const mx = points.reduce((s, p) => s + p.x, 0) / n;
      const my = points.reduce((s, p) => s + p.y, 0) / n;
      const sx = Math.sqrt(points.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n) || 1;
      const sy = Math.sqrt(points.reduce((s, p) => s + (p.y - my) ** 2, 0) / n) || 1;
      stats = { mx, my, sx, sy };
      surface = null; // data changed → loss surface is stale
    }
    const xn = (x) => (x - stats.mx) / stats.sx;
    const yn = (y) => (y - stats.my) / stats.sy;

    function lossAt(mm, bb) {
      if (!points.length) return 0;
      let s = 0;
      for (const p of points) { const e = mm * xn(p.x) + bb - yn(p.y); s += e * e; }
      return s / points.length;
    }
    function gradient() {
      let dm = 0, db = 0;
      for (const p of points) {
        const e = m * xn(p.x) + b - yn(p.y);
        dm += 2 * e * xn(p.x); db += 2 * e;
      }
      const n = points.length || 1;
      return { dm: dm / n, db: db / n };
    }
    function step() {
      if (!points.length) return;
      const g = gradient();
      m -= lr * g.dm; b -= lr * g.db;
      steps++;
    }
    function solveExact() {
      // Closed-form least squares in normalized space, then snap params there.
      let sxy = 0, sxx = 0;
      for (const p of points) { sxy += xn(p.x) * yn(p.y); sxx += xn(p.x) ** 2; }
      m = sxx ? sxy / sxx : 0; b = 0; // means are 0 in normalized space → intercept 0
      steps = 0;
    }

    // Map normalized params back to data-space slope/intercept.
    function dataLine() {
      const slope = m * stats.sy / stats.sx;
      const intercept = stats.my + stats.sy * b - slope * stats.mx;
      return { slope, intercept };
    }
    const predict = (x) => { const { slope, intercept } = dataLine(); return slope * x + intercept; };

    // --- metrics ---
    const mSlope = ui.metric(panels.metrics, "Slope");
    const mInt = ui.metric(panels.metrics, "Intercept");
    const mRmse = ui.metric(panels.metrics, "RMSE");
    const mR2 = ui.metric(panels.metrics, "R²");
    const mSteps = ui.metric(panels.metrics, "GD steps");
    const mLoss = ui.metric(panels.metrics, "Loss (norm.)");

    function metrics() {
      const { slope, intercept } = dataLine();
      let ssRes = 0, ssTot = 0;
      const my = points.reduce((s, p) => s + p.y, 0) / (points.length || 1);
      for (const p of points) { ssRes += (p.y - predict(p.x)) ** 2; ssTot += (p.y - my) ** 2; }
      const rmse = Math.sqrt(ssRes / (points.length || 1));
      const r2 = ssTot ? 1 - ssRes / ssTot : 0;
      mSlope(slope.toFixed(2)); mInt(intercept.toFixed(2));
      mRmse(rmse.toFixed(2)); mR2(r2.toFixed(3));
      mSteps(steps); mLoss(lossAt(m, b).toFixed(3));
    }

    // --- rendering ---
    function drawMain() {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 4, xLabel: "x", yLabel: "y" });
      // residuals first (under points)
      if (showResiduals) {
        for (const p of points) plot.line(p.x, p.y, p.x, predict(p.x), { color: COLORS.error, width: 1.5, dash: [3, 3] });
      }
      // fitted line across the view
      plot.line(xb.min, predict(xb.min), xb.max, predict(xb.max), { color: COLORS.predict, width: 2.5 });
      for (const p of points) plot.point(p.x, p.y, { r: 5, color: COLORS.train, stroke: "#0e1014", width: 1.5 });
    }

    function buildSurface() {
      const w = lossC.width, h = lossC.height;
      const img = lossPlot.ctx.createImageData(w, h);
      let lo = Infinity, hi = -Infinity;
      const grid = [];
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const mm = lossPlot.dx(px), bb = lossPlot.dy(py);
          const L = lossAt(mm, bb);
          grid.push(L); if (L < lo) lo = L; if (L > hi) hi = L;
        }
      }
      const rng = hi - lo || 1;
      for (let i = 0; i < grid.length; i++) {
        // log-ish remap so the valley is readable; low loss = bright teal.
        const t = 1 - Math.sqrt((grid[i] - lo) / rng);
        const o = i * 4;
        img.data[o] = 20 + t * 60;
        img.data[o + 1] = 24 + t * 150;
        img.data[o + 2] = 35 + t * 140;
        img.data[o + 3] = 255;
      }
      surface = img;
    }

    const path = [];
    function drawLoss() {
      if (!surface) buildSurface();
      lossPlot.ctx.putImageData(surface, 0, 0);
      lossPlot.grid({ xStep: 1, yStep: 1, xLabel: "slope", yLabel: "intercept" });
      // descent path
      lossPlot.ctx.strokeStyle = COLORS.update;
      lossPlot.ctx.lineWidth = 1.5;
      lossPlot.ctx.beginPath();
      path.forEach((p, i) => {
        const sx = lossPlot.px(p.m), sy = lossPlot.py(p.b);
        i ? lossPlot.ctx.lineTo(sx, sy) : lossPlot.ctx.moveTo(sx, sy);
      });
      lossPlot.ctx.stroke();
      // current params
      lossPlot.point(m, b, { r: 5, color: COLORS.update, stroke: "#fff", width: 1.5 });
    }

    function render() { drawMain(); drawLoss(); metrics(); }

    // --- animation loop ---
    let raf = null;
    function loop() {
      if (running) {
        step();
        path.push({ m, b });
        if (path.length > 400) path.shift();
        if (steps > 4000) running = false;
      }
      render();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    function resetLine() { m = 0; b = 0; steps = 0; path.length = 0; running = false; trainBtn.textContent = "Run Gradient Descent"; }

    // --- data controls ---
    ui.select(panels.data, {
      label: "Dataset preset",
      options: [
        { value: "clean", label: "Strong linear" },
        { value: "noisy", label: "Noisy" },
        { value: "outlier", label: "With outlier" },
        { value: "flat", label: "No relationship" },
      ],
      onChange: (v) => {
        if (v === "clean") points = data.linear(25, { slope: 1.1, intercept: 1, noise: 0.6 });
        else if (v === "noisy") points = data.linear(28, { slope: 0.9, intercept: 2, noise: 3 });
        else if (v === "flat") points = data.linear(25, { slope: 0, intercept: 7, noise: 2.5 });
        else { points = data.linear(22, { slope: 1.1, intercept: 1, noise: 1 }); points.push({ x: 11, y: -1 }); }
        recomputeStats(); resetLine();
      },
    });
    ui.buttonRow(panels.data, [
      { label: "Randomize", onClick: () => { points = data.linear(25, { slope: (Math.random() * 2 - 1) * 1.5, intercept: Math.random() * 6, noise: 1 + Math.random() * 2 }); recomputeStats(); resetLine(); } },
      { label: "Add outlier", onClick: () => { points.push({ x: ctx.lerp(xb.min + 1, xb.max - 1, Math.random()), y: ctx.lerp(xb.ymin, xb.ymax, Math.random()) }); recomputeStats(); } },
    ]);
    ui.buttonRow(panels.data, [
      { label: "Add noise", onClick: () => { points.forEach((p) => { p.y += data.gauss() * 1.2; }); recomputeStats(); } },
      { label: "Clear", kind: "danger", onClick: () => { points = []; recomputeStats(); resetLine(); } },
    ]);

    // --- hyperparameters ---
    ui.slider(panels.hyper, { label: "Learning rate", min: 0.005, max: 0.6, step: 0.005, value: lr, format: (v) => v.toFixed(3), onInput: (v) => { lr = v; } });
    ui.toggle(panels.hyper, { label: "Show residuals", value: true, onChange: (v) => { showResiduals = v; } });
    const [trainBtn, stepBtn] = ui.buttonRow(panels.hyper, [
      { label: "Run Gradient Descent", kind: "primary", onClick: () => { running = !running; trainBtn.textContent = running ? "Pause" : "Run Gradient Descent"; } },
      { label: "Step", onClick: () => { running = false; trainBtn.textContent = "Run Gradient Descent"; step(); path.push({ m, b }); } },
    ]);
    ui.buttonRow(panels.hyper, [
      { label: "Reset line", onClick: resetLine },
      { label: "Solve exactly", onClick: () => { solveExact(); path.length = 0; path.push({ m, b }); running = false; trainBtn.textContent = "Run Gradient Descent"; } },
    ]);
    ui.note(panels.hyper, "Crank the learning rate too high and the descent overshoots — watch the path bounce or diverge.");

    // Drag / add / remove points; any edit invalidates the cached loss surface.
    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y }),
      onChange: recomputeStats,
    }));

    recomputeStats();
  },
});
