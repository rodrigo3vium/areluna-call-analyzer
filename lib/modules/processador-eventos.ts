import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizar } from "@/lib/phone";
import { transcreverAudio } from "@/lib/modules/whisper";
import { notificarDeadLetter } from "@/lib/modules/email-alerta";
import { log } from "@/lib/log";

const MAX_TENTATIVAS = 5;
const BATCH_SIZE = 20;

export type ResultadoProcessamento = {
  processados: number;
  erros: number;
  deadLetters: number;
};

export async function processarEventosPendentes(
  supabase: SupabaseClient,
): Promise<ResultadoProcessamento> {
  const resultado: ResultadoProcessamento = { processados: 0, erros: 0, deadLetters: 0 };

  // Seleciona pendentes e erros que ainda têm tentativas disponíveis
  const { data: eventos, error } = await supabase
    .schema("comercial")
    .from("eventos_brutos")
    .select("*")
    .in("status", ["pendente", "erro"])
    .lt("tentativas", MAX_TENTATIVAS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    log.error("processador.select_error", { error: error.message });
    return resultado;
  }

  for (const evento of eventos ?? []) {
    await processarEvento(evento, supabase, resultado);
  }

  return resultado;
}

async function processarEvento(
  evento: Record<string, unknown>,
  supabase: SupabaseClient,
  resultado: ResultadoProcessamento,
) {
  // Marcar como processando (tentativa optimistic)
  await supabase
    .schema("comercial")
    .from("eventos_brutos")
    .update({ status: "processando" })
    .eq("id", evento.id);

  try {
    if (evento.fonte === "evolution") {
      await processarEventoEvolution(evento, supabase);
    } else if (evento.fonte === "zapier_plaud") {
      await processarEventoPlaud(evento, supabase);
    } else {
      throw new Error(`Fonte desconhecida: ${evento.fonte}`);
    }

    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .update({ status: "processado", processado_em: new Date().toISOString() })
      .eq("id", evento.id);

    resultado.processados++;
  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err);
    const novasTentativas = (evento.tentativas as number) + 1;
    const isDeadLetter = novasTentativas >= MAX_TENTATIVAS;

    log.warn("processador.evento_erro", {
      eventoId: evento.id,
      tentativas: novasTentativas,
      deadLetter: isDeadLetter,
      erro: mensagemErro,
    });

    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .update({
        status: isDeadLetter ? "dead_letter" : "erro",
        tentativas: novasTentativas,
        ultimo_erro: mensagemErro,
      })
      .eq("id", evento.id);

    if (isDeadLetter) {
      await notificarDeadLetter({
        id: evento.id as string,
        fonte: evento.fonte as string,
        external_id: evento.external_id as string,
        ultimo_erro: mensagemErro,
      });
      resultado.deadLetters++;
    } else {
      resultado.erros++;
    }
  }
}

async function processarEventoEvolution(evento: Record<string, unknown>, supabase: SupabaseClient) {
  const payload = evento.payload as Record<string, unknown>;
  const data = payload["data"] as Record<string, unknown>;
  const key = data["key"] as Record<string, unknown>;
  const instanceName = payload["instance"] as string;

  // Buscar evolution_instance
  const { data: instance, error: instanceError } = await supabase
    .schema("comercial")
    .from("evolution_instances")
    .select("id")
    .eq("instance_name", instanceName)
    .single();

  if (instanceError || !instance) {
    throw new Error(`Evolution instance não encontrada: ${instanceName}`);
  }

  const remoteJid = key["remoteJid"] as string;
  const messageId = key["id"] as string;
  const messageType = data["messageType"] as string;
  const messageTimestamp = data["messageTimestamp"] as number | undefined;
  const pushName = data["pushName"] as string | undefined;
  const message = data["message"] as Record<string, unknown> | undefined;

  // Normalizar telefone
  const telefone = normalizar(remoteJid);
  if (!telefone) {
    throw new Error(`Telefone inválido: ${remoteJid}`);
  }

  // Find or create Lead
  const { data: leadUpsert } = await supabase
    .schema("comercial")
    .from("leads")
    .upsert(
      { telefone, nome: pushName ?? telefone },
      { onConflict: "telefone", ignoreDuplicates: false },
    )
    .select("id")
    .single()
    .throwOnError();

  const leadId = leadUpsert!.id;

  // Find or create Conversa
  let conversaId: string;
  const { data: conversaExistente } = await supabase
    .schema("comercial")
    .from("conversas")
    .select("id")
    .eq("lead_id", leadId)
    .eq("evolution_instance_id", instance.id)
    .eq("numero_whatsapp", telefone)
    .maybeSingle();

  if (conversaExistente) {
    conversaId = conversaExistente.id;
  } else {
    const { data: novaConversa } = await supabase
      .schema("comercial")
      .from("conversas")
      .insert({
        lead_id: leadId,
        evolution_instance_id: instance.id,
        numero_whatsapp: telefone,
        status: "ativa",
      })
      .select("id")
      .single()
      .throwOnError();
    conversaId = novaConversa!.id;
  }

  // Resolver tipo e conteúdo da mensagem
  const { tipo, conteudo, mediaUrl, duracaoSegundos } = await extrairConteudoMensagem(
    messageType,
    message,
  );

  const enviada_em = messageTimestamp
    ? new Date(messageTimestamp * 1000).toISOString()
    : new Date().toISOString();

  // Inserir Mensagem (UNIQUE em message_id_evolution cuida de dedup)
  await supabase
    .schema("comercial")
    .from("mensagens")
    .insert({
      conversa_id: conversaId,
      message_id_evolution: messageId,
      tipo,
      fonte: "humano",
      conteudo,
      media_url: mediaUrl,
      duracao_segundos: duracaoSegundos,
      remetente: "lead",
      enviada_em,
    })
    .throwOnError();

  // Atualizar ultima_mensagem_em na conversa
  await supabase
    .schema("comercial")
    .from("conversas")
    .update({ ultima_mensagem_em: enviada_em })
    .eq("id", conversaId);
}

async function extrairConteudoMensagem(
  messageType: string,
  message: Record<string, unknown> | undefined,
): Promise<{
  tipo: string;
  conteudo: string | null;
  mediaUrl: string | null;
  duracaoSegundos: number | null;
}> {
  if (!message) return { tipo: "outro", conteudo: null, mediaUrl: null, duracaoSegundos: null };

  switch (messageType) {
    case "conversation":
      return {
        tipo: "texto",
        conteudo: (message["conversation"] as string) ?? null,
        mediaUrl: null,
        duracaoSegundos: null,
      };

    case "extendedTextMessage": {
      const ext = message["extendedTextMessage"] as Record<string, unknown> | undefined;
      return {
        tipo: "texto",
        conteudo: (ext?.["text"] as string) ?? null,
        mediaUrl: null,
        duracaoSegundos: null,
      };
    }

    case "audioMessage":
    case "pttMessage": {
      const audio = message["audioMessage"] as Record<string, unknown> | undefined;
      const url = audio?.["url"] as string | undefined;
      const duracao = audio?.["seconds"] as number | undefined;

      let conteudo: string | null = null;
      if (url) {
        const transcricao = await transcreverAudio(url);
        conteudo = transcricao ?? "[áudio - transcrição indisponível]";
      }

      return { tipo: "audio", conteudo, mediaUrl: url ?? null, duracaoSegundos: duracao ?? null };
    }

    case "imageMessage":
      return { tipo: "imagem", conteudo: "[imagem]", mediaUrl: null, duracaoSegundos: null };

    case "documentMessage":
      return { tipo: "documento", conteudo: "[documento]", mediaUrl: null, duracaoSegundos: null };

    default:
      return { tipo: "outro", conteudo: null, mediaUrl: null, duracaoSegundos: null };
  }
}

async function processarEventoPlaud(evento: Record<string, unknown>, supabase: SupabaseClient) {
  const payload = evento.payload as Record<string, unknown>;
  const configuracoes = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select("zapier_plaud_mapping")
    .single()
    .throwOnError();

  const mapping = (configuracoes.data?.zapier_plaud_mapping as Record<string, string>) ?? {};

  const get = (field: string, fallback: string) => payload[mapping[field] ?? fallback];

  const plaudId = get("plaud_id_field", "id") as string | undefined;
  const titulo = get("title_field", "title") as string | undefined;
  const transcricao = get("transcript_field", "transcript") as string | undefined;
  const duracao = get("duration_field", "duration") as number | undefined;
  const telefone = get("phone_field", "phone") as string | undefined;
  const realizadaEm = get("recorded_at_field", "created_at") as string | undefined;

  const telefoneNorm = telefone ? normalizar(telefone) : null;

  await supabase
    .schema("comercial")
    .from("calls")
    .insert({
      plaud_id: plaudId ?? null,
      titulo: titulo ?? null,
      transcricao: transcricao ?? null,
      transcricao_origem: transcricao ? "plaud" : null,
      duracao_segundos: duracao ?? null,
      telefone_extraido: telefoneNorm,
      match_status: "pendente",
      realizada_em: realizadaEm ?? null,
    })
    .throwOnError();
}
