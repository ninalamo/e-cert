import type { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local.provider";

export type { StorageProvider } from "./types";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider();
  }
  return provider;
}
