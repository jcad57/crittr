import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { queryClient } from "@/lib/query/client";
import { supabase } from "@/lib/supabase";
import { AppState, Platform } from "react-native";

export function setupAppResumeHandler(): () => void {
  if (Platform.OS === "web") return () => {};
  let disposed = false,
    revision = 0,
    backgroundedAt: number | null = null;
  const apply = async (state: string) => {
    const version = ++revision;
    if (state !== "active") {
      backgroundedAt ??= Date.now();
      focusManager.setFocused(false);
      await supabase.auth.stopAutoRefresh();
      return;
    }
    const away = backgroundedAt == null ? 0 : Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (away >= 30_000)
      await queryClient.cancelQueries({ fetchStatus: "fetching" });
    if (disposed || version !== revision) return;
    focusManager.setFocused(true);
    await supabase.auth.startAutoRefresh();
  };
  const app = AppState.addEventListener("change", (state) => {
    void apply(state).catch(() => {});
  });
  let networkRevision = 0;
  const online = (state: Network.NetworkState) =>
    onlineManager.setOnline(
      state.isConnected !== false && state.isInternetReachable !== false,
    );
  const network = Network.addNetworkStateListener((state) => {
    networkRevision++;
    online(state);
  });
  void Network.getNetworkStateAsync()
    .then((state) => {
      if (!disposed && networkRevision === 0) online(state);
    })
    .catch(() => {});
  void apply(AppState.currentState ?? "unknown").catch(() => {});
  return () => {
    disposed = true;
    revision++;
    app.remove();
    network.remove();
    void supabase.auth.stopAutoRefresh();
  };
}
