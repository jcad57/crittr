const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  ts = require("typescript");
function loadTS(relative, dependencies = {}, extras = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(process.cwd(), relative), "utf8"),
    {
      fileName: relative,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (id) => {
        if (!(id in dependencies))
          throw new Error("Unmocked dependency: " + id + " in " + relative);
        return dependencies[id];
      },
      Date,
      Promise,
      Map,
      Set,
      Math,
      JSON,
      AbortController,
      AbortSignal,
      Response,
      setTimeout,
      clearTimeout,
      __DEV__: false,
      console,
      ...extras,
    },
    { filename: relative },
  );
  return module.exports;
}
module.exports = { loadTS };
