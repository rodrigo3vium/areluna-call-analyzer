import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

export type ResultadoWebhook = {
  aceito: boolean;
  ignorado?: boolean;
  status?: number;
  erro?: string;
};

type EvolutionPayload = {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: Record<string, unknown>;
    messageType?: string;
    messageTimestamp?: number;
  };
};

export async function processarWebhookEvolution(
  body: unknown,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<ResultadoWebhook> {
  // Validação estrutural básica
  const payload = body as EvolutionPayload;
  if (!payload?.data?.key?.id || !payload?.instance) {
    return { aceito: false, status: 400, erro: "Payload inválido" };
  }

  // Buscar instance pelo nome e validar secret
  const { data: instance, error: instanceError } = await supabase
    .schema("comercial")
    .from("evolution_instances")
    .select("id, webhook_secret, ativa")
    .eq("instance_name", payload.instance)
    .single();

  if (instanceError || !instance) {
    log.warn("evolution.webhook.instance_not_found", { instance: payload.instance });
    return { aceito: false, status: 401, erro: "Instância não encontrada" };
  }

  if (instance.webhook_secret !== apiKey) {
    log.warn("evolution.webhook.invalid_secret", { instance: payload.instance });
    return { aceito: false, status: 401, erro: "Secret inválido" };
  }

  if (!instance.ativa) {
    return { aceito: true, ignorado: true };
  }

  // Ignorar eventos que não são messages.upsert
  if (payload.event !== "messages.upsert") {
    return { aceito: true, ignorado: true };
  }

  const key = payload.data!.key!;

  // Ignorar mensagens do próprio bot
  if (key.fromMe === true) {
    return { aceito: true, ignorado: true };
  }

  // Ignorar grupos
  if (key.remoteJid?.endsWith("@g.us")) {
    return { aceito: true, ignorado: true };
  }

  const externalId = `${payload.instance}_${key.id}`;

  // Inserir em eventos_brutos (UNIQUE constraint trata duplicatas)
  const { error: insertError } = await supabase
    .schema("comercial")
    .from("eventos_brutos")
    .insert({
      fonte: "evolution",
      external_id: externalId,
      payload: body as Record<string, unknown>,
    });

  if (insertError) {
    // Duplicata — UNIQUE constraint
    if (insertError.code === "23505") {
      log.debug("evolution.webhook.duplicate", { externalId });
      return { aceito: true, ignorado: true };
    }
    log.error("evolution.webhook.insert_error", { error: insertError.message });
    return { aceito: false, status: 500, erro: "Erro ao inserir evento" };
  }

  log.info("evolution.webhook.aceito", { externalId });
  return { aceito: true };
}
