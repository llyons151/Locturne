import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const queryRequire = createRequire(require.resolve('query-string'));

test('Expo query strings retain CommonJS decoding and valid Unicode after the security override', () => {
  const query = require('query-string');
  assert.deepEqual({ ...query.parse('name=caf%C3%A9+time&emoji=%F0%9F%8C%99&literal=%2B') }, {
    emoji: '🌙', literal: '+', name: 'café time',
  });
  const decode = queryRequire('decode-uri-component');
  assert.equal(typeof decode, 'function');
  assert.equal(decode('a+b'), 'a b');
  assert.equal(decode('%C3%A9%FF'), 'é%FF');
  assert.equal(decode('%41-%41%42-%FF'), 'A-AB-%FF');
  assert.equal(decode('%24%26-%FF'), '$&-%FF');
  assert.equal(decode('%FE%FF%C2'), '���');
});

test('many distinct malformed URI runs do not rescan the whole link', () => {
  const decoder = queryRequire.resolve('decode-uri-component');
  const output = execFileSync(process.execPath, ['-e',
    'const decode = require(process.argv[1]); ' +
    'const runs = Array.from({length: 50000}, (_, i) => "%FF" + Array.from(String(i), c => "%" + c.charCodeAt(0).toString(16)).join("")); ' +
    'const result = decode(runs.join("-")); if (!result.endsWith("%FF49999")) process.exit(1); process.stdout.write("ok");',
    decoder,
  ], { timeout: 5000, encoding: 'utf8' });
  assert.equal(output, 'ok');
});

test('malformed deep-link input finishes in a bounded child process', () => {
  // A separate process enforces the deadline even if decoding blocks the JS thread.
  const decoder = queryRequire.resolve('decode-uri-component');
  const output = execFileSync(process.execPath, ['-e',
    'const decode = require(process.argv[1]); const value = "%FF".repeat(20000) + "%C3%A9"; ' +
    'if (decode(value) !== "%FF".repeat(20000) + "é") process.exit(1); process.stdout.write("ok");',
    decoder,
  ], { timeout: 5000, encoding: 'utf8' });
  assert.equal(output, 'ok');
});

test('Xcode and legacy Expo plist consumers still support patched UUID and XML dependencies', () => {
  const xcode = require('xcode');
  const project = xcode.project('audit.pbxproj');
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  const activity = createRequire(require.resolve('react-native-device-activity/package.json'));
  const plist = activity('@expo/plist').default;
  const value = { Name: 'Locturne', Enabled: true, Items: ['night', 'always'], Count: 200 };
  assert.deepEqual(plist.parse(plist.build(value)), value);
  const uuid = require('uuid');
  assert.throws(() => uuid.v5('test', uuid.v5.DNS, new Uint8Array(1)), RangeError);
});


test('malformed URI fallback never reinterprets a decoded literal percent as another escape', () => {
  const decode = queryRequire('decode-uri-component');
  for (const suffix of ['%FF', '%80', '%C2']) {
    const expectedSuffix = suffix === '%C2' ? '�' : suffix;
    assert.equal(decode('%25%43%32' + suffix), '%C2' + expectedSuffix);
    assert.equal(decode(suffix + '%25%43%32'), expectedSuffix + '%C2');
  }
  assert.equal(decode('%C2'), '�', 'original malformed C2 keeps the legacy fallback');
  assert.equal(decode('%C2%A2%FF'), '¢%FF', 'valid C2 UTF-8 stays decoded');
  assert.equal(decode('%25%46%45%25%46%46%FF'), '%FE%FF%FF');
});
