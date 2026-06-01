import OpenAI from "openai";
import { log } from "@/lib/log";

let _client: OpenAI | null = null;

function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function transcreverAudio(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      log.warn("whisper.fetch_failed", { url, status: response.status });
      return null;
    }

    const blob = await response.blob();
    const file = new File([blob], "audio.ogg", { type: "audio/ogg" });

    const transcricao = await getClient().audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pt",
    });

    return transcricao.text;
  } catch (err) {
    log.error("whisper.transcricao_error", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
