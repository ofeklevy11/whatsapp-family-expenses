export interface SaveFileInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  familyId: string;
}

export interface SavedFile {
  /** Public-ish URL/path used to reference the file (e.g. "/uploads/..."). */
  url: string;
  /** Absolute or storage-relative path where the file lives. */
  path: string;
}

/**
 * Storage abstraction. The local implementation writes to disk now;
 * swap in an S3 / Cloudflare R2 implementation later without touching
 * the services that consume it.
 */
export interface StorageService {
  saveFile(input: SaveFileInput): Promise<SavedFile>;
}
