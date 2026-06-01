import { NextResponse, type NextRequest } from "next/server";
import { processarWebhookPlaud } from "@/lib/modules/captura-plaud";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const receivedSecret = request.headers.get("x-zapier-secret") ?? "";
  const expectedSecret = process.env.ZAPIER_WEBHOOK_SECRET ?? "";
  const supabase = await createServiceClient();

  const result = await processarWebhookPlaud(body, receivedSecret, expectedSecret, supabase);

  return NextResponse.json({ ok: result.aceito }, { status: result.status ?? 200 });
}
