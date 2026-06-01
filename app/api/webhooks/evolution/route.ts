import { NextResponse, type NextRequest } from "next/server";
import { processarWebhookEvolution } from "@/lib/modules/captura-evolution";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const apiKey = request.headers.get("apikey") ?? "";
  const supabase = await createServiceClient();

  const result = await processarWebhookEvolution(body, apiKey, supabase);

  return NextResponse.json({ ok: result.aceito }, { status: result.status ?? 200 });
}
