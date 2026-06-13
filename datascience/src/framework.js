"use strict";

// Shared engine for the Data Science Playground. Every algorithm screen is built
// from the same pieces: the universal layout (data controls, hyperparameters,
// metrics, main visualization, internal visualization, explanation), a small set
// of UI control builders, a 2D plotting helper with data<->pixel transforms and
// point editing, and dataset utilities. Algorithms call DSP.register({...}) and
// receive a context object with these tools in their mount() function.

const DSP = (function () {
  // --- Design language (from the spec) ------------------------------------
  const COLORS = {
    bg: "#1b1e27",
    panel: "#14161c",
    grid: "#262a35",
    axis: "#3a4052",
    text: "#9aa3b5",
    textBright: "#f0f2f7",
    train: "#6fc3ff",   // blue  — training data
    select: "#ffae57",  // orange — user-selected objects
    predict: "#8fd18f", // green — predictions
    error: "#e5736b",   // red   — errors / misclassifications
    update: "#b98fe5",  // purple — learning updates
    gray: "#717a8c",    // gray  — background / reference
  };

  // A distinct palette for class / cluster colors (class 0 = blue, 1 = orange…).
  const CLASS_COLORS = ["#6fc3ff", "#ffae57", "#8fd18f", "#b98fe5", "#e5736b", "#e5c96b"];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // --- Control builders ----------------------------------------------------
  // Each builder appends a control to `panel` and returns a small handle.
  const ui = {
    slider(panel, { label, min, max, step = 1, value, format, onInput }) {
      const wrap = el("div", "control");
      const head = el("div", "control-head");
      const name = el("span", "control-label", label);
      const val = el("span", "control-value");
      head.append(name, val);
      const input = el("input");
      input.type = "range";
      input.min = min; input.max = max; input.step = step; input.value = value;
      const fmt = format || ((v) => v);
      const sync = () => { val.textContent = fmt(Number(input.value)); };
      input.addEventListener("input", () => { sync(); if (onInput) onInput(Number(input.value)); });
      sync();
      wrap.append(head, input);
      panel.append(wrap);
      return {
        get value() { return Number(input.value); },
        set value(v) { input.value = v; sync(); },
        el: input,
      };
    },

    button(panel, { label, kind = "", onClick }) {
      const b = el("button", kind, label);
      if (onClick) b.addEventListener("click", onClick);
      panel.append(b);
      return b;
    },

    buttonRow(panel, buttons) {
      const row = el("div", "button-row");
      panel.append(row);
      return buttons.map((cfg) => ui.button(row, cfg));
    },

    toggle(panel, { label, value = false, onChange }) {
      const wrap = el("label", "toggle");
      const input = el("input");
      input.type = "checkbox";
      input.checked = value;
      input.addEventListener("change", () => { if (onChange) onChange(input.checked); });
      wrap.append(input, el("span", "", label));
      panel.append(wrap);
      return { get value() { return input.checked; }, set value(v) { input.checked = v; }, el: input };
    },

    select(panel, { label, options, value, onChange }) {
      const wrap = el("div", "control");
      const head = el("div", "control-head");
      head.append(el("span", "control-label", label));
      const sel = el("select");
      options.forEach((o) => {
        const opt = el("option", "", o.label || o);
        opt.value = o.value !== undefined ? o.value : o;
        sel.append(opt);
      });
      if (value !== undefined) sel.value = value;
      sel.addEventListener("change", () => { if (onChange) onChange(sel.value); });
      wrap.append(head, sel);
      panel.append(wrap);
      return { get value() { return sel.value; }, set value(v) { sel.value = v; }, el: sel };
    },

    // A live metric row. Returns a setter for the value cell.
    metric(panel, label, initial = "–") {
      let table = panel.querySelector("table.metrics");
      if (!table) { table = el("table", "metrics"); panel.append(table); }
      const row = el("tr");
      const tdl = el("td", "", label);
      const tdv = el("td", "metric-val", String(initial));
      row.append(tdl, tdv);
      table.append(row);
      return (v) => { tdv.textContent = v; };
    },

    note(panel, html) {
      const d = el("div", "note");
      d.innerHTML = html;
      panel.append(d);
      return d;
    },

    heading(panel, text) { panel.append(el("h3", "", text)); },
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // --- Plot: a 2D canvas with data<->pixel transforms ----------------------
  class Plot {
    constructor(canvas, { xMin = 0, xMax = 1, yMin = 0, yMax = 1, pad = 36 } = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.w = canvas.width;
      this.h = canvas.height;
      this.pad = pad;
      this.setBounds(xMin, xMax, yMin, yMax);
    }
    setBounds(xMin, xMax, yMin, yMax) {
      this.xMin = xMin; this.xMax = xMax; this.yMin = yMin; this.yMax = yMax;
    }
    px(x) { return lerp(this.pad, this.w - this.pad, (x - this.xMin) / (this.xMax - this.xMin)); }
    py(y) { return lerp(this.h - this.pad, this.pad, (y - this.yMin) / (this.yMax - this.yMin)); }
    dx(px) { return this.xMin + (px - this.pad) / (this.w - 2 * this.pad) * (this.xMax - this.xMin); }
    dy(py) { return this.yMin + (this.h - this.pad - py) / (this.h - 2 * this.pad) * (this.yMax - this.yMin); }

    // Pixel position of a mouse event relative to the canvas (handles CSS scaling).
    mouse(ev) {
      const r = this.c.getBoundingClientRect();
      return {
        px: (ev.clientX - r.left) * (this.w / r.width),
        py: (ev.clientY - r.top) * (this.h / r.height),
      };
    }

    clear() {
      this.ctx.fillStyle = COLORS.panel;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }

    grid({ xStep, yStep, xLabel, yLabel } = {}) {
      const ctx = this.ctx;
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.fillStyle = COLORS.text;
      ctx.font = "11px system-ui, sans-serif";
      if (xStep) {
        for (let x = Math.ceil(this.xMin / xStep) * xStep; x <= this.xMax; x += xStep) {
          const sx = this.px(x);
          ctx.beginPath(); ctx.moveTo(sx, this.pad); ctx.lineTo(sx, this.h - this.pad); ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(fmtNum(x), sx, this.h - this.pad + 4);
        }
      }
      if (yStep) {
        for (let y = Math.ceil(this.yMin / yStep) * yStep; y <= this.yMax; y += yStep) {
          const sy = this.py(y);
          ctx.beginPath(); ctx.moveTo(this.pad, sy); ctx.lineTo(this.w - this.pad, sy); ctx.stroke();
          ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(fmtNum(y), this.pad - 5, sy);
        }
      }
      // axis frame
      ctx.strokeStyle = COLORS.axis;
      ctx.strokeRect(this.pad, this.pad, this.w - 2 * this.pad, this.h - 2 * this.pad);
      if (xLabel) {
        ctx.fillStyle = COLORS.gray; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(xLabel, this.w - this.pad - 4, this.h - this.pad - 4);
      }
      if (yLabel) {
        ctx.save();
        ctx.translate(this.pad + 4, this.pad + 4);
        ctx.fillStyle = COLORS.gray; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
      }
    }

    point(x, y, { r = 5, color = COLORS.train, stroke, width = 2 } = {}) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.arc(this.px(x), this.py(y), r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    }

    line(x1, y1, x2, y2, { color = COLORS.predict, width = 2, dash } = {}) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      if (dash) ctx.setLineDash(dash);
      ctx.moveTo(this.px(x1), this.py(y1));
      ctx.lineTo(this.px(x2), this.py(y2));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      ctx.restore();
    }

    // Fill an axis-aligned data-space rectangle (used for decision regions).
    rect(x1, y1, x2, y2, color) {
      const ctx = this.ctx;
      const sx = this.px(x1), sy = this.py(y2);
      ctx.fillStyle = color;
      ctx.fillRect(sx, sy, this.px(x2) - sx, this.py(y1) - sy);
    }

    text(x, y, str, { color = COLORS.textBright, align = "left", baseline = "middle", font = "12px system-ui" } = {}) {
      const ctx = this.ctx;
      ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = baseline;
      ctx.fillText(str, this.px(x), this.py(y));
    }
  }

  function fmtNum(v) {
    if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) return v.toExponential(1);
    return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  }

  // Generic point editing on a Plot: drag existing points, click empty space to
  // add, shift/right-click to remove. `points` is an array of {x,y,...}. Calls
  // onChange after any edit. Returns a detach() function.
  function enablePointEditing(plot, points, { radius = 9, onAdd, onChange, onDrag, hitColor } = {}) {
    let dragging = null;
    const hit = (m) => {
      for (let i = points.length - 1; i >= 0; i--) {
        const dxp = plot.px(points[i].x) - m.px, dyp = plot.py(points[i].y) - m.py;
        if (dxp * dxp + dyp * dyp <= radius * radius) return i;
      }
      return -1;
    };
    const down = (ev) => {
      const m = plot.mouse(ev);
      const i = hit(m);
      if (ev.button === 2 || ev.shiftKey) {
        if (i >= 0) { points.splice(i, 1); if (onChange) onChange(); }
        ev.preventDefault();
        return;
      }
      if (i >= 0) { dragging = i; }
      else if (onAdd) {
        const x = clamp(plot.dx(m.px), plot.xMin, plot.xMax);
        const y = clamp(plot.dy(m.py), plot.yMin, plot.yMax);
        onAdd(x, y);
        if (onChange) onChange();
      }
    };
    const move = (ev) => {
      if (dragging === null) return;
      const m = plot.mouse(ev);
      points[dragging].x = clamp(plot.dx(m.px), plot.xMin, plot.xMax);
      points[dragging].y = clamp(plot.dy(m.py), plot.yMin, plot.yMax);
      if (onDrag) onDrag(dragging);
      if (onChange) onChange();
    };
    const up = () => { dragging = null; };
    plot.c.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    plot.c.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      plot.c.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }

  // --- Dataset utilities ---------------------------------------------------
  const data = {
    // Linear-ish cloud: y = slope*x + intercept + noise, x in [xMin,xMax].
    linear(n, { slope = 1, intercept = 0, noise = 1, xMin = 0, xMax = 10 } = {}) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = lerp(xMin, xMax, Math.random());
        const y = slope * x + intercept + (Math.random() * 2 - 1) * noise;
        pts.push({ x, y });
      }
      return pts;
    },
    // k gaussian blobs, each labeled by its cluster index.
    blobs(k, perBlob, { xMin = 0, xMax = 10, yMin = 0, yMax = 10, spread = 0.8 } = {}) {
      const pts = [];
      for (let c = 0; c < k; c++) {
        const cx = lerp(xMin + 1, xMax - 1, Math.random());
        const cy = lerp(yMin + 1, yMax - 1, Math.random());
        for (let i = 0; i < perBlob; i++) {
          pts.push({ x: cx + gauss() * spread, y: cy + gauss() * spread, label: c });
        }
      }
      return pts;
    },
    // Two labeled classes for classification (label 0 / 1).
    twoClasses(perClass, { xMin = 0, xMax = 10, yMin = 0, yMax = 10, spread = 1.1 } = {}) {
      const pts = [];
      const centers = [
        { x: lerp(xMin + 1, (xMin + xMax) / 2, Math.random()), y: lerp(yMin + 1, yMax - 1, Math.random()) },
        { x: lerp((xMin + xMax) / 2, xMax - 1, Math.random()), y: lerp(yMin + 1, yMax - 1, Math.random()) },
      ];
      for (let c = 0; c < 2; c++) {
        for (let i = 0; i < perClass; i++) {
          pts.push({ x: centers[c].x + gauss() * spread, y: centers[c].y + gauss() * spread, label: c });
        }
      }
      return pts;
    },
    gauss,
  };

  function gauss() {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // --- Registry & routing --------------------------------------------------
  const registry = [];
  function register(def) { registry.push(def); }

  let cleanups = [];
  function runCleanups() { cleanups.forEach((fn) => { try { fn(); } catch (e) {} }); cleanups = []; }

  function buildLayout(host, def) {
    host.innerHTML = "";
    const screen = el("div", "screen");

    const head = el("div", "screen-head");
    head.append(el("h1", "", def.name));
    head.append(el("p", "screen-desc", def.blurb));
    screen.append(head);

    const body = el("div", "screen-body");

    const left = el("div", "controls-col");
    const dataPanel = panel("Data Controls");
    const hyperPanel = panel("Hyperparameters");
    const metricsPanel = panel("Metrics");
    left.append(dataPanel.wrap, hyperPanel.wrap, metricsPanel.wrap);

    const right = el("div", "viz-col");
    const vizPanel = panel("Main Visualization");
    const internalPanel = panel("Internal Algorithm View");
    right.append(vizPanel.wrap, internalPanel.wrap);

    body.append(left, right);
    screen.append(body);

    const explainPanel = panel("Key Intuition & Notes");
    screen.append(explainPanel.wrap);

    host.append(screen);

    return {
      panels: {
        data: dataPanel.body, hyper: hyperPanel.body, metrics: metricsPanel.body,
        viz: vizPanel.body, internal: internalPanel.body, explain: explainPanel.body,
      },
      titles: { internal: internalPanel.titleEl },
    };
  }

  function panel(title) {
    const wrap = el("div", "panel");
    const titleEl = el("h2", "", title);
    const body = el("div", "panel-body");
    wrap.append(titleEl, body);
    return { wrap, body, titleEl };
  }

  // A canvas sized for a panel; appended to `parent`.
  function canvas(parent, w, h, cls) {
    const c = el("canvas", cls || "");
    c.width = w; c.height = h;
    parent.append(c);
    return c;
  }

  function start(id) {
    const def = registry.find((d) => d.id === id) || registry.find((d) => d.status === "ready");
    if (!def) return;
    runCleanups();
    highlightNav(def.id);
    if (def.status !== "ready") {
      const host = document.getElementById("stage");
      host.innerHTML = "";
      const s = el("div", "screen");
      const head = el("div", "screen-head");
      head.append(el("h1", "", def.name));
      head.append(el("p", "screen-desc", def.blurb));
      s.append(head);
      const soon = el("div", "panel");
      soon.append(el("h2", "", "Coming soon"));
      const b = el("div", "panel-body");
      ui.note(b, def.intuition ? `<b>Key intuition:</b> ${def.intuition}` : "This screen is on the roadmap.");
      ui.note(b, "This algorithm is specified in <code>docs/DataScience_Playground_Spec.md</code> and not yet built. Pick a ready algorithm from the list to explore now.");
      soon.append(b);
      s.append(soon);
      host.append(s);
      location.hash = def.id;
      return;
    }
    const host = document.getElementById("stage");
    const layout = buildLayout(host, def);
    const ctx = {
      ...layout,
      COLORS, CLASS_COLORS, ui, data, Plot, canvas, clamp, lerp, enablePointEditing,
      onCleanup: (fn) => cleanups.push(fn),
    };
    // Standard intuition note in the explanation panel.
    if (def.intuition) ui.note(layout.panels.explain, `<b>Key intuition:</b> ${def.intuition}`);
    def.mount(ctx);
    location.hash = def.id;
  }

  function highlightNav(id) {
    document.querySelectorAll(".nav-item").forEach((n) => {
      n.classList.toggle("active", n.dataset.id === id);
    });
  }

  function buildNav() {
    const nav = document.getElementById("nav");
    const phases = {};
    registry.forEach((d) => { (phases[d.phase] = phases[d.phase] || []).push(d); });
    Object.keys(phases).sort().forEach((phase) => {
      nav.append(el("div", "nav-phase", phase));
      phases[phase].forEach((d) => {
        const item = el("a", "nav-item");
        item.dataset.id = d.id;
        item.href = "#" + d.id;
        item.append(el("span", "nav-name", d.name));
        if (d.status !== "ready") item.append(el("span", "nav-badge", "soon"));
        item.addEventListener("click", (e) => { e.preventDefault(); start(d.id); });
        nav.append(item);
      });
    });
  }

  function init() {
    buildNav();
    const fromHash = location.hash.replace("#", "");
    start(fromHash || undefined);
  }

  return { register, init, COLORS, CLASS_COLORS, ui, data, Plot, canvas, clamp, lerp, enablePointEditing };
})();
