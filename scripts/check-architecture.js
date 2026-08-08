#!/usr/bin/env node
/**
 * Architecture guard: enforces dependency direction and forbids import cycles.
 *
 * Run: node scripts/check-architecture.js
 *      node scripts/check-architecture.js --update-baseline
 *
 * Known pre-existing violations live in `scripts/architecture-baseline.json` so
 * this can gate CI immediately while the migration retires them. The baseline
 * may shrink but never grow: `--update-baseline` refuses to add new entries.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(__dirname, "architecture-baseline.json");

/** Directories scanned. Anything outside this list is ignored (native, assets, supabase). */
const SOURCE_DIRS = [
  "app",
  "features",
  "components",
  "hooks",
  "lib",
  "services",
  "store",
  "stores",
  "utils",
  "constants",
  "theme",
  "config",
  "content",
  "types",
  "context",
  "data",
  "screen-styles",
];

/**
 * What each layer is allowed to import. Order is intentional: a layer may only
 * depend on layers at or below its own level of abstraction.
 *
 * `features` is special-cased — see `isAllowed`.
 */
const ALLOWED = {
  app: [
    "app", "features", "components", "hooks", "lib", "services", "store",
    "stores", "utils", "constants", "theme", "config", "content", "types",
    "context", "data", "screen-styles",
  ],
  features: [
    "features", "components", "hooks", "lib", "services", "store", "stores",
    "utils", "constants", "theme", "config", "content", "types", "data",
  ],
  components: [
    "components", "hooks", "lib", "utils", "constants", "theme", "config",
    "content", "types", "stores", "store", "services", "data", "screen-styles",
  ],
  hooks: [
    "hooks", "lib", "services", "store", "stores", "utils", "constants",
    "theme", "config", "types", "data",
  ],
  services: ["services", "lib", "utils", "constants", "config", "types"],
  lib: ["lib", "utils", "constants", "config", "types"],
  store: ["lib", "services", "utils", "constants", "config", "types", "store"],
  stores: ["lib", "services", "utils", "constants", "config", "types", "stores"],
  utils: ["utils", "constants", "theme", "config", "types"],
  constants: ["constants", "theme", "types"],
  theme: ["theme", "constants", "types"],
  config: ["config", "types"],
  content: ["content", "types"],
  types: ["types"],
  context: ["store", "stores", "types"],
  data: ["utils", "constants", "types"],
  "screen-styles": ["constants", "theme", "types"],
};

function layerOf(file) {
  return file.split("/")[0];
}

/** Feature name for `features/<name>/...`, else null. */
function featureOf(file) {
  const parts = file.split("/");
  return parts[0] === "features" ? parts[1] : null;
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function collectFiles() {
  const out = [];
  for (const dir of SOURCE_DIRS) walk(dir, out);
  return out;
}

function buildResolver(files) {
  const known = new Set(files);
  return function resolve(spec, fromFile) {
    let base;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) {
      base = path
        .normalize(path.join(path.dirname(fromFile), spec))
        .replace(/\\/g, "/");
    } else return null; // node_modules

    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ]) {
      if (known.has(candidate)) return candidate;
    }
    return null;
  };
}

/** Static `from "x"`, bare `import "x"`, and dynamic `import("x")`. */
const IMPORT_RE =
  /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;

function buildGraph(files, resolve) {
  const graph = new Map();
  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const deps = new Set();
    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(source))) {
      const target = resolve(match[1], file);
      if (target && target !== file) deps.add(target);
    }
    graph.set(file, [...deps]);
  }
  return graph;
}

function isAllowed(from, to) {
  const fromLayer = layerOf(from);
  const toLayer = layerOf(to);
  const allowed = ALLOWED[fromLayer];
  if (!allowed) return true; // unknown layer — don't invent rules
  if (!allowed.includes(toLayer)) return false;

  // Cross-feature imports must go through the feature's public entry point.
  const fromFeature = featureOf(from);
  const toFeature = featureOf(to);
  if (toFeature && fromFeature !== toFeature) {
    const isPublicEntry =
      to === `features/${toFeature}/index.ts` ||
      to === `features/${toFeature}/index.tsx`;
    if (!isPublicEntry) return false;
  }
  return true;
}

/** Every elementary cycle is expensive; one representative cycle per SCC is enough. */
function findCycles(graph) {
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const sccs = [];
  let counter = 0;

  function strongConnect(node) {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const dep of graph.get(node) || []) {
      if (!index.has(dep)) {
        strongConnect(dep);
        low.set(node, Math.min(low.get(node), low.get(dep)));
      } else if (onStack.has(dep)) {
        low.set(node, Math.min(low.get(node), index.get(dep)));
      }
    }

    if (low.get(node) === index.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1) sccs.push(component.sort());
    }
  }

  for (const node of graph.keys()) if (!index.has(node)) strongConnect(node);
  return sccs;
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  const updating = process.argv.includes("--update-baseline");
  const files = collectFiles();
  const graph = buildGraph(files, buildResolver(files));

  const layerViolations = [];
  for (const [from, deps] of graph) {
    for (const to of deps) {
      if (!isAllowed(from, to)) layerViolations.push(`${from} -> ${to}`);
    }
  }
  layerViolations.sort();
  const cycles = findCycles(graph).map((c) => c.join(" | ")).sort();

  const baseline = loadBaseline();
  const seeding = baseline === null;
  const knownLayer = new Set(baseline?.layerViolations || []);
  const knownCycles = new Set(baseline?.cycles || []);

  const newLayer = layerViolations.filter((v) => !knownLayer.has(v));
  const newCycles = cycles.filter((c) => !knownCycles.has(c));
  const fixedLayer = [...knownLayer].filter((v) => !layerViolations.includes(v));
  const fixedCycles = [...knownCycles].filter((c) => !cycles.includes(c));

  if (updating) {
    if (!seeding && (newLayer.length || newCycles.length)) {
      console.error(
        "Refusing to update baseline: it may only shrink.\n" +
          [...newLayer, ...newCycles].map((v) => `  NEW  ${v}`).join("\n"),
      );
      process.exit(1);
    }
    fs.writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify({ layerViolations, cycles }, null, 2)}\n`,
    );
    console.log(
      `Baseline updated: ${layerViolations.length} layer violation(s), ${cycles.length} cycle(s).`,
    );
    return;
  }

  console.log(
    `Scanned ${files.length} files, ${[...graph.values()].reduce((n, d) => n + d.length, 0)} internal imports.`,
  );

  if (fixedLayer.length || fixedCycles.length) {
    console.log(
      `\n${fixedLayer.length + fixedCycles.length} baseline entr(ies) now fixed — run with --update-baseline to lock the improvement in:`,
    );
    for (const v of [...fixedLayer, ...fixedCycles]) console.log(`  FIXED  ${v}`);
  }

  if (!newLayer.length && !newCycles.length) {
    console.log(
      `\nOK — no new violations. (${knownLayer.size} layer + ${knownCycles.size} cycle known, pending migration.)`,
    );
    return;
  }

  if (newLayer.length) {
    console.error(`\n${newLayer.length} new layer violation(s):`);
    for (const v of newLayer) {
      const [from, to] = v.split(" -> ");
      console.error(`  ${v}\n      ${layerOf(from)}/ may not import ${layerOf(to)}/`);
    }
  }
  if (newCycles.length) {
    console.error(`\n${newCycles.length} new import cycle(s):`);
    for (const c of newCycles) console.error(`  ${c.split(" | ").join("\n    -> ")}`);
  }
  process.exit(1);
}

main();
