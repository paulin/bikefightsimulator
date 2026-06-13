"use strict";

// Logistic Regression — fit a linear boundary by gradient descent on log-loss,
// but the output is a probability, not a hard label. Main view: probability
// heatmap + boundary at the chosen threshold. Internal view: the sigmoid, with
// every point placed on it by its score.
DSP.register({
  id: "logistic-regression",
  name: "Logistic Regression",
  phase: "Phase 2 — Supervised",
  status: "ready",
  blurb: "Predict class probability with a sigmoid of a linear score.",
  intuition: "It predicts a probability, not a certainty. The decision boundary is just the line where that probability crosses your threshold — slide the threshold and the boundary slides with it.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.twoClasses(20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.5 });
    let w1 = 0, w2 = 0, bn = 0;   // weights in normalized space
    let lr = 0.3, threshold = 0.5, running = false, steps = 0, addClass = 0, showHeat = true;
    let stats = null;

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Click to add a point of the selected class · drag to move · shift-click to remove.");

    const sigC = canvas(panels.internal, 480, 260);
    const sigPlot = new Plot(sigC, { xMin: -6, xMax: 6, yMin: -0.05, yMax: 1.05, pad: 34 });
    ctx.titles.internal.textContent = "Internal — The Sigmoid";
    ui.note(panels.internal, "Each point's linear score z is squashed through 1/(1+e⁻ᶻ). Well-separated points sit at the flat ends; ambiguous ones cluster near the middle.");

    const sigmoid = (z) => 1 / (1 + Math.exp(-z));

    function recomputeStats() {
      const n = points.length || 1;
      const mx = points.reduce((s, p) => s + p.x, 0) / n, my = points.reduce((s, p) => s + p.y, 0) / n;
      const sx = Math.sqrt(points.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n) || 1;
      const sy = Math.sqrt(points.reduce((s, p) => s + (p.y - my) ** 2, 0) / n) || 1;
      stats = { mx, my, sx, sy };
    }
    const xn = (x) => (x - stats.mx) / stats.sx, yn = (y) => (y - stats.my) / stats.sy;

    // data-space score coefficients, so z = a*x + c*y + d
    function dataCoef() {
      const a = w1 / stats.sx, c = w2 / stats.sy;
      const d = bn - w1 * stats.mx / stats.sx - w2 * stats.my / stats.sy;
      return { a, c, d };
    }
    const scoreData = (x, y) => { const { a, c, d } = dataCoef(); return a * x + c * y + d; };

    function step() {
      if (!points.length) return;
      let g1 = 0, g2 = 0, gb = 0;
      for (const p of points) {
        const pr = sigmoid(w1 * xn(p.x) + w2 * yn(p.y) + bn);
        const err = pr - p.label;
        g1 += err * xn(p.x); g2 += err * yn(p.y); gb += err;
      }
      const n = points.length;
      w1 -= lr * g1 / n; w2 -= lr * g2 / n; bn -= lr * gb / n;
      steps++;
    }

    const mAcc = ui.metric(panels.metrics, "Accuracy");
    const mLoss = ui.metric(panels.metrics, "Log loss");
    const mThr = ui.metric(panels.metrics, "Threshold");
    const mSteps = ui.metric(panels.metrics, "GD steps");

    function blend(p) { // p = prob of class 1
      const A = CLASS_COLORS[0], B = CLASS_COLORS[1];
      const ha = [parseInt(A.slice(1, 3), 16), parseInt(A.slice(3, 5), 16), parseInt(A.slice(5, 7), 16)];
      const hb = [parseInt(B.slice(1, 3), 16), parseInt(B.slice(3, 5), 16), parseInt(B.slice(5, 7), 16)];
      return [0, 1, 2].map((i) => Math.round(ha[i] * (1 - p) + hb[i] * p));
    }

    function drawHeat() {
      if (!showHeat) return;
      const w = mainC.width, h = mainC.height, cell = 8;
      const img = plot.ctx.createImageData(w, h);
      for (let py = 0; py < h; py += cell) {
        for (let px = 0; px < w; px += cell) {
          const pr = sigmoid(scoreData(plot.dx(px + cell / 2), plot.dy(py + cell / 2)));
          const [r, g, b] = blend(pr);
          for (let yy = py; yy < Math.min(py + cell, h); yy++)
            for (let xx = px; xx < Math.min(px + cell, w); xx++) {
              const o = (yy * w + xx) * 4;
              img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 46;
            }
        }
      }
      plot.ctx.putImageData(img, 0, 0);
    }

    function drawMain() {
      plot.clear();
      drawHeat();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      // decision boundary: score = logit(threshold)
      const t0 = Math.log(threshold / (1 - threshold));
      const { a, c, d } = dataCoef();
      if (Math.abs(c) > 1e-6) plot.line(xb.min, (t0 - d - a * xb.min) / c, xb.max, (t0 - d - a * xb.max) / c, { color: COLORS.predict, width: 2.5 });
      else if (Math.abs(a) > 1e-6) plot.line((t0 - d) / a, xb.ymin, (t0 - d) / a, xb.ymax, { color: COLORS.predict, width: 2.5 });
      for (const p of points) plot.point(p.x, p.y, { r: 5, color: CLASS_COLORS[p.label], stroke: "#0e1014", width: 1.3 });
    }

    function drawSigmoid() {
      sigPlot.clear();
      sigPlot.grid({ xStep: 2, yStep: 0.25, xLabel: "score z", yLabel: "P(class 1)" });
      // sigmoid curve
      sigPlot.ctx.strokeStyle = COLORS.update; sigPlot.ctx.lineWidth = 2; sigPlot.ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const z = -6 + 12 * i / 120, sy = sigPlot.py(sigmoid(z)), sx = sigPlot.px(z);
        i ? sigPlot.ctx.lineTo(sx, sy) : sigPlot.ctx.moveTo(sx, sy);
      }
      sigPlot.ctx.stroke();
      sigPlot.line(-6, threshold, 6, threshold, { color: COLORS.gray, width: 1, dash: [4, 3] });
      for (const p of points) {
        const z = Math.max(-6, Math.min(6, scoreData(p.x, p.y)));
        sigPlot.point(z, sigmoid(z), { r: 4, color: CLASS_COLORS[p.label], stroke: "#0e1014", width: 1 });
      }
    }

    function metrics() {
      if (!points.length) { [mAcc, mLoss].forEach((f) => f("–")); mThr(threshold.toFixed(2)); mSteps(steps); return; }
      let correct = 0, loss = 0;
      for (const p of points) {
        const pr = Math.min(1 - 1e-7, Math.max(1e-7, sigmoid(scoreData(p.x, p.y))));
        if ((pr >= threshold ? 1 : 0) === p.label) correct++;
        loss += -(p.label * Math.log(pr) + (1 - p.label) * Math.log(1 - pr));
      }
      mAcc((100 * correct / points.length).toFixed(1) + "%");
      mLoss((loss / points.length).toFixed(3));
      mThr(threshold.toFixed(2));
      mSteps(steps);
    }

    function render() { drawMain(); drawSigmoid(); metrics(); }

    let raf = requestAnimationFrame(function loop() {
      if (running) { for (let k = 0; k < 3; k++) step(); if (steps > 6000) running = false; }
      render(); raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    function reset() { w1 = w2 = bn = 0; steps = 0; running = false; runBtn.textContent = "Run Gradient Descent"; }

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
      { label: "Randomize", onClick: () => { points = data.twoClasses(20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.5 }); recomputeStats(); reset(); } },
      { label: "Overlap more", onClick: () => { points = data.twoClasses(22, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 2.6 }); recomputeStats(); reset(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "Clear", kind: "danger", onClick: () => { points = []; recomputeStats(); reset(); } }]);

    ui.slider(panels.hyper, { label: "Learning rate", min: 0.02, max: 1.0, step: 0.02, value: lr, format: (v) => v.toFixed(2), onInput: (v) => { lr = v; } });
    ui.slider(panels.hyper, { label: "Decision threshold", min: 0.05, max: 0.95, step: 0.05, value: threshold, format: (v) => v.toFixed(2), onInput: (v) => { threshold = v; } });
    ui.toggle(panels.hyper, { label: "Show probability heatmap", value: true, onChange: (v) => { showHeat = v; } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Run Gradient Descent", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Run Gradient Descent"; } },
      { label: "Step", onClick: () => { running = false; runBtn.textContent = "Run Gradient Descent"; step(); } },
    ]);
    ui.buttonRow(panels.hyper, [{ label: "Reset weights", onClick: reset }]);
    ui.note(panels.hyper, "Raise the threshold and the boundary shifts to demand more confidence before calling a point class 1 — trading recall for precision.");

    recomputeStats();
    render();
  },
});
