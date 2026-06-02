import { normalizarTexto } from "@/lib/utils/normalizar";

export type DadosParseados = {
  dataGravacao: Date | null;
  nomeCloserBruto: string | null;
  nomeClienteBruto: string | null;
  erro: string | null;
};

// Padrão: YYYY-MM-DD_NomeCloser_NomeCliente.ext
// Hífen dentro do campo (nome composto), underscore entre campos.
// Flag i: extensão case-insensitive (mp4, MP4, mov, MOV…)
const PADRAO = /^(\d{4}-\d{2}-\d{2})_([^_]+)_([^.]+)\.[a-zA-Z0-9]+$/i;

export function parsearNomeArquivo(nomeArquivo: string): DadosParseados {
  const match = nomeArquivo.match(PADRAO);

  if (!match) {
    return {
      dataGravacao: null,
      nomeCloserBruto: null,
      nomeClienteBruto: null,
      erro: `Nome não segue padrão YYYY-MM-DD_NomeCloser_NomeCliente.ext: "${nomeArquivo}"`,
    };
  }

  const [, dataStr, closerRaw, clienteRaw] = match;
  const data = new Date(`${dataStr}T00:00:00.000Z`);

  if (isNaN(data.getTime())) {
    return {
      dataGravacao: null,
      nomeCloserBruto: closerRaw.replace(/-/g, " "),
      nomeClienteBruto: clienteRaw.replace(/-/g, " "),
      erro: `Data inválida: "${dataStr}"`,
    };
  }

  return {
    dataGravacao: data,
    nomeCloserBruto: closerRaw.replace(/-/g, " "),
    nomeClienteBruto: clienteRaw.replace(/-/g, " "),
    erro: null,
  };
}

// Re-export to avoid importing normalizar in callers that only need parser
export { normalizarTexto };
