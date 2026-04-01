import PetPillSwitcher from "@/components/ui/pets/PetPillSwitcher";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import type { Pet } from "@/data/mockDashboard";
import { useProfileQuery } from "@/hooks/queries";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function greetingLine(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type DashboardHeaderProps = {
  pets: Pet[];
  activePetId: string | null;
  onSwitchPet: (id: string) => void;
  onAddPet?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  unreadNotificationCount?: number;
};

export default function DashboardHeader({
  pets,
  activePetId,
  onSwitchPet,
  onAddPet,
  onNotificationsPress,
  onProfilePress,
  unreadNotificationCount = 0,
}: DashboardHeaderProps) {
  const { data: profile } = useProfileQuery();
  const profileAvatarUri = profile?.avatar_url?.trim() || null;

  const { greeting, dateLine } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dateLine = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return { greeting: greetingLine(hour), dateLine };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.greetingColumn}>
          <View style={styles.greetingTitleRow}>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <Text style={styles.date}>{dateLine}</Text>
        </View>
        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onNotificationsPress}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={Colors.gray800}
            />
            {unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.circleButton,
              profileAvatarUri && styles.circleButtonWithPhoto,
            ]}
            onPress={onProfilePress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {profileAvatarUri ? (
              <Image
                source={{ uri: profileAvatarUri }}
                style={styles.profileAvatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={24}
                color={Colors.gray800}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pillBlock}>
        <PetPillSwitcher
          pets={pets}
          activePetId={activePetId}
          onSwitchPet={onSwitchPet}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  /** Greeting + date stacked tight; avoids row height following the 40px icon buttons. */
  greetingColumn: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  greetingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  greeting: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    lineHeight: 34,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  pawIcon: {
    marginRight: -2,
  },
  date: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 0,
    marginBottom: 10,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonWithPhoto: {
    padding: 0,
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  pillBlock: {
    marginTop: 8,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.gray300,
    backgroundColor: "transparent",
  },
  addPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.gray500,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.white,
    lineHeight: 14,
  },
});
