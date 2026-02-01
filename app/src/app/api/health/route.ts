import { NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env vars" }, { status: 500 });
  }

  const supabase = createClient(url, key);

  // simple read: check table exists (0 rows is fine)
  const { error } = await supabase.from("transactions").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
