import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('the enquiry form is explicitly a non-functional demo', () => {
  const html = read('index.html');
  const client = `${html}\n${read('script.js')}`;

  assert.match(html, /Demo form only — your message will not be sent\./);
  assert.doesNotMatch(client, /\/api\/contact\b|\bresend\b|\bfetch\s*\(/i);
});

test('the testimonial demo uses only the three approved videos', () => {
  const html = read('index.html');
  const script = read('script.js');
  const videoIds = [...script.matchAll(/\bvideoId\s*:\s*['"]([^'"]+)['"]/g)]
    .map(([, videoId]) => videoId);

  assert.deepEqual(videoIds, ['hJYOADLk4hU', 'hV5xGbiG0yw', 'T60qPeU_eoQ']);
  assert.match(html, /Demonstration content — external Google customer story, not a KRM testimonial\./);
  assert.doesNotMatch(`${html}\n${script}`, /[?&]autoplay=1|<(?:video|iframe)\b[^>]*\bautoplay\b/i);
});

test('the hero and story artwork are canvas driven, with the old vectors gone', () => {
  const html = read('index.html');

  assert.match(html, /class="hero-art"/);
  assert.equal((html.match(/data-hero-art/g) || []).length, 1);
  assert.equal((html.match(/data-signal-canvas/g) || []).length, 1);
  assert.doesNotMatch(html, /hero-art__ribbon|hero-art__signal-run|hero-art__noise/);
  assert.doesNotMatch(html, /signal-line signal-line--|signal-particle|class="signal-node"/);
  assert.match(html, /<strong class="proof-card__channel">Channel 9<\/strong>/);
  assert.equal((html.match(/team-card__tag/g) || []).length, 2);
});

test('the hero mask marks where the copy is and fades out cleanly', async () => {
  const { heroMaskValue } = await import('../script.js');
  const rects = [{ x0: 100, y0: 150, x1: 900, y1: 420 }];
  const at = (x, y) => heroMaskValue(x, y, rects, 84);

  assert.equal(at(500, 300), 1, 'fully masked inside a copy rect');
  assert.equal(at(500, 420), 1, 'still masked on the boundary');
  assert.equal(at(500, 420 + 84), 0, 'clear once past the feather');
  assert.equal(at(2000, 2000), 0, 'clear far away');
  assert.equal(heroMaskValue(0, 0, [], 84), 0, 'no copy means no mask');

  // Monotonic and continuous as it recedes — the falloff drives the bow around
  // the glyphs, so a discontinuity here would show as a kink in the artwork.
  let previous = 1;
  for (let d = 0; d <= 84; d += 4) {
    const value = at(500, 420 + d);
    assert.ok(value <= previous + 1e-9, `mask must not rise at ${d}px`);
    assert.ok(value >= 0 && value <= 1);
    previous = value;
  }
});

test('hero ink over the copy is bounded no matter what is asked for', async () => {
  const { heroInkAlpha } = await import('../script.js');

  // The invariant: this is the last operation on every alpha, so an absurd
  // upstream gain must still land under the ceiling.
  for (const raw of [0.001, 0.05, 0.2, 1, 40]) {
    assert.ok(heroInkAlpha(raw, 1) <= 0.03 + 1e-9, `capped over copy for ${raw}`);
    assert.ok(heroInkAlpha(raw, 0) <= 0.35, `clear space stays sane for ${raw}`);
  }
  // Clear space is allowed to carry the artwork; copy is not. Keep them far
  // apart so turning the ink up never quietly darkens the text.
  assert.ok(heroInkAlpha(999, 0) > heroInkAlpha(999, 1) * 5);

  // Faint ink is scaled, not clamped, so the ghost behind the copy is real.
  assert.ok(heroInkAlpha(0.02, 1) < heroInkAlpha(0.02, 0));
  assert.ok(heroInkAlpha(0.02, 1) > 0);
  assert.equal(heroInkAlpha(-5, 0), 0, 'negative alpha never inverts');

  // The worst single pixel of artwork behind the body copy must not meaningfully
  // erode contrast. --muted on --paper is only 5.34:1 to begin with, so the
  // bar is "stays comfortably AA and barely moves", not "reaches AAA".
  const luminance = ([r, g, b]) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const paper = [255, 250, 246];
  const ink = [126, 108, 124];
  const muted = luminance([111, 102, 108]);
  const ratio = (bg) => (luminance(bg) + 0.05) / (muted + 0.05);

  const worst = heroInkAlpha(999, 1);
  const baseline = ratio(paper);
  const composite = (alpha) => paper.map((c, i) => c * (1 - alpha) + ink[i] * alpha);

  assert.ok(worst <= 0.03);
  const single = ratio(composite(worst));
  assert.ok(single >= 4.5, `body copy stays WCAG AA, got ${single.toFixed(2)}`);
  assert.ok(
    single > baseline * 0.95,
    `one stroke erodes contrast under 5% (${baseline.toFixed(2)} -> ${single.toFixed(2)})`
  );

  // The ceiling bounds a single stroke, not what happens where several cross
  // the same pixel. Measured peak accumulation over live glyphs is ~0.075, so
  // check the harsher case of four worst-case strokes stacking.
  const stacked = 1 - (1 - worst) ** 4;
  assert.ok(stacked > 0.075, 'the modelled stack is worse than what was measured');
  assert.ok(
    ratio(composite(stacked)) >= 4.5,
    `stacked strokes still clear AA, got ${ratio(composite(stacked)).toFixed(2)}`
  );
});

test('the hero gravity attracts nearby stars and leaves distant stars alone', async () => {
  const { heroGravity } = await import('../script.js');

  assert.deepEqual(heroGravity(0, 0), { x: 0, y: 0, weight: 0 });
  assert.deepEqual(heroGravity(250, 0), { x: 0, y: 0, weight: 0 });

  const near = heroGravity(30, 40);
  const far = heroGravity(90, 120);
  assert.ok(near.x > 0 && near.y > 0);
  assert.ok(near.weight > far.weight);
  assert.ok(Math.hypot(near.x, near.y) > Math.hypot(far.x, far.y));

  const left = heroGravity(-30, 0);
  assert.ok(left.x < 0);
  assert.equal(left.y, 0);
});

test('the hero avoids the canvas operations that made the old one costly', () => {
  const script = read('script.js');

  // shadowBlur forces an offscreen blur per stroke and was the single most
  // expensive call in the previous hero.
  assert.doesNotMatch(script, /shadowBlur/);
  // No compositing tricks: a persistent trail buffer faded with destination-out
  // never reaches zero, because 8-bit alpha rounding leaves it stuck around
  // 4-12/255, which would build a permanent film on the warm paper ground.
  assert.doesNotMatch(script, /globalCompositeOperation/);
  // getImageData is a GPU readback stall; ctx.filter is unsupported on older Safari.
  assert.doesNotMatch(script, /getImageData|ctx\.filter/);
});

test('the scroll cue is readable rather than a clipped vertical string', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const cue = css.slice(css.indexOf('.hero-index,'), css.indexOf('@keyframes scroll-cue-run'));

  assert.match(html, /class="scroll-cue__text">Scroll to find the signal</);
  assert.doesNotMatch(cue, /writing-mode/);
  assert.match(cue, /color: var\(--plum\)/);
});

test('Chrome uses guided smooth scrolling instead of hard CSS snapping', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const script = read('script.js');
  const brand = html.match(/<a class="brand"[\s\S]*?<\/a>/)?.[0] || '';

  assert.match(brand, /class="brand__mark"[^>]*>KRM</);
  assert.doesNotMatch(brand, /<img/);
  assert.match(css, /scroll-behavior:\s*smooth/);
  assert.doesNotMatch(css, /scroll-snap-type|scroll-snap-stop/);
  assert.match(script, /function setupGuidedStoryScroll\(\)/);
  assert.match(script, /behavior:\s*"smooth"/);
});

test('the illustrative channel figures stay internally consistent', async () => {
  const { CHANNELS, STORY_STATES } = await import('../script.js');
  const total = (key) => CHANNELS.reduce((sum, channel) => sum + channel[key], 0);

  assert.equal(total('spend'), 100);
  assert.equal(total('growth'), 100);
  assert.ok(CHANNELS.every(({ name }) => name.trim().length > 0));

  // Every metric a chapter asks for must exist on every channel.
  Object.values(STORY_STATES).forEach(({ metric, title, unit }) => {
    assert.ok(title && unit, 'each chapter needs a caption');
    if (metric) {
      assert.ok(CHANNELS.every((channel) => Number.isFinite(channel[metric])));
    }
  });

  assert.equal(STORY_STATES.signal.title, 'The best ROI for advertising');
  assert.equal(STORY_STATES.strategy.title, 'Optimised advertising spend');
});

test('every chapter supplies every morphable value', async () => {
  const { CHANNELS, STORY_STATES, MORPH_KEYS, storyTargets } = await import('../script.js');
  const layout = {
    height: 900, compact: false, midY: 450, nodeX: 300, endX: 574, labelX: 600,
    fanSpan: 380, labelSpan: 430, stackHeight: 470
  };

  // A key missing from one chapter interpolates to NaN and silently blanks
  // that strand, which is invisible in tests but obvious on the page.
  Object.keys(STORY_STATES).forEach((state) => {
    CHANNELS.forEach((channel, index) => {
      const target = storyTargets(state, index, layout);
      MORPH_KEYS.forEach((key) => {
        assert.ok(
          Number.isFinite(target[key]),
          `${state}/${channel.name} is missing a finite "${key}"`
        );
      });
    });
  });
});

test('the plan and the result are drawn differently', async () => {
  const { CHANNELS, storyTargets } = await import('../script.js');
  const layout = {
    height: 900, compact: false, midY: 450, nodeX: 300, endX: 574, labelX: 600,
    fanSpan: 380, labelSpan: 430, stackHeight: 470
  };
  const at = (state) => CHANNELS.map((_, index) => storyTargets(state, index, layout));

  const strategy = at('strategy');
  const momentum = at('momentum');

  // Only the measurement chapter switches to the trajectory treatment.
  assert.ok(['noise', 'signal', 'strategy'].every((s) => at(s).every((t) => t.trend === 0)));
  assert.ok(momentum.every((t) => t.trend === 1));

  // The two chapters must not resolve to the same picture.
  assert.ok(strategy.some((t, i) => Math.abs(t.endY - momentum[i].endY) > 20));

  // Stacked bands sit in declared order and touch without overlapping.
  strategy.slice(1).forEach((band, i) => {
    const above = strategy[i];
    const gap = (band.endY - band.weight / 2) - (above.endY + above.weight / 2);
    assert.ok(Math.abs(gap) < 1, 'spend bands should stack flush');
  });

  // Email & CRM returns more than it costs, so its label overtakes Out-of-home
  // and Radio when the chapter turns to measured growth.
  const crm = CHANNELS.findIndex((c) => c.name === 'Email & CRM');
  const ooh = CHANNELS.findIndex((c) => c.name === 'Out-of-home');
  assert.ok(strategy[crm].labelY > strategy[ooh].labelY, 'ranked below on spend');
  assert.ok(momentum[crm].labelY < momentum[ooh].labelY, 'ranked above on growth');

  // Bigger contribution means a higher end point.
  const google = CHANNELS.findIndex((c) => c.name === 'Google / Search');
  const print = CHANNELS.findIndex((c) => c.name === 'Print');
  assert.ok(momentum[google].endY < momentum[print].endY);
});

test('preview redirects and indexing protections stay configured', () => {
  const config = JSON.parse(read('vercel.json'));
  const redirects = new Map(config.redirects.map(({ source, destination }) => [source, destination]));

  assert.deepEqual(Object.fromEntries(redirects), {
    '/meet-krm': '/#people',
    '/krm-services': '/#expertise',
    '/contact-us': '/#contact',
    '/book-online': '/#contact'
  });
  assert.ok(config.redirects.every(({ permanent }) => permanent === true));

  const globalHeaders = config.headers.find(({ source }) => source === '/(.*)');
  assert.ok(globalHeaders, 'global response headers are required');
  const headers = new Map(globalHeaders.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  const csp = headers.get('content-security-policy');

  assert.equal(headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /https:\/\/fonts\.googleapis\.com/);
  assert.match(csp, /https:\/\/fonts\.gstatic\.com/);
  assert.match(csp, /https:\/\/i\.ytimg\.com/);
  assert.match(csp, /https:\/\/www\.youtube-nocookie\.com/);
  assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'/);
});

test('CSP permits only the exact inline Organization JSON-LD', () => {
  const html = read('index.html');
  const config = JSON.parse(read('vercel.json'));
  const jsonLd = html.match(/<script\s+type=['"]application\/ld\+json['"]>([\s\S]*?)<\/script>/i);

  assert.ok(jsonLd, 'Organization JSON-LD is required');
  assert.equal(JSON.parse(jsonLd[1])['@type'], 'Organization');

  const hash = createHash('sha256').update(jsonLd[1]).digest('base64');
  const globalHeaders = config.headers.find(({ source }) => source === '/(.*)');
  const csp = globalHeaders.headers.find(({ key }) => key === 'Content-Security-Policy').value;
  assert.ok(csp.includes(`'sha256-${hash}'`), 'CSP must contain the exact JSON-LD hash');
});

test('robots.txt blocks all crawlers during preview', () => {
  assert.match(read('robots.txt'), /^User-agent: \*\r?\nDisallow: \/\s*$/);
});
