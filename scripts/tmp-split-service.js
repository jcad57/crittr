#!/usr/bin/env node
/**
 * Slice a service file into modules, giving each one only the imports it uses.
 *
 * Temporary: delete once the oversized services are split.
 */
const fs = require("fs");
const path = require("path");

/**
 * @param {object} cfg
 * @param {string} cfg.source        file to split, e.g. "services/pets.ts"
 * @param {string} cfg.outDir        e.g. "services/pets"
 * @param {{name:string,from:string,isType?:boolean}[]} cfg.bindings
 * @param {Record<string,{header?:string,ranges:[number,number][]}>} cfg.files
 */
function split(cfg) {
  const lines = fs.readFileSync(cfg.source, "utf8").split("\n");
  const slice = (a, b) => lines.slice(a - 1, b).join("\n").replace(/\s+$/, "");

  fs.mkdirSync(cfg.outDir, { recursive: true });

  for (const [name, spec] of Object.entries(cfg.files)) {
    const body = spec.ranges.map(([a, b]) => slice(a, b)).join("\n\n");

    // Which of the original imports does this slice actually reference?
    const used = cfg.bindings.filter((b) =>
      new RegExp(`\\b${b.name}\\b`).test(body),
    );

    const byModule = new Map();
    for (const b of used) {
      // Relative service imports break once the file moves down a directory.
      const from = b.from.startsWith("./")
        ? `@/services/${b.from.slice(2)}`
        : b.from;
      const key = `${from}\u0000${b.isType ? "type" : "value"}`;
      if (!byModule.has(key)) byModule.set(key, []);
      byModule.get(key).push(b.name);
    }

    const importLines = [...byModule.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, names]) => {
        const [from, kind] = key.split("\u0000");
        const kw = kind === "type" ? "import type" : "import";
        const list = [...new Set(names)].sort();
        const single = `${kw} { ${list.join(", ")} } from "${from}";`;
        if (single.length <= 80) return single;
        return `${kw} {\n${list.map((n) => `  ${n},`).join("\n")}\n} from "${from}";`;
      })
      .join("\n");

    const out = [
      spec.header ? `${spec.header}\n` : "",
      importLines ? `${importLines}\n` : "",
      body,
      "",
    ]
      .filter((p, i) => p !== "" || i > 1)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");

    fs.writeFileSync(path.join(cfg.outDir, name), out);
    console.log(`  ${path.join(cfg.outDir, name)}  (${out.split("\n").length} lines)`);
  }
}

/** Compare old vs new ignoring imports, ordering and whitespace. */
function verify(oldSrc, newSrcs) {
  const norm = (s) =>
    s
      .replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .sort()
      .join("\n");
  const a = norm(oldSrc).split("\n");
  const b = norm(newSrcs.join("\n")).split("\n");
  const only = (x, y) => {
    const s = new Set(y);
    return x.filter((v) => !s.has(v));
  };
  const lost = only(a, b);
  const gained = only(b, a);
  if (!lost.length && !gained.length) return console.log("VERIFY: identical");
  if (lost.length) console.log("LOST:\n" + lost.join("\n"));
  if (gained.length) console.log("GAINED:\n" + gained.join("\n"));
}

module.exports = { split, verify };
