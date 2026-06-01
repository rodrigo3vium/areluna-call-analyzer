import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { log } from "@/lib/log";
import type { ResultadoWebhook } from "./captura-evolution";

export async function processarWebhookPlaud(
  body: unknown,
  receivedSecret: string,
  expectedSecret: string,
  supabase: SupabaseClient,
): Promise<ResultadoWebhook> {
  if (receivedSecret !== expectedSecret) {
    log.warn("plaud.webhook.invalid_secret");
    return { aceito: false, status: 401, erro: "Secret inválido" };
  }

  const payload = body as Record<string, unknown>;
  const transcript = payload["transcript"] as string | undefined;
  const plaudId = payload["id"] as string | undefined;

  // Precisamos de transcript OU id para ter evento útil
  if (!transcript && !plaudId) {
    return { aceito: false, status: 400, erro: "Payload sem transcript nem id" };
  }

  // external_id: plaud_id se disponível, senão hash de transcript
  let externalId: string;
  if (plaudId) {
    externalId = plaudId;
  } else {
    const hash = createHash("sha256").update(transcript!).digest("hex").slice(0, 16);
    externalId = `hash_${hash}`;
  }

  const { error: insertError } = await supabase.schema("comercial").from("eventos_brutos").insert({
    fonte: "zapier_plaud",
    external_id: externalId,
    payload: payload,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      log.debug("plaud.webhook.duplicate", { externalId });
      return { aceito: true, ignorado: true };
    }
    log.error("plaud.webhook.insert_error", { error: insertError.message });
    return { aceito: false, status: 500, erro: "Erro ao inserir evento" };
  }

  log.info("plaud.webhook.aceito", { externalId });
  return { aceito: true };
}
