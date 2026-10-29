const { loadTS } = require("./load-typescript.cjs");
// Render color consumers without a React renderer, using the real palette factories.
module.exports = loadTS("theme/colors.ts", {
  react: { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() },
  "./seasonalThemes": loadTS("theme/seasonalThemes.ts"),
});
