import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to fetch profile:", error);
    return null;
  }
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      Profile,
      | "first_name"
      | "last_name"
      | "display_name"
      | "bio"
      | "avatar_url"
      | "onboarding_complete"
    >
  >,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAvatar(
  userId: string,
  uri: string,
): Promise<string> {
  const fileName = `${userId}/avatar-${Date.now()}.jpg`;
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  return publicUrl;
}
