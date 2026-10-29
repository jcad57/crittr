const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

const palettes = loadTS("theme/seasonalThemes.ts");
const transitions = loadTS("constants/seasonTransitions.ts");
const calendar = loadTS("utils/seasonCalendar.ts", {
  "../constants/seasonTransitions": transitions,
  "../constants/southernTimeZones": loadTS("constants/southernTimeZones.ts"),
});
function runtime() {
  return loadTS("theme/colors.ts", {
    react: { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() },
    "./seasonalThemes": palettes,
  });
}
function preference(theme, storage) {
  return loadTS("components/theme/seasonalPreference.ts", {
    "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
    "@/theme/colors": theme,
  });
}

test("official equinoxes and solstices switch at the event in both hemispheres, including leap years", () => {
  // Independently published USNO UTC times for 2026.
  assert.deepEqual(Array.from(transitions.SEASON_TRANSITIONS[2026]), [
    "2026-03-20T14:46:00Z", "2026-06-21T08:24:00Z", "2026-09-23T00:05:00Z", "2026-12-21T20:50:00Z",
  ]);
  for (const year of [2024, 2026, 2027, 2028, 2050, 2100]) {
    transitions.SEASON_TRANSITIONS[year].forEach((iso, index) => {
      const now = new Date(iso);
      const north = ["spring", "summer", "fall", "winter"];
      const south = ["fall", "winter", "spring", "summer"];
      assert.equal(calendar.seasonAt(new Date(now.getTime() - 1), "north"), north[(index + 3) % 4]);
      assert.equal(calendar.seasonAt(now, "north"), north[index]);
      assert.equal(calendar.seasonAt(now, "south"), south[index]);
    });
  }
  assert.equal(calendar.seasonAt(new Date("2027-01-01T00:00:00Z"), "north"), "winter");
  assert.equal(calendar.seasonAt(new Date("2026-09-22T19:05:00-05:00"), "north"), "fall");
  assert.equal(calendar.nextSeasonTransition(new Date("2026-12-31T23:59:00Z")), Date.parse(transitions.SEASON_TRANSITIONS[2027][0]));
});

test("timezone hemisphere detection covers southern regions and legacy aliases without GPS", () => {
  for (const zone of ["Australia/Sydney", "Australia/NSW", "Pacific/Auckland", "Pacific/Chatham", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Buenos_Aires", "America/Coyhaique", "Africa/Johannesburg", "Asia/Jakarta", "Asia/Makassar", "Indian/Mauritius", "Antarctica/McMurdo", "Chile/Continental", "NZ"]) {
    assert.equal(calendar.hemisphereForTimeZone(zone), "south", zone);
  }
  for (const zone of ["America/Chicago", "Europe/London", "Asia/Tokyo", "Pacific/Honolulu", "Africa/Cairo", "UTC", "Unknown/Zone"]) {
    assert.equal(calendar.hemisphereForTimeZone(zone), "north", zone);
  }
});

test("toggle off and summer use the exact default palette; previews override and reset to the live calendar", () => {
  const theme = runtime();
  theme.updateTheme({ season: "fall", hydrated: true });
  assert.equal(theme.getThemeColors(), palettes.SEASONAL_THEMES.fall.colors);
  theme.updateTheme({ enabled: false });
  assert.equal(theme.getThemeColors(), palettes.DEFAULT_COLORS);
  theme.updateTheme({ preview: "winter" });
  assert.equal(theme.getThemeColors(), palettes.SEASONAL_THEMES.winter.colors);
  theme.updateTheme({ season: "spring", preview: null });
  assert.equal(theme.getThemeColors(), palettes.DEFAULT_COLORS);
  theme.updateTheme({ enabled: true });
  assert.equal(theme.getThemeColors(), palettes.SEASONAL_THEMES.spring.colors);
  theme.updateTheme({ season: "summer" });
  assert.equal(theme.getThemeColors(), palettes.DEFAULT_COLORS);
  assert.equal(palettes.SEASONAL_THEMES.summer.particles, null);
  assert.equal(palettes.SEASONAL_THEMES.spring.particles, null);
});

test("theme value factories build only once per palette and memoized UI reads the new palette", () => {
  const theme = runtime();
  let builds = 0;
  const values = theme.createThemeValues((colors) => ({ ink: colors.textPrimary, build: ++builds }));
  const summer = theme.useThemeValues(values);
  assert.equal(theme.useThemeValues(values), summer);
  theme.updateTheme({ season: "winter" });
  assert.notEqual(theme.useThemeValues(values), summer);
  assert.equal(theme.useThemeValues(values).ink, palettes.SEASONAL_THEMES.winter.colors.textPrimary);
  theme.updateTheme({ enabled: false });
  assert.equal(theme.useThemeValues(values), summer);
  assert.equal(builds, 2);
});

test("preferences default on, restore off, serialize rapid changes and recover from storage failures", async () => {
  const theme = runtime();
  const saves = [];
  let stored = null;
  const settings = preference(theme, {
    getItem: async () => stored,
    setItem: async (_key, value) => { saves.push(value); stored = value; },
  });
  assert.equal(await settings.loadSeasonalPreference(), true);
  await settings.setSeasonalThemesEnabled(false);
  assert.equal(await settings.loadSeasonalPreference(), false);
  theme.updateTheme({ preview: "winter" });
  await Promise.all([settings.setSeasonalThemesEnabled(true), settings.setSeasonalThemesEnabled(false), settings.setSeasonalThemesEnabled(true)]);
  assert.equal(stored, "true");
  assert.deepEqual(saves, ["false", "true", "false", "true"]);
  assert.equal(theme.getThemeSnapshot().preview, null);
  const failed = preference(theme, { getItem: async () => "false", setItem: async () => { throw new Error("disk"); } });
  await assert.rejects(failed.setSeasonalThemesEnabled(true), /disk/);
  assert.equal(theme.getThemeSnapshot().enabled, false);
});

function flatten(node) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function renderSetting(dev) {
  const theme = runtime();
  theme.updateTheme({ season: "fall", hydrated: true });
  const { default: Setting } = loadTS("components/theme/SeasonalThemeSetting.tsx", {
    "react/jsx-runtime": require("react/jsx-runtime"),
    react: { useState: (initial) => [initial, () => {}] },
    "react-native": { Alert: { alert() {} }, Platform: { OS: "ios" }, Pressable: "Pressable", StyleSheet: { create: (v) => v, hairlineWidth: 1 }, Switch: "Switch", Text: "Text", View: "View" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/theme/colors": theme,
    "@/theme/seasonalThemes": palettes,
    "@/theme/typography": { Font: {} },
    "./seasonalPreference": { setSeasonalThemesEnabled: async () => {} },
  }, { __DEV__: dev });
  return { theme, nodes: flatten(Setting()) };
}

test("production settings expose one switch; development adds four previews and a reset action", () => {
  const prod = renderSetting(false).nodes;
  assert.equal(prod.filter((n) => n.type === "Switch").length, 1);
  assert.equal(prod.some((n) => n.props?.accessibilityLabel?.startsWith("Preview")), false);
  const { theme, nodes } = renderSetting(true);
  for (const season of ["spring", "summer", "fall", "winter"]) {
    nodes.find((n) => n.props?.accessibilityLabel === `Preview ${season} theme`).props.onPress();
    assert.equal(theme.getThemeColors(), palettes.SEASONAL_THEMES[season].colors);
  }
  nodes.find((n) => n.props?.accessibilityLabel === "Reset theme preview to current season").props.onPress();
  assert.equal(theme.getThemeSnapshot().preview, null);
  assert.equal(theme.getThemeColors(), palettes.SEASONAL_THEMES.fall.colors);
});

test("season refresh schedules the exact boundary, updates after travel/resume, and cleans up", async () => {
  const theme = runtime();
  let now = Date.parse("2026-09-23T00:04:30Z");
  let zone = "America/Chicago";
  let listener, cleanup, timer;
  const removed = [];
  const appState = { currentState: "active", addEventListener: (_name, fn) => { listener = fn; return { remove: () => removed.push("app") }; } };
  class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const { default: Bootstrap } = loadTS("components/theme/SeasonalThemeBootstrap.tsx", {
    react: { useEffect: (effect) => { cleanup = effect(); } },
    "react-native": { AppState: appState },
    "@/theme/colors": theme,
    "@/utils/seasonCalendar": { ...calendar, deviceTimeZone: () => zone },
    "./seasonalPreference": { loadSeasonalPreference: async () => false },
  }, { Date: TestDate, setTimeout: (fn, delay) => { timer = { fn, delay }; return timer; }, clearTimeout: (id) => { if (id) removed.push(id); } });
  Bootstrap();
  await Promise.resolve();
  assert.equal(theme.getThemeSnapshot().hydrated, true);
  assert.equal(theme.getThemeSnapshot().enabled, false);
  assert.equal(theme.getThemeSnapshot().season, "summer");
  assert.equal(timer.delay, 30_000);
  now += 30_000;
  timer.fn();
  assert.equal(theme.getThemeSnapshot().season, "fall");
  appState.currentState = "background";
  listener("background");
  assert.ok(removed.includes(timer));
  zone = "Australia/Sydney";
  appState.currentState = "active";
  listener("active");
  assert.equal(theme.getThemeSnapshot().season, "spring");
  assert.equal(timer.delay, 30 * 60_000);
  cleanup();
  assert.ok(removed.includes("app"));
});

test("particle field is limited, ignores touches, and animates only in foreground without Reduce Motion", () => {
  function render({ season = "fall", active = true, reduced = false } = {}) {
    const effects = [];
    const cancelled = [];
    const repeats = [];
    let states = [active, reduced];
    const theme = runtime();
    theme.updateTheme({ season });
    const { default: Backdrop } = loadTS("components/theme/SeasonalBackdrop.tsx", {
      "react/jsx-runtime": require("react/jsx-runtime"),
      react: { memo: (fn) => fn, useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn(), useState: () => [states.shift(), () => {}] },
      "react-native": { AccessibilityInfo: {}, AppState: { currentState: active ? "active" : "background" }, StyleSheet: { create: (s) => s, absoluteFill: {} }, useWindowDimensions: () => ({ width: 400, height: 850 }), View: "View" },
      "react-native-reanimated": { __esModule: true, default: { View: "AnimatedView" }, useSharedValue: (v) => ({ value: v }), useAnimatedStyle: (fn) => fn(), cancelAnimation: (value) => cancelled.push(value), Easing: { linear: "linear" }, withRepeat: (...args) => { repeats.push(args); return 1; }, withTiming: (v) => v },
      "react-native-svg": { __esModule: true, default: "Svg", Path: "Path" },
      "@/theme/colors": theme,
      "@/theme/seasonalThemes": palettes,
    });
    const tree = Backdrop();
    const cleanup = effects[1]();
    return { tree, repeats, cancelled, cleanup };
  }
  for (const options of [{ season: "summer" }, { season: "spring" }, { reduced: true }, { active: false }]) {
    const result = render(options);
    assert.equal(result.tree, null);
    assert.equal(result.repeats.length, 0);
  }
  for (const [season, count] of [["fall", 14], ["winter", 22]]) {
    const result = render({ season });
    assert.equal(result.tree.props.pointerEvents, "none");
    assert.equal(result.tree.props.accessibilityElementsHidden, true);
    assert.equal(result.tree.props.children.length, count);
    const specs = result.tree.props.children.map((n) => n.props.spec);
    assert.ok(new Set(specs.map((s) => s.size)).size > 2);
    assert.ok(new Set(specs.map((s) => s.color)).size > 2);
    assert.equal(result.repeats.length, 1); // One shared UI-thread clock for the entire field.
    result.cleanup();
    assert.equal(result.cancelled.length, 1);
  }
});

test("seasonal text and primary button labels retain readable contrast", () => {
  const luminance = (hex) => hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const season of ["spring", "fall", "winter"]) {
    const { colors } = palettes.SEASONAL_THEMES[season];
    for (const surface of ["cream", "peach", "sage", "warmWhite", "white"]) {
      assert.ok(contrast(colors.textPrimary, colors[surface]) >= 4.5, `${season}: text on ${surface}`);
    }
    assert.ok(contrast(colors.white, colors.orange) >= 4.5, `${season}: button label`);
    assert.ok(contrast(colors.orangeDark, colors.orangeLight) >= 4.5, `${season}: accent text`);
  }
});

test("each theme has a distinctly green completed ring with readable contrast on both card states",()=>{
 const luminance=hex=>hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255)
  .map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4)
  .reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
 const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
 const completeGreens=new Set();
 for(const season of ['summer','spring','fall','winter']){
  const {colors}=palettes.SEASONAL_THEMES[season];
  const ring=colors.progressCompleteRing;
  const [red,green,blue]=ring.slice(1).match(/../g).map(value=>parseInt(value,16));
  assert.ok(green>red&&green>blue,`${season}: completed ink stays green`);
  for(const surface of ['peach','progressCompleteBackground','progressCompleteTrack']){
   assert.ok(luminance(ring)<luminance(colors[surface]),`${season}: green ink is darker than ${surface}`);
   assert.ok(contrast(ring,colors[surface])>=4.5,`${season}: completed ink contrast on ${surface}`);
  }
  completeGreens.add(ring);
 }
 assert.equal(completeGreens.size,4);
});
