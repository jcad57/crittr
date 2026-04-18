import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import {
  extensionForContentType,
  inferImageContentType,
  readLocalImageUriAsArrayBuffer,
} from "./localImageUpload";

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

export async function fetchProfilesByIds(userIds: string[]): Promise<Profile[]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", unique);

  if (error) {
    console.error("Failed to fetch profiles by ids:", error);
    return [];
  }
  return data ?? [];
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
      | "home_address"
      | "phone_number"
      | "avatar_url"
      | "onboarding_complete"
      | "notify_meals_treats"
      | "notify_co_care_activities"
      | "notify_medications"
      | "notify_vet_visits"
      | "crittr_pro_banner_theme"
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
  const contentType = inferImageContentType(uri);
  const fileName = `${userId}/avatar-${Date.now()}.${extensionForContentType(contentType)}`;
  const buffer = await readLocalImageUriAsArrayBuffer(uri);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  return publicUrl;
}
