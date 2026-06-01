import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gerarRonda, calcularPeriodoSemanaAnterior } from "@/lib/modules/gerador-ronda";
import { renderizarRondaWhatsapp, renderizarRondaCalls } from "@/lib/modules/email-renderer-ronda";
import { enviarRonda } from "@/lib/modules/enviador-resend";
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
    .select("nome_clinica, destinatarios_whatsapp, destinatarios_calls")
    .eq("id", 1)
    .single();

  const nomeCli = config?.nome_clinica ?? "Clínica";
  const { inicio, fim } = calcularPeriodoSemanaAnterior();
  const dataRef = inicio.toLocaleDateString("pt-BR");

  try {
    const [rondaWpp, rondaCalls] = await Promise.all([
      gerarRonda("whatsapp", inicio, fim, supabase),
      gerarRonda("calls", inicio, fim, supabase),
    ]);

    const [snapWpp, snapCalls] = await Promise.all([
      supabase
        .schema("comercial")
        .from("rondas")
        .select("snapshot")
        .eq("id", rondaWpp.rondaId)
        .single(),
      supabase
        .schema("comercial")
        .from("rondas")
        .select("snapshot")
        .eq("id", rondaCalls.rondaId)
        .single(),
    ]);

    await Promise.all([
      enviarRonda(
        rondaWpp.rondaId,
        `Ronda WhatsApp — ${nomeCli} (${dataRef})`,
        renderizarRondaWhatsapp(snapWpp.data!.snapshot, nomeCli),
        config?.destinatarios_whatsapp ?? [],
        nomeCli,
        supabase,
      ),
      enviarRonda(
        rondaCalls.rondaId,
        `Ronda Calls — ${nomeCli} (${dataRef})`,
        renderizarRondaCalls(snapCalls.data!.snapshot, nomeCli),
        config?.destinatarios_calls ?? [],
        nomeCli,
        supabase,
      ),
    ]);

    log.info("cron.ronda_semanal.ok", { inicio: inicio.toISOString(), fim: fim.toISOString() });
    return NextResponse.json({ ok: true, inicio: inicio.toISOString(), fim: fim.toISOString() });
  } catch (err) {
    log.error("cron.ronda_semanal.erro", {
      erro: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
