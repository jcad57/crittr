import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import AlertBanner from "@/components/ui/dashboard/AlertBanner";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import { Colors } from "@/constants/colors";
import {
  MOCK_ACTIVITIES,
  MOCK_ALERT,
  MOCK_DAILY_PROGRESS,
  MOCK_MEDICATIONS,
  MOCK_PETS,
  MOCK_VET_VISITS,
} from "@/data/mockDashboard";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const activePet = MOCK_PETS[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerPad}>
        <DashboardHeader pet={activePet} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AlertBanner alert={MOCK_ALERT} />

        <View style={styles.section}>
          <DailyProgress categories={MOCK_DAILY_PROGRESS} />
        </View>

        <View style={styles.section}>
          <ActivityFeed activities={MOCK_ACTIVITIES} date="October 16, 2025" />
        </View>

        <View style={styles.section}>
          <HealthSection
            medications={MOCK_MEDICATIONS}
            vetVisits={MOCK_VET_VISITS}
          />
        </View>

        <View style={styles.section}>
          <PetManagement pets={MOCK_PETS} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerPad: {
    paddingHorizontal: 20,
  },
  scroll: {
    paddingTop: 10,
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
});
