import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

// Marca leads com origem_status='pendente' há mais de 14 dias como 'desconhecido'
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const limite = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .schema("comercial")
    .from("leads")
    .update({
      origem: "desconhecido",
      origem_status: "desconhecido",
    })
    .eq("origem_status", "pendente")
    .lt("created_at", limite)
    .select("id");

  const atualizados = data?.length ?? 0;
  log.info("cron.classify_origin_stale.ok", { atualizados });
  return NextResponse.json({ ok: true, atualizados });
}
