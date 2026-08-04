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

const TAU = Math.PI * 2;
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
function createStage(canvas, draw, { maxRatio = 2 } = {}) {
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;

  const stage = { width: 0, height: 0, time: 0, motion: !reducedMotion() };
  let frameId = 0;
  let running = false;
  let onScreen = true;
  let last = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
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

  // Repaint whenever the element's box changes. This also covers the first
  // paint landing before layout has settled: with reduced motion there is no
  // render loop to correct a canvas that was sized while it had no width.
  if ("ResizeObserver" in window) {
    new ResizeObserver(paint).observe(canvas);
  } else {
    window.addEventListener("resize", paint, { passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  paint();
  start();

  return { stage, paint };
}


/* ---------------------------------------------------------------------------
 * Hero artwork — gravity stars inside a slow field of translucent colour.
 * ------------------------------------------------------------------------- */

const HERO_MIN_INK = 0.1;
const HERO_CEIL_COPY = 0.03;
const HERO_CEIL_CLEAR = 0.34;
const HERO_MASK_PAD = 24;
const HERO_STAR_COLOURS = Object.freeze([
  "75,38,62",
  "115,52,91",
  "163,70,120",
  "201,37,123",
  "228,206,221",
]);
const HERO_BUBBLES = Object.freeze([
  { x: 0.86, y: 0.23, radius: 0.52, colour: "228,206,221", alpha: 0.42, phase: 0.2, speed: 0.12, depth: 0.8 },
  { x: 0.95, y: 0.76, radius: 0.58, colour: "75,38,62", alpha: 0.16, phase: 1.7, speed: 0.08, depth: 1.1 },
  { x: 0.67, y: 0.88, radius: 0.4, colour: "201,37,123", alpha: 0.14, phase: 3.4, speed: 0.1, depth: 0.65 },
  { x: 0.58, y: 0.08, radius: 0.34, colour: "244,218,233", alpha: 0.24, phase: 4.8, speed: 0.07, depth: 0.45 },
  { x: 1.08, y: 0.34, radius: 0.38, colour: "133,74,112", alpha: 0.16, phase: 5.7, speed: 0.09, depth: 0.9 },
]);

export function heroMaskValue(x, y, rects, feather) {
  let nearest = Infinity;
  for (const rect of rects) {
    const dx = Math.max(rect.x0 - x, 0, x - rect.x1);
    const dy = Math.max(rect.y0 - y, 0, y - rect.y1);
    nearest = Math.min(nearest, dx * dx + dy * dy);
  }
  if (nearest === Infinity) return 0;
  return 1 - smooth(clamp(Math.sqrt(nearest) / feather, 0, 1));
}

export function heroInkAlpha(raw, mask) {
  const protectedAmount = clamp(mask, 0, 1);
  const scale = HERO_MIN_INK + (1 - HERO_MIN_INK) * (1 - protectedAmount);
  const ceiling =
    HERO_CEIL_COPY + (HERO_CEIL_CLEAR - HERO_CEIL_COPY) * (1 - protectedAmount);
  return Math.min(Math.max(raw, 0) * scale, ceiling);
}

export function heroGravity(dx, dy, influence = 210, strength = 62) {
  const distance = Math.hypot(dx, dy);
  if (!distance || distance >= influence) return { x: 0, y: 0, weight: 0 };
  const weight = smooth(1 - distance / influence);
  return {
    x: (dx / distance) * strength * weight,
    y: (dy / distance) * strength * weight,
    weight,
  };
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function heroCopyRects(hero) {
  const origin = hero.getBoundingClientRect();
  const elements = [
    hero.querySelector(".eyebrow"),
    hero.querySelector("h1"),
    hero.querySelector(".hero__footer p"),
    ...hero.querySelectorAll(".hero-actions .button"),
    hero.querySelector(".scroll-cue"),
  ].filter(Boolean);

  return elements.map((element) => {
    const box = element.getBoundingClientRect();
    return {
      x0: box.left - origin.left - HERO_MASK_PAD,
      y0: box.top - origin.top - HERO_MASK_PAD,
      x1: box.right - origin.left + HERO_MASK_PAD,
      y1: box.bottom - origin.top + HERO_MASK_PAD,
    };
  });
}

function setupHeroArt() {
  const canvas = $("[data-hero-art]");
  const hero = canvas?.closest(".hero");
  if (!canvas || !hero) return;

  const random = mulberry32(0x4b524d02);
  const still = reducedMotion();
  const pointer = { x: 0, y: 0, active: 0 };
  const wanted = { x: 0, y: 0, active: 0 };
  let stars = [];
  let copyRects = [];
  let lastWidth = 0;
  let lastHeight = 0;

  const rebuild = (width, height) => {
    const count = width < 620 ? 48 : width < 1100 ? 68 : 84;
    stars = Array.from({ length: count }, () => {
      const angle = random() * TAU;
      const speed = 5 + random() * 12;
      return {
        x: random() * width,
        y: random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseVx: Math.cos(angle) * speed,
        baseVy: Math.sin(angle) * speed,
        radius: 0.7 + random() * 1.9,
        opacity: 0.32 + random() * 0.48,
        colour: HERO_STAR_COLOURS[Math.floor(random() * HERO_STAR_COLOURS.length)],
        phase: random() * TAU,
      };
    });
    copyRects = heroCopyRects(hero);
    lastWidth = width;
    lastHeight = height;
  };

  const readPointer = (event) => {
    const box = hero.getBoundingClientRect();
    wanted.x = event.clientX - box.left;
    wanted.y = event.clientY - box.top;
    wanted.active = 1;
  };

  if (!still && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    hero.addEventListener("pointermove", readPointer, { passive: true });
    hero.addEventListener("pointerleave", () => {
      wanted.active = 0;
    });
  }

  const stageRef = createStage(
    canvas,
    (ctx, stage, delta) => {
      const { width, height, time } = stage;
      if (width !== lastWidth || height !== lastHeight) rebuild(width, height);

      const ease = 1 - Math.exp(-delta * 5);
      pointer.x = lerp(pointer.x, wanted.x, ease);
      pointer.y = lerp(pointer.y, wanted.y, ease);
      pointer.active = lerp(pointer.active, wanted.active, ease);

      for (const bubble of HERO_BUBBLES) {
        const driftX = Math.sin(time * bubble.speed + bubble.phase) * width * 0.045;
        const driftY = Math.cos(time * bubble.speed * 0.82 + bubble.phase) * height * 0.055;
        const parallaxX =
          pointer.active * (pointer.x / width - 0.5) * width * 0.055 * bubble.depth;
        const parallaxY =
          pointer.active * (pointer.y / height - 0.5) * height * 0.045 * bubble.depth;
        const x = bubble.x * width + driftX + parallaxX;
        const y = bubble.y * height + driftY + parallaxY;
        const radius = Math.min(width, height) * bubble.radius;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(" + bubble.colour + "," + bubble.alpha + ")");
        gradient.addColorStop(
          0.42,
          "rgba(" + bubble.colour + "," + (bubble.alpha * 0.48).toFixed(3) + ")",
        );
        gradient.addColorStop(1, "rgba(" + bubble.colour + ",0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      if (pointer.active > 0.01) {
        const radius = Math.min(width, height) * 0.28;
        const gradient = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          radius,
        );
        gradient.addColorStop(
          0,
          "rgba(201,37,123," + (0.11 * pointer.active).toFixed(3) + ")",
        );
        gradient.addColorStop(
          0.48,
          "rgba(228,206,221," + (0.07 * pointer.active).toFixed(3) + ")",
        );
        gradient.addColorStop(1, "rgba(228,206,221,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
      }

      for (const star of stars) {
        let gravity = { x: 0, y: 0, weight: 0 };
        if (pointer.active > 0.01) {
          gravity = heroGravity(pointer.x - star.x, pointer.y - star.y);
          star.vx += gravity.x * delta * pointer.active;
          star.vy += gravity.y * delta * pointer.active;
        }

        const returnStrength = 0.24 * delta;
        star.vx += (star.baseVx - star.vx) * returnStrength;
        star.vy += (star.baseVy - star.vy) * returnStrength;
        const speed = Math.hypot(star.vx, star.vy);
        if (speed > 58) {
          star.vx = (star.vx / speed) * 58;
          star.vy = (star.vy / speed) * 58;
        }

        if (!still) {
          star.x += star.vx * delta;
          star.y += star.vy * delta;
        }
        const margin = 16;
        if (star.x < -margin) star.x = width + margin;
        if (star.x > width + margin) star.x = -margin;
        if (star.y < -margin) star.y = height + margin;
        if (star.y > height + margin) star.y = -margin;

        const twinkle = still ? 0.9 : 0.72 + 0.28 * Math.sin(time * 0.8 + star.phase);
        const mask = heroMaskValue(
          star.x,
          star.y,
          copyRects,
          clamp(width * 0.045, 34, 74),
        );
        const alpha = heroInkAlpha(
          star.opacity * twinkle * (1 + gravity.weight * 0.85),
          mask,
        );
        const radius = star.radius * (1 + gravity.weight * 0.55);

        if (gravity.weight > 0.12) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, radius * 3.4, 0, TAU);
          ctx.fillStyle =
            "rgba(" +
            star.colour +
            "," +
            (alpha * gravity.weight * 0.14).toFixed(4) +
            ")";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, radius, 0, TAU);
        ctx.fillStyle = "rgba(" + star.colour + "," + alpha.toFixed(4) + ")";
        ctx.fill();
      }
    },
    { maxRatio: 1.5 },
  );

  if (!stageRef) return;

  const refreshMask = () => {
    copyRects = heroCopyRects(hero);
    stageRef.paint();
  };
  if ("ResizeObserver" in window) {
    const inner = hero.querySelector(".hero__inner");
    if (inner) new ResizeObserver(refreshMask).observe(inner);
  }
  document.fonts?.ready?.then(refreshMask);
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

function setupGuidedStoryScroll() {
  const hero = $(".hero");
  const story = $(".story");
  const steps = $$(".story-step[data-chapter]");
  const afterStory = story?.nextElementSibling;
  const wide = window.matchMedia("(min-width: 821px)");
  if (!hero || !story || !steps.length || !afterStory || reducedMotion()) return;

  let lockedUntil = 0;

  const topOf = (element) => {
    const rect = element.getBoundingClientRect();
    if (element.matches(".story-step")) {
      return window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
    }
    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
    return window.scrollY + rect.top - margin;
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (
        !wide.matches ||
        event.ctrlKey ||
        Math.abs(event.deltaY) < 4 ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      ) return;

      const stops = [topOf(hero), ...steps.map(topOf), topOf(afterStory)];
      const y = window.scrollY;
      const tolerance = Math.max(24, window.innerHeight * 0.03);
      if (y < stops[0] - tolerance || y > stops[stops.length - 1] + tolerance) return;

      const next = event.deltaY > 0
        ? stops.find((stop) => stop > y + tolerance)
        : [...stops].reverse().find((stop) => stop < y - tolerance);
      if (next === undefined) return;

      event.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) {
        lockedUntil = Math.max(lockedUntil, now + 140);
        return;
      }

      lockedUntil = now + 650;
      window.scrollTo({ top: Math.max(0, next), behavior: "smooth" });
    },
    { passive: false },
  );
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
  setupGuidedStoryScroll();
  setupReveals();
  setupTestimonials();
  setupDemoForm();
}
