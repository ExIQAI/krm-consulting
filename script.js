export const TESTIMONIALS = Object.freeze([
  {
    title: "World Surf League",
    organisation: "Google for Publishers customer story",
    videoId: "hJYOADLk4hU",
    sourceUrl: "https://www.youtube.com/watch?v=hJYOADLk4hU",
    summary:
      "An external customer-story example showing how a real video testimonial can add human proof to a strategic narrative.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
  {
    title: "El Clasificado",
    organisation: "Google for Publishers customer story",
    videoId: "hV5xGbiG0yw",
    sourceUrl: "https://www.youtube.com/watch?v=hV5xGbiG0yw",
    summary:
      "An external example selected to demonstrate the pacing, hierarchy and source attribution of KRM's future client stories.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
  {
    title: "Curb Free with Cory Lee",
    organisation: "Google for Publishers customer story",
    videoId: "T60qPeU_eoQ",
    sourceUrl: "https://www.youtube.com/watch?v=T60qPeU_eoQ",
    summary:
      "An external example showing how accessible video, a clear summary and an attributed source work together.",
    disclaimer:
      "Demonstration content — external Google customer story, not a KRM testimonial.",
  },
]);

/**
 * Illustrative channel mix used by the scroll story. The figures are indicative
 * teaching numbers, not client results — both columns are declared as whole
 * percentages and each column sums to 100.
 */
export const CHANNELS = Object.freeze([
  { name: "Google / Search", spend: 28, growth: 33, lead: true },
  { name: "Social", spend: 22, growth: 26, lead: true },
  { name: "Television", spend: 18, growth: 15, lead: true },
  { name: "Out-of-home", spend: 12, growth: 8, lead: false },
  { name: "Radio", spend: 10, growth: 5, lead: false },
  { name: "Email & CRM", spend: 6, growth: 11, lead: false },
  { name: "Print", spend: 4, growth: 2, lead: false },
]);

export const STORY_STATES = Object.freeze({
  noise: {
    title: "Every channel reporting at once",
    unit: "Unfiltered channel noise",
    metric: null,
  },
  signal: {
    title: "The best ROI for advertising",
    unit: "One signal, separated from the noise",
    metric: null,
  },
  strategy: {
    title: "Optimised advertising spend",
    unit: "Share of working media budget",
    metric: "spend",
  },
  momentum: {
    title: "Where the growth actually came from",
    unit: "Share of measured growth",
    metric: "growth",
  },
});

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (from, to, t) => from + (to - from) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Wraps a canvas in a device-pixel-ratio aware render loop that only runs while
 * the element is on screen. With reduced motion the loop is replaced by
 * single-shot renders so the artwork still composes, it simply stops moving.
 */
function createStage(canvas, draw) {
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;

  const stage = { width: 0, height: 0, time: 0, motion: !reducedMotion() };
  let frameId = 0;
  let running = false;
  let onScreen = true;
  let last = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.max(1, Math.round(rect.width));
    stage.height = Math.max(1, Math.round(rect.height));

    const pixelWidth = Math.round(stage.width * ratio);
    const pixelHeight = Math.round(stage.height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const render = (delta) => {
    resize();
    stage.time += delta;
    ctx.clearRect(0, 0, stage.width, stage.height);
    draw(ctx, stage, delta);
  };

  const tick = (now) => {
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    render(delta);
    frameId = running ? window.requestAnimationFrame(tick) : 0;
  };

  // A large delta makes every eased value land on its target immediately.
  const paint = () => render(4);

  const start = () => {
    if (!stage.motion || running || !onScreen) return;
    running = true;
    last = 0;
    frameId = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { rootMargin: "120px" },
    ).observe(canvas);
  }

  window.addEventListener("resize", paint, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  paint();
  start();

  return { stage, paint };
}

const HERO_STRAND_COUNT = 9;
const HERO_SEGMENTS = 54;

/**
 * Hero artwork: many channel strands flow in from the left, braid together and
 * merge into a single signal that opens out towards the top right.
 */
function setupHeroArt() {
  const canvas = $("[data-hero-art]");
  if (!canvas) return;

  // Deterministic per-strand character, so the composition is stable on reload.
  const strands = Array.from({ length: HERO_STRAND_COUNT }, (_, index) => ({
    origin: 0.2 + (index / (HERO_STRAND_COUNT - 1)) * 0.92,
    amplitude: 0.035 + ((index * 37) % 11) / 150,
    fast: 2.2 + ((index * 53) % 17) / 6,
    slow: 4.9 + ((index * 29) % 13) / 4,
    driftA: 0.24 + ((index * 41) % 9) / 44,
    driftB: 0.33 + ((index * 17) % 7) / 26,
    phase: index * 1.37,
    weight: 0.75 + ((index * 23) % 5) / 5,
    flow: 0.1 + ((index * 11) % 7) / 90,
  }));

  const motes = Array.from({ length: 16 }, (_, index) => ({
    x: 0.03 + ((index * 61) % 100) / 168,
    y: 0.56 + ((index * 47) % 100) / 214,
    size: 1.4 + ((index * 13) % 7) / 2.4,
    speed: 0.18 + ((index * 31) % 9) / 30,
    phase: index * 0.83,
  }));

  const spineAt = (t, geo) => {
    const u = 1 - t;
    const x =
      u * u * u * geo.cx +
      3 * u * u * t * geo.p1x +
      3 * u * t * t * geo.p2x +
      t * t * t * geo.ex;
    const y =
      u * u * u * geo.cy +
      3 * u * u * t * geo.p1y +
      3 * u * t * t * geo.p2y +
      t * t * t * geo.ey;
    return { x, y };
  };

  createStage(canvas, (ctx, stage) => {
    const { width, height, time } = stage;
    const cx = width * 0.6;
    const cy = height * 0.66;
    const breathe = Math.sin(time * 0.34) * height * 0.014;

    const geo = {
      cx,
      cy,
      p1x: cx + width * 0.16,
      p1y: cy - height * 0.08 + breathe,
      p2x: width * 0.85,
      p2y: height * 0.16 - breathe,
      ex: width * 1.1,
      ey: -height * 0.14,
    };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Drifting motes in the noisy field on the left.
    motes.forEach((mote) => {
      const x = mote.x * width + Math.sin(time * mote.speed + mote.phase) * width * 0.012;
      const y = mote.y * height + Math.cos(time * mote.speed * 0.8 + mote.phase) * height * 0.02;
      const pulse = 0.24 + (Math.sin(time * 0.9 + mote.phase) + 1) * 0.16;
      ctx.beginPath();
      ctx.arc(x, y, mote.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(75, 38, 62, ${pulse.toFixed(3)})`;
      ctx.fill();
    });

    // The merged flow, drawn as a band that opens out towards the top right.
    const steps = 40;
    const near = [];
    const far = [];
    const maxHalf = Math.min(width * 0.115, 132);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const point = spineAt(t, geo);
      const ahead = spineAt(Math.min(1, t + 0.01), geo);
      const behind = spineAt(Math.max(0, t - 0.01), geo);
      const dx = ahead.x - behind.x;
      const dy = ahead.y - behind.y;
      const length = Math.hypot(dx, dy) || 1;
      const half = 1.6 + Math.pow(t, 1.35) * maxHalf;
      near.push([point.x - (dy / length) * half, point.y + (dx / length) * half]);
      far.push([point.x + (dy / length) * half, point.y - (dx / length) * half]);
    }

    ctx.beginPath();
    near.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = far.length - 1; i >= 0; i -= 1) ctx.lineTo(far[i][0], far[i][1]);
    ctx.closePath();

    const band = ctx.createLinearGradient(geo.cx, geo.cy, geo.ex, geo.ey);
    band.addColorStop(0, "#3b2231");
    band.addColorStop(0.45, "#140e14");
    band.addColorStop(1, "#0b090b");
    ctx.fillStyle = band;
    ctx.shadowColor = "rgba(75, 38, 62, 0.3)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetX = -18;
    ctx.shadowOffsetY = 16;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Incoming strands, braiding as they approach the merge point.
    strands.forEach((strand, index) => {
      const startY = height * strand.origin;
      const strandAt = (t) => {
        const wobble =
          Math.sin(t * strand.fast + time * strand.driftA + strand.phase) * 0.66 +
          Math.sin(t * strand.slow - time * strand.driftB + strand.phase * 0.7) * 0.34;
        return {
          x: lerp(-width * 0.06, cx, t),
          y:
            lerp(startY, cy, smooth(t)) +
            wobble * strand.amplitude * height * Math.pow(1 - t, 1.4),
        };
      };

      ctx.beginPath();
      for (let i = 0; i <= HERO_SEGMENTS; i += 1) {
        const point = strandAt(i / HERO_SEGMENTS);
        if (i) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
      }
      const ink = ctx.createLinearGradient(-width * 0.06, 0, cx, 0);
      ink.addColorStop(0, "rgba(75, 38, 62, 0.02)");
      ink.addColorStop(0.5, "rgba(75, 38, 62, 0.28)");
      ink.addColorStop(0.9, "rgba(160, 46, 108, 0.6)");
      ink.addColorStop(1, "rgba(201, 37, 123, 0.85)");
      ctx.strokeStyle = ink;
      ctx.lineWidth = strand.weight;
      ctx.stroke();

      // Data running down each strand towards the merge point.
      for (let p = 0; p < 2; p += 1) {
        const head = (time * strand.flow + index * 0.19 + p * 0.5) % 1;
        const tail = Math.max(0, head - 0.09);
        // Brightest near the merge, invisible at the far edges.
        const fade = Math.sin(head * Math.PI) * Math.pow(head, 0.7);
        if (fade < 0.03) continue;

        ctx.beginPath();
        for (let s = 0; s <= 6; s += 1) {
          const point = strandAt(lerp(tail, head, s / 6));
          if (s) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        }
        ctx.strokeStyle = `rgba(201, 37, 123, ${(fade * 0.72).toFixed(3)})`;
        ctx.lineWidth = strand.weight * 1.7;
        ctx.stroke();

        const dot = strandAt(head);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 30, 78, ${fade.toFixed(3)})`;
        ctx.fill();
      }
    });

    // The single signal running through the merged flow.
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const point = spineAt(i / steps, geo);
      if (i) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    }
    const signal = ctx.createLinearGradient(geo.cx, geo.cy, geo.ex, geo.ey);
    signal.addColorStop(0, "#c9257b");
    signal.addColorStop(0.55, "#f3b9d8");
    signal.addColorStop(1, "#fff7fb");

    ctx.strokeStyle = "rgba(242, 198, 222, 0.22)";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = signal;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // A pulse travelling out along the signal.
    const travel = (time * 0.19) % 1;
    ctx.save();
    ctx.beginPath();
    const tail = Math.max(0, travel - 0.13);
    for (let i = 0; i <= 18; i += 1) {
      const point = spineAt(lerp(tail, travel, i / 18), geo);
      if (i) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    }
    ctx.strokeStyle = "rgba(255, 250, 246, 0.92)";
    ctx.lineWidth = 3.4;
    ctx.shadowColor = "#f2c6de";
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();

    // The merge point itself.
    const halo = 26 + Math.sin(time * 1.6) * 5;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, halo);
    glow.addColorStop(0, "rgba(255, 247, 251, 0.85)");
    glow.addColorStop(0.35, "rgba(201, 37, 123, 0.32)");
    glow.addColorStop(1, "rgba(201, 37, 123, 0)");
    ctx.beginPath();
    ctx.arc(cx, cy, halo, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff7fb";
    ctx.fill();
  });
}

function setupNavigation() {
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    nav.removeAttribute("data-open");
  };

  toggle.addEventListener("click", () => {
    const willOpen = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(willOpen));
    toggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
    nav.toggleAttribute("data-open", willOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      toggle.focus();
    }
  });
}

const STORY_SEGMENTS = 60;
const STORY_PULSES = 3;

/** Seconds for one strand to complete its morph, and the gap between strands. */
const MORPH_SECONDS = 1.15;
const MORPH_STAGGER = 0.07;
const MORPH_TOTAL = MORPH_SECONDS + MORPH_STAGGER * (CHANNELS.length - 1);

/** Every value that is interpolated between chapters. */
export const MORPH_KEYS = Object.freeze([
  "startY",
  "endY",
  "labelX",
  "labelY",
  "converge",
  "chaos",
  "weight",
  "alpha",
  "accent",
  "leader",
  "trend",
]);

/** Position of each channel when the list is ordered by a metric, best first. */
const rankBy = (metric) => {
  const ranks = new Array(CHANNELS.length);
  CHANNELS.map((channel, index) => index)
    .sort((a, b) => CHANNELS[b][metric] - CHANNELS[a][metric])
    .forEach((index, position) => {
      ranks[index] = position;
    });
  return ranks;
};

const RANKS = Object.freeze({ spend: rankBy("spend"), growth: rankBy("growth") });
const TOP_GROWTH = Math.max(...CHANNELS.map((channel) => channel.growth));

/**
 * Builds the geometry every strand morphs towards for a given chapter.
 * Positions are returned in CSS pixels for the current panel size.
 */
export function storyTargets(state, index, layout) {
  const channel = CHANNELS[index];
  const count = CHANNELS.length;
  const slot = count > 1 ? index / (count - 1) - 0.5 : 0;
  const { midY, nodeX, labelX, fanSpan, labelSpan, stackHeight, compact } = layout;

  const labelY = midY + slot * labelSpan;
  const rankedY = (metric) =>
    midY + (RANKS[metric][index] / (count - 1) - 0.5) * stackHeight * 0.94;

  if (state === "noise") {
    // Nothing has been separated yet: every channel is equally loud and the
    // names sit wherever they landed. On a phone-sized panel there is no room
    // to scatter without the names colliding, so only the strands stay noisy.
    const scatter = ((index * 47) % 100) / 100 - 0.5;
    return {
      startY: midY + slot * fanSpan * 1.5,
      endY: midY + (slot * 1.35 + scatter * 0.3) * fanSpan,
      labelX: compact ? labelX : nodeX * (0.12 + ((index * 29) % 70) / 100),
      labelY: compact ? labelY : midY + (slot * 1.25 + scatter * 0.42) * labelSpan,
      converge: 0,
      chaos: 1.35,
      weight: 1 + (index % 3) * 0.4,
      alpha: 0.46,
      accent: 0,
      leader: 0,
      trend: 0,
    };
  }

  if (state === "signal") {
    // Everything is pulled through one point; only the channels that carry the
    // return stay bright.
    return {
      startY: midY + slot * fanSpan * 1.2,
      endY: midY + slot * fanSpan * 0.12,
      labelX,
      labelY,
      converge: 1,
      chaos: 0.16,
      weight: channel.lead ? 2.6 : 1,
      alpha: channel.lead ? 0.95 : 0.3,
      accent: channel.lead ? 1 : 0,
      leader: channel.lead ? 0.5 : 0.12,
      trend: 0,
    };
  }

  if (state === "strategy") {
    // The plan: one budget divided up. Bands are stacked so each thickness is
    // that channel's share of the whole.
    const share = channel.spend / 100;
    let below = 0;
    for (let i = 0; i < index; i += 1) below += CHANNELS[i].spend / 100;

    return {
      startY: midY + slot * fanSpan * 1.15,
      endY: midY - stackHeight / 2 + (below + share / 2) * stackHeight,
      labelX,
      // Ordered by budget share, which is also the order the channels are
      // declared in — so the plan reads top to bottom, biggest first.
      labelY: rankedY("spend"),
      converge: 1,
      chaos: 0.12,
      weight: Math.max(2, share * stackHeight),
      alpha: channel.lead ? 0.92 : 0.62,
      accent: channel.lead ? 1 : 0.35,
      leader: 0.55,
      trend: 0,
    };
  }

  // Momentum is the result, not the plan, so it is drawn as a trajectory
  // instead of a split: each channel climbs from a baseline to a height set by
  // what it actually returned, and the labels re-order as they overtake.
  const climb = channel.growth / TOP_GROWTH;

  return {
    startY: midY + slot * fanSpan * 1.15,
    endY: midY + stackHeight * 0.44 - climb * stackHeight * 0.94,
    labelX,
    labelY: rankedY("growth"),
    converge: 1,
    chaos: 0.1,
    weight: 1.6 + (channel.growth / 100) * (compact ? 14 : 26),
    alpha: channel.lead ? 0.95 : 0.66,
    accent: channel.lead ? 1 : 0.35,
    leader: 0.55,
    trend: 1,
  };
}

function setupScrollStory() {
  const steps = $$(".story-step[data-chapter]");
  const visual = $("[data-signal-visual]");
  const canvas = $("[data-signal-canvas]");
  const labelHost = $("[data-signal-labels]");
  const caption = $(".signal-caption");
  const titleEl = $("[data-signal-title]");
  const unitEl = $("[data-signal-unit]");
  const dataRows = $("[data-signal-data-rows]");
  if (!steps.length) return;

  if (dataRows) {
    CHANNELS.forEach((channel) => {
      const row = document.createElement("tr");
      const head = document.createElement("th");
      head.scope = "row";
      head.textContent = channel.name;
      row.append(head);
      [channel.spend, channel.growth].forEach((figure) => {
        const cell = document.createElement("td");
        cell.textContent = `${figure}%`;
        row.append(cell);
      });
      dataRows.append(row);
    });
  }

  const labels = labelHost
    ? CHANNELS.map((channel) => {
        const label = document.createElement("span");
        label.className = "signal-label";
        const name = document.createElement("span");
        name.className = "signal-label__name";
        name.textContent = channel.name;
        const value = document.createElement("span");
        value.className = "signal-label__value";
        label.append(name, value);
        labelHost.append(label);
        return { label, value };
      })
    : [];

  let state = "noise";

  // The right-hand column is sized from the widest rendered label so a long
  // channel name plus its percentage can never run off the panel.
  let labelReserve = 200;
  const measureLabels = () => {
    if (!labels.length) return;
    const widest = labels.reduce(
      (max, { label }) => Math.max(max, label.getBoundingClientRect().width),
      0,
    );
    if (widest > 0) labelReserve = widest + 26;
  };
  window.addEventListener("resize", measureLabels, { passive: true });

  // Each channel gets its own wave signature so the noise chapter reads as
  // genuinely uncorrelated rather than one waveform drawn seven times.
  // `from` is the shape at the last chapter change and `at` is the shape being
  // drawn; the morph eases one into the other.
  const nodes = CHANNELS.map((_, index) => ({
    from: {},
    at: {},
    phase: index * 1.31,
    fast: 3.6 + ((index * 43) % 19) / 3.4,
    slow: 7.4 + ((index * 31) % 23) / 2.6,
    drift: 0.38 + ((index * 19) % 11) / 24,
    flow: 0.13 + ((index * 7) % 5) / 60,
    ready: false,
  }));

  // Progress through the current chapter change, 0 to 1 across MORPH_TOTAL.
  let morph = 1;

  let captionSwap = 0;
  let visualStage = null;

  const applyState = (next) => {
    state = next;
    if (visual) visual.dataset.state = next;

    const copy = STORY_STATES[next];
    if (!copy) return;

    // Restart the morph from whatever shape is currently on screen.
    nodes.forEach((node) => {
      if (node.ready) Object.assign(node.from, node.at);
    });
    morph = reducedMotion() ? 1 : 0;

    // Wording and figures cross-fade rather than cutting, so the panel changes
    // as one piece. Scrolling quickly queues several swaps; only the last lands.
    window.clearTimeout(captionSwap);
    caption?.setAttribute("data-swapping", "");
    labelHost?.setAttribute("data-swapping", "");

    captionSwap = window.setTimeout(() => {
      if (titleEl) titleEl.textContent = copy.title;
      if (unitEl) unitEl.textContent = copy.unit;

      labels.forEach(({ label, value }, index) => {
        const channel = CHANNELS[index];
        const figure = copy.metric ? `${channel[copy.metric]}%` : "";
        value.textContent = figure;
        label.toggleAttribute("data-value", Boolean(figure));
        label.toggleAttribute("data-lead", Boolean(channel.lead) && next !== "noise");
      });

      measureLabels();
      caption?.removeAttribute("data-swapping");
      labelHost?.removeAttribute("data-swapping");
    }, reducedMotion() ? 0 : 300);

    // With reduced motion there is no render loop, so the chapter change has to
    // trigger its own repaint. When the loop is running it must not — paint()
    // snaps every eased value and would skip the transition entirely.
    if (visualStage && !visualStage.stage.motion) visualStage.paint();
  };

  if (canvas) {
    visualStage = createStage(canvas, (ctx, stage, delta) => {
      const { width, height, time } = stage;
      const compact = width < 620;
      const labelX = width - clamp(labelReserve, 110, width * 0.46);
      // On a compact panel the caption sits above the artwork, so the field is
      // nudged down and every span is tightened to fit.
      const layout = {
        height,
        compact,
        midY: height * (compact ? 0.56 : 0.5),
        nodeX: labelX * 0.5,
        endX: labelX - (compact ? 14 : 26),
        labelX,
        fanSpan: Math.min(height * (compact ? 0.44 : 0.56), 380),
        labelSpan: compact
          ? Math.min(height * 0.56, 250)
          : clamp(height * 0.55, 200, 430),
        stackHeight: Math.min(height * (compact ? 0.5 : 0.58), compact ? 240 : 470),
      };
      const startX = -width * 0.06;
      const nodeT = (layout.nodeX - startX) / (layout.endX - startX);

      // Butt caps: a round cap on a 90px band would overhang its own label.
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";

      morph = Math.min(1, morph + delta / MORPH_TOTAL);
      const elapsed = morph * MORPH_TOTAL;

      let converged = 0;
      let trending = 0;

      // Pass one: advance the morph. Each strand starts a beat after the one
      // above it, so chapters flow into each other instead of snapping.
      CHANNELS.forEach((_, index) => {
        const node = nodes[index];
        const target = storyTargets(state, index, layout);

        if (!node.ready) {
          MORPH_KEYS.forEach((key) => {
            node.from[key] = target[key];
            node.at[key] = target[key];
          });
          node.ready = true;
        } else {
          const eased = smooth(
            clamp((elapsed - index * MORPH_STAGGER) / MORPH_SECONDS, 0, 1),
          );
          MORPH_KEYS.forEach((key) => {
            node.at[key] = lerp(node.from[key], target[key], eased);
          });
        }

        converged += node.at.converge / CHANNELS.length;
        trending += node.at.trend / CHANNELS.length;
      });

      // The measurement chapter earns a baseline and time gridlines, drawn
      // behind the strands so it reads as a chart rather than a flow.
      if (trending > 0.02) {
        const baseline = layout.midY + layout.stackHeight * 0.44;
        const ticks = compact ? 3 : 5;

        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(228, 206, 221, ${(0.05 * trending).toFixed(3)})`;
        for (let i = 1; i <= ticks; i += 1) {
          const x = lerp(layout.nodeX, layout.endX, i / ticks);
          ctx.beginPath();
          ctx.moveTo(x, baseline);
          ctx.lineTo(x, baseline - layout.stackHeight * 0.98);
          ctx.stroke();
        }

        ctx.strokeStyle = `rgba(228, 206, 221, ${(0.2 * trending).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(layout.nodeX * 0.35, baseline);
        ctx.lineTo(layout.endX, baseline);
        ctx.stroke();
      }

      // Pass two: draw each channel.
      CHANNELS.forEach((_, index) => {
        const node = nodes[index];
        const at = node.at;

        // Where the strand sits as it passes the merge point.
        const freeAtNode = lerp(at.startY, at.endY, smooth(nodeT));
        const pinchY = lerp(freeAtNode, layout.midY, at.converge);

        const pointAt = (t) => {
          const x = lerp(startX, layout.endX, t);
          let base;
          if (t <= nodeT) {
            base = lerp(at.startY, pinchY, smooth(t / nodeT));
          } else {
            const u = (t - nodeT) / (1 - nodeT);
            // A split settles evenly; a result compounds, so the measurement
            // chapter leaves the node flat and steepens as it goes.
            base = lerp(
              lerp(pinchY, at.endY, smooth(u)),
              lerp(pinchY, at.endY, Math.pow(u, 2.1)),
              at.trend,
            );
          }
          const wobble =
            Math.sin(t * node.fast + time * node.drift + node.phase) * 0.62 +
            Math.sin(t * node.slow - time * node.drift * 1.4 + node.phase * 1.7) * 0.3;
          const room = height * 0.075 * at.chaos * (1 - t * t * 0.82);
          return { x, y: base + wobble * room };
        };

        ctx.beginPath();
        for (let i = 0; i <= STORY_SEGMENTS; i += 1) {
          const point = pointAt(i / STORY_SEGMENTS);
          if (i) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        }

        const tint = (a) =>
          at.accent > 0.5
            ? `rgba(242, 198, 222, ${clamp(a, 0, 1).toFixed(3)})`
            : `rgba(228, 206, 221, ${clamp(a, 0, 1).toFixed(3)})`;
        const warm = ctx.createLinearGradient(startX, 0, layout.endX, 0);
        warm.addColorStop(0, tint(at.alpha * 0.1));
        warm.addColorStop(0.45, tint(at.alpha * 0.55));
        warm.addColorStop(1, tint(at.alpha));
        ctx.strokeStyle = warm;
        ctx.lineWidth = Math.max(0.6, at.weight);
        ctx.stroke();

        // Leader line from the end of the strand across to its label.
        if (at.leader > 0.02) {
          const tail = pointAt(1);
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(at.labelX - 10, at.labelY);
          ctx.strokeStyle = `rgba(228, 206, 221, ${(at.leader * 0.42).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Data travelling along the channel: a short streak with a bright head,
        // several in flight at once so every line reads as carrying traffic.
        const streak = Math.min(Math.max(at.weight * 0.5, 1.6), 5);
        for (let p = 0; p < STORY_PULSES; p += 1) {
          const head = (time * node.flow + index * 0.17 + p / STORY_PULSES) % 1;
          const tail = Math.max(0, head - 0.07);
          if (head - tail < 0.01) continue;

          // Fade in and out at the ends so nothing pops on or off.
          const fade = Math.sin(head * Math.PI) * at.alpha;
          if (fade < 0.02) continue;

          ctx.beginPath();
          for (let s = 0; s <= 6; s += 1) {
            const point = pointAt(lerp(tail, head, s / 6));
            if (s) ctx.lineTo(point.x, point.y);
            else ctx.moveTo(point.x, point.y);
          }
          ctx.strokeStyle = `rgba(255, 247, 251, ${(fade * 0.8).toFixed(3)})`;
          ctx.lineWidth = streak;
          ctx.stroke();

          const dot = pointAt(head);
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, streak * 0.6 + 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${fade.toFixed(3)})`;
          ctx.fill();
        }

        // In the measurement chapter each line lands on a marker.
        if (at.trend > 0.05) {
          const end = pointAt(1);
          ctx.beginPath();
          ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 247, 251, ${(at.trend * at.alpha).toFixed(3)})`;
          ctx.fill();
        }

        const entry = labels[index];
        if (entry) {
          entry.label.style.transform =
            `translate(${at.labelX.toFixed(1)}px, ${at.labelY.toFixed(1)}px) translateY(-50%)`;
          entry.label.style.opacity = clamp(at.alpha + 0.24, 0, 1).toFixed(3);
        }
      });

      // The merge point brightens as the chapters converge.
      if (converged > 0.02) {
        const radius = (18 + Math.sin(time * 1.5) * 4) * converged;
        const glow = ctx.createRadialGradient(
          layout.nodeX,
          layout.midY,
          0,
          layout.nodeX,
          layout.midY,
          Math.max(radius, 1),
        );
        glow.addColorStop(0, `rgba(255, 247, 251, ${(0.9 * converged).toFixed(3)})`);
        glow.addColorStop(0.4, `rgba(242, 198, 222, ${(0.3 * converged).toFixed(3)})`);
        glow.addColorStop(1, "rgba(242, 198, 222, 0)");
        ctx.beginPath();
        ctx.arc(layout.nodeX, layout.midY, Math.max(radius, 1), 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    });
  }

  const activate = (step) => {
    steps.forEach((item) => item.toggleAttribute("data-active", item === step));
    if (step.dataset.chapter !== state) applyState(step.dataset.chapter);
  };

  applyState(steps[0].dataset.chapter);
  steps[0].setAttribute("data-active", "");

  if (!("IntersectionObserver" in window)) return;

  // Ratios are kept for every step, not just the ones in the current callback,
  // so the active chapter is always the most visible one on the page.
  const ratios = new Map(steps.map((step) => [step, 0]));

  const onIntersect = (entries) => {
    entries.forEach((entry) => {
      ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });

    let best = null;
    let bestRatio = 0;
    ratios.forEach((ratio, step) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = step;
      }
    });

    if (best) activate(best);
  };

  const narrow = window.matchMedia("(max-width: 820px)");
  let observer = null;

  const observe = () => {
    observer?.disconnect();
    steps.forEach((step) => ratios.set(step, 0));
    observer = new IntersectionObserver(onIntersect, {
      // On narrow screens the panel is pinned over the top of the viewport, so
      // the active chapter is read from the copy actually visible below it.
      rootMargin: narrow.matches ? "-62% 0px -6%" : "-25% 0px -25%",
      threshold: [0, 0.2, 0.45, 0.7, 1],
    });
    steps.forEach((step) => observer.observe(step));
  };

  observe();
  narrow.addEventListener?.("change", observe);
}

function setupReveals() {
  const items = $$(".reveal");
  if (!items.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.setAttribute("data-visible", ""));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-visible", "");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.15 },
  );

  items.forEach((item) => observer.observe(item));
}

function setupTestimonials() {
  const selectors = $("#video-selectors");
  const play = $("#video-play");
  const poster = $("#video-poster");
  const title = $("#video-title");
  const organisation = $("#video-organisation");
  const summary = $("#video-summary");
  const source = $("#video-source");
  const frameSlot = $("#video-frame-slot");

  if (!selectors || !play || !poster || !title || !organisation || !summary || !source || !frameSlot) return;

  let selectedIndex = 0;

  const posterUrl = (videoId, quality = "maxresdefault") =>
    `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;

  const resetPlayer = () => {
    frameSlot.replaceChildren();
    play.hidden = false;
  };

  const renderSelection = (index, focus = false) => {
    selectedIndex = index;
    const item = TESTIMONIALS[index];
    resetPlayer();
    poster.src = posterUrl(item.videoId);
    poster.alt = `Video preview for ${item.title}`;
    poster.dataset.fallback = "false";
    title.textContent = item.title;
    organisation.textContent = item.organisation;
    summary.textContent = item.summary;
    source.href = item.sourceUrl;
    source.textContent = `View ${item.title} on YouTube`;
    play.setAttribute("aria-label", `Load the ${item.title} demonstration video`);

    $$("button", selectors).forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      button.toggleAttribute("data-active", active);
    });

    if (focus) $$("button", selectors)[index]?.focus();
  };

  poster.addEventListener("error", () => {
    if (poster.dataset.fallback === "true") return;
    poster.dataset.fallback = "true";
    poster.src = posterUrl(TESTIMONIALS[selectedIndex].videoId, "hqdefault");
  });

  TESTIMONIALS.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "video-selector";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "video-feature");
    button.innerHTML = `<span class="video-selector__number">0${index + 1}</span><span><strong>${item.title}</strong><small>${item.organisation}</small><em>${item.disclaimer}</em></span>`;
    button.addEventListener("click", () => renderSelection(index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = TESTIMONIALS.length - 1;
      else if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % TESTIMONIALS.length;
      else next = (index - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
      renderSelection(next, true);
    });
    selectors.append(button);
  });

  play.addEventListener("click", () => {
    const item = TESTIMONIALS[selectedIndex];
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&modestbranding=1`;
    iframe.title = `${item.title} — external demonstration video`;
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    frameSlot.replaceChildren(iframe);
    play.hidden = true;
    iframe.focus();
  });

  renderSelection(0);
}

function setupDemoForm() {
  const form = $("#demo-form");
  const button = $("#demo-submit");
  const status = $("#form-status");
  if (!form || !button || !status) return;

  const runDemo = () => {
    if (!form.reportValidity()) {
      status.textContent = "Please complete the required fields to preview the form response.";
      status.dataset.state = "error";
      return;
    }

    status.textContent = "Demo complete — your information was not sent or stored.";
    status.dataset.state = "success";
    form.reset();
    button.textContent = "Demo complete";
    window.setTimeout(() => {
      button.textContent = "Preview enquiry response";
    }, 2400);
  };

  button.addEventListener("click", runDemo);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      runDemo();
    }
  });
}

function setupHeader() {
  const header = $(".site-header");
  if (!header) return;
  const update = () => header.toggleAttribute("data-scrolled", window.scrollY > 24);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

if (typeof document !== "undefined") {
  setupNavigation();
  setupHeader();
  setupHeroArt();
  setupScrollStory();
  setupReveals();
  setupTestimonials();
  setupDemoForm();
}
