"use strict";

// Transformers — the self-attention matrix you can poke at. Each token forms a
// query and a key; their dot products (softmaxed) decide how much every token
// attends to every other. Main view: the attention matrix. Internal view: arcs
// from the selected token to what it attends to. (Illustrative, untrained
// projections — the point is the mechanism, not a learned language model.)
DSP.register({
  id: "transformers",
  name: "Transformers",
  phase: "Phase 4 — Deep Learning",
  status: "ready",
  blurb: "Let every token decide how much to attend to every other.",
  intuition: "Attention is a soft, content-based lookup: a token's query is compared against every key, softmax turns the scores into weights, and the token reads a blend of the others. Different heads learn to look for different relationships.",

  mount(ctx) {
    const { panels, ui, canvas, COLORS } = ctx;

    const sentences = {
      cat: "the cat sat on the mat".split(" "),
      water: "she poured water into a cup".split(" "),
      robot: "robots learn from data fast".split(" "),
    };
    let tokens = sentences.cat;
    let heads = 3, head = 0, temp = 1, posBias = true, selected = 0;
    const D = 4;

    const matC = canvas(panels.viz, 460, 460);
    const xc = matC.getContext("2d");
    ui.note(panels.viz, "Rows = the querying token, columns = what it attends to. Click a row to select that token; brighter = more attention.");

    const arcC = canvas(panels.internal, 560, 240);
    const actx = arcC.getContext("2d");
    ctx.titles.internal.textContent = "Internal — Who the Selected Token Attends To";
    ui.note(panels.internal, "Arc thickness = attention weight from the highlighted token to each other token, for the current head. Switch heads to see different patterns emerge.");

    function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; }
    function vec(seed) { let h = hash(seed); const v = []; for (let i = 0; i < D; i++) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; v.push((h / 4294967296) * 2 - 1); } return v; }
    const dot = (a, b) => a.reduce((s, _, i) => s + a[i] * b[i], 0);

    function attention() {
      const n = tokens.length;
      const Q = tokens.map((w, i) => vec(w + "|q|" + head)), Kk = tokens.map((w) => vec(w + "|k|" + head));
      const A = [];
      for (let i = 0; i < n; i++) {
        const scores = [];
        for (let j = 0; j < n; j++) { let s = dot(Q[i], Kk[j]) / Math.sqrt(D); if (posBias) s -= Math.abs(i - j) * 0.6; scores.push(s / temp); }
        const mx = Math.max(...scores); const ex = scores.map((s) => Math.exp(s - mx)); const sum = ex.reduce((a, b) => a + b, 0);
        A.push(ex.map((e) => e / sum));
      }
      return A;
    }

    const mTokens = ui.metric(panels.metrics, "Tokens");
    const mHead = ui.metric(panels.metrics, "Head");
    const mSel = ui.metric(panels.metrics, "Selected token");
    const mTop = ui.metric(panels.metrics, "Attends most to");

    function drawMatrix(A) {
      const n = tokens.length, w = matC.width, h = matC.height, m = 90;
      xc.fillStyle = COLORS.panel; xc.fillRect(0, 0, w, h);
      const cw = (w - m - 16) / n, ch = (h - m - 16) / n;
      // labels
      xc.font = "12px system-ui"; xc.fillStyle = COLORS.text;
      for (let j = 0; j < n; j++) { xc.save(); xc.translate(m + j * cw + cw / 2, m - 8); xc.rotate(-Math.PI / 4); xc.textAlign = "left"; xc.textBaseline = "middle"; xc.fillText(tokens[j], 0, 0); xc.restore(); }
      for (let i = 0; i < n; i++) { xc.textAlign = "right"; xc.textBaseline = "middle"; xc.fillStyle = i === selected ? COLORS.select : COLORS.text; xc.fillText(tokens[i], m - 8, m + i * ch + ch / 2); }
      // cells
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const a = A[i][j]; xc.fillStyle = `rgba(111,195,255,${0.08 + 0.92 * a})`;
        xc.fillRect(m + j * cw, m + i * ch, cw - 2, ch - 2);
        if (a > 0.18) { xc.fillStyle = "#0e1014"; xc.font = "10px system-ui"; xc.textAlign = "center"; xc.textBaseline = "middle"; xc.fillText(a.toFixed(2), m + j * cw + cw / 2, m + i * ch + ch / 2); }
      }
      if (selected < n) { xc.strokeStyle = COLORS.select; xc.lineWidth = 2; xc.strokeRect(m, m + selected * ch, n * cw - 2, ch - 2); }
      xc.fillStyle = COLORS.gray; xc.font = "11px system-ui"; xc.textAlign = "left"; xc.textBaseline = "top"; xc.fillText("key →", m, 8); xc.save(); xc.translate(14, m); xc.rotate(-Math.PI / 2); xc.fillText("query →", 0, 0); xc.restore();
    }

    function drawArcs(A) {
      const n = tokens.length, w = arcC.width, h = arcC.height;
      actx.fillStyle = COLORS.panel; actx.fillRect(0, 0, w, h);
      const y = h - 60, sp = (w - 60) / Math.max(1, n - 1), x = (i) => 30 + sp * i;
      const row = A[selected];
      // arcs from selected to others
      for (let j = 0; j < n; j++) {
        if (j === selected) continue; const a = row[j]; if (a < 0.02) continue;
        actx.strokeStyle = `rgba(111,195,255,${0.15 + 0.85 * a})`; actx.lineWidth = 1 + 6 * a;
        const x0 = x(selected), x1 = x(j), midx = (x0 + x1) / 2, lift = 30 + Math.abs(x1 - x0) * 0.5;
        actx.beginPath(); actx.moveTo(x0, y); actx.quadraticCurveTo(midx, y - lift, x1, y); actx.stroke();
      }
      // tokens
      actx.font = "13px system-ui"; actx.textAlign = "center"; actx.textBaseline = "top";
      for (let i = 0; i < n; i++) { const self = row[i]; actx.fillStyle = i === selected ? COLORS.select : COLORS.train; actx.beginPath(); actx.arc(x(i), y, 6, 0, 6.283); actx.fill(); actx.fillStyle = i === selected ? COLORS.select : COLORS.text; actx.fillText(tokens[i], x(i), y + 12); if (i !== selected && self > 0.02) { actx.fillStyle = COLORS.gray; actx.font = "10px system-ui"; actx.fillText(self.toFixed(2), x(i), y - 16); actx.font = "13px system-ui"; } }
      actx.fillStyle = COLORS.gray; actx.font = "12px system-ui"; actx.textAlign = "left"; actx.textBaseline = "top"; actx.fillText(`"${tokens[selected]}" attends to:`, 20, 14);
    }

    function metrics(A) {
      mTokens(tokens.length); mHead((head + 1) + " / " + heads); mSel(`"${tokens[selected]}"`);
      // strongest attention target, excluding self
      const row = A[selected]; let best = -1, bv = -1; row.forEach((v, j) => { if (j !== selected && v > bv) { bv = v; best = j; } });
      mTop(best >= 0 ? `"${tokens[best]}" (${bv.toFixed(2)})` : "–");
    }

    function render() { const A = attention(); drawMatrix(A); drawArcs(A); metrics(A); }

    matC.addEventListener("mousedown", (ev) => {
      const rect = matC.getBoundingClientRect(), my = (ev.clientY - rect.top) * (matC.height / rect.height);
      const n = tokens.length, m = 90, ch = (matC.height - m - 16) / n; const i = Math.floor((my - m) / ch);
      if (i >= 0 && i < n) { selected = i; render(); }
    });

    ui.buttonRow(panels.data, [
      { label: "“the cat…”", onClick: () => { tokens = sentences.cat; selected = 0; render(); } },
      { label: "“she poured…”", onClick: () => { tokens = sentences.water; selected = 0; render(); } },
    ]);
    ui.buttonRow(panels.data, [{ label: "“robots learn…”", onClick: () => { tokens = sentences.robot; selected = 0; render(); } }]);

    ui.slider(panels.hyper, { label: "Attention heads", min: 1, max: 6, step: 1, value: heads, onInput: (v) => { heads = v; if (head >= heads) head = heads - 1; render(); } });
    const headSlider = ui.slider(panels.hyper, { label: "View head", min: 1, max: heads, step: 1, value: head + 1, onInput: (v) => { head = Math.min(heads, v) - 1; render(); } });
    ui.slider(panels.hyper, { label: "Softmax temperature", min: 0.2, max: 3, step: 0.1, value: temp, format: (v) => v.toFixed(1), onInput: (v) => { temp = v; render(); } });
    ui.toggle(panels.hyper, { label: "Positional bias (favor nearby)", value: true, onChange: (v) => { posBias = v; render(); } });
    ui.note(panels.hyper, "Low temperature sharpens attention onto a single token; high temperature spreads it evenly. Each head uses different projections, so it attends to different things — click a row and flip through heads.");

    render();
  },
});
