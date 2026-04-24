/* ═══════════════════════════════════════════════════════════════════════
   Voice Visualizer — Embed version
   Mountable to any container. Call mountVisualizer(selector, opts).
   opts: { loop, valleyWidth, valleyDepth, density, opacity, compact }
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SVGNS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;

  const CREAM = "oklch(0.94 0.02 85)";
  const DIM   = "oklch(0.55 0.01 85)";
  const ACCENTS = [
    "oklch(0.85 0.14 165)",
    "oklch(0.82 0.12 220)",
    "oklch(0.72 0.16 310)",
    "oklch(0.78 0.17 350)",
    "oklch(0.88 0.15 95)",
  ];

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.mountVisualizer = function (container, opts) {
    opts = opts || {};
    const LOOP = opts.loop || 8;
    const VALLEY_WIDTH = opts.valleyWidth != null ? opts.valleyWidth : 0.32;
    const VALLEY_DEPTH = opts.valleyDepth != null ? opts.valleyDepth : 0.35;
    const COL_SPACING = opts.colSpacing || 14;
    const OPACITY = opts.opacity != null ? opts.opacity : 1;
    const SEED = opts.seed || 7;

    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;
    if (W <= 0 || H <= 0) return;

    // Clear
    el.innerHTML = '';
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';

    // Dot grid
    const dots = document.createElementNS(SVGNS, "svg");
    dots.setAttribute("width", W);
    dots.setAttribute("height", H);
    dots.style.cssText = "position:absolute;inset:0;display:block;pointer-events:none;opacity:0.6;";
    const spacing = 28;
    const dotCols = Math.ceil(W / spacing) + 1;
    const dotRows = Math.ceil(H / spacing) + 1;
    const dotFrag = document.createDocumentFragment();
    for (let r = 0; r < dotRows; r++) {
      for (let c = 0; c < dotCols; c++) {
        const d = document.createElementNS(SVGNS, "circle");
        d.setAttribute("cx", c * spacing);
        d.setAttribute("cy", r * spacing);
        d.setAttribute("r", 0.9);
        d.setAttribute("fill", "#ffffff");
        d.setAttribute("opacity", 0.05);
        dotFrag.appendChild(d);
      }
    }
    dots.appendChild(dotFrag);
    el.appendChild(dots);

    // Viz svg
    const viz = document.createElementNS(SVGNS, "svg");
    viz.setAttribute("width", W);
    viz.setAttribute("height", H);
    viz.style.cssText = "position:absolute;inset:0;display:block;pointer-events:none;opacity:" + OPACITY + ";";
    el.appendChild(viz);

    // Build columns
    const PILL_W_BASE = 10;
    const PILL_ROW_H = 10;
    const PILL_H = 6;
    const VIZ_BOTTOM = H * 0.96;
    const VIZ_TOP_ABS = H * 0.36;
    const MAX_VIZ_H = VIZ_BOTTOM - VIZ_TOP_ABS;
    const MAX_PILLS = Math.floor(MAX_VIZ_H / PILL_ROW_H);

    const rand = mulberry32(SEED);
    const numCols = Math.floor(W / COL_SPACING) - 2;
    const startX = (W - (numCols - 1) * COL_SPACING) / 2;

    const cols = [];
    const valleyCenter = W / 2;
    const valleyWidthPx = W * VALLEY_WIDTH;

    for (let i = 0; i < numCols; i++) {
      const x = startX + i * COL_SPACING;
      const edgeDist = Math.min(x, W - x) / (W * 0.5);
      const edgeFalloff = Math.min(1, Math.pow(edgeDist, 0.9) * 1.8);

      const distNorm = Math.abs(x - valleyCenter) / (valleyWidthPx / 2);
      let valleyMult;
      if (distNorm >= 1) valleyMult = 1;
      else {
        const dip = 0.5 + 0.5 * Math.cos(distNorm * Math.PI);
        valleyMult = 1 - dip * VALLEY_DEPTH;
      }

      const heightMult = edgeFalloff * valleyMult * (0.55 + rand() * 0.45);
      const colMaxPills = Math.max(1, Math.floor(MAX_PILLS * heightMult));
      const pillW = PILL_W_BASE + (rand() - 0.5) * 2.5;

      const c1 = 1 + Math.floor(rand() * 2);
      const c2 = 2 + Math.floor(rand() * 3);
      const c3 = 4 + Math.floor(rand() * 4);
      const p1 = rand() * TAU;
      const p2 = rand() * TAU;
      const p3 = rand() * TAU;
      const a1 = 0.38 + rand() * 0.22;
      const a2 = 0.18 + rand() * 0.14;
      const a3 = 0.09 + rand() * 0.09;
      const colPhase = rand() * TAU;
      const baseLevel = 0.38 + rand() * 0.28;

      const floorRoll = rand();
      let minLevel;
      if (floorRoll < 0.15) minLevel = rand() * 0.15;
      else if (floorRoll < 0.65) minLevel = 0.30 + rand() * 0.25;
      else minLevel = 0.50 + rand() * 0.22;

      const accentPill = rand() < 0.22 ? ACCENTS[Math.floor(rand() * ACCENTS.length)] : null;

      const slots = [];
      for (let p = 0; p < colMaxPills; p++) {
        let color;
        const r = rand();
        if (p === colMaxPills - 1 && accentPill) color = accentPill;
        else if (r < 0.05) color = ACCENTS[Math.floor(rand() * ACCENTS.length)];
        else if (r < 0.22) color = DIM;
        else color = CREAM;

        slots.push({
          baseY: VIZ_BOTTOM - p * PILL_ROW_H - PILL_H / 2,
          color,
          breathCycles: 1 + Math.floor(rand() * 2),
          breathPhase: rand() * TAU,
          breathAmp: 0.5 + rand() * 1.1,
          shimmerCycles: 1 + Math.floor(rand() * 3),
          shimmerPhase: rand() * TAU,
          shimmerAmp: 0.08 + rand() * 0.12,
        });
      }

      cols.push({ x, pillW, colMaxPills, c1, c2, c3, p1, p2, p3, a1, a2, a3, colPhase, baseLevel, minLevel, slots });
    }

    // Build rects
    const rects = [];
    const meta = [];
    const frag = document.createDocumentFragment();
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      for (let p = 0; p < col.slots.length; p++) {
        const slot = col.slots[p];
        const rect = document.createElementNS(SVGNS, "rect");
        rect.setAttribute("x", col.x - col.pillW / 2);
        rect.setAttribute("width", col.pillW);
        rect.setAttribute("height", PILL_H);
        rect.setAttribute("rx", 3);
        rect.setAttribute("ry", 3);
        rect.setAttribute("fill", slot.color);
        rect.setAttribute("y", slot.baseY - PILL_H / 2);
        rect.setAttribute("opacity", 0);
        frag.appendChild(rect);
        rects.push(rect);
        meta.push({ col, slot, slotIndex: p });
      }
    }
    viz.appendChild(frag);

    function columnLevel(col, tNorm) {
      const phase = tNorm * TAU + col.colPhase;
      const s1 = Math.sin(phase * col.c1 + col.p1);
      const s2 = Math.sin(phase * col.c2 + col.p2);
      const s3 = Math.sin(phase * col.c3 + col.p3);
      let v = col.baseLevel + col.a1 * s1 + col.a2 * s2 + col.a3 * s3;
      if (v < col.minLevel) v = col.minLevel;
      else if (v > 1) v = 1;
      v = v * v * (3 - 2 * v);
      return v;
    }

    const t0 = performance.now();
    let rafId;
    function frame(now) {
      const t = ((now - t0) / 1000) % LOOP;
      const tNorm = t / LOOP;
      const levelCache = new Map();

      for (let i = 0; i < rects.length; i++) {
        const { col, slot, slotIndex } = meta[i];
        let level = levelCache.get(col);
        if (level === undefined) {
          level = columnLevel(col, tNorm);
          levelCache.set(col, level);
        }
        const activeCount = level * col.colMaxPills;
        const distBelow = activeCount - slotIndex;

        let fillAlpha;
        if (distBelow >= 1) fillAlpha = 1;
        else if (distBelow <= 0) fillAlpha = 0;
        else { const f = distBelow; fillAlpha = f * f * (3 - 2 * f); }

        const breathPhase = tNorm * TAU * slot.breathCycles + slot.breathPhase;
        const dy = Math.sin(breathPhase) * slot.breathAmp * fillAlpha;

        const shimmerPhase = tNorm * TAU * slot.shimmerCycles + slot.shimmerPhase;
        const shimmer = 1 - slot.shimmerAmp * (0.5 - 0.5 * Math.cos(shimmerPhase));

        let finalAlpha = fillAlpha * shimmer;
        if (slotIndex < 2) {
          const floor = slotIndex === 0 ? 0.78 : 0.55;
          finalAlpha = Math.max(finalAlpha, floor * shimmer);
        }

        if (finalAlpha < 0.02) {
          rects[i].setAttribute("opacity", 0);
        } else {
          rects[i].setAttribute("opacity", finalAlpha);
          rects[i].setAttribute("y", slot.baseY + dy - PILL_H / 2);
        }
      }

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // Re-mount on resize
    let resizeTimer;
    const resizeHandler = function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resizeHandler);
        window.mountVisualizer(container, opts);
      }, 250);
    };
    window.addEventListener('resize', resizeHandler);
  };
})();
