"use strict";

// Naive Bayes (Gaussian) — model each class as an independent Gaussian per
// feature, then let evidence multiply into a posterior. Main view: posterior
// shading + per-class Gaussian ellipses. Internal view: the 1D class-conditional
// bells for each feature you can toggle on and off.
DSP.register({
  id: "naive-bayes",
  name: "Naive Bayes",
  phase: "Phase 2 — Supervised",
  status: "ready",
  blurb: "Multiply independent per-feature likelihoods into a class posterior.",
  intuition: "Evidence accumulates toward a prediction. Each feature votes via its likelihood; 'naive' just means we pretend the features are independent and multiply.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.twoClasses(20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.6 });
    let useF1 = true, useF2 = true, smoothing = 0.3, addClass = 0;
    let model = null;

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Click to add a point of the selected class · drag to move · shift-click to remove.");

    const distC = canvas(panels.internal, 480, 300);
    const dctx = distC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Class-Conditional Likelihoods";
    ui.note(panels.internal, "Each class is a bell curve per feature. Where the bells overlap, that feature gives weak evidence; where they're far apart, it's decisive.");

    function fit() {
      const m = {};
      for (const lab of [0, 1]) {
        const g = points.filter((p) => p.label === lab);
        if (!g.length) { m[lab] = null; continue; }
        const mean = (k) => g.reduce((s, p) => s + p[k], 0) / g.length;
        const mx = mean("x"), my = mean("y");
        const vx = g.reduce((s, p) => s + (p.x - mx) ** 2, 0) / g.length + smoothing;
        const vy = g.reduce((s, p) => s + (p.y - my) ** 2, 0) / g.length + smoothing;
        m[lab] = { prior: g.length / points.length, mx, my, vx, vy, n: g.length };
      }
      model = m;
    }

    const logN = (v, mu, varr) => -0.5 * Math.log(2 * Math.PI * varr) - (v - mu) ** 2 / (2 * varr);
    const normN = (v, mu, varr) => Math.exp(-((v - mu) ** 2) / (2 * varr)) / Math.sqrt(2 * Math.PI * varr);

    function logPost(lab, x, y) {
      const c = model[lab]; if (!c) return -Infinity;
      let lp = Math.log(c.prior);
      if (useF1) lp += logN(x, c.mx, c.vx);
      if (useF2) lp += logN(y, c.my, c.vy);
      return lp;
    }
    function pClass1(x, y) {
      const l0 = logPost(0, x, y), l1 = logPost(1, x, y);
      if (l0 === -Infinity && l1 === -Infinity) return 0.5;
      if (l0 === -Infinity) return 1; if (l1 === -Infinity) return 0;
      return 1 / (1 + Math.exp(l0 - l1));
    }

    const mAcc = ui.metric(panels.metrics, "Accuracy");
    const mP0 = ui.metric(panels.metrics, "Prior class 0");
    const mP1 = ui.metric(panels.metrics, "Prior class 1");
    const mFeat = ui.metric(panels.metrics, "Features used");

    function blend(p) {
      const A = CLASS_COLORS[0], B = CLASS_COLORS[1];
      const ha = [parseInt(A.slice(1, 3), 16), parseInt(A.slice(3, 5), 16), parseInt(A.slice(5, 7), 16)];
      const hb = [parseInt(B.slice(1, 3), 16), parseInt(B.slice(3, 5), 16), parseInt(B.slice(5, 7), 16)];
      return [0, 1, 2].map((i) => Math.round(ha[i] * (1 - p) + hb[i] * p));
    }

    function drawHeat() {
      const w = mainC.width, h = mainC.height, cell = 8;
      const img = plot.ctx.createImageData(w, h);
      for (let py = 0; py < h; py += cell)
        for (let px = 0; px < w; px += cell) {
          const pr = pClass1(plot.dx(px + cell / 2), plot.dy(py + cell / 2));
          const [r, g, b] = blend(pr);
          for (let yy = py; yy < Math.min(py + cell, h); yy++)
            for (let xx = px; xx < Math.min(px + cell, w); xx++) {
              const o = (yy * w + xx) * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 46;
            }
        }
      plot.ctx.putImageData(img, 0, 0);
    }

    function ellipse(cx, cy, rx, ry, color, width) {
      const sx = plot.px(cx), sy = plot.py(cy);
      const px1 = plot.px(1) - plot.px(0), py1 = plot.py(0) - plot.py(1);
      plot.ctx.save(); plot.ctx.strokeStyle = color; plot.ctx.lineWidth = width;
      plot.ctx.beginPath(); plot.ctx.ellipse(sx, sy, rx * px1, ry * py1, 0, 0, Math.PI * 2); plot.ctx.stroke();
      plot.ctx.restore();
    }

    function drawMain() {
      plot.clear();
      if (model) drawHeat();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      for (const lab of [0, 1]) {
        const c = model && model[lab]; if (!c) continue;
        const sx = Math.sqrt(c.vx), sy = Math.sqrt(c.vy);
        ellipse(c.mx, c.my, sx, sy, CLASS_COLORS[lab], 2);
        ellipse(c.mx, c.my, 2 * sx, 2 * sy, CLASS_COLORS[lab] + "88", 1.2);
        plot.point(c.mx, c.my, { r: 4, color: CLASS_COLORS[lab], stroke: "#fff", width: 1.5 });
      }
      for (const p of points) plot.point(p.x, p.y, { r: 5, color: CLASS_COLORS[p.label], stroke: "#0e1014", width: 1.3 });
    }

    function drawDists() {
      const w = distC.width, h = distC.height;
      dctx.fillStyle = COLORS.panel; dctx.fillRect(0, 0, w, h);
      const panel = (top, feat, key, vkey, label) => {
        const ph = h / 2 - 12, py0 = top + ph;
        dctx.strokeStyle = COLORS.axis; dctx.beginPath(); dctx.moveTo(30, py0); dctx.lineTo(w - 10, py0); dctx.stroke();
        dctx.fillStyle = feat ? COLORS.text : COLORS.gray; dctx.font = "11px system-ui"; dctx.textAlign = "left"; dctx.textBaseline = "top";
        dctx.fillText(label + (feat ? "" : "  (off)"), 32, top + 2);
        if (!model) return;
        let peak = 1e-6;
        for (const lab of [0, 1]) { const c = model[lab]; if (c) peak = Math.max(peak, normN(c[key], c[key], c[vkey])); }
        for (const lab of [0, 1]) {
          const c = model[lab]; if (!c) continue;
          dctx.strokeStyle = feat ? CLASS_COLORS[lab] : CLASS_COLORS[lab] + "55"; dctx.lineWidth = 2; dctx.beginPath();
          for (let i = 0; i <= 120; i++) {
            const v = xb.min + (xb.max - xb.min) * i / 120;
            const x = 30 + (w - 40) * i / 120;
            const yv = py0 - (ph - 6) * (normN(v, c[key], c[vkey]) / peak);
            i ? dctx.lineTo(x, yv) : dctx.moveTo(x, yv);
          }
          dctx.stroke();
        }
      };
      panel(8, useF1, "mx", "vx", "Feature 1 likelihoods");
      panel(h / 2 + 4, useF2, "my", "vy", "Feature 2 likelihoods");
    }

    function metrics() {
      if (!points.length || !model) { [mAcc, mP0, mP1].forEach((f) => f("–")); mFeat(featLabel()); return; }
      let correct = 0;
      for (const p of points) { const pred = pClass1(p.x, p.y) >= 0.5 ? 1 : 0; if (pred === p.label) correct++; }
      mAcc((100 * correct / points.length).toFixed(1) + "%");
      mP0(model[0] ? model[0].prior.toFixed(2) : "0");
      mP1(model[1] ? model[1].prior.toFixed(2) : "0");
      mFeat(featLabel());
    }
    function featLabel() { return [useF1 && "f1", useF2 && "f2"].filter(Boolean).join(" + ") || "none"; }

    function render() { fit(); drawMain(); drawDists(); metrics(); }

    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y, label: addClass }),
      onChange: render,
    }));

    const classBtns = ui.buttonRow(panels.data, [
      { label: "Add Class 0", onClick: () => setAdd(0) },
      { label: "Add Class 1", onClick: () => setAdd(1) },
    ]);
    function setAdd(c) { addClass = c; classBtns.forEach((b, i) => b.classList.toggle("active", i === c)); }
    setAdd(0);
    ui.buttonRow(panels.data, [
      { label: "Randomize", onClick: () => { points = data.twoClasses(20, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.6 }); render(); } },
      { label: "Clear", kind: "danger", onClick: () => { points = []; model = null; render(); } },
    ]);

    ui.toggle(panels.hyper, { label: "Use feature 1", value: true, onChange: (v) => { useF1 = v; render(); } });
    ui.toggle(panels.hyper, { label: "Use feature 2", value: true, onChange: (v) => { useF2 = v; render(); } });
    ui.slider(panels.hyper, { label: "Variance smoothing", min: 0.05, max: 3, step: 0.05, value: smoothing, format: (v) => v.toFixed(2), onInput: (v) => { smoothing = v; render(); } });
    ui.note(panels.hyper, "Turn off a feature and watch the boundary collapse onto the other axis — you can see exactly how much each feature was contributing.");

    render();
  },
});
