import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { recomputarStatusLead } from "@/lib/modules/lead-status-machine";
import { log } from "@/lib/log";

// Detecta leads em_atendimento sem mensagem nova há 48h e reclassifica como sem_resposta
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: conversas } = await supabase
    .schema("comercial")
    .from("conversas")
    .select("lead_id")
    .eq("status", "ativa")
    .lt("ultima_mensagem_em", limite48h)
    .not("lead_id", "is", null)
    .limit(100);

  const leadIds = [...new Set((conversas ?? []).map((c) => c.lead_id as string))];

  const { data: leads } = await supabase
    .schema("comercial")
    .from("leads")
    .select("id")
    .in("id", leadIds)
    .eq("status", "em_atendimento")
    .eq("status_origem", "sistema");

  let atualizados = 0;
  for (const lead of leads ?? []) {
    await recomputarStatusLead(lead.id, "sem_resposta", supabase);
    atualizados++;
  }

  log.info("cron.recompute_stale_leads.ok", { atualizados });
  return NextResponse.json({ ok: true, atualizados });
}
