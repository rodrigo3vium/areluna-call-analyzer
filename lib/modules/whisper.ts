import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";

// Whisper tem limite de 25MB e não aceita containers de vídeo (.mov/.mp4).
// ffmpeg extrai só o áudio em m4a mono/baixo bitrate, resolvendo container incompatível
// E o limite de tamanho de uma vez (~104 min cabem em 25MB a 32k mono).
// Em produção (Vercel), o ffmpeg precisa ser instalado na imagem — ver nota no CLAUDE.md.
const LIMITE_BYTES = 25 * 1024 * 1024;

const execFileAsync = promisify(execFile);

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _client;
}

function isContainerVideo(buffer: Buffer): boolean {
  // magic: offset 4–7 = "ftyp" cobre todos os containers ISO-BMFF / QuickTime
  // (brand "qt  ", "mp42", "isom", "M4V ", etc.). Não basta checar só "qt  ":
  // os .mov reais da Areluna vêm com brands variados e precisam igualmente de extração.
  return buffer.length > 11 && buffer.slice(4, 8).toString("ascii") === "ftyp";
}

async function extrairAudioM4a(buffer: Buffer, originalName: string): Promise<Buffer> {
  const id = Date.now().toString(36);
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "mov";
  const inPath = join(tmpdir(), `whisper-in-${id}.${ext}`);
  const outPath = join(tmpdir(), `whisper-out-${id}.m4a`);
  try {
    await writeFile(inPath, buffer);
    await execFileAsync("ffmpeg", [
      "-i",
      inPath,
      "-vn", // descarta vídeo
      "-ac",
      "1", // mono — call é voz, não precisa de estéreo
      "-c:a",
      "aac",
      "-b:a",
      "32k", // 32kbps mono: ~104 min cabem em 25MB, suficiente para voz
      "-y",
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}

export async function transcreverAudio(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  let uploadBuffer = buffer;
  let uploadFileName = fileName;
  let uploadMimeType = mimeType;

  // Extrai áudio para qualquer container de vídeo OU arquivo acima do limite.
  if (isContainerVideo(buffer) || buffer.length > LIMITE_BYTES) {
    uploadBuffer = await extrairAudioM4a(buffer, fileName);
    uploadFileName = fileName.replace(/\.[^.]+$/, ".m4a");
    uploadMimeType = "audio/mp4";
  }

  if (uploadBuffer.length > LIMITE_BYTES) {
    throw new Error(
      `Arquivo "${fileName}" tem ${(uploadBuffer.length / 1024 / 1024).toFixed(1)}MB após extração de áudio mono 32k. ` +
        `Whisper aceita até 25MB (~104 min). Call provavelmente excede esse limite — precisa de chunking.`,
    );
  }

  const file = await toFile(uploadBuffer, uploadFileName, { type: uploadMimeType });

  const response = await getClient().audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
    response_format: "text",
  });

  return response as unknown as string;
}
