import { NextResponse, type NextRequest } from "next/server";
import { processarEventosPendentes } from "@/lib/modules/processador-eventos";
import { createServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const resultado = await processarEventosPendentes(supabase);

  log.info("cron.processar_eventos.concluido", resultado);
  return NextResponse.json(resultado);
}
