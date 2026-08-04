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
/** Smoothstep between two arbitrary edges. */
const ramp = (from, to, x) => smooth(clamp((x - from) / (to - from), 0, 1));

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
 * Hero artwork — "Focus".
 *
 * The hero is an optical bench. Several hundred fine data rays drift in from
 * the left as a tangled, low-contrast field, pass through an invisible lens
 * plane, converge into a caustic in the open lower right, and leave as one
 * clean collimated ribbon. The mouse is the focus ring.
 *
 * Two rules make it safe for the artwork to cover the whole hero:
 *   1. Nothing is ever drawn at the cursor, so no bright spot ever wanders
 *      across the copy.
 *   2. Every alpha passes through heroInkAlpha() as its LAST operation, which
 *      caps ink hard wherever the copy measurably is. No later gain term can
 *      defeat it.
 *
 * There is no persistent trail buffer. Fading one with `destination-out`
 * never reaches zero — 8-bit alpha rounding leaves it stuck around 4-12/255,
 * which would slowly build a grey film across a warm paper hero. Tails are
 * redrawn from closed-form ray positions every frame instead.
 * ------------------------------------------------------------------------- */

/** Ink is cut to this fraction of full strength directly over copy. */
const HERO_MIN_INK = 0.1;
/**
 * Absolute alpha ceilings. Clear space carries the artwork; the copy ceiling is
 * the legibility invariant and must stay low whatever the clear value becomes.
 */
const HERO_CEIL_COPY = 0.03;
const HERO_CEIL_CLEAR = 0.32;
/** Quantised alpha bands. Fine granularity where the copy zone lives. */
const HERO_ALPHA_LEVELS = Object.freeze(
  Array.from({ length: 10 }, (_, k) => HERO_CEIL_CLEAR * (k / 9) ** 2),
);
/** One accent only. Class 0 is also what anything over copy is forced to. */
const HERO_RGB = Object.freeze(["126,108,124", "96,58,88", "75,38,62", "201,37,123"]);
const HERO_WIDTH = Object.freeze([0.85, 1.05, 1.35, 1.5]);
const HERO_MASK_CELL = 12;
const HERO_MASK_FEATHER = 84;
const HERO_MASK_PAD = 22;

/** A point on the optical axis frame, in canvas pixels. */
export function heroAxisPoint(p, q, frame) {
  return {
    x: frame.xL + p * frame.cos - q * frame.sin,
    y: frame.yA + p * frame.sin + q * frame.cos,
  };
}

/** 1 at perfect focus (cursor centred), 0 at either edge of the hero. */
export const heroSharp = (driveX) => smooth(1 - Math.min(Math.abs(driveX), 1));

/** Focal length, driven by the cursor's horizontal position. */
export const heroFocalLength = (driveX, sensor) =>
  sensor * (1 + 0.55 * clamp(driveX, -1, 1));

/** Turbulence: full upstream, gone by the focus. Chaos becoming order. */
export const heroTurbulence = (p, sensor) => 1 - 0.94 * ramp(-0.15 * sensor, sensor, p);

/** 1 inside a copy rect, 0 once clear of every rect by `feather`. */
export function heroMaskValue(x, y, rects, feather) {
  let nearest = Infinity;
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i];
    const dx = Math.max(rect.x0 - x, 0, x - rect.x1);
    const dy = Math.max(rect.y0 - y, 0, y - rect.y1);
    const squared = dx * dx + dy * dy;
    if (squared < nearest) nearest = squared;
  }
  if (nearest === Infinity) return 0;
  return 1 - smooth(clamp(Math.sqrt(nearest) / feather, 0, 1));
}

/**
 * The legibility invariant: scale ink down over copy, then clamp it under an
 * absolute ceiling. This must be the last thing done to any alpha.
 */
export function heroInkAlpha(raw, mask) {
  const m = clamp(mask, 0, 1);
  const scale = HERO_MIN_INK + (1 - HERO_MIN_INK) * (1 - m);
  const ceiling = HERO_CEIL_COPY + (HERO_CEIL_CLEAR - HERO_CEIL_COPY) * (1 - m);
  return Math.min(Math.max(raw, 0) * scale, ceiling);
}

/** Deterministic RNG, so the reduced-motion still frame is identical every load. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-line boxes for text, element boxes for controls. */
function heroCopyRects(hero) {
  const lineRects = (selector) => {
    const element = hero.querySelector(selector);
    if (!element) return [];
    const box = element.getBoundingClientRect();
    let rects = [];
    try {
      const range = document.createRange();
      range.selectNodeContents(element);
      rects = [...range.getClientRects()].filter((r) => r.width > 4 && r.height > 4);
    } catch {
      rects = [];
    }
    // Some engines merge a wrapped, balanced headline into one rect. If the
    // element is clearly taller than what came back, trust the element box.
    if (rects.length < 2 && box.height > (rects[0]?.height ?? 0) * 1.6) return [box];
    return rects.length ? rects : [box];
  };

  const boxes = [
    ...lineRects(".eyebrow"),
    ...lineRects("h1"),
    ...lineRects(".hero__footer p"),
    ...[...hero.querySelectorAll(".hero-actions .button")].map((e) => e.getBoundingClientRect()),
    ...[...hero.querySelectorAll(".scroll-cue")].map((e) => e.getBoundingClientRect()),
  ];

  const origin = hero.getBoundingClientRect();
  return boxes.map((box) => ({
    x0: box.left - origin.left - HERO_MASK_PAD,
    y0: box.top - origin.top - HERO_MASK_PAD,
    x1: box.right - origin.left + HERO_MASK_PAD,
    y1: box.bottom - origin.top + HERO_MASK_PAD,
  }));
}

function setupHeroArt() {
  const canvas = $("[data-hero-art]");
  const hero = canvas?.closest(".hero");
  if (!canvas || !hero) return;

  const still = reducedMotion();
  const rnd = mulberry32(0x4b524d01);
  const MAX_RAYS = 1100;
  /** Seconds of travel a streak represents. This is what reads as flow. */
  const STREAK_SECONDS = 0.35;

  // --- ray state, allocated once -----------------------------------------
  const aperture = new Float32Array(MAX_RAYS);
  const along = new Float32Array(MAX_RAYS);
  const speed = new Float32Array(MAX_RAYS);
  const phaseA = new Float32Array(MAX_RAYS);
  const phaseB = new Float32Array(MAX_RAYS);
  const rarity = new Float32Array(MAX_RAYS);
  const dither = new Float32Array(MAX_RAYS);

  const seedRay = (i, spread) => {
    aperture[i] = 2 * rnd() - 1;
    along[i] = spread ? rnd() : 0;
    speed[i] = (1 / 7.5) * (0.75 + 0.5 * rnd());
    phaseA[i] = rnd() * TAU;
    phaseB[i] = rnd() * TAU;
    rarity[i] = rnd() ** 2.1;
    dither[i] = rnd();
  };
  for (let i = 0; i < MAX_RAYS; i += 1) seedRay(i, true);

  // --- copy mask ----------------------------------------------------------
  let mask = new Float32Array(1);
  let maskGradX = new Float32Array(1);
  let maskGradY = new Float32Array(1);
  let maskW = 1;
  let maskH = 1;
  let ready = false;

  const sample = (grid, x, y) => {
    const gx = clamp(x / HERO_MASK_CELL, 0, maskW - 1.001);
    const gy = clamp(y / HERO_MASK_CELL, 0, maskH - 1.001);
    const ix = gx | 0;
    const iy = gy | 0;
    const fx = gx - ix;
    const fy = gy - iy;
    const a = grid[iy * maskW + ix];
    const b = grid[iy * maskW + ix + 1];
    const c = grid[(iy + 1) * maskW + ix];
    const d = grid[(iy + 1) * maskW + ix + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  };
  const maskAt = (x, y) => sample(mask, x, y);

  const bakeMask = (width, height) => {
    const rects = heroCopyRects(hero);
    // A fixed 84px feather is a fifth of a phone's width and would swallow the
    // little clear space it has, so it scales with the viewport.
    const feather = clamp(width * 0.055, 34, HERO_MASK_FEATHER);
    maskW = Math.ceil(width / HERO_MASK_CELL) + 1;
    maskH = Math.ceil(height / HERO_MASK_CELL) + 1;
    const size = maskW * maskH;
    if (mask.length !== size) {
      mask = new Float32Array(size);
      maskGradX = new Float32Array(size);
      maskGradY = new Float32Array(size);
    }
    for (let gy = 0; gy < maskH; gy += 1) {
      for (let gx = 0; gx < maskW; gx += 1) {
        mask[gy * maskW + gx] = heroMaskValue(
          gx * HERO_MASK_CELL,
          gy * HERO_MASK_CELL,
          rects,
          feather,
        );
      }
    }
    // Central differences, edge replicated. Drives the bow around the glyphs.
    for (let gy = 0; gy < maskH; gy += 1) {
      for (let gx = 0; gx < maskW; gx += 1) {
        const k = gy * maskW + gx;
        const xa = mask[gy * maskW + Math.max(gx - 1, 0)];
        const xb = mask[gy * maskW + Math.min(gx + 1, maskW - 1)];
        const ya = mask[Math.max(gy - 1, 0) * maskW + gx];
        const yb = mask[Math.min(gy + 1, maskH - 1) * maskW + gx];
        maskGradX[k] = (xb - xa) / (2 * HERO_MASK_CELL);
        maskGradY[k] = (yb - ya) / (2 * HERO_MASK_CELL);
      }
    }
  };

  // --- geometry -----------------------------------------------------------
  const geo = {
    rays: 0,
    tail: 5,
    deflect: 0,
    xL: 0,
    yA: 0,
    aperture: 0,
    sensor: 0,
    enter: 0,
    exit: 0,
    theta0: 0,
    wander: 0,
    lift: 0,
  };

  const rebuildGeometry = (width, height) => {
    const wide = width >= 900;
    const tablet = width >= 620;

    if (width >= 1200) {
      geo.rays = 1100;
      geo.tail = 9;
      geo.deflect = 2600;
    } else if (wide) {
      geo.rays = 800;
      geo.tail = 8;
      geo.deflect = 2600;
    } else if (tablet) {
      geo.rays = 480;
      geo.tail = 6;
      geo.deflect = 2200;
    } else {
      geo.rays = 280;
      geo.tail = 4;
      geo.deflect = 0;
    }
    geo.rays = Math.round(geo.rays * Math.min(1, height / 760));
    if ((navigator.hardwareConcurrency || 8) <= 4) geo.rays = Math.round(geo.rays * 0.65);
    geo.rays = Math.max(80, Math.min(geo.rays, MAX_RAYS));

    geo.xL = width * (wide ? 0.52 : tablet ? 0.46 : 0.42);
    // The fan has to reach the top of the hero. A fixed pixel cap here leaves
    // tall viewports with an empty upper third, which is the footer-ribbon
    // failure the old hero had.
    geo.aperture = height * (wide ? 0.68 : tablet ? 0.56 : 0.42);
    geo.sensor = width * (wide ? 0.3 : tablet ? 0.34 : 0.42);
    geo.enter = -(geo.xL + width * 0.12);
    geo.exit = width * 1.15 - geo.xL;
    geo.theta0 = wide ? -0.085 : -0.03;
    // Upstream turbulence. This is the "many scattered inputs" beat, so the
    // rays have to visibly cross and tangle, not merely undulate.
    geo.wander = height * 0.13 * (tablet ? 1 : 0.7);
    geo.lift = height * 0.055;

    // Walk the axis down until the bright end of the piece is clear of copy.
    // This is what guarantees the caustic can never land on the headline at
    // any viewport, breakpoint or headline wrap.
    geo.yA = height * (wide ? 0.72 : tablet ? 0.78 : 0.855);
    for (let step = 0; step < 8; step += 1) {
      const frame = {
        xL: geo.xL,
        yA: geo.yA,
        cos: Math.cos(geo.theta0),
        sin: Math.sin(geo.theta0),
      };
      const focus = heroAxisPoint(geo.sensor, 0, frame);
      if (maskAt(focus.x, focus.y) < 0.08) break;
      geo.yA = Math.min(geo.yA + height * 0.02, height * 0.88);
    }
  };

  // --- pointer ------------------------------------------------------------
  const drive = { x: 0, y: 0, active: 0 };
  const wanted = { x: 0, y: 0, active: 0 };
  let pointerX = -9999;
  let pointerY = -9999;
  let pointerMask = 0;
  let heroBox = null;
  let boxDirty = true;
  let touchRelease = 0;

  const readPointer = (clientX, clientY) => {
    if (boxDirty || !heroBox) {
      heroBox = hero.getBoundingClientRect();
      boxDirty = false;
    }
    const x = clientX - heroBox.left;
    const y = clientY - heroBox.top;
    if (x < -40 || y < -40 || x > heroBox.width + 40 || y > heroBox.height + 40) {
      wanted.active = 0;
      return;
    }
    pointerX = x;
    pointerY = y;
    wanted.x = clamp((x / heroBox.width - 0.5) * 2, -1, 1);
    wanted.y = clamp((y / heroBox.height - 0.5) * 2, -1, 1);
    wanted.active = 1;
  };

  if (!still) {
    // One listener on document: .site-header sits over the top of the hero and
    // would otherwise swallow the event there. Passive, and never on the CTAs.
    document.addEventListener(
      "pointermove",
      (event) => readPointer(event.clientX, event.clientY),
      { passive: true },
    );
    hero.addEventListener(
      "touchmove",
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        window.clearTimeout(touchRelease);
        readPointer(touch.clientX, touch.clientY);
      },
      { passive: true },
    );
    hero.addEventListener("touchend", () => {
      window.clearTimeout(touchRelease);
      touchRelease = window.setTimeout(() => {
        wanted.active = 0;
      }, 1500);
    }, { passive: true });
    window.addEventListener("scroll", () => {
      boxDirty = true;
    }, { passive: true });
    window.addEventListener("blur", () => {
      wanted.active = 0;
    });
  }

  // --- draw buckets -------------------------------------------------------
  const strokes = Array.from({ length: 40 }, () => []);
  // Squares share the stroke quantisation so they obey the same ink ceiling.
  const squares = Array.from({ length: 10 }, () => []);
  const STROKE_STYLE = [];
  for (let cls = 0; cls < 4; cls += 1) {
    for (let level = 0; level < 10; level += 1) {
      STROKE_STYLE.push(`rgba(${HERO_RGB[cls]},${HERO_ALPHA_LEVELS[level].toFixed(4)})`);
    }
  }

  /** Quantise an alpha to a band that is guaranteed to sit under the ceiling. */
  const bandFor = (alpha, mask, jitter) => {
    const ceiling = HERO_CEIL_COPY + (HERO_CEIL_CLEAR - HERO_CEIL_COPY) * (1 - mask);
    let level = clamp(
      Math.round(Math.sqrt(alpha / HERO_CEIL_CLEAR) * 9 + jitter - 0.5),
      0,
      9,
    );
    while (level > 0 && HERO_ALPHA_LEVELS[level] > ceiling) level -= 1;
    return level;
  };

  let intro = 0;
  let fontsSettled = false;
  let flux = 0;
  let lastW = 0;
  let lastH = 0;
  let rebuildTimer = 0;
  let stageRef = null;
  let slowFrames = 0;
  let averageDelta = 1 / 60;
  let latched = false;

  const scheduleRebuild = () => {
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(() => {
      const width = stageRef?.stage.width || canvas.clientWidth || 1;
      const height = stageRef?.stage.height || canvas.clientHeight || 1;
      bakeMask(width, height);
      rebuildGeometry(width, height);
      ready = true;
      boxDirty = true;
      stageRef?.paint();
    }, 120);
  };

  // Scratch points, reused every sample so the loop allocates nothing.
  const pointA = { x: 0, y: 0, p: 0, u: 0, c: 0, m: 0 };
  const pointB = { x: 0, y: 0, p: 0, u: 0, c: 0, m: 0 };

  stageRef = createStage(
    canvas,
    (ctx, stage, delta) => {
      const width = stage.width;
      const height = stage.height;
      if (width !== lastW || height !== lastH) {
        lastW = width;
        lastH = height;
        scheduleRebuild();
      }
      if (!ready) return;

      const dt = Math.min(delta, 1 / 30);
      const moving = stage.motion;
      const time = moving ? stage.time : 6;

      if (moving) {
        // Held at zero until the mask has been baked against the real font.
        // getBoundingClientRect before Playfair swaps in returns fallback
        // metrics, and art must never sit over live type in that window.
        if (fontsSettled) intro += (1 - intro) * (1 - Math.exp(-delta * 2.6));
        const grab = 1 - Math.exp(-delta * 2.2);
        drive.active += (wanted.active - drive.active) * grab;
        // Cubed so the piece rests near focus and only briefly softens: the
        // passive visitor's default view is the resolved one.
        const autoX = 0.62 * Math.sin((TAU * time) / 15) ** 3;
        const autoY = 0.3 * Math.sin((TAU * time) / 23.5);
        const ease = 1 - Math.exp(-delta * 5);
        drive.x += (lerp(autoX, wanted.x, drive.active) - drive.x) * ease;
        drive.y += (lerp(autoY, wanted.y, drive.active) - drive.y) * ease;
      } else {
        intro = 1;
        drive.x = 0;
        drive.y = 0;
        drive.active = 0;
      }

      const sharp = moving ? heroSharp(drive.x) : 0.94;
      const focal = heroFocalLength(drive.x, geo.sensor);
      const theta = geo.theta0 + drive.y * 0.085;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const normalX = -sin;
      const normalY = cos;
      const apertureNow = geo.aperture * (1 - 0.12 * Math.abs(drive.y));
      const hoverRadius = 0.26 * Math.min(width, height);
      pointerMask = drive.active > 0.01 ? maskAt(pointerX, pointerY) : 0;

      for (let i = 0; i < strokes.length; i += 1) strokes[i].length = 0;
      for (let i = 0; i < squares.length; i += 1) squares[i].length = 0;
      let focalHits = 0;

      // Per-ray scratch, captured by evaluate().
      let rayIndex = 0;
      let rayHeight = 0;
      let rayFocal = 0;
      let rayExit = 0;
      let rayWander0 = 0;

      const wanderAt = (p) =>
        geo.wander *
        (Math.sin(p * 0.006 + phaseA[rayIndex] + time * 0.33) +
          0.58 * Math.sin(p * 0.0147 - phaseB[rayIndex] + time * 0.51) +
          0.34 * Math.sin(p * 0.0286 + phaseA[rayIndex] * 1.7 - time * 0.21));

      const evaluate = (out, s) => {
        const p = geo.enter + (geo.exit - geo.enter) * s;
        const gate = heroTurbulence(p, geo.sensor);
        let q;
        let collimation = 0;
        if (p <= 0) {
          q = rayHeight + (gate > 0.02 ? gate * (wanderAt(p) - rayWander0) : 0);
        } else {
          const diverging = rayHeight * (1 - p / rayFocal);
          collimation = sharp * ramp(rayFocal, rayFocal + 0.45 * (geo.exit - rayFocal), p);
          q = diverging + (rayExit - diverging) * collimation - geo.lift * collimation;
          if (gate > 0.02) q += gate * (wanderAt(p) - rayWander0) * 0.1 * (1 - collimation);
        }
        let x = geo.xL + p * cos - q * sin;
        let y = geo.yA + p * sin + q * cos;
        if (geo.deflect) {
          // The copy is a body in the beam: rays bow around the glyph runs.
          const gradient =
            sample(maskGradX, x, y) * normalX + sample(maskGradY, x, y) * normalY;
          x -= gradient * geo.deflect * normalX;
          y -= gradient * geo.deflect * normalY;
        }
        out.x = x;
        out.y = y;
        out.p = p;
        out.u = p > 0 ? p / rayFocal : 0;
        out.c = collimation;
        out.m = maskAt(x, y);
        if (out.u > 0.9 && out.u < 1.1) focalHits += 1;
        return out;
      };

      const emit = (from, to, taper, hover) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        if (dx * dx + dy * dy > 90000) return;
        const m = to.m;
        const u = to.u;
        let base;
        if (to.p <= 0) {
          // Rises as the scattered field approaches the lens.
          base = 0.05 + 0.05 * (1 - to.p / geo.enter);
        } else {
          base =
            0.075 +
            0.04 * Math.min(u, 1.6) +
            0.12 * Math.exp(-(((u - 1) / 0.26) ** 2)) * (0.35 + 0.65 * sharp);
        }
        const raw =
          base * taper * (0.72 + 1.9 * rarity[rayIndex]) * (1 + 0.55 * hover) * intro;
        const alpha = heroInkAlpha(raw, m);
        // Nothing dark, saturated or wide is ever drawn over type.
        let cls = to.p <= 0 ? 0 : rarity[rayIndex] > 0.88 ? 3 : u > 0.78 ? 2 : 1;
        if (m > 0.45) cls = 0;
        const level = bandFor(alpha, m, dither[rayIndex]);
        if (!level) return;
        strokes[cls * 10 + level].push(from.x, from.y, to.x, to.y);
      };

      for (let i = 0; i < geo.rays; i += 1) {
        if (moving) {
          along[i] += speed[i] * dt;
          if (along[i] >= 1) seedRay(i, false);
        }
        rayIndex = i;
        rayHeight = apertureNow * aperture[i];
        const norm = aperture[i];
        // Longitudinal spherical aberration: marginal rays cross nearer than
        // paraxial ones, and the envelope of that family IS the caustic cusp.
        rayFocal = Math.max(focal * (1 - 0.2 * norm * norm), focal * 0.55);
        // Math.sign(0) is 0, which is correct: the axial ray is the axis.
        rayExit = -Math.sign(rayHeight) * (apertureNow * 0.05 + Math.abs(rayHeight) * 0.085);
        rayWander0 = wanderAt(0);

        const head = evaluate(pointA, along[i]);

        let hover = 0;
        if (drive.active > 0.01) {
          const dx = head.x - pointerX;
          const dy = head.y - pointerY;
          hover =
            drive.active *
            Math.exp(-(dx * dx + dy * dy) / (hoverRadius * hoverRadius)) *
            (1 - 0.8 * pointerMask);
        }

        // Raw data points in the stream, which cease to exist once focused.
        if (i % 10 === 0 && head.p <= 0) {
          const alpha = heroInkAlpha(0.14 * (0.72 + 1.9 * rarity[i]) * intro, head.m);
          const level = bandFor(alpha, head.m, dither[i]);
          if (level) squares[level].push(head.x, head.y);
          continue;
        }

        const step =
          (speed[i] * STREAK_SECONDS * (1 + 1.5 * hover) * (1 - 0.35 * head.c)) /
          (geo.tail - 1);
        // Two scratch points, swapped each step, so the loop never allocates.
        let previous = pointA;
        let scratch = pointB;
        for (let j = 1; j < geo.tail; j += 1) {
          const next = evaluate(scratch, Math.max(along[i] - step * j, 0));
          emit(previous, next, 1 - (j - 1) / (geo.tail - 1), hover);
          scratch = previous;
          previous = next;
        }
      }

      // --- emit: at most 40 strokes and 3 fills for the whole field --------
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let b = 0; b < strokes.length; b += 1) {
        const bucket = strokes[b];
        if (!bucket.length) continue;
        ctx.beginPath();
        for (let n = 0; n < bucket.length; n += 4) {
          ctx.moveTo(bucket[n], bucket[n + 1]);
          ctx.lineTo(bucket[n + 2], bucket[n + 3]);
        }
        ctx.strokeStyle = STROKE_STYLE[b];
        ctx.lineWidth = HERO_WIDTH[(b / 10) | 0];
        ctx.stroke();
      }
      for (let b = 1; b < squares.length; b += 1) {
        const bucket = squares[b];
        if (!bucket.length) continue;
        ctx.fillStyle = STROKE_STYLE[b];
        for (let n = 0; n < bucket.length; n += 2) {
          ctx.fillRect(bucket[n] - 1, bucket[n + 1] - 1, 2, 2);
        }
      }

      // --- the caustic ------------------------------------------------------
      // 0.047 is the fraction of each ray's path that lies inside the focal
      // band, so this is the sample count expected at steady state.
      const expected = Math.max(1, geo.rays * geo.tail * 0.047);
      const arrival = clamp((focalHits / expected - 0.8) / 0.45, 0, 1);
      flux += (arrival - flux) * (1 - Math.exp(-dt / 0.35));

      const frame = { xL: geo.xL, yA: geo.yA, cos, sin };
      const focus = heroAxisPoint(focal, 0, frame);
      const behind = heroAxisPoint(focal * 0.78, 0, frame);

      const spine = ctx.createLinearGradient(behind.x, behind.y, focus.x, focus.y);
      spine.addColorStop(0, "rgba(201,37,123,0)");
      spine.addColorStop(1, `rgba(201,37,123,${((0.06 + 0.3 * sharp) * intro).toFixed(3)})`);
      ctx.beginPath();
      ctx.moveTo(behind.x, behind.y);
      ctx.lineTo(focus.x, focus.y);
      ctx.strokeStyle = spine;
      ctx.lineWidth = 1.2 + 2.6 * sharp;
      ctx.stroke();

      const radius = (8 + 34 * (1 - sharp)) * (1 + 0.1 * flux);
      const bloom = (cx, cy, scale, hot, mid) => {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(radius, 1));
        gradient.addColorStop(
          0,
          `rgba(${hot},${((0.42 + 0.3 * sharp * flux) * intro * scale).toFixed(3)})`,
        );
        gradient.addColorStop(
          0.28,
          `rgba(${mid},${(0.26 * (0.4 + 0.6 * sharp) * intro * scale).toFixed(3)})`,
        );
        gradient.addColorStop(0.62, `rgba(201,37,123,${(0.1 * intro * scale).toFixed(3)})`);
        gradient.addColorStop(1, "rgba(201,37,123,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      };

      // Defocused light disperses into a colour fringe — kept in palette.
      if (sharp < 0.62) {
        const offset = (1 - sharp) * 8;
        bloom(focus.x - offset * cos, focus.y - offset * sin, 0.35, "75,38,62", "75,38,62");
        bloom(focus.x + offset * cos, focus.y + offset * sin, 0.35, "228,206,221", "228,206,221");
      }
      bloom(focus.x, focus.y, 1, "255,253,255", "243,185,216");

      ctx.beginPath();
      ctx.arc(focus.x, focus.y, 1.1 + 2.4 * sharp, 0, TAU);
      ctx.fillStyle = `rgba(255,252,254,${((0.55 + 0.42 * sharp * flux) * intro).toFixed(3)})`;
      ctx.fill();

      // --- one-shot quality latch ------------------------------------------
      if (moving && !latched) {
        averageDelta += (delta - averageDelta) * 0.05;
        slowFrames = averageDelta > 0.021 ? slowFrames + 1 : 0;
        if (slowFrames > 45) {
          geo.rays = Math.round(geo.rays * 0.7);
          geo.tail = Math.max(3, geo.tail - 1);
          latched = true;
        }
      }
    },
    { maxRatio: canvas.clientWidth >= 620 ? 1.5 : 1.25 },
  );

  if (!stageRef) return;

  // The mask is measured from the DOM, so it must be rebuilt whenever the copy
  // could have moved — including when Playfair Display finally swaps in.
  scheduleRebuild();
  if ("ResizeObserver" in window) {
    const inner = hero.querySelector(".hero__inner");
    if (inner) new ResizeObserver(scheduleRebuild).observe(inner);
  }
  const settleFonts = () => {
    if (fontsSettled) return;
    fontsSettled = true;
    scheduleRebuild();
  };
  document.fonts?.ready?.then(settleFonts);
  // Always keep the fallback: if document.fonts is missing or never resolves,
  // the hero would otherwise stay invisible forever.
  window.setTimeout(settleFonts, 1200);
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
