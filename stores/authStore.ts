import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  needsOnboarding: boolean;

  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isLoggedIn: false,
  needsOnboarding: false,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        set({
          session,
          profile,
          isLoggedIn: true,
          needsOnboarding: !profile?.onboarding_complete,
        });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          set({
            session,
            profile,
            isLoggedIn: true,
            needsOnboarding: !profile?.onboarding_complete,
          });
        } else {
          set({
            session: null,
            profile: null,
            isLoggedIn: false,
            needsOnboarding: false,
          });
        }
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, firstName, lastName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({
      session: null,
      profile: null,
      isLoggedIn: false,
      needsOnboarding: false,
    });
  },

  setProfile: (profile) => {
    set({ profile, needsOnboarding: !profile.onboarding_complete });
  },

  completeOnboarding: async () => {
    const { session } = get();
    if (!session) throw new Error("No session");

    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) throw error;
    set({ profile: data, needsOnboarding: false });
  },
}));
