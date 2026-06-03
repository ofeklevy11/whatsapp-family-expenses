import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type {
  StorageService,
  SaveFileInput,
  SavedFile,
} from "./storage.interface";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

function extensionFor(input: SaveFileInput): string {
  if (input.fileName && input.fileName.includes(".")) {
    return input.fileName.split(".").pop()!.toLowerCase();
  }
  return MIME_EXTENSIONS[input.mimeType] ?? "bin";
}

/**
 * Stores files on the local filesystem under:
 *   {UPLOADS_DIR}/families/{familyId}/{timestamp}-{uuid}.{ext}
 *
 * Files are served back through the /api/uploads route handler so they
 * stay out of the public folder (and can be access-controlled later).
 */
export class LocalStorageService implements StorageService {
  constructor(private readonly baseDir: string) {}

  async saveFile(input: SaveFileInput): Promise<SavedFile> {
    const ext = extensionFor(input);
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;

    const relDir = path.join("families", input.familyId);
    const absDir = path.join(this.baseDir, relDir);
    await fs.mkdir(absDir, { recursive: true });

    const absPath = path.join(absDir, fileName);
    await fs.writeFile(absPath, input.buffer);

    // URL always uses forward slashes regardless of OS.
    const url = `/api/uploads/families/${input.familyId}/${fileName}`;

    return { url, path: absPath };
  }
}

/** Default storage instance (local). Swap here when moving to S3/R2. */
export const storage: StorageService = new LocalStorageService(
  path.isAbsolute(env.UPLOADS_DIR)
    ? env.UPLOADS_DIR
    : path.join(process.cwd(), env.UPLOADS_DIR),
);
