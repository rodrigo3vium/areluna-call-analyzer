import type { SupabaseClient } from "@supabase/supabase-js";
import { baixarArquivo } from "@/lib/modules/sharepoint-client";
import { transcreverAudio } from "@/lib/modules/whisper";
import { log } from "@/lib/log";

// 3 calls por execução: ~10s Whisper cada = ~30s máximo, seguro no timeout de 60s do Vercel Pro
const BATCH_SIZE = 3;

export type TranscricaoResult = {
  processadas: number;
  sucesso: number;
  erros: Array<{ call_id: string; erro: string }>;
};

export async function processarTranscricoesPendentes(
  supabase: SupabaseClient,
): Promise<TranscricaoResult> {
  const result: TranscricaoResult = { processadas: 0, sucesso: 0, erros: [] };

  const { data: pendentes } = await supabase
    .schema("comercial")
    .from("calls")
    .select("id, sharepoint_file_id, sharepoint_file_name")
    .eq("transcricao_status", "pendente")
    .order("data_gravacao", { ascending: true })
    .limit(BATCH_SIZE)
    .throwOnError();

  if (!pendentes || pendentes.length === 0) return result;

  for (const call of pendentes) {
    result.processadas++;

    // Lock otimista: só atualiza se ainda estiver pendente (evita race condition em retry)
    // Sem throwOnError para poder inspecionar o error e fazer continue
    const { error: lockError } = await supabase
      .schema("comercial")
      .from("calls")
      .update({ transcricao_status: "em_processamento" })
      .eq("id", call.id)
      .eq("transcricao_status", "pendente");

    if (lockError) {
      result.erros.push({ call_id: call.id, erro: `Lock falhou: ${lockError.message}` });
      continue;
    }

    try {
      const { buffer, mimeType, fileName } = await baixarArquivo(call.sharepoint_file_id as string);
      const transcricao = await transcreverAudio(buffer, fileName, mimeType);

      // UPDATE atômico: transcricao + concluida + aguardando_analise no mesmo statement
      await supabase
        .schema("comercial")
        .from("calls")
        .update({
          transcricao,
          transcricao_status: "concluida",
          status_analise: "aguardando_analise",
          transcricao_erro: null,
        })
        .eq("id", call.id)
        .throwOnError();

      log.info("transcritor_calls.concluido", { callId: call.id });
      result.sucesso++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error("transcritor_calls.erro", { callId: call.id, erro: errMsg });

      // Sem throwOnError: não mascarar o erro original que já foi logado
      await supabase
        .schema("comercial")
        .from("calls")
        .update({
          transcricao_status: "erro",
          status_analise: "erro",
          transcricao_erro: errMsg,
        })
        .eq("id", call.id);

      result.erros.push({ call_id: call.id, erro: errMsg });
    }
  }

  return result;
}
