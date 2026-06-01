import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gerarRonda, calcularPeriodoSemanaAnterior } from "@/lib/modules/gerador-ronda";
import { renderizarRondaWhatsapp, renderizarRondaCalls } from "@/lib/modules/email-renderer-ronda";
import { enviarRonda } from "@/lib/modules/enviador-resend";
import { log } from "@/lib/log";

// Regenera rondas com status != 'enviada' da semana anterior (idempotente)
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: config } = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select("nome_clinica, destinatarios_whatsapp, destinatarios_calls")
    .eq("id", 1)
    .single();

  const nomeCli = config?.nome_clinica ?? "Clínica";
  const { inicio, fim } = calcularPeriodoSemanaAnterior();
  const dataRef = inicio.toLocaleDateString("pt-BR");

  const { data: existentes } = await supabase
    .schema("comercial")
    .from("rondas")
    .select("id, tipo, status")
    .gte("periodo_inicio", inicio.toISOString())
    .lte("periodo_inicio", fim.toISOString());

  const enviadas = new Set(
    (existentes ?? []).filter((r) => r.status === "enviada").map((r) => r.tipo),
  );
  const tiposParaReprocessar = (["whatsapp", "calls"] as const).filter((t) => !enviadas.has(t));

  if (tiposParaReprocessar.length === 0) {
    log.info("cron.backfill_rondas.nada_a_fazer", { inicio: inicio.toISOString() });
    return NextResponse.json({ ok: true, message: "Todas as rondas já enviadas" });
  }

  for (const tipo of tiposParaReprocessar) {
    try {
      const resultado = await gerarRonda(tipo, inicio, fim, supabase);
      const { data: snap } = await supabase
        .schema("comercial")
        .from("rondas")
        .select("snapshot")
        .eq("id", resultado.rondaId)
        .single();

      const destinatarios =
        tipo === "whatsapp"
          ? (config?.destinatarios_whatsapp ?? [])
          : (config?.destinatarios_calls ?? []);

      const html =
        tipo === "whatsapp"
          ? renderizarRondaWhatsapp(snap!.snapshot, nomeCli)
          : renderizarRondaCalls(snap!.snapshot, nomeCli);

      const assunto =
        tipo === "whatsapp"
          ? `Ronda WhatsApp — ${nomeCli} (${dataRef}) [reenvio]`
          : `Ronda Calls — ${nomeCli} (${dataRef}) [reenvio]`;

      await enviarRonda(resultado.rondaId, assunto, html, destinatarios, nomeCli, supabase);
    } catch (err) {
      log.error("cron.backfill_rondas.erro", {
        tipo,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, reprocessados: tiposParaReprocessar });
}
