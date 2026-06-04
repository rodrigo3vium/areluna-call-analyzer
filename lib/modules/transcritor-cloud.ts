import { AssemblyAI } from "assemblyai";

let cachedClient: AssemblyAI | null = null;

function getClient(): AssemblyAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY não configurada no ambiente");
  }

  cachedClient = new AssemblyAI({ apiKey });
  return cachedClient;
}

export type ResultadoTranscricao = {
  texto: string;
  duracaoSegundos: number;
  custoEstimadoUSD: number;
};

/**
 * Transcreve um arquivo de áudio/vídeo a partir de uma URL pública.
 * AssemblyAI baixa o arquivo da URL, transcreve e retorna o texto.
 * O SDK faz polling interno — este método só retorna quando a transcrição termina.
 *
 * Vantagens vs Whisper+ffmpeg:
 * - Aceita vídeo direto, sem extração de áudio prévia
 * - Sem limite de 25MB — AssemblyAI aceita até 5GB
 * - Funciona em Vercel serverless (sem dependência de binário externo)
 *
 * @throws se a transcrição falhar ou a URL estiver inacessível
 */
export async function transcreverDeURL(url: string): Promise<ResultadoTranscricao> {
  const client = getClient();

  const transcript = await client.transcripts.transcribe({
    audio: url,
    language_code: "pt",
    speech_models: ["universal-3-pro"],
    punctuate: true,
    format_text: true,
  });

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI falhou: ${transcript.error ?? "erro desconhecido"}`);
  }

  if (!transcript.text) {
    throw new Error("AssemblyAI retornou status=completed mas text vazio");
  }

  const duracaoSegundos = transcript.audio_duration ?? 0;
  const custoEstimadoUSD = (duracaoSegundos / 3600) * 0.37;

  return {
    texto: transcript.text,
    duracaoSegundos,
    custoEstimadoUSD,
  };
}
