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
