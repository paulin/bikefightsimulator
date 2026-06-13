"use strict";

// Time Series Forecasting — build a signal from trend + seasonality + noise, then
// decompose it and project it forward. Main view: history, forecast, and a
// widening confidence band. Internal view: the trend / seasonal / residual
// components pulled apart.
DSP.register({
  id: "time-series",
  name: "Time Series Forecasting",
  phase: "Phase 5 — Sequential",
  status: "ready",
  blurb: "Decompose a signal into trend + seasonality and extrapolate it.",
  intuition: "A forecast is just the patterns you can explain — a trend line plus a repeating seasonal shape — carried into the future. What you can't explain becomes the residual, and it sets how fast your confidence fans out.",

  mount(ctx) {
    const { panels, ui, data, Plot, canvas, COLORS } = ctx;

    const N = 60;
    let trend = 0.04, seasonAmp = 2.5, period = 12, noise = 0.6, horizon = 24;
    let shocks = [];
    let series = [];

    const mainC = canvas(panels.viz, 600, 360);
    const plot = new Plot(mainC, { xMin: 0, xMax: N + horizon, yMin: -6, yMax: 10 });
    ui.note(panels.viz, "Blue = observed history, green = forecast, shaded = 95% interval. Click on the chart to drop a shock.");

    const compC = canvas(panels.internal, 600, 320);
    const cctx = compC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Decomposition (trend · seasonal · residual)";
    ui.note(panels.internal, "The model splits the signal into a straight trend, a repeating seasonal pattern, and leftover residuals. Add noise and the residual band — and the forecast cone — widen.");

    function generate() {
      series = [];
      for (let t = 0; t < N; t++) {
        let v = 1 + trend * t + seasonAmp * Math.sin(2 * Math.PI * t / period) + data.gauss() * noise;
        for (const s of shocks) if (t >= s.t) v += s.mag * Math.exp(-(t - s.t) / 6);
        series.push(v);
      }
    }

    // Fit trend (least squares on t), seasonal indices, residual std.
    function model() {
      const n = series.length;
      const mt = (n - 1) / 2, my = series.reduce((a, b) => a + b, 0) / n;
      let sxy = 0, sxx = 0;
      for (let t = 0; t < n; t++) { sxy += (t - mt) * (series[t] - my); sxx += (t - mt) ** 2; }
      const slope = sxx ? sxy / sxx : 0, intercept = my - slope * mt;
      const trendAt = (t) => intercept + slope * t;
      const seas = new Array(period).fill(0), cnt = new Array(period).fill(0);
      for (let t = 0; t < n; t++) { seas[t % period] += series[t] - trendAt(t); cnt[t % period]++; }
      for (let k = 0; k < period; k++) seas[k] = cnt[k] ? seas[k] / cnt[k] : 0;
      const sm = seas.reduce((a, b) => a + b, 0) / period; for (let k = 0; k < period; k++) seas[k] -= sm;
      let sse = 0; for (let t = 0; t < n; t++) { const r = series[t] - trendAt(t) - seas[t % period]; sse += r * r; }
      const resStd = Math.sqrt(sse / Math.max(1, n - 2));
      return { slope, intercept, trendAt, seas, resStd };
    }

    const mSlope = ui.metric(panels.metrics, "Trend / step");
    const mAmp = ui.metric(panels.metrics, "Seasonal amplitude");
    const mRes = ui.metric(panels.metrics, "Residual σ");
    const mHorizon = ui.metric(panels.metrics, "Forecast horizon");

    function autobounds() {
      const m = model();
      let lo = Infinity, hi = -Infinity;
      for (let t = 0; t < N + horizon; t++) { const v = m.trendAt(t) + m.seas[t % period]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
      for (const v of series) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const pad = (hi - lo) * 0.2 + 1; plot.setBounds(0, N + horizon, lo - pad, hi + pad);
    }

    function drawMain() {
      const m = model();
      autobounds();
      plot.clear();
      plot.grid({ xStep: 12, yStep: 2, xLabel: "time", yLabel: "value" });
      // confidence band
      plot.ctx.fillStyle = "rgba(143,209,143,0.14)"; plot.ctx.beginPath();
      const upper = [], lower = [];
      for (let i = 0; i <= horizon; i++) { const t = N - 1 + i; const f = m.trendAt(t) + m.seas[t % period]; const w = 1.96 * m.resStd * Math.sqrt(1 + i * 0.12); upper.push([t, f + w]); lower.push([t, f - w]); }
      upper.forEach(([t, v], i) => { const sx = plot.px(t), sy = plot.py(v); i ? plot.ctx.lineTo(sx, sy) : plot.ctx.moveTo(sx, sy); });
      for (let i = lower.length - 1; i >= 0; i--) { plot.ctx.lineTo(plot.px(lower[i][0]), plot.py(lower[i][1])); }
      plot.ctx.closePath(); plot.ctx.fill();
      // fitted history (faint)
      plot.ctx.strokeStyle = COLORS.gray; plot.ctx.lineWidth = 1; plot.ctx.setLineDash([3, 3]); plot.ctx.beginPath();
      for (let t = 0; t < N; t++) { const v = m.trendAt(t) + m.seas[t % period]; const sx = plot.px(t), sy = plot.py(v); t ? plot.ctx.lineTo(sx, sy) : plot.ctx.moveTo(sx, sy); }
      plot.ctx.stroke(); plot.ctx.setLineDash([]);
      // forecast
      plot.ctx.strokeStyle = COLORS.predict; plot.ctx.lineWidth = 2.5; plot.ctx.beginPath();
      for (let i = 0; i <= horizon; i++) { const t = N - 1 + i; const v = m.trendAt(t) + m.seas[t % period]; const sx = plot.px(t), sy = plot.py(v); i ? plot.ctx.lineTo(sx, sy) : plot.ctx.moveTo(sx, sy); }
      plot.ctx.stroke();
      // "now" divider
      plot.line(N - 1, plot.yMin, N - 1, plot.yMax, { color: COLORS.gray, width: 1, dash: [5, 4] });
      // observed history
      plot.ctx.strokeStyle = COLORS.train; plot.ctx.lineWidth = 2; plot.ctx.beginPath();
      series.forEach((v, t) => { const sx = plot.px(t), sy = plot.py(v); t ? plot.ctx.lineTo(sx, sy) : plot.ctx.moveTo(sx, sy); });
      plot.ctx.stroke();
      for (let t = 0; t < N; t++) plot.point(t, series[t], { r: 2.2, color: COLORS.train });

      mSlope(m.slope.toFixed(3)); mAmp(((Math.max(...m.seas) - Math.min(...m.seas)) / 2).toFixed(2)); mRes(m.resStd.toFixed(2)); mHorizon(horizon);
    }

    function drawComp() {
      const m = model(), w = compC.width, h = compC.height;
      cctx.fillStyle = COLORS.panel; cctx.fillRect(0, 0, w, h);
      const panelH = h / 3;
      const sub = (top, title, valsFn, color, range) => {
        const mid = top + panelH / 2;
        cctx.strokeStyle = COLORS.axis; cctx.beginPath(); cctx.moveTo(40, mid); cctx.lineTo(w - 10, mid); cctx.stroke();
        cctx.fillStyle = COLORS.text; cctx.font = "11px system-ui"; cctx.textAlign = "left"; cctx.textBaseline = "top"; cctx.fillText(title, 42, top + 4);
        const sc = (panelH / 2 - 10) / (range || 1);
        cctx.strokeStyle = color; cctx.lineWidth = 1.8; cctx.beginPath();
        for (let t = 0; t < N; t++) { const x = 40 + (w - 50) * t / (N - 1), y = mid - valsFn(t) * sc; t ? cctx.lineTo(x, y) : cctx.moveTo(x, y); }
        cctx.stroke();
      };
      const trendRange = Math.max(0.5, Math.abs(m.trendAt(N - 1) - m.trendAt(0)) / 2 + 1);
      sub(0, "Trend", (t) => m.trendAt(t) - (m.trendAt(0) + m.trendAt(N - 1)) / 2, COLORS.update, trendRange);
      const seasRange = Math.max(0.5, Math.max(...m.seas.map(Math.abs)));
      sub(panelH, "Seasonal", (t) => m.seas[t % period], COLORS.predict, seasRange);
      let resRange = 0.5; for (let t = 0; t < N; t++) resRange = Math.max(resRange, Math.abs(series[t] - m.trendAt(t) - m.seas[t % period]));
      // residual stems
      const top = 2 * panelH, mid = top + panelH / 2, sc = (panelH / 2 - 10) / resRange;
      cctx.strokeStyle = COLORS.axis; cctx.beginPath(); cctx.moveTo(40, mid); cctx.lineTo(w - 10, mid); cctx.stroke();
      cctx.fillStyle = COLORS.text; cctx.font = "11px system-ui"; cctx.textAlign = "left"; cctx.textBaseline = "top"; cctx.fillText("Residual", 42, top + 4);
      cctx.strokeStyle = COLORS.error; cctx.lineWidth = 1;
      for (let t = 0; t < N; t++) { const r = series[t] - m.trendAt(t) - m.seas[t % period]; const x = 40 + (w - 50) * t / (N - 1); cctx.beginPath(); cctx.moveTo(x, mid); cctx.lineTo(x, mid - r * sc); cctx.stroke(); }
    }

    function render() { drawMain(); drawComp(); }
    function regen() { generate(); render(); }

    // click on chart to add a shock at that time
    function onDown(ev) { const m = plot.mouse(ev); const t = Math.round(plot.dx(m.px)); if (t >= 0 && t < N) { shocks.push({ t, mag: 4 }); regen(); } }
    mainC.addEventListener("mousedown", onDown);
    ctx.onCleanup(() => mainC.removeEventListener("mousedown", onDown));

    ui.buttonRow(panels.data, [
      { label: "Regenerate", onClick: regen },
      { label: "Clear shocks", onClick: () => { shocks = []; regen(); } },
    ]);
    ui.slider(panels.hyper, { label: "Trend / step", min: -0.15, max: 0.15, step: 0.01, value: trend, format: (v) => v.toFixed(2), onInput: (v) => { trend = v; regen(); } });
    ui.slider(panels.hyper, { label: "Seasonal amplitude", min: 0, max: 5, step: 0.1, value: seasonAmp, format: (v) => v.toFixed(1), onInput: (v) => { seasonAmp = v; regen(); } });
    ui.slider(panels.hyper, { label: "Season period", min: 4, max: 20, step: 1, value: period, onInput: (v) => { period = v; regen(); } });
    ui.slider(panels.hyper, { label: "Noise", min: 0, max: 3, step: 0.1, value: noise, format: (v) => v.toFixed(1), onInput: (v) => { noise = v; regen(); } });
    ui.slider(panels.hyper, { label: "Forecast horizon", min: 6, max: 48, step: 1, value: horizon, onInput: (v) => { horizon = v; render(); } });
    ui.note(panels.hyper, "Crank the noise and the confidence cone fans out fast — the model knows less, so it hedges more. A bigger trend tilts the whole forecast.");

    regen();
  },
});
