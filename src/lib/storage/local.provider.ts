import fs from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./types";

const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH ?? "./storage";

export class LocalStorageProvider implements StorageProvider {
  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private resolvePath(relativePath: string): string {
    return path.join(STORAGE_ROOT, relativePath);
  }

  async writeFile(relativePath: string, data: Buffer): Promise<string> {
    const fullPath = this.resolvePath(relativePath);
    await this.ensureDir(fullPath);
    await fs.writeFile(fullPath, data);
    return relativePath;
  }

  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.resolvePath(relativePath);
    return fs.readFile(fullPath);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    await fs.unlink(fullPath);
  }

  async getSignedUrl(relativePath: string): Promise<string> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${appUrl}/api/storage/${relativePath}`;
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(relativePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
