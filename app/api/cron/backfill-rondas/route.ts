import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gerarRonda, calcularPeriodoSemanaAnterior } from "@/lib/modules/gerador-ronda";
import { renderizarRondaCalls } from "@/lib/modules/email-renderer-ronda";
import { enviarRonda } from "@/lib/modules/enviador-resend";
import type { SnapshotCalls } from "@/lib/types";
import { log } from "@/lib/log";

// Regenera ronda da semana anterior se ainda não foi enviada (idempotente)
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: config } = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select("nome_clinica, destinatarios_calls")
    .eq("id", 1)
    .single();

  const nomeCli = config?.nome_clinica ?? "Areluna";
  const { inicio, fim } = calcularPeriodoSemanaAnterior();

  const { data: existente } = await supabase
    .schema("comercial")
    .from("rondas")
    .select("id, status")
    .eq("tipo", "calls")
    .gte("periodo_inicio", inicio.toISOString())
    .lte("periodo_inicio", fim.toISOString())
    .maybeSingle();

  if (existente?.status === "enviada") {
    log.info("cron.backfill_rondas.nada_a_fazer", { inicio: inicio.toISOString() });
    return NextResponse.json({ ok: true, message: "Ronda já enviada" });
  }

  try {
    const resultado = await gerarRonda(inicio, fim, supabase);
    const { data: snap } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", resultado.rondaId)
      .single();

    await enviarRonda(
      resultado.rondaId,
      `Ronda Calls — ${nomeCli} (${inicio.toLocaleDateString("pt-BR")}) [reenvio]`,
      renderizarRondaCalls(snap!.snapshot as unknown as SnapshotCalls, nomeCli),
      config?.destinatarios_calls ?? [],
      nomeCli,
      supabase,
    );
  } catch (err) {
    log.error("cron.backfill_rondas.erro", {
      erro: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
