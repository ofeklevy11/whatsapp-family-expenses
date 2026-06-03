import { NextResponse } from "next/server";
import { getBotStatus } from "@/server/services/bot-status.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getBotStatus();
    return NextResponse.json(status);
  } catch {
    // DB unreachable — report offline rather than 500 so the UI degrades gracefully.
    return NextResponse.json({
      online: false,
      connection: "close",
      phone: null,
      lastSeenAt: null,
      connectedAt: null,
      lastError: "status_unavailable",
      staleMs: null,
    });
  }
}
