"use strict";

// Support Vector Machine (linear, soft-margin) — trained with Pegasos sub-gradient
// descent on the hinge loss. Main view: boundary + the two margin lines + the
// support vectors that actually pin them. Internal view: each point's functional
// margin, so you can see which points are "in play".
DSP.register({
  id: "svm",
  name: "Support Vector Machine",
  phase: "Phase 2 — Supervised",
  status: "ready",
  blurb: "Separate classes with the widest possible margin.",
  intuition: "Only a few points — the support vectors on or inside the margin — actually define the boundary. Everything else could move freely without changing it. C trades margin width against misclassifications.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.twoClasses(16, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.2 });
    let w1 = 0, w2 = 0, bn = 0;     // normalized-space weights
    let C = 1, t = 0, running = false, addClass = 0;
    let stats = null;

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Click to add a point of the selected class · drag to move · shift-click to remove.");

    const marginC = canvas(panels.internal, 480, 260);
    const mctx = marginC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Functional Margins  y·(w·x+b)";
    ui.note(panels.internal, "Bars are each point's signed margin. Anything at or below 1 (the dashed line) is a support vector — it pays hinge loss and pulls on the boundary.");

    function recomputeStats() {
      const n = points.length || 1;
      const mx = points.reduce((s, p) => s + p.x, 0) / n, my = points.reduce((s, p) => s + p.y, 0) / n;
      const sx = Math.sqrt(points.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n) || 1;
      const sy = Math.sqrt(points.reduce((s, p) => s + (p.y - my) ** 2, 0) / n) || 1;
      stats = { mx, my, sx, sy };
    }
    const xn = (x) => (x - stats.mx) / stats.sx, yn = (y) => (y - stats.my) / stats.sy;
    const sign = (label) => (label === 1 ? 1 : -1);

    // Pegasos: one stochastic sub-gradient step (lambda derived from C).
    function step() {
      if (points.length < 2) return;
      const lambda = 1 / (C * points.length);
      t++;
      const eta = 1 / (lambda * t);
      const i = Math.floor(Math.random() * points.length);
      const p = points[i], y = sign(p.label);
      const margin = y * (w1 * xn(p.x) + w2 * yn(p.y) + bn);
      w1 *= (1 - eta * lambda); w2 *= (1 - eta * lambda);
      if (margin < 1) { w1 += eta * y * xn(p.x); w2 += eta * y * yn(p.y); bn += eta * y; }
    }

    function dataCoef() {
      const a = w1 / stats.sx, c = w2 / stats.sy;
      const d = bn - w1 * stats.mx / stats.sx - w2 * stats.my / stats.sy;
      return { a, c, d };
    }
    const scoreN = (p) => w1 * xn(p.x) + w2 * yn(p.y) + bn;

    const mAcc = ui.metric(panels.metrics, "Accuracy");
    const mMargin = ui.metric(panels.metrics, "Margin width");
    const mSV = ui.metric(panels.metrics, "Support vectors");
    const mC = ui.metric(panels.metrics, "C");
    const mSteps = ui.metric(panels.metrics, "Updates");

    function drawLineAtScore(level, style) {
      const { a, c, d } = dataCoef();
      if (Math.abs(c) > 1e-6) plot.line(xb.min, (level - d - a * xb.min) / c, xb.max, (level - d - a * xb.max) / c, style);
      else if (Math.abs(a) > 1e-6) plot.line((level - d) / a, xb.ymin, (level - d) / a, xb.ymax, style);
    }

    function isSV(p) { return sign(p.label) * scoreN(p) <= 1.0001; }

    function drawMain() {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      drawLineAtScore(1, { color: COLORS.gray, width: 1, dash: [5, 4] });
      drawLineAtScore(-1, { color: COLORS.gray, width: 1, dash: [5, 4] });
      drawLineAtScore(0, { color: COLORS.predict, width: 2.5 });
      for (const p of points) {
        const sv = isSV(p);
        plot.point(p.x, p.y, { r: sv ? 7 : 5, color: CLASS_COLORS[p.label], stroke: sv ? "#fff" : "#0e1014", width: sv ? 2.4 : 1.3 });
      }
    }

    function drawMargins() {
      const w = marginC.width, h = marginC.height;
      mctx.fillStyle = COLORS.panel; mctx.fillRect(0, 0, w, h);
      if (!points.length) return;
      const margins = points.map((p) => ({ m: sign(p.label) * scoreN(p), label: p.label })).sort((a, b) => a.m - b.m);
      const maxAbs = Math.max(2, ...margins.map((d) => Math.abs(d.m)));
      const mid = h * 0.5, scale = (h * 0.42) / maxAbs;
      // zero axis and margin=1 line
      mctx.strokeStyle = COLORS.axis; mctx.beginPath(); mctx.moveTo(30, mid); mctx.lineTo(w - 10, mid); mctx.stroke();
      mctx.strokeStyle = COLORS.gray; mctx.setLineDash([4, 3]); mctx.beginPath();
      mctx.moveTo(30, mid - scale); mctx.lineTo(w - 10, mid - scale); mctx.stroke(); mctx.setLineDash([]);
      mctx.fillStyle = COLORS.gray; mctx.font = "10px system-ui"; mctx.textAlign = "left"; mctx.textBaseline = "bottom";
      mctx.fillText("margin = 1", 32, mid - scale - 2);
      const bw = (w - 44) / margins.length;
      margins.forEach((d, i) => {
        const x = 32 + i * bw, bh = d.m * scale;
        mctx.fillStyle = d.m <= 1.0001 ? CLASS_COLORS[d.label] : CLASS_COLORS[d.label] + "66";
        mctx.fillRect(x, mid - Math.max(0, bh), Math.max(1, bw - 1.5), Math.abs(bh));
      });
    }

    function metrics() {
      if (points.length < 2) { [mAcc, mMargin, mSV].forEach((f) => f("–")); mC(C); mSteps(t); return; }
      let correct = 0, sv = 0;
      for (const p of points) { if ((scoreN(p) >= 0 ? 1 : 0) === p.label) correct++; if (isSV(p)) sv++; }
      const wn = Math.hypot(w1, w2);
      mAcc((100 * correct / points.length).toFixed(1) + "%");
      mMargin(wn < 1e-3 ? "– (untrained)" : (2 / wn).toFixed(2));
      mSV(sv); mC(C < 1 ? C.toFixed(2) : C); mSteps(t);
    }

    function render() { drawMain(); drawMargins(); metrics(); }

    let raf = requestAnimationFrame(function loop() {
      if (running) { for (let k = 0; k < 5; k++) step(); }
      render(); raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    function reset() { w1 = w2 = bn = 0; t = 0; running = false; runBtn.textContent = "Train"; }

    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y, label: addClass }),
      onChange: recomputeStats,
    }));

    const classBtns = ui.buttonRow(panels.data, [
      { label: "Add Class 0", onClick: () => setAdd(0) },
      { label: "Add Class 1", onClick: () => setAdd(1) },
    ]);
    function setAdd(c) { addClass = c; classBtns.forEach((b, i) => b.classList.toggle("active", i === c)); }
    setAdd(0);
    ui.buttonRow(panels.data, [
      { label: "Separable", onClick: () => { points = data.twoClasses(16, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.0 }); recomputeStats(); reset(); } },
      { label: "Overlapping", onClick: () => { points = data.twoClasses(20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 2.4 }); recomputeStats(); reset(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "Clear", kind: "danger", onClick: () => { points = []; recomputeStats(); reset(); } }]);

    ui.slider(panels.hyper, { label: "C (penalty on errors)", min: 0.05, max: 20, step: 0.05, value: C, format: (v) => v < 1 ? v.toFixed(2) : v.toFixed(1), onInput: (v) => { C = v; } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Train", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Train"; } },
      { label: "Reset", onClick: reset },
    ]);
    ui.note(panels.hyper, "Low C = a wide, soft margin that tolerates errors. High C = a narrow, hard margin that bends to classify every point. Watch the margin lines move.");

    recomputeStats();
    render();
  },
});
