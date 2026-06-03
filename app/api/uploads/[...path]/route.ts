import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const baseDir = path.isAbsolute(env.UPLOADS_DIR)
  ? env.UPLOADS_DIR
  : path.join(process.cwd(), env.UPLOADS_DIR);

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const abs = path.normalize(path.join(baseDir, ...parts));

  // Prevent path traversal outside the uploads directory.
  if (!abs.startsWith(path.normalize(baseDir))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const file = await fs.readFile(abs);
    const ext = abs.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
