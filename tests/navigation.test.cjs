const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const React = require("react");
const { loadTS } = require("./load-typescript.cjs");

const destinations = [
  ["Home", "/(logged-in)/(tabs)/dashboard"],
  ["Schedule", "/(logged-in)/(tabs)/activity"],
  ["Pets", "/(logged-in)/(tabs)/pets"],
  ["Health", "/(logged-in)/(tabs)/health"],
  ["CrittrAI", "/(logged-in)/crittr-ai"],
];

function loadTabLayout() {
  const Tabs = Object.assign(() => null, { Screen: () => null });
  return loadTS("app/(logged-in)/(tabs)/_layout.tsx", {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@/theme/colors": { Colors: {} },
    "expo-router": { Tabs },
  }).default();
}

function renderNav(pathname) {
  const calls = [];
  const { default: FloatingBottomNav } = loadTS(
    "components/ui/navigation/FloatingBottomNav.tsx",
    {
      "react/jsx-runtime": require("react/jsx-runtime"),
      react: { useEffect() {} },
      "@/theme/colors": { Colors: {} },
      "@/theme/typography": { Font: {} },
      "@/lib/navigation/floatingNav": loadTS("lib/navigation/floatingNav.ts"),
      "@expo/vector-icons": { MaterialCommunityIcons: () => null },
      "expo-router": {
        usePathname: () => pathname,
        useSegments: () => ["(logged-in)", ...pathname.split("/").filter(Boolean)],
        useRouter: () => ({
          navigate: (href) => calls.push(["navigate", href]),
          push: (href) => calls.push(["push", href]),
        }),
      },
      "react-native": {
        Pressable: "Pressable",
        View: "View",
        Text: "Text",
        StyleSheet: { create: (styles) => styles },
      },
      "react-native-reanimated": {
        default: { View: "Animated.View" },
        useSharedValue: (value) => ({ value }),
        useAnimatedStyle: (callback) => callback(),
        withTiming: (value) => value,
      },
      "react-native-safe-area-context": {
        useSafeAreaInsets: () => ({ bottom: 0 }),
      },
    },
  );
  const nav = FloatingBottomNav();
  const buttons = React.Children.toArray(nav.props.children.props.children);
  return { calls, buttons };
}

test("SDK 58 tab layout explicitly declares every filesystem tab", () => {
  // Undeclared filesystem tabs redirect to the first declared tab in SDK 58.
  const routes = fs.readdirSync("app/(logged-in)/(tabs)")
    .filter((file) => file.endsWith(".tsx") && file !== "_layout.tsx")
    .map((file) => file.slice(0, -4));
  const declared = React.Children.toArray(loadTabLayout().props.children)
    .map((screen) => screen.props.name);
  assert.deepEqual([...declared].sort(), routes.sort());
});

test("each bottom navigation button opens its own screen from a detail screen", () => {
  const declared = new Set(React.Children.toArray(loadTabLayout().props.children)
    .map((screen) => screen.props.name));
  for (const [label, href] of destinations) {
    const { calls, buttons } = renderNav("/pet/test-pet");
    const button = buttons.find((item) => item.props.accessibilityLabel === label);
    assert.ok(button, `Missing ${label} button`);
    button.props.onPress();
    assert.deepEqual(calls, [[label === "CrittrAI" ? "push" : "navigate", href]]);
    assert.ok(fs.existsSync(`app${href}.tsx`), `${label} route must exist`);
    if (href.includes("/(tabs)/")) {
      assert.ok(declared.has(href.split("/").at(-1)), `${label} must be declared`);
    }
  }
});

test("active bottom navigation buttons stay selected and tapping them is a no-op", () => {
  for (const [label, href] of destinations) {
    const { calls, buttons } = renderNav(`/${href.split("/").at(-1)}`);
    const button = buttons.find((item) => item.props.accessibilityLabel === label);
    assert.equal(button.props.accessibilityState.selected, true, label);
    button.props.onPress();
    assert.deepEqual(calls, [], label);
  }
});
