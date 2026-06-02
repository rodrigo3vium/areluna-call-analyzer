import type { SupabaseClient } from "@supabase/supabase-js";
import { listarArquivosDaPasta } from "@/lib/modules/sharepoint-client";
import { parsearNomeArquivo } from "@/lib/modules/parser-nome-arquivo";
import { resolverCloserPorNome } from "@/lib/modules/resolver-closer";
import { log } from "@/lib/log";

export type SyncResult = {
  arquivos_encontrados: number;
  arquivos_novos: number;
  criados: number;
  erros: Array<{ arquivo: string; erro: string }>;
};

export async function sincronizarSharePoint(supabase: SupabaseClient): Promise<SyncResult> {
  const arquivos = await listarArquivosDaPasta();

  // Busca IDs já existentes para dedup (UNIQUE constraint é 2ª camada)
  const { data: existentes } = await supabase
    .schema("comercial")
    .from("calls")
    .select("sharepoint_file_id")
    .in(
      "sharepoint_file_id",
      arquivos.map((a) => a.id),
    )
    .throwOnError();

  const idsExistentes = new Set((existentes ?? []).map((e) => e.sharepoint_file_id as string));
  const novos = arquivos.filter((a) => !idsExistentes.has(a.id));

  const result: SyncResult = {
    arquivos_encontrados: arquivos.length,
    arquivos_novos: novos.length,
    criados: 0,
    erros: [],
  };

  for (const arquivo of novos) {
    try {
      let closerId: string | null = null;
      let transcricao_status = "pendente";
      let status_analise = "aguardando_transcricao";
      let transcricao_erro: string | null = null;

      if (arquivo.closerFolderName) {
        // Estrutura com subpastas: closer = nome da pasta
        closerId = await resolverCloserPorNome(arquivo.closerFolderName, supabase);
        if (!closerId) {
          transcricao_erro = `Closer "${arquivo.closerFolderName}" não cadastrado ou inativo`;
        }
      } else {
        // Estrutura plana: parseia nome do arquivo (YYYY-MM-DD_NomeCloser_Cliente.ext)
        const parsed = parsearNomeArquivo(arquivo.name);
        if (parsed.erro) {
          transcricao_status = "erro";
          status_analise = "erro";
          transcricao_erro = parsed.erro;
        } else {
          closerId = parsed.nomeCloserBruto
            ? await resolverCloserPorNome(parsed.nomeCloserBruto, supabase)
            : null;
          if (parsed.nomeCloserBruto && !closerId) {
            transcricao_erro = `Closer "${parsed.nomeCloserBruto}" não cadastrado ou inativo`;
          }
        }
      }

      // Extrai data do início do nome: "2026-05-26 16-18-03.mov" ou "2026-05-26_Closer_..." → "2026-05-26"
      const dataMatch = arquivo.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const dataGravacao = dataMatch
        ? new Date(`${dataMatch[1]}T00:00:00.000Z`).toISOString()
        : arquivo.createdDateTime;

      await supabase
        .schema("comercial")
        .from("calls")
        .insert({
          closer_id: closerId,
          sharepoint_file_id: arquivo.id,
          sharepoint_file_name: arquivo.name,
          sharepoint_file_url: arquivo.webUrl,
          data_gravacao: dataGravacao,
          transcricao_status,
          transcricao_erro,
          status_analise,
        })
        .throwOnError();

      result.criados++;
      log.info("sync_sharepoint.criado", { arquivo: arquivo.name, closerId, transcricao_status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("sync_sharepoint.erro", { arquivo: arquivo.name, erro: msg });
      result.erros.push({ arquivo: arquivo.name, erro: msg });
    }
  }

  log.info("sync_sharepoint.concluido", result);
  return result;
}
