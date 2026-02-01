import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOOLS } from "@/lib/tools";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const apiKey = req.headers.get("x-tools-key");
  if (!process.env.TOOLS_API_KEY || apiKey !== process.env.TOOLS_API_KEY) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { name } = await context.params;

  const tool = (TOOLS as Record<string, unknown>)[name];
  if (typeof tool !== "function") {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Tool not found" } },
      { status: 404 }
    );
  }

  const payload = await req.json();

  try {
    const result = await (tool as (x: unknown) => Promise<unknown>)(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "DB_ERROR", message: "Tool execution failed" } },
      { status: 500 }
    );
  }
}
