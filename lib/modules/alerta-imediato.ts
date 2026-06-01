import type { SupabaseClient } from "@supabase/supabase-js";
import { notificarScoreBaixo } from "@/lib/modules/email-alerta";
import { log } from "@/lib/log";

// Throttle: 1 alerta por lead por dia
const alertasHoje = new Map<string, number>();

function limparThrottle() {
  const agora = Date.now();
  for (const [k, ts] of alertasHoje) {
    if (agora - ts > 86_400_000) alertasHoje.delete(k);
  }
}

export async function dispararAlertaSeNecessario(
  tipo: "whatsapp" | "call",
  leadId: string | null,
  leadNome: string,
  leadTelefone: string,
  score: number,
  supabase: SupabaseClient,
): Promise<void> {
  if (!leadId) return;

  const { data: config } = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select("threshold_alerta_imediato_whatsapp, destinatarios_whatsapp, destinatarios_calls")
    .eq("id", 1)
    .single();

  if (!config) return;

  const threshold = config.threshold_alerta_imediato_whatsapp as number;
  if (score >= threshold) return;

  limparThrottle();
  const chave = `${tipo}:${leadId}`;
  if (alertasHoje.has(chave)) {
    log.info("alerta_imediato.throttled", { leadId, tipo, score });
    return;
  }

  const destinatarios: string[] =
    tipo === "whatsapp"
      ? (config.destinatarios_whatsapp as string[])
      : (config.destinatarios_calls as string[]);

  if (destinatarios.length === 0) return;

  alertasHoje.set(chave, Date.now());

  await notificarScoreBaixo({
    id: leadId,
    nome: leadNome,
    telefone: leadTelefone,
    score,
    tipo,
    destinatarios,
  });

  log.info("alerta_imediato.enviado", { leadId, tipo, score });
}
