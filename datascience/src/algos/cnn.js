"use strict";

// CNN — the convolution operation, made tangible. Paint an image, pick (or edit)
// a kernel, and watch the feature map light up where the kernel's pattern occurs.
// Internal view: the editable kernel and the exact dot-product under your cursor.
DSP.register({
  id: "cnn",
  name: "CNN",
  phase: "Phase 4 — Deep Learning",
  status: "ready",
  blurb: "Slide a small kernel over an image to detect local patterns.",
  intuition: "A convolution is one tiny pattern-matcher slid across the whole image, sharing its weights everywhere. Where the patch matches the kernel, the feature map lights up — patterns become features, features become objects.",

  mount(ctx) {
    const { panels, ui, canvas, COLORS } = ctx;

    const G = 16;
    let img = zeros();
    let K = kernels.sobelx.map((r) => r.slice());
    let relu = true, pool = false, brush = 1, hoverCell = null;

    function zeros() { return Array.from({ length: G }, () => new Array(G).fill(0)); }

    const mainC = canvas(panels.viz, 560, 300);
    const mctx = mainC.getContext("2d");
    ui.note(panels.viz, "Paint on the left image (drag) · right-click to erase. Hover the feature map to see which patch produced each value.");

    const kerC = canvas(panels.internal, 560, 280);
    const kctx = kerC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Kernel & Convolution Arithmetic";
    ui.note(panels.internal, "Left-click a kernel cell to raise its weight, right-click to lower it. The sum on the right is the patch under your cursor multiplied element-wise by this kernel.");

    function conv() {
      const out = [];
      for (let r = 0; r < G - 2; r++) { const row = []; for (let c = 0; c < G - 2; c++) { let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += img[r + i][c + j] * K[i][j]; row.push(relu ? Math.max(0, s) : s); } out.push(row); }
      if (!pool) return out;
      const P = [];
      for (let r = 0; r + 1 < out.length; r += 2) { const row = []; for (let c = 0; c + 1 < out[0].length; c += 2) row.push(Math.max(out[r][c], out[r][c + 1], out[r + 1][c], out[r + 1][c + 1])); P.push(row); }
      return P;
    }

    // layout regions in the main canvas
    const IN = { x: 14, y: 30, s: 250 };
    const FM = { x: 300, y: 30, s: 250 };

    function divColor(v, maxAbs) { const t = Math.min(1, Math.abs(v) / (maxAbs || 1)); return v >= 0 ? `rgb(${30 + 30 * t},${40 + 160 * t},${50 + 90 * t})` : `rgb(${40 + 180 * t},${40 * (1 - t) + 40},${50 * (1 - t) + 40})`; }

    function drawMain() {
      mctx.fillStyle = COLORS.panel; mctx.fillRect(0, 0, mainC.width, mainC.height);
      const cs = IN.s / G;
      // input
      for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) { const v = img[r][c]; mctx.fillStyle = `rgb(${Math.round(v * 220 + 20)},${Math.round(v * 220 + 20)},${Math.round(v * 230 + 25)})`; mctx.fillRect(IN.x + c * cs, IN.y + r * cs, cs, cs); }
      mctx.strokeStyle = COLORS.axis; mctx.strokeRect(IN.x, IN.y, IN.s, IN.s);
      mctx.fillStyle = COLORS.gray; mctx.font = "12px system-ui"; mctx.textAlign = "left"; mctx.textBaseline = "bottom"; mctx.fillText("input image (paint here)", IN.x, IN.y - 6);
      // feature map
      const out = conv(), N = out.length, fcs = FM.s / N;
      let maxAbs = 1e-6; out.forEach((row) => row.forEach((v) => maxAbs = Math.max(maxAbs, Math.abs(v))));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { mctx.fillStyle = divColor(out[r][c], maxAbs); mctx.fillRect(FM.x + c * fcs, FM.y + r * fcs, fcs, fcs); }
      mctx.strokeStyle = COLORS.axis; mctx.strokeRect(FM.x, FM.y, FM.s, FM.s);
      mctx.fillStyle = COLORS.gray; mctx.textBaseline = "bottom"; mctx.fillText("feature map" + (pool ? " (2×2 max-pooled)" : "") + (relu ? " + ReLU" : ""), FM.x, FM.y - 6);
      // hover receptive field
      if (hoverCell) {
        const { r, c } = hoverCell;
        mctx.strokeStyle = COLORS.select; mctx.lineWidth = 2; mctx.strokeRect(FM.x + c * fcs, FM.y + r * fcs, fcs, fcs);
        if (!pool) mctx.strokeRect(IN.x + c * cs, IN.y + r * cs, cs * 3, cs * 3);
        mctx.lineWidth = 1;
      }
      return out;
    }

    const mKernel = ui.metric(panels.metrics, "Kernel");
    const mActive = ui.metric(panels.metrics, "Map size");
    const mMax = ui.metric(panels.metrics, "Peak response");
    let kernelName = "sobelx";

    function drawKernel() {
      kctx.fillStyle = COLORS.panel; kctx.fillRect(0, 0, kerC.width, kerC.height);
      const cs = 56, ox = 24, oy = 56;
      let maxAbs = 1e-6; K.forEach((row) => row.forEach((v) => maxAbs = Math.max(maxAbs, Math.abs(v))));
      kctx.fillStyle = COLORS.gray; kctx.font = "12px system-ui"; kctx.textAlign = "left"; kctx.textBaseline = "bottom"; kctx.fillText("kernel (3×3)", ox, oy - 8);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const x = ox + j * cs, y = oy + i * cs;
        kctx.fillStyle = divColor(K[i][j], maxAbs); kctx.fillRect(x, y, cs - 3, cs - 3);
        kctx.fillStyle = COLORS.textBright; kctx.font = "14px system-ui"; kctx.textAlign = "center"; kctx.textBaseline = "middle"; kctx.fillText(K[i][j].toFixed(2), x + (cs - 3) / 2, y + (cs - 3) / 2);
      }
      // arithmetic for hovered patch
      kctx.fillStyle = COLORS.text; kctx.font = "12px system-ui"; kctx.textAlign = "left"; kctx.textBaseline = "top";
      const tx = ox + 3 * cs + 30, ty = oy;
      if (hoverCell && !pool) {
        const { r, c } = hoverCell; let sum = 0; const terms = [];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const p = img[r + i][c + j]; sum += p * K[i][j]; }
        kctx.fillText("patch · kernel under cursor:", tx, ty);
        for (let i = 0; i < 3; i++) { let line = ""; for (let j = 0; j < 3; j++) line += img[r + i][c + j].toFixed(1) + "×" + K[i][j].toFixed(1) + (j < 2 ? "  " : ""); kctx.fillText(line, tx, ty + 22 + i * 18); }
        const val = relu ? Math.max(0, sum) : sum;
        kctx.fillStyle = COLORS.predict; kctx.font = "14px system-ui"; kctx.fillText("= " + sum.toFixed(2) + (relu && sum < 0 ? "  → ReLU → 0" : ""), tx, ty + 22 + 3 * 18 + 6);
      } else {
        kctx.fillStyle = COLORS.gray; kctx.fillText("hover a feature-map cell to see its", tx, ty); kctx.fillText("3×3 receptive field and dot product.", tx, ty + 18);
      }
    }

    function render() { const out = drawMain(); drawKernel(); mKernel(kernelName); mActive(out.length + "×" + out.length); let mx = 0; out.forEach((row) => row.forEach((v) => mx = Math.max(mx, v))); mMax(mx.toFixed(2)); }

    // painting on input
    let painting = 0;
    function inputCell(ev) { const rect = mainC.getBoundingClientRect(); const mx = (ev.clientX - rect.left) * (mainC.width / rect.width), my = (ev.clientY - rect.top) * (mainC.height / rect.height); const cs = IN.s / G; const c = Math.floor((mx - IN.x) / cs), r = Math.floor((my - IN.y) / cs); return (r >= 0 && c >= 0 && r < G && c < G) ? { r, c } : null; }
    function featureCell(ev) { const rect = mainC.getBoundingClientRect(); const mx = (ev.clientX - rect.left) * (mainC.width / rect.width), my = (ev.clientY - rect.top) * (mainC.height / rect.height); const N = conv().length, fcs = FM.s / N; const c = Math.floor((mx - FM.x) / fcs), r = Math.floor((my - FM.y) / fcs); return (r >= 0 && c >= 0 && r < N && c < N) ? { r, c } : null; }
    function paint(ev) { const cell = inputCell(ev); if (!cell) return; const v = painting === 2 ? 0 : 1; for (let di = -(brush - 1); di <= brush - 1; di++) for (let dj = -(brush - 1); dj <= brush - 1; dj++) { const r = cell.r + di, c = cell.c + dj; if (r >= 0 && c >= 0 && r < G && c < G) img[r][c] = v; } render(); }
    mainC.addEventListener("mousedown", (e) => { painting = e.button === 2 ? 2 : 1; if (inputCell(e)) paint(e); e.preventDefault(); });
    mainC.addEventListener("mousemove", (e) => { if (painting) { if (inputCell(e)) paint(e); } else { hoverCell = featureCell(e); render(); } });
    window.addEventListener("mouseup", () => { painting = 0; });
    mainC.addEventListener("mouseleave", () => { hoverCell = null; render(); });
    mainC.addEventListener("contextmenu", (e) => e.preventDefault());

    // kernel editing
    kerC.addEventListener("mousedown", (e) => {
      const rect = kerC.getBoundingClientRect(); const mx = (e.clientX - rect.left) * (kerC.width / rect.width), my = (e.clientY - rect.top) * (kerC.height / rect.height);
      const cs = 56, ox = 24, oy = 56; const j = Math.floor((mx - ox) / cs), i = Math.floor((my - oy) / cs);
      if (i >= 0 && j >= 0 && i < 3 && j < 3) { K[i][j] = Math.max(-2, Math.min(2, K[i][j] + (e.button === 2 ? -0.25 : 0.25))); kernelName = "custom"; render(); }
      e.preventDefault();
    });
    kerC.addEventListener("contextmenu", (e) => e.preventDefault());

    // presets
    ui.buttonRow(panels.data, [
      { label: "Draw X", onClick: () => { img = zeros(); for (let i = 3; i < G - 3; i++) { img[i][i] = 1; img[i][G - 1 - i] = 1; } render(); } },
      { label: "Draw box", onClick: () => { img = zeros(); for (let i = 3; i < G - 3; i++) { img[3][i] = 1; img[G - 4][i] = 1; img[i][3] = 1; img[i][G - 4] = 1; } render(); } },
    ]);
    ui.buttonRow(panels.data, [
      { label: "Stripes", onClick: () => { img = zeros(); for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) img[r][c] = c % 4 < 2 ? 1 : 0; render(); } },
      { label: "Clear", kind: "danger", onClick: () => { img = zeros(); render(); } },
    ]);
    ui.slider(panels.data, { label: "Brush size", min: 1, max: 3, step: 1, value: brush, onInput: (v) => { brush = v; } });

    ui.select(panels.hyper, {
      label: "Kernel preset", options: [
        { value: "sobelx", label: "Sobel X (vertical edges)" }, { value: "sobely", label: "Sobel Y (horizontal edges)" },
        { value: "edge", label: "Edge / Laplacian" }, { value: "blur", label: "Blur" }, { value: "sharpen", label: "Sharpen" }, { value: "identity", label: "Identity" },
      ], value: "sobelx", onChange: (v) => { K = kernels[v].map((r) => r.slice()); kernelName = v; render(); },
    });
    ui.toggle(panels.hyper, { label: "ReLU (clip negatives to 0)", value: true, onChange: (v) => { relu = v; render(); } });
    ui.toggle(panels.hyper, { label: "2×2 max pooling", value: false, onChange: (v) => { pool = v; render(); } });
    ui.note(panels.hyper, "Sobel X fires on vertical edges, Sobel Y on horizontal — draw a box and watch each kernel pick out only the strokes it's tuned to.");

    render();
  },
});

const kernels = {
  sobelx: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  sobely: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  edge: [[0, -1, 0], [-1, 4, -1], [0, -1, 0]],
  blur: [[0.06, 0.12, 0.06], [0.12, 0.28, 0.12], [0.06, 0.12, 0.06]],
  sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  identity: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
};
