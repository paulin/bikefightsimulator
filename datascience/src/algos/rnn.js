"use strict";

// RNN / LSTM — recurrence made visible through a single memory cell. The cell
// state integrates the input sequence, gated by forget / input / output. Main
// view: input, memory (cell state) and output unrolled over time. Internal view:
// the gate values and the update equation at the current step.
DSP.register({
  id: "rnn-lstm",
  name: "RNN / LSTM",
  phase: "Phase 4 — Deep Learning",
  status: "ready",
  blurb: "Carry information across a sequence through a gated memory cell.",
  intuition: "Past information influences the future because the cell state persists. The forget gate sets how long memory lasts: near 1 it's a long-term integrator, near 0 it reacts only to the latest input.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS } = ctx;

    const T = 24;
    let x = pulse();
    let forget = 0.85, inGain = 0.4, outGain = 1, t = T - 1, running = false;

    function pulse() { const a = new Array(T).fill(0); a[4] = 1; a[5] = 1; a[14] = -1; return a; }
    function steps() { const a = new Array(T).fill(0); for (let i = 8; i < T; i++) a[i] = 0.6; return a; }
    function rand() { return Array.from({ length: T }, () => Math.round((Math.random() * 2 - 1) * 10) / 10); }
    function alt() { return Array.from({ length: T }, (_, i) => (i % 6 < 3 ? 0.7 : -0.7)); }

    // Roll the recurrence forward; return c[] and h[] for all steps.
    function unroll() {
      const c = [], h = []; let cs = 0;
      for (let k = 0; k < T; k++) { cs = forget * cs + inGain * x[k]; const hk = outGain * Math.tanh(cs); c.push(cs); h.push(hk); }
      return { c, h };
    }

    const mainC = canvas(panels.viz, 600, 360);
    const plot = new Plot(mainC, { xMin: -0.5, xMax: T - 0.5, yMin: -1.6, yMax: 1.6, pad: 36 });
    ui.note(panels.viz, "Click on the chart to set the input at that step. Blue = input, purple = memory (cell state), green = output.");

    const gateC = canvas(panels.internal, 600, 240);
    const gctx = gateC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Gates & Update at the Current Step";
    ui.note(panels.internal, "cellₜ = forget · cellₜ₋₁ + input · xₜ, then outputₜ = out · tanh(cellₜ). The forget gate is the memory's half-life.");

    const mForget = ui.metric(panels.metrics, "Forget gate");
    const mStep = ui.metric(panels.metrics, "Current step");
    const mCell = ui.metric(panels.metrics, "Cell state");
    const mOut = ui.metric(panels.metrics, "Output");

    function bars(arr, color, baseAlpha) {
      for (let k = 0; k < T; k++) { const v = arr[k]; plot.ctx.fillStyle = color + baseAlpha; const x0 = plot.px(k - 0.32), x1 = plot.px(k + 0.32), y0 = plot.py(0), y1 = plot.py(v); plot.ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0)); }
    }
    function lineSeries(arr, color, width) { plot.ctx.strokeStyle = color; plot.ctx.lineWidth = width; plot.ctx.beginPath(); arr.forEach((v, k) => { const sx = plot.px(k), sy = plot.py(v); k ? plot.ctx.lineTo(sx, sy) : plot.ctx.moveTo(sx, sy); }); plot.ctx.stroke(); for (let k = 0; k < T; k++) plot.point(k, arr[k], { r: 2.4, color }); }

    function drawMain() {
      const { c, h } = unroll();
      plot.clear();
      plot.grid({ xStep: 4, yStep: 0.5, xLabel: "time step", yLabel: "value" });
      plot.line(-0.5, 0, T - 0.5, 0, { color: COLORS.axis, width: 1 });
      bars(x, "rgba(111,195,255,", "0.5)");          // input bars
      lineSeries(c, COLORS.update, 2.5);              // cell state
      lineSeries(h, COLORS.predict, 2);               // output
      // current-step marker
      plot.line(t, plot.yMin, t, plot.yMax, { color: COLORS.select, width: 1.5, dash: [4, 3] });
      mForget(forget.toFixed(2)); mStep(t + "/" + (T - 1)); mCell(c[t].toFixed(2)); mOut(h[t].toFixed(2));
    }

    function drawGates() {
      const { c } = unroll();
      gctx.fillStyle = COLORS.panel; gctx.fillRect(0, 0, gateC.width, gateC.height);
      const prevC = t > 0 ? c[t - 1] : 0, cur = c[t], xt = x[t], hk = outGain * Math.tanh(cur);
      // gate bars
      const gates = [["forget", forget, COLORS.error], ["input", inGain, COLORS.train], ["output", outGain, COLORS.predict]];
      const bx = 30, bw = 90, top = 30, maxh = 120;
      gctx.font = "12px system-ui"; gctx.textAlign = "center";
      gates.forEach((g, i) => { const x0 = bx + i * (bw + 24); gctx.fillStyle = g[2]; gctx.fillRect(x0, top + maxh - maxh * Math.min(1, g[1]), bw, maxh * Math.min(1, g[1])); gctx.fillStyle = COLORS.axis; gctx.strokeStyle = COLORS.axis; gctx.strokeRect(x0, top, bw, maxh); gctx.fillStyle = COLORS.text; gctx.textBaseline = "top"; gctx.fillText(g[0] + " " + g[1].toFixed(2), x0 + bw / 2, top + maxh + 6); });
      // equation
      const tx = bx + 3 * (bw + 24) + 6, ty = 40;
      gctx.fillStyle = COLORS.text; gctx.font = "13px system-ui"; gctx.textAlign = "left"; gctx.textBaseline = "top";
      gctx.fillText("step " + t + ":", tx, ty);
      gctx.fillStyle = COLORS.update; gctx.fillText(`cell = ${forget.toFixed(2)}·${prevC.toFixed(2)} + ${inGain.toFixed(2)}·${xt.toFixed(2)} = ${cur.toFixed(2)}`, tx, ty + 26);
      gctx.fillStyle = COLORS.predict; gctx.fillText(`output = ${outGain.toFixed(2)}·tanh(${cur.toFixed(2)}) = ${hk.toFixed(2)}`, tx, ty + 52);
      gctx.fillStyle = COLORS.gray; gctx.font = "12px system-ui"; gctx.fillText("Half-life of memory ≈ " + (forget >= 1 ? "∞" : (Math.log(0.5) / Math.log(forget)).toFixed(1)) + " steps", tx, ty + 84);
    }

    function render() { drawMain(); drawGates(); }

    let frame = 0, raf = requestAnimationFrame(function loop() {
      if (running) { frame++; if (frame % 12 === 0) { t = (t + 1) % T; render(); } }
      raf = requestAnimationFrame(loop);
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));

    function onDown(ev) { const m = plot.mouse(ev); const k = Math.round(plot.dx(m.px)); if (k >= 0 && k < T) { x[k] = Math.max(-1, Math.min(1, plot.dy(m.py))); t = k; render(); } }
    mainC.addEventListener("mousedown", onDown);
    ctx.onCleanup(() => mainC.removeEventListener("mousedown", onDown));

    ui.buttonRow(panels.data, [
      { label: "Pulse", onClick: () => { x = pulse(); render(); } },
      { label: "Step up", onClick: () => { x = steps(); render(); } },
    ]);
    ui.buttonRow(panels.data, [
      { label: "Alternating", onClick: () => { x = alt(); render(); } },
      { label: "Random", onClick: () => { x = rand(); render(); } },
    ]);

    ui.slider(panels.hyper, { label: "Forget gate", min: 0, max: 1, step: 0.01, value: forget, format: (v) => v.toFixed(2), onInput: (v) => { forget = v; render(); } });
    ui.slider(panels.hyper, { label: "Input gate", min: 0, max: 1, step: 0.01, value: inGain, format: (v) => v.toFixed(2), onInput: (v) => { inGain = v; render(); } });
    ui.slider(panels.hyper, { label: "Output gate", min: 0, max: 1.5, step: 0.05, value: outGain, format: (v) => v.toFixed(2), onInput: (v) => { outGain = v; render(); } });
    var [runBtn] = ui.buttonRow(panels.hyper, [
      { label: "Play through time", kind: "primary", onClick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Play through time"; } },
      { label: "Step ▶", onClick: () => { running = false; runBtn.textContent = "Play through time"; t = (t + 1) % T; render(); } },
    ]);
    ui.note(panels.hyper, "Set forget near 1 and a single input pulse leaves a memory that decays slowly for many steps. Drop it toward 0 and the cell forgets almost immediately.");

    render();
  },
});
