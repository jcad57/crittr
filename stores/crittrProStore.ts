import { create } from "zustand";

/**
 * Mock Crittr Pro subscription until Stripe is integrated.
 * `isMockPro === false` simulates a free user for gated flows (e.g. add pet).
 */
type CrittrProState = {
  isMockPro: boolean;
  setMockPro: (value: boolean) => void;
};

export const useCrittrProStore = create<CrittrProState>((set) => ({
  isMockPro: false,
  setMockPro: (isMockPro) => set({ isMockPro }),
}));
