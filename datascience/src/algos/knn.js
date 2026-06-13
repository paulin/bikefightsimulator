"use strict";

// K-Nearest Neighbors — drag a query point around and watch which neighbors get
// to vote on its class. Main view: labeled points + query + lines to its K
// nearest + optional decision regions. Internal view: the vote tally.
DSP.register({
  id: "knn",
  name: "K-Nearest Neighbors",
  phase: "Phase 1 — Foundations",
  status: "ready",
  blurb: "Classify a point by asking its K closest neighbors to vote.",
  intuition: "There is no model — just the data. A point becomes whatever most of its nearest neighbors are. Small K is jumpy and local; large K is smooth and global.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.twoClasses(18, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.6 });
    let query = { x: 6, y: 6 };
    let K = 5;
    let weighted = false;
    let showRegions = true;
    let addClass = 0;
    let regionCache = null;       // ImageData, invalidated on data / K / weighting change

    const mainC = canvas(panels.viz, 480, 480);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Drag the orange query point · click empty space to add a training point · shift-click to remove.");

    const voteC = canvas(panels.internal, 480, 200);
    const vctx = voteC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Neighbor Votes";
    ui.note(panels.internal, "The K nearest neighbors, nearest at the top. Bar length = how much that neighbor's vote counts.");

    function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

    function classify(qx, qy, exclude) {
      const ds = [];
      for (let i = 0; i < points.length; i++) {
        if (i === exclude) continue;
        ds.push({ i, d: dist(qx, qy, points[i].x, points[i].y), label: points[i].label });
      }
      ds.sort((a, b) => a.d - b.d);
      const near = ds.slice(0, Math.min(K, ds.length));
      const votes = {};
      for (const n of near) {
        const w = weighted ? 1 / (n.d * n.d + 1e-6) : 1;
        votes[n.label] = (votes[n.label] || 0) + w;
      }
      let best = null, bestV = -1;
      for (const k in votes) if (votes[k] > bestV) { bestV = votes[k]; best = Number(k); }
      return { label: best, votes, near };
    }

    function classColor(label, alpha) {
      const hex = CLASS_COLORS[label % CLASS_COLORS.length];
      if (alpha === undefined) return hex;
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${bl},${alpha})`;
    }

    function buildRegions() {
      const w = mainC.width, h = mainC.height, cell = 8;
      const img = vctx.createImageData(w, h); // borrow a context for the buffer
      // Classify a coarse grid, then expand into the pixel buffer.
      for (let py = 0; py < h; py += cell) {
        for (let px = 0; px < w; px += cell) {
          const cls = classify(plot.dx(px + cell / 2), plot.dy(py + cell / 2), -1).label;
          if (cls === null) continue;
          const hex = CLASS_COLORS[cls % CLASS_COLORS.length];
          const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
          for (let yy = py; yy < Math.min(py + cell, h); yy++) {
            for (let xx = px; xx < Math.min(px + cell, w); xx++) {
              const o = (yy * w + xx) * 4;
              img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = bl; img.data[o + 3] = 40;
            }
          }
        }
      }
      regionCache = img;
    }

    const mLabel = ui.metric(panels.metrics, "Predicted class");
    const mVotes = ui.metric(panels.metrics, "Vote split");
    const mK = ui.metric(panels.metrics, "Effective K");
    const mAcc = ui.metric(panels.metrics, "Train accuracy (LOO)");

    function looAccuracy() {
      if (points.length < 2) return 0;
      let correct = 0;
      for (let i = 0; i < points.length; i++) {
        if (classify(points[i].x, points[i].y, i).label === points[i].label) correct++;
      }
      return correct / points.length;
    }

    function render() {
      const res = classify(query.x, query.y, -1);
      // main
      plot.clear();
      if (showRegions) { if (!regionCache) buildRegions(); plot.ctx.putImageData(regionCache, 0, 0); }
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      // lines to neighbors
      for (const n of res.near) {
        plot.line(query.x, query.y, points[n.i].x, points[n.i].y, { color: COLORS.gray, width: 1, dash: [4, 3] });
      }
      // training points (highlight chosen neighbors)
      for (let i = 0; i < points.length; i++) {
        const isNeighbor = res.near.some((n) => n.i === i);
        plot.point(points[i].x, points[i].y, {
          r: isNeighbor ? 7 : 5,
          color: classColor(points[i].label),
          stroke: isNeighbor ? "#fff" : "#0e1014",
          width: isNeighbor ? 2 : 1.2,
        });
      }
      // query point, outlined in its predicted class color
      plot.point(query.x, query.y, { r: 8, color: COLORS.select, stroke: res.label !== null ? classColor(res.label) : "#fff", width: 3 });

      drawVotes(res);

      // metrics
      mLabel(res.label === null ? "–" : `Class ${res.label}`);
      const split = Object.keys(res.votes).sort().map((k) => `${k}:${res.votes[k].toFixed(weighted ? 2 : 0)}`).join("  ");
      mVotes(split || "–");
      mK(Math.min(K, Math.max(points.length - 0, 0)));
      mAcc((looAccuracy() * 100).toFixed(1) + "%");
    }

    function drawVotes(res) {
      const w = voteC.width, h = voteC.height;
      vctx.fillStyle = COLORS.panel; vctx.fillRect(0, 0, w, h);
      const rows = res.near;
      if (!rows.length) return;
      const maxW = weighted ? Math.max(...rows.map((n) => 1 / (n.d * n.d + 1e-6))) : 1;
      const rowH = Math.min(26, (h - 16) / rows.length);
      vctx.font = "12px system-ui";
      rows.forEach((n, idx) => {
        const y = 8 + idx * rowH;
        const wgt = weighted ? 1 / (n.d * n.d + 1e-6) : 1;
        const barW = (w - 150) * (wgt / maxW);
        vctx.fillStyle = classColor(points[n.i].label, 0.85);
        vctx.fillRect(120, y + 2, Math.max(2, barW), rowH - 6);
        vctx.fillStyle = COLORS.text; vctx.textAlign = "left"; vctx.textBaseline = "middle";
        vctx.fillText(`#${idx + 1}  d=${n.d.toFixed(2)}  cls ${points[n.i].label}`, 8, y + rowH / 2);
      });
    }

    // --- interaction (query takes priority over training points) ---
    let dragging = null; // 'query' | index
    const near = (m, x, y) => Math.hypot(plot.px(x) - m.px, plot.py(y) - m.py) <= 11;
    function down(ev) {
      const m = plot.mouse(ev);
      if (near(m, query.x, query.y)) { dragging = "query"; return; }
      let hit = -1;
      for (let i = points.length - 1; i >= 0; i--) if (near(m, points[i].x, points[i].y)) { hit = i; break; }
      if (ev.shiftKey || ev.button === 2) { if (hit >= 0) { points.splice(hit, 1); invalidate(); } ev.preventDefault(); return; }
      if (hit >= 0) { dragging = hit; return; }
      points.push({ x: ctx.clamp(plot.dx(m.px), xb.min, xb.max), y: ctx.clamp(plot.dy(m.py), xb.ymin, xb.ymax), label: addClass });
      invalidate();
    }
    function move(ev) {
      if (dragging === null) return;
      const m = plot.mouse(ev);
      const x = ctx.clamp(plot.dx(m.px), xb.min, xb.max), y = ctx.clamp(plot.dy(m.py), xb.ymin, xb.ymax);
      if (dragging === "query") { query.x = x; query.y = y; }
      else { points[dragging].x = x; points[dragging].y = y; invalidate(); }
    }
    function up() { dragging = null; }
    function invalidate() { regionCache = null; }
    mainC.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    mainC.addEventListener("contextmenu", (e) => e.preventDefault());
    ctx.onCleanup(() => { mainC.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); });

    // --- controls ---
    const classBtns = ui.buttonRow(panels.data, [
      { label: "Add Class 0", onClick: () => setAddClass(0) },
      { label: "Add Class 1", onClick: () => setAddClass(1) },
    ]);
    function setAddClass(c) { addClass = c; classBtns.forEach((b, i) => b.classList.toggle("active", i === c)); }
    setAddClass(0);
    ui.buttonRow(panels.data, [
      { label: "Randomize", onClick: () => { points = data.twoClasses(18, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.6 }); invalidate(); } },
      { label: "Add 3rd class", onClick: () => { const b = data.blobs(1, 14, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.2 }); b.forEach((p) => p.label = 2); points.push(...b); invalidate(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "Clear", kind: "danger", onClick: () => { points = []; invalidate(); } }]);

    ui.slider(panels.hyper, { label: "K (neighbors)", min: 1, max: 25, step: 1, value: K, onInput: (v) => { K = v; invalidate(); } });
    ui.toggle(panels.hyper, { label: "Distance weighting (closer = louder)", value: false, onChange: (v) => { weighted = v; invalidate(); } });
    ui.toggle(panels.hyper, { label: "Show decision regions", value: true, onChange: (v) => { showRegions = v; } });
    ui.note(panels.hyper, "Slide K up and watch the colored regions go from jagged islands to smooth territories.");

    let raf = requestAnimationFrame(function loop() { render(); raf = requestAnimationFrame(loop); });
    ctx.onCleanup(() => cancelAnimationFrame(raf));
  },
});
