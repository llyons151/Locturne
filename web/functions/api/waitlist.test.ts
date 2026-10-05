import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanTag, onRequestPost } from './waitlist.ts';

function database() {
  const rows: unknown[][] = [];
  return {
    rows,
    DB: {
      prepare: (_sql: string) => ({
        bind: (...values: unknown[]) => ({
          bind() { return this; },
          async run() { rows.push(values); return { meta: { changes: 1 } }; },
        }),
        async run() { return { meta: {} }; },
      }),
    },
  };
}

function request(body: string, origin = 'https://locturne.com') {
  return new Request('https://locturne.com/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', origin },
    body,
  });
}

test('waitlist stores valid input using bound parameters and rejects cross-scheme origins', async () => {
  const env = database();
  assert.equal((await onRequestPost({ request: request('{"email":"person@example.com"}'), env })).status, 200);
  assert.equal(env.rows[0][0], 'person@example.com');
  for (const origin of ['http://locturne.com', 'https://evil.example', 'null']) {
    assert.equal((await onRequestPost({ request: request('{"email":"person@example.com"}', origin), env })).status, 403);
  }
  assert.equal(env.rows.length, 1);
});

test('waitlist attribution cannot become a spreadsheet formula', () => {
  for (const value of ['+1+1', '-1+1', ' +cmd', '=1', '@sum']) assert.equal(cleanTag(value), null);
  assert.equal(cleanTag('tt-stairs-01'), 'tt-stairs-01');
});

test('waitlist caps UTF-8 bytes, even when the character count fits', async () => {
  const env = database();
  const body = JSON.stringify({ email: 'person@example.com', extra: '😀'.repeat(1100) });
  assert.ok(body.length < 4096);
  assert.equal((await onRequestPost({ request: request(body), env })).status, 400);
  assert.equal(env.rows.length, 0);
});

test('waitlist cancels oversized streaming bodies without reading the remainder', async () => {
  const env = database();
  let cancelled = false;
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(4097)); },
    cancel() { cancelled = true; },
  });
  const streaming = new Request('https://locturne.com/api/waitlist', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body, duplex: 'half',
  } as RequestInit);
  assert.equal((await onRequestPost({ request: streaming, env })).status, 400);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 2);
  assert.equal(env.rows.length, 0);
});

test('waitlist handles a disconnected request body without throwing', async () => {
  const env = database();
  const body = new ReadableStream({ start(controller) { controller.error(new Error('disconnected')); } });
  const streaming = new Request('https://locturne.com/api/waitlist', {
    method: 'POST', headers: { accept: 'application/json' }, body, duplex: 'half',
  } as RequestInit);
  assert.equal((await onRequestPost({ request: streaming, env })).status, 400);
});

test('waitlist SQL-like email input is bound as a value, never interpolated', async () => {
  const queries: string[] = [];
  const env = database();
  const prepare = env.DB.prepare;
  env.DB.prepare = (sql: string) => { queries.push(sql); return prepare(sql); };
  const email = "x'--@example.com";
  assert.equal((await onRequestPost({ request: request(JSON.stringify({ email })), env })).status, 200);
  assert.equal(env.rows[0][0], email);
  assert.equal(queries[0].includes(email), false);
  assert.match(queries[0], /VALUES \(\?,/);
});

test('waitlist honeypots and malformed inputs never reach the database', async () => {
  const env = database();
  for (const body of ['null', '[]', '{', '{"email":42}', '{"email":"person@example.com","hp_k7":"filled"}']) {
    await onRequestPost({ request: request(body), env });
  }
  assert.equal(env.rows.length, 0);
});

test('recursive security matrix: origin confusion, byte boundary, prototype keys and formula fields', async () => {
  const env = database();
  for (const origin of ['https://locturne.com.evil.test', 'https://locturne.com@evil.test', 'https://locturne.com:8443', 'data:text/plain,locturne.com']) {
    assert.equal((await onRequestPost({ request: request('{"email":"person@example.com"}', origin), env })).status, 403);
  }
  for (const email of ['=cmd@example.com', '+run@example.com', '-test@example.com', 'x\r\ny@example.com']) {
    assert.equal((await onRequestPost({ request: request(JSON.stringify({ email })), env })).status, 400);
  }
  const valid = '{"email":"person@example.com","__proto__":{"polluted":true}}';
  assert.equal((await onRequestPost({ request: request(valid.padEnd(4096)), env })).status, 200);
  assert.equal((await onRequestPost({ request: request(valid.padEnd(4097)), env })).status, 400);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  assert.equal(env.rows.length, 1);
});
