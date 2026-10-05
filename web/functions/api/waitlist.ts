/**
 * POST /api/waitlist: add an email to the Locturne waitlist (Cloudflare D1, binding `DB`).
 *
 * Accepts JSON (from waitlist.js) or a plain form post (no JavaScript). Answers the same way
 * whether the email is new or already on the list, so the form can't be used to check who
 * signed up.
 *
 * Spam protection, kept light on purpose:
 * - a honeypot field (`hp_k7`) that people never see; bots that fill it get a fake success.
 *   A meaningless name with `autocomplete="new-password"`, so browser autofill never fills it
 *   (a `company` field got autofilled, and real people were silently dropped)
 * - a time trap: a form sent under 1.5 s after the page loaded is treated the same way. The
 *   page measures that itself (`t`, in ms), so a phone whose clock is off can't trip it
 * - same-origin only: a browser POST from another site is refused
 * - size limits on the body and on every field
 * For heavier abuse, add a Cloudflare rate-limiting rule on /api/waitlist (see README).
 */

// Minimal D1 types so this file needs no dependencies. Wrangler compiles it as-is.
interface D1Result {
  meta: { changes?: number };
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB: D1Database;
}

interface Context {
  request: Request & { cf?: { country?: string } };
  env: Env;
}

const MAX_BODY = 4096;
const MIN_FILL_MS = 1500;
const TAG_KEYS = ['src', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Deliberately simple: one @, something on each side, a dot in the domain, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lowercased and trimmed, or null if it isn't a plausible address. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!EMAIL.test(email)) return null;
  // A cell starting with one of these is a formula when the export is opened in a spreadsheet.
  if (/^[=+\-@]/.test(email)) return null;
  const [local] = email.split('@');
  if (local.length > 64) return null;
  return email;
}

/** Attribution tags: short, and only characters a link tag needs. */
export function cleanTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const tag = raw.trim().slice(0, 64);
  if (/^[=+\-@]/.test(tag)) return null;
  return /^[A-Za-z0-9._~+-]+$/.test(tag) ? tag : null;
}

function cleanHost(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const host = raw.trim().toLowerCase().slice(0, 100);
  if (host.startsWith('-')) return null;
  return /^[a-z0-9.-]+$/.test(host) ? host : null;
}

async function readFields(request: Request): Promise<Record<string, unknown> | null> {
  // Count bytes while streaming: missing or false Content-Length must not allow buffering
  // an arbitrarily large request in the worker.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY) {
        await reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const parsed: unknown = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    }
    if (type.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(text));
    }
  } catch {
    return null;
  }
  return null;
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('application/json');
}

function reply(request: Request, status: number, error?: string): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(error ? { ok: false, error } : { ok: true }), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  // No JavaScript: success goes to the thank-you page; errors get a plain page with a way back.
  if (!error) return Response.redirect(new URL('/thanks', request.url).toString(), 303);
  const message =
    error === 'invalid_email' ? 'That email doesn’t look right.' : 'That didn’t go through. Try again in a minute.';
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Locturne</title><link rel="stylesheet" href="/styles.css"><body class="night"><main class="landing"><p class="hero voice">${message}</p><p class="lede"><a href="/#join">Go back</a></p></main></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser clients and some older browsers omit it.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request)) return reply(request, 403, 'forbidden');

  const fields = await readFields(request);
  if (!fields) return reply(request, 400, 'bad_request');

  // Bots: pretend it worked, store nothing.
  if (typeof fields.hp_k7 === 'string' && fields.hp_k7.trim() !== '') return reply(request, 200);
  // Milliseconds from page load to submit, measured by the page. A page cached from before
  // sends a clock time instead, which is never this small, so it passes.
  // Without JavaScript the hidden field arrives empty, and `Number('')` is 0: no timing then.
  const elapsed = typeof fields.t === 'string' && fields.t.trim() !== '' ? Number(fields.t) : NaN;
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) return reply(request, 200);

  const email = normalizeEmail(fields.email);
  if (!email) return reply(request, 400, 'invalid_email');

  const tags = TAG_KEYS.map((key) => cleanTag(fields[key]));
  const ref = cleanHost(fields.ref);
  const country = cleanTag(request.cf?.country)?.slice(0, 2) ?? null;

  try {
    await env.DB.prepare(
      `INSERT INTO signups (email, src, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
      .bind(email, ...tags, ref, country)
      .run();
  } catch (err) {
    console.error('waitlist insert failed', err);
    return reply(request, 500, 'server_error');
  }

  return reply(request, 200);
}
