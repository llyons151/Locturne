/// <reference types="node" />

/**
 * The React Compiler (app.json `experiments.reactCompiler`) caches any expression it thinks
 * has no reactive inputs in a `react.memo_cache_sentinel` block: computed once per mount.
 * A store, clock or native read during render is such an expression, so it goes stale (#130,
 * #169). This compiles every component and hook file the way babel-preset-expo does and fails
 * if one of those reads lands in a sentinel block. Fix with `'use no memo'` (file or function),
 * or by moving the read into state that a listener refreshes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

const ROOT = process.env.LOCTURNE_ROOT ?? path.resolve(import.meta.dirname, '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;

/** Calling anything from these reads the device, so it's never a constant. */
const NATIVE = new Set(['react-native-device-activity', 'blocked-apps', 'react-native-purchases', 'expo-notifications', 'expo-localization']);
const RN_LIVE = new Set(['AppState', 'Appearance', 'Dimensions', 'AccessibilityInfo']);
/** Reads that are fixed for the life of the process. */
const CONSTANT = new Set(['isScreenTimeAvailable', 'isAvailable']);
const SENTINEL = 'react.memo_cache_sentinel';

type Fn = { calls: Set<string>; impure: string | null };
type Mod = { imports: Map<string, { file?: string; external?: string; name: string }>; fns: Map<string, Fn>; exports: Map<string, string> };

function sources(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

const parse = (code: string, filename: string) =>
  babel.parseSync(code, { filename, babelrc: false, configFile: false, parserOpts: { plugins: ['typescript', 'jsx'] } });

function resolve(from: string, spec: string) {
  const base = spec.startsWith('@/') ? path.join(ROOT, 'src', spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return { external: spec };
  for (const c of ['', '.ts', '.tsx', '.ios.ts', '.ios.tsx', '/index.ts', '/index.tsx'].map((x) => base + x))
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return { file: c };
  return { external: spec };
}

const calleeName = (c: any): string | null =>
  c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.object.type === 'Identifier' && !c.computed ? `${c.object.name}.${c.property.name}` : null;
const isNow = (n: any) =>
  (n.type === 'NewExpression' && n.callee.name === 'Date' && n.arguments.length === 0) ||
  (n.type === 'CallExpression' && calleeName(n.callee) === 'Date.now');

/** Every top-level function in src, and whether calling it reads something that changes. */
function analyse(files: string[]) {
  const mods = new Map<string, Mod>();
  for (const file of files) {
    const ast = parse(fs.readFileSync(file, 'utf8'), file);
    const mod: Mod = { imports: new Map(), fns: new Map(), exports: new Map() };
    const lets = new Set<string>();
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration' && node.importKind !== 'type')
        for (const s of node.specifiers)
          mod.imports.set(s.local.name, { ...resolve(file, node.source.value), name: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*' });
      if (node.type === 'ExportNamedDeclaration') for (const s of node.specifiers ?? []) mod.exports.set(s.exported.name, s.local.name);
      const decl = node.declaration ?? node;
      if (decl.type === 'VariableDeclaration' && decl.kind === 'let') for (const d of decl.declarations) if (d.id.name) lets.add(d.id.name);
    }
    traverse(ast, {
      'FunctionDeclaration|VariableDeclarator'(p: any) {
        const top = p.scope.getProgramParent();
        const fn = p.isFunctionDeclaration() ? p : p.get('init');
        const name = p.node.id?.name;
        if (!name || !fn?.node || (p.isFunctionDeclaration() ? p.parentPath.scope !== top : p.scope !== top)) return;
        const info: Fn = { calls: new Set(), impure: null };
        fn.traverse({
          'CallExpression|NewExpression'(q: any) {
            if (isNow(q.node)) info.impure ??= 'the clock';
            const c = calleeName(q.node.callee);
            if (c) info.calls.add(c);
          },
          Identifier(q: any) {
            if (q.parentPath.isMemberExpression({ property: q.node }) && !q.parent.computed) return;
            const b = q.scope.getBinding(q.node.name);
            if (b?.scope === top && b.kind === 'let' && lets.has(q.node.name)) info.impure ??= `module state \`${q.node.name}\``;
            if (RN_LIVE.has(q.node.name) && mod.imports.get(q.node.name)?.external === 'react-native') info.impure ??= q.node.name;
          },
        });
        mod.fns.set(name, info);
      },
    });
    mods.set(file, mod);
  }

  function impurity(file: string, local: string, seen = new Set<string>()): string | null {
    if (CONSTANT.has(local) || seen.has(file + local)) return null;
    seen.add(file + local);
    const mod = mods.get(file)!;
    const [head, member] = local.split('.');
    const imp = mod.imports.get(head);
    if (member) {
      if (imp?.external && NATIVE.has(imp.external)) return imp.external;
      if (imp?.external === 'react-native' && RN_LIVE.has(head)) return head;
      return imp?.file && imp.name === '*' ? impurity(imp.file, member, seen) : null;
    }
    const own = mod.fns.get(local);
    if (own) return own.impure;
    if (imp?.external) return NATIVE.has(imp.external) ? imp.external : null;
    if (imp?.file) return impurity(imp.file, mods.get(imp.file)?.exports.get(imp.name) ?? imp.name, seen);
    return null;
  }

  for (let changed = true; changed; ) {
    changed = false;
    for (const [file, mod] of mods)
      for (const fn of mod.fns.values())
        if (!fn.impure)
          for (const c of fn.calls) {
            const why = impurity(file, c);
            if (why) { fn.impure = `${c} → ${why}`; changed = true; break; }
          }
  }
  return impurity;
}

/** The compiler as babel-preset-expo configures it for a production build. */
function compile(file: string): string {
  return babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    plugins: [[require.resolve('babel-plugin-react-compiler'), { target: '19', panicThreshold: 'none' }]],
    presets: [[require.resolve('@babel/preset-typescript'), { isTSX: file.endsWith('.tsx'), allExtensions: true }]],
  }).code;
}

test('no store, clock or native read is cached once per mount by the React Compiler', () => {
  const files = sources(path.join(ROOT, 'src'));
  const impurity = analyse(files);
  const compiled = files.filter((f) => f.endsWith('.tsx') || /\/(hooks\/[^/]+|use-[^/]+)\.ts$/.test(f));
  assert.ok(compiled.length > 50, `only ${compiled.length} files to compile`);
  const cached: string[] = [];
  for (const file of compiled) {
    const out = compile(file);
    if (!out.includes(SENTINEL)) continue;
    traverse(parse(out, file), {
      IfStatement(p: any) {
        if (!out.slice(p.node.test.start, p.node.test.end).includes(SENTINEL)) return;
        const where = p.getFunctionParent()?.node.id?.name ?? p.getFunctionParent()?.parent.id?.name ?? '?';
        // Callbacks made in the block run later and read fresh, so skip nested functions.
        p.get('consequent').traverse({
          Function(q: any) { q.skip(); },
          'CallExpression|NewExpression'(q: any) {
            const name = calleeName(q.node.callee);
            const why = isNow(q.node) ? 'the clock' : name && !/^use[A-Z]/.test(name) && !name.startsWith('$') ? impurity(file, name) : null;
            if (why) cached.push(`${path.relative(ROOT, file)} ${where}(): ${q.node.type === 'NewExpression' ? 'new ' : ''}${name}() reads ${why}`);
          },
        });
      },
    });
  }
  assert.deepEqual(cached, [], `computed once per mount (add 'use no memo'):\n${cached.join('\n')}`);
});
