import { NextResponse, type NextRequest } from "next/server";
import { processarTranscricoesPendentes } from "@/lib/modules/transcritor-calls";
import { createServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const resultado = await processarTranscricoesPendentes(supabase);
    log.info("cron.transcrever_calls.concluido", resultado);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    log.error("cron.transcrever_calls.erro", {
      erro: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" },
      { status: 500 },
    );
  }
}
