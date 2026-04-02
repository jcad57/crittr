import { Colors } from "@/constants/colors";
import {
  FLOATING_NAV_BAR_HEIGHT,
  FLOATING_NAV_HORIZONTAL_MARGIN_PERCENT,
  FLOATING_NAV_OUTER_BOTTOM_GAP,
  getFloatingNavSlideOutDistance,
  shouldShowFloatingNav,
} from "@/constants/floatingNav";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabId = "home" | "activity" | "pets" | "health" | "more";

type TabItem = {
  id: TabId;
  label: string;
  href: Href;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TABS: TabItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/(logged-in)/dashboard",
    icon: "home-outline",
    iconActive: "home",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/(logged-in)/activity",
    icon: "chart-timeline-variant",
    iconActive: "chart-timeline-variant",
  },
  {
    id: "pets",
    label: "Pets",
    href: "/(logged-in)/pets",
    icon: "paw-outline",
    iconActive: "paw",
  },
  {
    id: "health",
    label: "Health",
    href: "/(logged-in)/health",
    icon: "heart-pulse",
    iconActive: "heart-pulse",
  },
  {
    id: "more",
    label: "More",
    href: "/(logged-in)/more",
    icon: "menu",
    iconActive: "menu",
  },
];

/** True when `pathname` is already the tab’s root screen (same destination as `router.replace(href)`). */
function isAlreadyOnTabRoot(tabId: TabId, pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  switch (tabId) {
    case "home":
      return /\/dashboard$/.test(p);
    case "activity":
      return /\/activity$/.test(p);
    case "pets":
      return /\/pets$/.test(p);
    case "health":
      return /\/health$/.test(p);
    case "more":
      return /\/more$/.test(p);
    default:
      return false;
  }
}

function resolveActiveTab(pathname: string, segments: string[]): TabId {
  if (segments.includes("dashboard")) return "home";
  if (segments.includes("activity")) return "activity";
  if (segments.includes("pets")) return "pets";
  if (segments.includes("pet")) return "pets";
  if (segments.includes("health")) return "health";
  if (segments.includes("more") || segments.includes("profile")) return "more";
  if (segments.includes("add-pet")) return "pets";
  if (segments.includes("add-vet-visit")) return "health";

  if (pathname.includes("dashboard")) return "home";
  if (pathname.includes("activity")) return "activity";
  if (pathname.includes("/pets") && !pathname.includes("/pet/")) return "pets";
  if (pathname.includes("/pet/")) return "pets";
  if (pathname.includes("health")) return "health";
  if (pathname.includes("more") || pathname.includes("profile")) return "more";
  if (pathname.includes("add-pet")) return "pets";
  if (pathname.includes("add-vet-visit")) return "health";
  return "home";
}

export default function FloatingBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const active = resolveActiveTab(pathname, segments as string[]);
  const navVisible = shouldShowFloatingNav(segments, pathname);
  const slideDistance = getFloatingNavSlideOutDistance(insets.bottom);

  const translateY = useSharedValue(navVisible ? 0 : slideDistance);

  useEffect(() => {
    translateY.value = withTiming(navVisible ? 0 : slideDistance, {
      duration: 280,
    });
  }, [navVisible, slideDistance]);

  const animatedOuterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents={navVisible ? "box-none" : "none"}
      style={[
        styles.outer,
        animatedOuterStyle,
        {
          paddingBottom: insets.bottom + FLOATING_NAV_OUTER_BOTTOM_GAP,
          paddingHorizontal: FLOATING_NAV_HORIZONTAL_MARGIN_PERCENT,
        },
      ]}
    >
      <View style={styles.pill}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
              onPress={() => {
                if (isAlreadyOnTabRoot(tab.id, pathname)) return;
                router.replace(tab.href);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? Colors.orange : Colors.gray400}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    width: "100%",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: FLOATING_NAV_BAR_HEIGHT,
    borderRadius: FLOATING_NAV_BAR_HEIGHT / 2,
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    minWidth: 0,
  },
  tabPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    fontFamily: Font.isMedium,
    fontSize: 10,
    color: Colors.gray400,
  },
  tabLabelActive: {
    fontFamily: Font.isSemiBold,
    color: Colors.orange,
  },
});
