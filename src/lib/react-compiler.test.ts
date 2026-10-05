/// <reference types="node" />

/**
 * The React Compiler (app.json `experiments.reactCompiler`) caches any expression it thinks
 * has no reactive inputs in a `react.memo_cache_sentinel` block: computed once per mount.
 * A store, clock or native read during render is such an expression, so it goes stale (#130,
 * #169). This compiles every source file the way babel-preset-expo does (the compiler finds
 * components and hooks in any .ts or .tsx file, whatever its name or folder) and fails if one
 * of those reads lands in a sentinel block: a call, or a live React Native property such as
 * `AppState.currentState`. Fix with `'use no memo'` (file or function), or by moving the read
 * into state that a listener refreshes.
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
type Mod = {
  imports: Map<string, { file?: string; external?: string; name: string }>;
  fns: Map<string, Fn>;
  exports: Map<string, string>;
  /** `export * from` sources, searched for a name this file doesn't define. */
  stars: string[];
};

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

/** Metro's order for an iOS build: the exact file, then per extension `.ios`, `.native`, plain. */
const SUFFIXES = ['', ...['', '/index'].flatMap((dir) => ['.ts', '.tsx'].flatMap((ext) => [`${dir}.ios${ext}`, `${dir}.native${ext}`, `${dir}${ext}`]))];

function resolve(from: string, spec: string) {
  const base = spec.startsWith('@/') ? path.join(ROOT, 'src', spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return { external: spec };
  for (const c of SUFFIXES.map((x) => base + x))
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
    const mod: Mod = { imports: new Map(), fns: new Map(), exports: new Map(), stars: [] };
    const lets = new Set<string>();
    const nameOf = (n: any) => n.name ?? n.value;
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration' && node.importKind !== 'type')
        for (const s of node.specifiers)
          mod.imports.set(s.local.name, { ...resolve(file, node.source.value), name: s.type === 'ImportSpecifier' ? nameOf(s.imported) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*' });
      if (node.type === 'ExportNamedDeclaration' && node.exportKind !== 'type')
        for (const s of node.specifiers ?? []) {
          const exported = nameOf(s.exported);
          if (!node.source) mod.exports.set(exported, s.local.name);
          else {
            // `export { f as g } from './x'`: an import under a name no code can use.
            const local = `export:${exported}`;
            const name = s.type === 'ExportNamespaceSpecifier' ? '*' : nameOf(s.local);
            mod.imports.set(local, { ...resolve(file, node.source.value), name });
            mod.exports.set(exported, local);
          }
        }
      if (node.type === 'ExportDefaultDeclaration') {
        const d = node.declaration;
        const local = d.type === 'Identifier' ? d.name : d.id?.name;
        if (local) mod.exports.set('default', local);
      }
      if (node.type === 'ExportAllDeclaration' && node.exportKind !== 'type') {
        const target = resolve(file, node.source.value);
        if (target.file) mod.stars.push(target.file);
      }
      const decl = node.declaration ?? node;
      if (decl.type === 'VariableDeclaration' && decl.kind === 'let') for (const d of decl.declarations) if (d.id.name) lets.add(d.id.name);
    }
    traverse(ast, {
      'FunctionDeclaration|VariableDeclarator'(p: any) {
        const top = p.scope.getProgramParent();
        const fn = p.isFunctionDeclaration() ? p : p.get('init');
        const name = p.node.id?.name;
        if (!name || !fn?.node || (p.isFunctionDeclaration() ? p.parentPath.scope !== top : p.scope !== top)) return;
        const collect = (body: any, info: Fn) =>
          body.traverse({
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
        const info: Fn = { calls: new Set(), impure: null };
        collect(fn, info);
        mod.fns.set(name, info);
        // Each method of a module-level object (`api.read()`) on its own.
        if (fn.isObjectExpression())
          for (const prop of fn.get('properties')) {
            const key = prop.node.key;
            if (prop.node.computed || !key || (key.type !== 'Identifier' && key.type !== 'StringLiteral')) continue;
            const method: Fn = { calls: new Set(), impure: null };
            const value = prop.isObjectMethod() ? prop : prop.get('value');
            if (value.isIdentifier()) method.calls.add(value.node.name);
            else if (value.isFunction()) collect(value, method);
            else continue;
            mod.fns.set(`${name}.${nameOf(key)}`, method);
          }
      },
    });
    mods.set(file, mod);
  }

  function impurity(file: string, local: string, seen = new Set<string>()): string | null {
    const mod = mods.get(file);
    if (!mod || CONSTANT.has(local.split('.').pop()!) || seen.has(file + local)) return null;
    seen.add(file + local);
    const own = mod.fns.get(local);
    if (own) return own.impure;
    const [head, member] = local.split('.');
    const imp = mod.imports.get(head);
    if (member) {
      if (imp?.external && NATIVE.has(imp.external)) return imp.external;
      if (imp?.external === 'react-native' && RN_LIVE.has(head)) return head;
      if (!imp?.file) return null;
      // `ns.f()` on `import * as ns`, or `api.read()` on an imported object.
      return imp.name === '*' ? impurity(imp.file, member, seen) : impurity(imp.file, `${exported(imp.file, imp.name)}.${member}`, seen);
    }
    if (imp?.external) return NATIVE.has(imp.external) ? imp.external : null;
    if (imp?.file) return impurity(imp.file, exported(imp.file, imp.name), seen);
    // Not defined here: an `export * from` source may export it.
    for (const star of mod.stars) {
      const why = impurity(star, exported(star, local), seen);
      if (why) return why;
    }
    return null;
  }
  /** The local name `file` exports as `name`. */
  const exported = (file: string, name: string) => mods.get(file)?.exports.get(name) ?? name;

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
  assert.ok(files.length > 100, `only ${files.length} files to compile`);
  const cached: string[] = [];
  for (const file of files) {
    /** Why calling this reads something that changes, or null. Hooks run every render. */
    const read = (q: any): string | null => {
      if (isNow(q.node)) return 'the clock';
      const name = calleeName(q.node.callee);
      return name && !/^use[A-Z]/.test(name) && !name.startsWith('$') ? impurity(file, name) : null;
    };
    /** A live React Native property read, not a call: `AppState.currentState`. */
    const liveProperty = (q: any): string | null => {
      if (q.parentPath.isCallExpression({ callee: q.node }) || q.parentPath.isNewExpression({ callee: q.node })) return null;
      const name = calleeName(q.node);
      return name && RN_LIVE.has(name.split('.')[0]) && impurity(file, name) ? name : null;
    };
    /**
     * The first such read in an expression, outside callbacks made there. A hook's arguments
     * don't count: what it returns is its own state (`useState(AppState.currentState)`).
     */
    const readsIn = (expr: any): { name: string; why: string } | null => {
      if (!expr?.node) return null;
      let found: { name: string; why: string } | null = null;
      const isHook = (q: any) => q.isCallExpression() && /^use[A-Z]/.test(calleeName(q.node.callee)?.split('.').pop() ?? '');
      if (isHook(expr)) return null;
      const check = (q: any) => {
        if (isHook(q)) return q.skip();
        if (found) return;
        if (q.isCallExpression() || q.isNewExpression()) {
          const why = read(q);
          if (why) found = { name: `${calleeName(q.node.callee) ?? 'new Date'}()`, why };
        } else if (q.isMemberExpression()) {
          const live = liveProperty(q);
          if (live) found = { name: live, why: live.split('.')[0] };
        }
      };
      check(expr);
      expr.traverse({ Function(q: any) { q.skip(); }, 'CallExpression|NewExpression|MemberExpression': check });
      return found;
    };
    const out = compile(file);
    if (!out.includes(SENTINEL)) continue;
    traverse(parse(out, file), {
      IfStatement(p: any) {
        if (!out.slice(p.node.test.start, p.node.test.end).includes(SENTINEL)) return;
        const where = p.getFunctionParent()?.node.id?.name ?? p.getFunctionParent()?.parent.id?.name ?? '?';
        // Callbacks made in the block run later and read fresh, so skip nested functions.
        const report = (name: string, why: string) => cached.push(`${path.relative(ROOT, file)} ${where}(): ${name} reads ${why}`);
        const consequent = p.get('consequent');
        consequent.traverse({
          Function(q: any) { q.skip(); },
          MemberExpression(q: any) {
            const live = liveProperty(q);
            if (live) report(live, live.split('.')[0]);
          },
          'CallExpression|NewExpression'(q: any) {
            const why = read(q);
            if (why) report(`${q.node.type === 'NewExpression' ? 'new ' : ''}${calleeName(q.node.callee)}()`, why);
          },
        });
        // A value read before the block and only used in it (`const s = AppState.currentState`,
        // then `<Text>{s}</Text>` cached): the cached result keeps the first render's value.
        const seen = new Set<string>();
        consequent.traverse({
          Identifier(q: any) {
            if (!q.isReferencedIdentifier() || seen.has(q.node.name)) return;
            const b = q.scope.getBinding(q.node.name);
            if (!b?.path.isVariableDeclarator() || b.scope.getFunctionParent() !== p.scope.getFunctionParent()) return;
            if (b.path.findParent((x: any) => x === consequent)) return;
            seen.add(q.node.name);
            const why = readsIn(b.path.get('init'));
            if (why) report(`\`${q.node.name}\` (${why.name})`, why.why);
          },
        });
      },
    });
  }
  assert.deepEqual(cached, [], `computed once per mount (add 'use no memo'):\n${cached.join('\n')}`);
});
