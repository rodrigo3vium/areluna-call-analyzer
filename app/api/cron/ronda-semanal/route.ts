import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gerarRonda, calcularPeriodoSemanaAnterior } from "@/lib/modules/gerador-ronda";
import { renderizarRondaCalls } from "@/lib/modules/email-renderer-ronda";
import { enviarRonda } from "@/lib/modules/enviador-resend";
import type { SnapshotCalls } from "@/lib/types";
import { log } from "@/lib/log";

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

  try {
    const ronda = await gerarRonda(inicio, fim, supabase);

    const { data: snap } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", ronda.rondaId)
      .single();

    await enviarRonda(
      ronda.rondaId,
      `Ronda Calls — ${nomeCli} (${inicio.toLocaleDateString("pt-BR")})`,
      renderizarRondaCalls(snap!.snapshot as unknown as SnapshotCalls, nomeCli),
      config?.destinatarios_calls ?? [],
      nomeCli,
      supabase,
    );

    log.info("cron.ronda_semanal.ok", { inicio: inicio.toISOString(), fim: fim.toISOString() });
    return NextResponse.json({ ok: true, inicio: inicio.toISOString(), fim: fim.toISOString() });
  } catch (err) {
    log.error("cron.ronda_semanal.erro", {
      erro: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
