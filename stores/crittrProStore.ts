import { create } from "zustand";

/**
 * Manual Crittr Pro override used in dev/QA flows. The real entitlement comes
 * from `profile.crittr_pro_until` (driven by RevenueCat). `isMockPro === false`
 * simulates a free user for gated flows (e.g. add pet).
 */
type CrittrProState = {
  isMockPro: boolean;
  setMockPro: (value: boolean) => void;
};

export const useCrittrProStore = create<CrittrProState>((set) => ({
  isMockPro: false,
  setMockPro: (isMockPro) => set({ isMockPro }),
}));
