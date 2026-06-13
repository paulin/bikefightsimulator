"use strict";

// PCA (2D) — find the directions the data varies most, rotate onto them, and see
// how much you'd lose by keeping only the first. Main view: the cloud with its
// principal axes (and optional projection onto PC1). Internal view: the same data
// rotated so the principal axes are horizontal/vertical (decorrelated scores).
DSP.register({
  id: "pca",
  name: "PCA",
  phase: "Phase 1 — Foundations",
  status: "ready",
  blurb: "Find the axes of greatest variance and reduce dimensions along them.",
  intuition: "Most of the information in correlated data lies in a few directions. PCA rotates onto those directions; dropping the smallest one is lossy compression you can see.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = correlatedCloud(0.8);
    let project1D = false;
    let showProj = true;

    function correlatedCloud(corr) {
      const pts = [];
      const cx = 6, cy = 6;
      for (let i = 0; i < 40; i++) {
        const a = data.gauss() * 2.6, b = data.gauss() * 1.0;
        // rotate the (a,b) ellipse by ~35° to make x,y correlated
        const ang = Math.PI * 0.22;
        pts.push({ x: cx + a * Math.cos(ang) - b * Math.sin(ang), y: cy + a * Math.sin(ang) + b * Math.cos(ang) });
      }
      return pts;
    }

    const mainC = canvas(panels.viz, 460, 460);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Drag points to reshape the cloud · click to add · shift-click to remove. The arrows are the principal axes.");

    const pcC = canvas(panels.internal, 460, 360);
    const pcPlot = new Plot(pcC, { xMin: -6, xMax: 6, yMin: -6, yMax: 6, pad: 34 });
    ctx.titles.internal.textContent = "Internal — Rotated onto Principal Axes";
    ui.note(panels.internal, "The same points expressed in PC1/PC2 coordinates. The cloud is now axis-aligned: PC1 (horizontal) holds the most spread.");

    function pca() {
      const n = points.length || 1;
      const mx = points.reduce((s, p) => s + p.x, 0) / n;
      const my = points.reduce((s, p) => s + p.y, 0) / n;
      let a = 0, b = 0, c = 0;
      for (const p of points) { const dx = p.x - mx, dy = p.y - my; a += dx * dx; b += dx * dy; c += dy * dy; }
      a /= n; b /= n; c /= n;
      const tr = a + c, det = a * c - b * b;
      const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      const vec = (l) => {
        let vx, vy;
        if (Math.abs(b) > 1e-9) { vx = l - c; vy = b; }
        else { vx = a >= c ? 1 : 0; vy = a >= c ? 0 : 1; }
        const len = Math.hypot(vx, vy) || 1; return [vx / len, vy / len];
      };
      const v1 = vec(l1), v2 = [-v1[1], v1[0]];
      return { mx, my, l1: Math.max(l1, 0), l2: Math.max(l2, 0), v1, v2 };
    }

    const mVar1 = ui.metric(panels.metrics, "Variance on PC1");
    const mVar2 = ui.metric(panels.metrics, "Variance on PC2");
    const mAngle = ui.metric(panels.metrics, "PC1 direction");
    const mRetain = ui.metric(panels.metrics, "Retained if 1D");

    function drawMain(p) {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "x", yLabel: "y" });
      const { mx, my, l1, l2, v1, v2 } = p;
      const s1 = Math.sqrt(l1) * 2.2, s2 = Math.sqrt(l2) * 2.2;
      // principal axes through the mean
      plot.line(mx - v1[0] * s1, my - v1[1] * s1, mx + v1[0] * s1, my + v1[1] * s1, { color: COLORS.update, width: 3 });
      plot.line(mx - v2[0] * s2, my - v2[1] * s2, mx + v2[0] * s2, my + v2[1] * s2, { color: COLORS.predict, width: 2 });
      plot.text(mx + v1[0] * s1, my + v1[1] * s1, " PC1", { color: COLORS.update, font: "12px system-ui" });
      plot.text(mx + v2[0] * s2, my + v2[1] * s2, " PC2", { color: COLORS.predict, font: "12px system-ui" });

      for (const pt of points) {
        if (showProj || project1D) {
          const t = (pt.x - mx) * v1[0] + (pt.y - my) * v1[1];
          const fx = mx + t * v1[0], fy = my + t * v1[1];
          plot.line(pt.x, pt.y, fx, fy, { color: COLORS.error, width: 1, dash: [3, 3] });
          if (project1D) plot.point(fx, fy, { r: 4, color: COLORS.predict, stroke: "#0e1014", width: 1 });
        }
        plot.point(pt.x, pt.y, { r: 4.5, color: project1D ? COLORS.gray : COLORS.train, stroke: "#0e1014", width: 1 });
      }
      plot.point(mx, my, { r: 5, color: COLORS.select, stroke: "#fff", width: 2 });
    }

    function drawPC(p) {
      const { mx, my, l1, l2, v1, v2 } = p;
      let maxAbs = 1;
      const scores = points.map((pt) => {
        const dx = pt.x - mx, dy = pt.y - my;
        const s = [dx * v1[0] + dy * v1[1], dx * v2[0] + dy * v2[1]];
        maxAbs = Math.max(maxAbs, Math.abs(s[0]), Math.abs(s[1]));
        return s;
      });
      const bound = Math.ceil(maxAbs + 0.5);
      pcPlot.setBounds(-bound, bound, -bound, bound);
      pcPlot.clear();
      pcPlot.grid({ xStep: 2, yStep: 2, xLabel: "PC1 score", yLabel: "PC2 score" });
      // PC axes
      pcPlot.line(-bound, 0, bound, 0, { color: COLORS.update, width: 2 });
      pcPlot.line(0, -bound, 0, bound, { color: COLORS.predict, width: 1.5 });
      scores.forEach((s) => {
        if (project1D) {
          pcPlot.line(s[0], s[1], s[0], 0, { color: COLORS.error, width: 1, dash: [3, 3] });
          pcPlot.point(s[0], 0, { r: 4, color: COLORS.predict, stroke: "#0e1014", width: 1 });
          pcPlot.point(s[0], s[1], { r: 3.5, color: COLORS.gray });
        } else {
          pcPlot.point(s[0], s[1], { r: 4, color: COLORS.train, stroke: "#0e1014", width: 1 });
        }
      });
    }

    function render() {
      const p = pca();
      drawMain(p); drawPC(p);
      const total = p.l1 + p.l2 || 1;
      mVar1((100 * p.l1 / total).toFixed(1) + "%");
      mVar2((100 * p.l2 / total).toFixed(1) + "%");
      const deg = Math.atan2(p.v1[1], p.v1[0]) * 180 / Math.PI;
      mAngle(deg.toFixed(0) + "°");
      mRetain((100 * p.l1 / total).toFixed(1) + "%");
    }

    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y }),
      onChange: render,
    }));

    ui.buttonRow(panels.data, [
      { label: "Strong correlation", onClick: () => { points = correlatedCloud(0.9); render(); } },
      { label: "Round blob", onClick: () => { points = []; for (let i = 0; i < 40; i++) points.push({ x: 6 + data.gauss() * 1.8, y: 6 + data.gauss() * 1.8 }); render(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "Clear", kind: "danger", onClick: () => { points = []; render(); } }]);

    ui.toggle(panels.hyper, { label: "Show projections onto PC1", value: true, onChange: (v) => { showProj = v; render(); } });
    ui.toggle(panels.hyper, { label: "Reduce to 1D (keep PC1 only)", value: false, onChange: (v) => { project1D = v; render(); } });
    ui.note(panels.hyper, "Stretch the cloud into a thin diagonal line: PC1's variance share shoots toward 100% and reducing to 1D loses almost nothing.");

    render();
  },
});
