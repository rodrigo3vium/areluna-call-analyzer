import { NextResponse, type NextRequest } from "next/server";
import { sincronizarSharePoint } from "@/lib/modules/sync-sharepoint";
import { createServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const resultado = await sincronizarSharePoint(supabase);
    log.info("cron.sync_sharepoint.concluido", resultado);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    log.error("cron.sync_sharepoint.erro", {
      erro: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" },
      { status: 500 },
    );
  }
}
