import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StorageProvider } from "./types";

const BUCKET = "certificates";

export class SupabaseStorageProvider implements StorageProvider {
  async writeFile(path: string, data: Buffer): Promise<string> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, data, { contentType: "application/pdf", upsert: true });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    return path;
  }

  async readFile(path: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(path);

    if (error) {
      throw new Error(`Storage download failed: ${error.message}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 604800);

    if (error) {
      throw new Error(`Storage signed URL failed: ${error.message}`);
    }
    return data.signedUrl;
  }

  async fileExists(path: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .exists(path);

    return !error && data;
  }
}
