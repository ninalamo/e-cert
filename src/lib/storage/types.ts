export interface StorageProvider {
  writeFile(path: string, data: Buffer): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  getSignedUrl(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
}
