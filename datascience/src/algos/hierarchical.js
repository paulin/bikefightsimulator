"use strict";

// Hierarchical (agglomerative) clustering — repeatedly merge the two closest
// clusters, building a tree of nested groupings. Main view: points colored by
// the clusters at the current cut. Internal view: the dendrogram, with a movable
// cut line that decides how many clusters you get.
DSP.register({
  id: "hierarchical",
  name: "Hierarchical Clustering",
  phase: "Phase 3 — Unsupervised",
  status: "ready",
  blurb: "Merge nearest clusters bottom-up; cut the tree to choose how many.",
  intuition: "Clusters exist at every scale at once. The dendrogram records the whole merge history; where you cut it — high or low — is what fixes the number of clusters.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = data.blobs(3, 5, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 0.8 }).map((p) => ({ x: p.x, y: p.y }));
    let linkage = "average";
    let cut = 3;
    let root = null, maxH = 1;

    const mainC = canvas(panels.viz, 460, 460);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Click to add a point · drag to move · shift-click to remove. (Keep it under ~20 points so the dendrogram stays readable.)");

    const dendC = canvas(panels.internal, 560, 320);
    const dctx = dendC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Dendrogram";
    ui.note(panels.internal, "Bar height = the distance at which two groups merged. The dashed cut line slides with the threshold; everything joined below it is one cluster.");

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function build() {
      const n = points.length;
      if (n === 0) { root = null; maxH = 1; return; }
      // active clusters: each a tree node {leaf, idx, members, x, height}
      let nodes = points.map((p, i) => ({ leaf: true, idx: i, members: [i], height: 0 }));
      function linkDist(A, B) {
        let agg = linkage === "single" ? Infinity : (linkage === "complete" ? -Infinity : 0);
        for (const a of A.members) for (const b of B.members) {
          const d = dist(points[a], points[b]);
          if (linkage === "single") agg = Math.min(agg, d);
          else if (linkage === "complete") agg = Math.max(agg, d);
          else agg += d;
        }
        return linkage === "average" ? agg / (A.members.length * B.members.length) : agg;
      }
      maxH = 1;
      while (nodes.length > 1) {
        let bi = 0, bj = 1, bd = Infinity;
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
          const d = linkDist(nodes[i], nodes[j]); if (d < bd) { bd = d; bi = i; bj = j; }
        }
        const a = nodes[bi], b = nodes[bj];
        const merged = { leaf: false, left: a, right: b, members: a.members.concat(b.members), height: bd };
        maxH = Math.max(maxH, bd);
        nodes = nodes.filter((_, k) => k !== bi && k !== bj);
        nodes.push(merged);
      }
      root = nodes[0];
    }

    // Assign clusters at the current cut; returns leafCluster[] (index per point).
    function clustersAtCut() {
      const leafCluster = new Array(points.length).fill(0);
      let c = -1;
      (function assign(node) {
        if (!node) return;
        if (node.leaf || node.height <= cut) { c++; node.members.forEach((m) => { leafCluster[m] = c; }); }
        else { assign(node.left); assign(node.right); }
      })(root);
      return { leafCluster, k: c + 1 };
    }

    const mK = ui.metric(panels.metrics, "Clusters at cut");
    const mLink = ui.metric(panels.metrics, "Linkage");
    const mCut = ui.metric(panels.metrics, "Cut distance");
    const mMax = ui.metric(panels.metrics, "Tallest merge");

    function drawMain(leafCluster) {
      plot.clear();
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      for (let i = 0; i < points.length; i++) plot.point(points[i].x, points[i].y, { r: 5.5, color: CLASS_COLORS[leafCluster[i] % CLASS_COLORS.length], stroke: "#0e1014", width: 1.3 });
    }

    function drawDendro(leafCluster) {
      const w = dendC.width, h = dendC.height, pad = 30, padTop = 16;
      dctx.fillStyle = COLORS.panel; dctx.fillRect(0, 0, w, h);
      if (!root) return;
      // leaf order via in-order traversal
      const order = []; (function walk(n) { if (n.leaf) order.push(n.idx); else { walk(n.left); walk(n.right); } })(root);
      const pos = {}; order.forEach((idx, i) => { pos[idx] = i; });
      const L = order.length;
      const X = (node) => node.leaf ? pad + (w - 2 * pad) * (L === 1 ? 0.5 : pos[node.idx] / (L - 1)) : (X(node.left) + X(node.right)) / 2;
      const Y = (height) => (h - pad) - (h - pad - padTop) * (height / (maxH * 1.05));
      function draw(node) {
        if (node.leaf) return { x: X(node), y: h - pad };
        const l = draw(node.left), r = draw(node.right);
        const yy = Y(node.height);
        const col = node.height <= cut ? CLASS_COLORS[leafCluster[node.members[0]] % CLASS_COLORS.length] : COLORS.gray;
        dctx.strokeStyle = col; dctx.lineWidth = 1.8; dctx.beginPath();
        dctx.moveTo(l.x, l.y); dctx.lineTo(l.x, yy); dctx.lineTo(r.x, yy); dctx.lineTo(r.x, r.y); dctx.stroke();
        return { x: (l.x + r.x) / 2, y: yy };
      }
      draw(root);
      // cut line
      const cy = Y(cut);
      dctx.strokeStyle = COLORS.error; dctx.setLineDash([5, 4]); dctx.lineWidth = 1.5;
      dctx.beginPath(); dctx.moveTo(pad - 6, cy); dctx.lineTo(w - 6, cy); dctx.stroke(); dctx.setLineDash([]);
      dctx.fillStyle = COLORS.error; dctx.font = "11px system-ui"; dctx.textAlign = "left"; dctx.textBaseline = "bottom";
      dctx.fillText("cut = " + cut.toFixed(1), pad - 6, cy - 2);
    }

    function render() {
      if (!root && points.length) build();
      if (!points.length) { plot.clear(); plot.grid({ xStep: 2, yStep: 2 }); dctx.fillStyle = COLORS.panel; dctx.fillRect(0, 0, dendC.width, dendC.height); [mK, mMax].forEach((f) => f("–")); mLink(linkage); mCut(cut.toFixed(1)); return; }
      const { leafCluster, k } = clustersAtCut();
      drawMain(leafCluster); drawDendro(leafCluster);
      mK(k); mLink(linkage); mCut(cut.toFixed(1)); mMax(maxH.toFixed(2));
    }
    function rebuild() { build(); render(); }

    ctx.onCleanup(ctx.enablePointEditing(plot, points, {
      onAdd: (x, y) => points.push({ x, y }),
      onChange: rebuild,
    }));

    ui.buttonRow(panels.data, [
      { label: "3 blobs", onClick: () => { points = data.blobs(3, 5, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 0.8 }).map((p) => ({ x: p.x, y: p.y })); rebuild(); } },
      { label: "Scatter", onClick: () => { points = []; for (let i = 0; i < 14; i++) points.push({ x: ctx.lerp(xb.min + 1, xb.max - 1, Math.random()), y: ctx.lerp(xb.ymin + 1, xb.ymax - 1, Math.random()) }); rebuild(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "Clear", kind: "danger", onClick: () => { points = []; root = null; render(); } }]);

    ui.select(panels.hyper, { label: "Linkage", options: [{ value: "single", label: "Single (nearest)" }, { value: "complete", label: "Complete (farthest)" }, { value: "average", label: "Average" }], value: linkage, onChange: (v) => { linkage = v; rebuild(); } });
    ui.slider(panels.hyper, { label: "Cut distance", min: 0, max: 16, step: 0.1, value: cut, format: (v) => v.toFixed(1), onInput: (v) => { cut = v; render(); } });
    ui.note(panels.hyper, "Single linkage chains clusters along stepping-stones; complete linkage keeps them compact. Slide the cut to read off a different number of clusters.");

    rebuild();
  },
});
