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

test('the hero signal pulse fades smoothly at both ends', async () => {
  const { pulseEnvelope } = await import('../script.js');

  assert.equal(pulseEnvelope(0), 0);
  assert.ok(pulseEnvelope(0.5) > 0.99);
  assert.ok(pulseEnvelope(1) < 0.000001);
});

test('the hero inputs stay below the protected copy and CTA area', async () => {
  const { heroLinePoint } = await import('../script.js');
  const geometry = { width: 1600, height: 900 };

  for (let strand = 0; strand < 9; strand += 1) {
    for (let step = 0; step <= 50; step += 1) {
      const point = heroLinePoint((step / 50) * 0.54, strand, geometry);
      assert.ok(point.y >= geometry.height * 0.85, `strand ${strand} entered the CTA-safe area`);
    }
  }
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
