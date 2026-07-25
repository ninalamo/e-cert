import type { StorageProvider } from "./types";
import { SupabaseStorageProvider } from "./supabase.provider";

export type { StorageProvider } from "./types";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = new SupabaseStorageProvider();
  }
  return provider;
}
