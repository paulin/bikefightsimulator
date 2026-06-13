"use strict";

// DBSCAN — clusters are dense regions linked through core points; everything too
// sparse is noise. Main view: points colored by cluster, the density graph of
// within-ε links, and the ε disk around whatever point you hover. Internal view:
// the core / border / noise breakdown.
DSP.register({
  id: "dbscan",
  name: "DBSCAN",
  phase: "Phase 3 — Unsupervised",
  status: "ready",
  blurb: "Grow clusters from dense cores; leave sparse points as noise.",
  intuition: "No K to choose. A point is 'core' if at least MinPts neighbors sit within ε; cores chain together into clusters and drag their border points along. Anything left over is noise.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = makeData();
    let eps = 1.2, minPts = 4;
    let hover = null;
    let result = null;

    function makeData() {
      const p = data.blobs(3, 16, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 0.7 });
      for (let i = 0; i < 12; i++) p.push({ x: ctx.lerp(xb.min, xb.max, Math.random()), y: ctx.lerp(xb.ymin, xb.ymax, Math.random()), label: -1 });
      return p.map((q) => ({ x: q.x, y: q.y }));
    }

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Hover a point to see its ε neighborhood · click to add · drag to move · shift-click to remove.");

    const barC = canvas(panels.internal, 480, 180);
    const bctx = barC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Point Types";
    ui.note(panels.internal, "Core points have a full ε-neighborhood and seed clusters. Border points are reachable from a core but not dense themselves. Noise is neither.");

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function run() {
      const n = points.length;
      const neighbors = points.map((p, i) => { const a = []; for (let j = 0; j < n; j++) if (i !== j && dist(p, points[j]) <= eps) a.push(j); return a; });
      const isCore = neighbors.map((a) => a.length + 1 >= minPts);
      const cluster = new Array(n).fill(-1); // -1 unvisited/noise
      let c = -1;
      for (let i = 0; i < n; i++) {
        if (cluster[i] !== -1 || !isCore[i]) continue;
        c++; cluster[i] = c;
        const queue = [...neighbors[i]];
        while (queue.length) {
          const j = queue.shift();
          if (cluster[j] === -1) cluster[j] = c;       // border or to-expand
          else continue;
          if (isCore[j]) for (const k of neighbors[j]) if (cluster[k] === -1) queue.push(k);
        }
      }
      // classify type
      const type = points.map((_, i) => cluster[i] === -1 ? "noise" : (isCore[i] ? "core" : "border"));
      result = { neighbors, isCore, cluster, type, nClusters: c + 1 };
    }

    const mClusters = ui.metric(panels.metrics, "Clusters found");
    const mCore = ui.metric(panels.metrics, "Core points");
    const mBorder = ui.metric(panels.metrics, "Border points");
    const mNoise = ui.metric(panels.metrics, "Noise points");
    const mEps = ui.metric(panels.metrics, "ε / MinPts");

    function clusterColor(cl) { return cl < 0 ? COLORS.gray : CLASS_COLORS[cl % CLASS_COLORS.length]; }

    function drawMain() {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      // density edges (within eps), faint
      plot.ctx.strokeStyle = "rgba(120,130,150,0.18)"; plot.ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i++) for (const j of result.neighbors[i]) if (j > i) {
        plot.ctx.beginPath(); plot.ctx.moveTo(plot.px(points[i].x), plot.py(points[i].y)); plot.ctx.lineTo(plot.px(points[j].x), plot.py(points[j].y)); plot.ctx.stroke();
      }
      // hover epsilon disk
      if (hover != null && points[hover]) {
        const sx = plot.px(points[hover].x), sy = plot.py(points[hover].y);
        const rpx = eps * (plot.px(1) - plot.px(0));
        plot.ctx.beginPath(); plot.ctx.arc(sx, sy, rpx, 0, Math.PI * 2);
        plot.ctx.fillStyle = "rgba(111,195,255,0.10)"; plot.ctx.fill();
        plot.ctx.strokeStyle = COLORS.train; plot.ctx.lineWidth = 1.5; plot.ctx.stroke();
      }
      for (let i = 0; i < points.length; i++) {
        const t = result.type[i];
        plot.point(points[i].x, points[i].y, {
          r: t === "core" ? 6 : 5,
          color: t === "noise" ? COLORS.gray : clusterColor(result.cluster[i]),
          stroke: t === "core" ? "#fff" : (t === "noise" ? COLORS.error : "#0e1014"),
          width: t === "core" ? 2 : 1.3,
        });
      }
    }

    function drawBars() {
      const w = barC.width, h = barC.height;
      bctx.fillStyle = COLORS.panel; bctx.fillRect(0, 0, w, h);
      const counts = { core: 0, border: 0, noise: 0 };
      result.type.forEach((t) => counts[t]++);
      const items = [["core", COLORS.train, "Core"], ["border", COLORS.predict, "Border"], ["noise", COLORS.gray, "Noise"]];
      const max = Math.max(1, counts.core, counts.border, counts.noise);
      const bw = (w - 80) , x0 = 70;
      items.forEach(([k, col, label], i) => {
        const y = 24 + i * 46;
        bctx.fillStyle = COLORS.text; bctx.font = "12px system-ui"; bctx.textAlign = "right"; bctx.textBaseline = "middle";
        bctx.fillText(label, x0 - 8, y);
        bctx.fillStyle = col; bctx.fillRect(x0, y - 11, Math.max(2, bw * counts[k] / max), 22);
        bctx.fillStyle = COLORS.textBright; bctx.textAlign = "left"; bctx.fillText(String(counts[k]), x0 + Math.max(2, bw * counts[k] / max) + 6, y);
      });
    }

    function metrics() {
      const counts = { core: 0, border: 0, noise: 0 };
      result.type.forEach((t) => counts[t]++);
      mClusters(result.nClusters); mCore(counts.core); mBorder(counts.border); mNoise(counts.noise);
      mEps(eps.toFixed(2) + " / " + minPts);
    }

    function render() { run(); drawMain(); drawBars(); metrics(); }

    // hover tracking
    function onMove(ev) {
      const m = plot.mouse(ev); let best = null, bd = 12 * 12;
      for (let i = 0; i < points.length; i++) { const d = (plot.px(points[i].x) - m.px) ** 2 + (plot.py(points[i].y) - m.py) ** 2; if (d < bd) { bd = d; best = i; } }
      hover = best; render();
    }
    mainC.addEventListener("mousemove", onMove);
    mainC.addEventListener("mouseleave", () => { hover = null; render(); });
    ctx.onCleanup(() => { mainC.removeEventListener("mousemove", onMove); });

    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y }),
      onChange: render,
    }));

    ui.buttonRow(panels.data, [
      { label: "Blobs + noise", onClick: () => { points = makeData(); render(); } },
      { label: "Clear", kind: "danger", onClick: () => { points = []; result = { neighbors: [], isCore: [], cluster: [], type: [], nClusters: 0 }; drawMain(); drawBars(); metrics(); } },
    ]);

    ui.slider(panels.hyper, { label: "ε (neighborhood radius)", min: 0.3, max: 4, step: 0.1, value: eps, format: (v) => v.toFixed(1), onInput: (v) => { eps = v; render(); } });
    ui.slider(panels.hyper, { label: "MinPts", min: 2, max: 12, step: 1, value: minPts, onInput: (v) => { minPts = v; render(); } });
    ui.note(panels.hyper, "Too small an ε and everything is noise; too large and separate blobs merge. MinPts controls how dense 'dense' has to be.");

    render();
  },
});
