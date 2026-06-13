"use strict";

// Neural Network — a small multilayer perceptron trained by backprop on 2D
// classification. Main view: the (often nonlinear) decision boundary bending to
// fit the data. Internal view: the live network graph — weighted edges and, for
// whatever point you hover, the activation flowing through each neuron.
DSP.register({
  id: "neural-network",
  name: "Neural Network",
  phase: "Phase 4 — Deep Learning",
  status: "ready",
  blurb: "Stack simple nonlinear units to learn curved decision boundaries.",
  intuition: "One layer can only draw a straight line. Stack a hidden layer of squashed weighted sums and the network can bend, fold, and carve the space into whatever shape the data needs.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS, CLASS_COLORS } = ctx;

    const xb = { min: 0, max: 12, ymin: 0, ymax: 12 };
    let points = circles();
    let hidden = 6, layers2 = true, act = "tanh", lr = 0.1;
    let running = false, epochs = 0, net = null, hover = null;

    // --- datasets (scaled later to ~[-1,1]) ---
    function circles() { const p = []; for (let i = 0; i < 120; i++) { const a = Math.random() * 6.283, r = Math.random() * 5.5; const x = 6 + r * Math.cos(a), y = 6 + r * Math.sin(a); p.push({ x, y, label: r < 2.6 ? 0 : 1 }); } return p; }
    function xor() { const p = []; for (let i = 0; i < 120; i++) { const x = Math.random() * 12, y = Math.random() * 12; p.push({ x, y, label: (x < 6) === (y < 6) ? 0 : 1 }); } return p; }
    function blobs() { return data.twoClasses(40, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax, spread: 1.4 }); }
    function spiral() { const p = []; for (let c = 0; c < 2; c++) for (let i = 0; i < 60; i++) { const t = i / 60 * 3.2, r = 0.4 + t * 1.5; const a = t * 2 + c * Math.PI; p.push({ x: 6 + r * Math.cos(a), y: 6 + r * Math.sin(a), label: c }); } return p; }

    const sx = (x) => (x - 6) / 4, sy = (y) => (y - 6) / 4;

    const mainC = canvas(panels.viz, 460, 460);
    const plot = new Plot(mainC, { xMin: xb.min, xMax: xb.max, yMin: xb.ymin, yMax: xb.ymax });
    ui.note(panels.viz, "Hover the canvas to trace that input through the network · click to add · shift-click to remove.");

    const netC = canvas(panels.internal, 560, 360);
    const nctx = netC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Network Graph (edges = weights, fill = activation)";
    ui.note(panels.internal, "Blue edges are positive weights, red negative, thickness = magnitude. Node brightness is its activation for the hovered input. The boundary is everything downstream of these.");

    // --- tiny MLP ---
    function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); }
    function makeNet() {
      const sizes = layers2 ? [2, hidden, hidden, 1] : [2, hidden, 1];
      const W = [], b = [];
      for (let l = 1; l < sizes.length; l++) {
        const fin = sizes[l - 1], scale = Math.sqrt(2 / fin);
        W.push(Array.from({ length: sizes[l] }, () => Array.from({ length: fin }, () => randn() * scale)));
        b.push(new Array(sizes[l]).fill(0));
      }
      net = { sizes, W, b };
      epochs = 0;
    }
    const actf = (z) => act === "relu" ? Math.max(0, z) : Math.tanh(z);
    const actd = (z, a) => act === "relu" ? (z > 0 ? 1 : 0) : (1 - a * a);
    const sig = (z) => 1 / (1 + Math.exp(-z));

    function forward(input) {
      const A = [input.slice()], Z = [null];
      for (let l = 0; l < net.W.length; l++) {
        const last = l === net.W.length - 1, z = [], a = [];
        for (let i = 0; i < net.W[l].length; i++) {
          let s = net.b[l][i]; const row = net.W[l][i], prev = A[l];
          for (let j = 0; j < row.length; j++) s += row[j] * prev[j];
          z.push(s); a.push(last ? sig(s) : actf(s));
        }
        Z.push(z); A.push(a);
      }
      return { A, Z };
    }
    const prob = (x, y) => forward([sx(x), sy(y)]).A[net.W.length][0];

    function trainStep() {
      if (points.length < 2) return;
      const gW = net.W.map((m) => m.map((r) => r.map(() => 0)));
      const gB = net.b.map((v) => v.map(() => 0));
      for (const p of points) {
        const { A, Z } = forward([sx(p.x), sy(p.y)]);
        const Lc = net.W.length;
        // output delta (BCE + sigmoid)
        let delta = [A[Lc][0] - p.label];
        for (let l = Lc - 1; l >= 0; l--) {
          for (let i = 0; i < net.W[l].length; i++) { gB[l][i] += delta[i]; for (let j = 0; j < net.W[l][i].length; j++) gW[l][i][j] += delta[i] * A[l][j]; }
          if (l > 0) {
            const prevDelta = new Array(A[l].length).fill(0);
            for (let j = 0; j < A[l].length; j++) { let s = 0; for (let i = 0; i < net.W[l].length; i++) s += net.W[l][i][j] * delta[i]; prevDelta[j] = s * actd(Z[l][j], A[l][j]); }
            delta = prevDelta;
          }
        }
      }
      const n = points.length;
      for (let l = 0; l < net.W.length; l++) { for (let i = 0; i < net.W[l].length; i++) { net.b[l][i] -= lr * gB[l][i] / n; for (let j = 0; j < net.W[l][i].length; j++) net.W[l][i][j] -= lr * gW[l][i][j] / n; } }
      epochs++;
    }

    const mAcc = ui.metric(panels.metrics, "Accuracy");
    const mLoss = ui.metric(panels.metrics, "Loss");
    const mArch = ui.metric(panels.metrics, "Architecture");
    const mEpochs = ui.metric(panels.metrics, "Epochs");

    function blend(p) {
      const A = CLASS_COLORS[0], B = CLASS_COLORS[1];
      const ha = [parseInt(A.slice(1, 3), 16), parseInt(A.slice(3, 5), 16), parseInt(A.slice(5, 7), 16)];
      const hb = [parseInt(B.slice(1, 3), 16), parseInt(B.slice(3, 5), 16), parseInt(B.slice(5, 7), 16)];
      return [0, 1, 2].map((i) => Math.round(ha[i] * (1 - p) + hb[i] * p));
    }
    function drawMain() {
      plot.clear();
      const w = mainC.width, h = mainC.height, cell = 10, img = plot.ctx.createImageData(w, h);
      for (let py = 0; py < h; py += cell) for (let px = 0; px < w; px += cell) {
        const pr = prob(plot.dx(px + cell / 2), plot.dy(py + cell / 2)); const [r, g, b] = blend(pr);
        for (let yy = py; yy < Math.min(py + cell, h); yy++) for (let xx = px; xx < Math.min(px + cell, w); xx++) { const o = (yy * w + xx) * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 60; }
      }
      plot.ctx.putImageData(img, 0, 0);
      plot.grid({ xStep: 2, yStep: 2, xLabel: "feature 1", yLabel: "feature 2" });
      for (const p of points) plot.point(p.x, p.y, { r: 4, color: CLASS_COLORS[p.label], stroke: "#0e1014", width: 1 });
    }

    function drawNet() {
      nctx.fillStyle = COLORS.panel; nctx.fillRect(0, 0, netC.width, netC.height);
      const sizes = net.sizes, w = netC.width, h = netC.height, padX = 50;
      const colX = sizes.map((_, l) => padX + (w - 2 * padX) * (sizes.length === 1 ? 0.5 : l / (sizes.length - 1)));
      const nodeY = (l, i) => { const n = sizes[l]; return (h) * (i + 1) / (n + 1); };
      // activations for hovered point (or dataset centroid)
      const hp = hover || { x: 6, y: 6 };
      const { A } = forward([sx(hp.x), sy(hp.y)]);
      // edges
      for (let l = 0; l < net.W.length; l++) {
        let maxW = 1e-6; net.W[l].forEach((r) => r.forEach((v) => maxW = Math.max(maxW, Math.abs(v))));
        for (let i = 0; i < net.W[l].length; i++) for (let j = 0; j < net.W[l][i].length; j++) {
          const v = net.W[l][i][j];
          nctx.strokeStyle = v >= 0 ? "rgba(111,195,255," + (0.15 + 0.6 * Math.abs(v) / maxW) + ")" : "rgba(229,115,107," + (0.15 + 0.6 * Math.abs(v) / maxW) + ")";
          nctx.lineWidth = 0.5 + 3 * Math.abs(v) / maxW;
          nctx.beginPath(); nctx.moveTo(colX[l], nodeY(l, j)); nctx.lineTo(colX[l + 1], nodeY(l + 1, i)); nctx.stroke();
        }
      }
      // nodes
      const labels = ["f1", "f2"];
      for (let l = 0; l < sizes.length; l++) for (let i = 0; i < sizes[l]; i++) {
        const aVal = A[l] ? A[l][i] : 0, t = Math.min(1, Math.abs(aVal));
        nctx.beginPath(); nctx.arc(colX[l], nodeY(l, i), 11, 0, 6.283);
        nctx.fillStyle = `rgba(143,209,143,${0.2 + 0.8 * t})`; nctx.fill();
        nctx.strokeStyle = COLORS.axis; nctx.lineWidth = 1; nctx.stroke();
        if (l === 0) { nctx.fillStyle = COLORS.text; nctx.font = "10px system-ui"; nctx.textAlign = "center"; nctx.textBaseline = "middle"; nctx.fillText(labels[i] || "", colX[l], nodeY(l, i)); }
        if (l === sizes.length - 1) { nctx.fillStyle = COLORS.textBright; nctx.font = "10px system-ui"; nctx.textAlign = "center"; nctx.textBaseline = "middle"; nctx.fillText(aVal.toFixed(2), colX[l], nodeY(l, i)); }
      }
      nctx.fillStyle = COLORS.gray; nctx.font = "11px system-ui"; nctx.textAlign = "center"; nctx.textBaseline = "top";
      sizes.forEach((s, l) => nctx.fillText(l === 0 ? "input" : (l === sizes.length - 1 ? "output" : "hidden"), colX[l], 4));
    }

    function metrics() {
      mArch(net.sizes.join("–")); mEpochs(epochs);
      if (points.length < 2) { mAcc("–"); mLoss("–"); return; }
      let correct = 0, loss = 0;
      for (const p of points) { const pr = Math.min(1 - 1e-7, Math.max(1e-7, prob(p.x, p.y))); if ((pr >= 0.5 ? 1 : 0) === p.label) correct++; loss += -(p.label * Math.log(pr) + (1 - p.label) * Math.log(1 - pr)); }
      mAcc((100 * correct / points.length).toFixed(1) + "%"); mLoss((loss / points.length).toFixed(3));
    }

    function render() { drawMain(); drawNet(); metrics(); }

    let raf = requestAnimationFrame(function loop() {
      if (running) { for (let k = 0; k < 4; k++) trainStep(); }
      render(); raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    function onMove(ev) { const m = plot.mouse(ev); hover = { x: plot.dx(m.px), y: plot.dy(m.py) }; }
    mainC.addEventListener("mousemove", onMove);
    mainC.addEventListener("mouseleave", () => { hover = null; });
    ctx.onCleanup(() => mainC.removeEventListener("mousemove", onMove));

    let addClass = 0;
    ctx.onCleanup(ctx.enablePointEditing(plot, points, { onAdd: (x, y) => points.push({ x, y, label: addClass }) }));

    ui.buttonRow(panels.data, [
      { label: "Circles", onClick: () => { points = circles(); makeNet(); } },
      { label: "XOR", onClick: () => { points = xor(); makeNet(); } },
    ]);
    ui.buttonRow(panels.data, [
      { label: "Spiral", onClick: () => { points = spiral(); makeNet(); } },
      { label: "Blobs", onClick: () => { points = blobs(); makeNet(); } },
    ]);
    const classBtns = ui.buttonRow(panels.data, [
      { label: "Add Class 0", onClick: () => setAdd(0) },
      { label: "Add Class 1", onClick: () => setAdd(1) },
    ]);
    function setAdd(c) { addClass = c; classBtns.forEach((b, i) => b.classList.toggle("active", i === c)); }
    setAdd(0);

    ui.slider(panels.hyper, { label: "Hidden layer width", min: 2, max: 12, step: 1, value: hidden, onInput: (v) => { hidden = v; makeNet(); } });
    ui.toggle(panels.hyper, { label: "Two hidden layers", value: true, onChange: (v) => { layers2 = v; makeNet(); } });
    ui.select(panels.hyper, { label: "Activation", options: [{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }], value: act, onChange: (v) => { act = v; makeNet(); } });
    ui.slider(panels.hyper, { label: "Learning rate", min: 0.01, max: 1, step: 0.01, value: lr, format: (v) => v.toFixed(2), onInput: (v) => { lr = v; } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Train", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Train"; } },
      { label: "Reset", onClick: () => { makeNet(); running = false; runBtn.textContent = "Train"; } },
    ]);
    ui.note(panels.hyper, "Try Circles or Spiral with too few hidden units — the boundary can't curve enough. Widen the layer and it suddenly can.");

    makeNet();
    render();
  },
});
