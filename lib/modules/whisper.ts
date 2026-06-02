import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";

// Whisper tem limite de 25MB. Arquivos .mov QuickTime (ftyp "qt  ") precisam de conversão.
// ffmpeg extrai só o áudio em m4a, resolvendo container incompatível e o limite de tamanho.
// Em produção (Vercel), o ffmpeg precisa ser instalado na imagem — ver nota no CLAUDE.md.
const LIMITE_BYTES = 25 * 1024 * 1024;

const execFileAsync = promisify(execFile);

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _client;
}

function isQuickTime(buffer: Buffer): boolean {
  // magic: offset 4–7 = "ftyp", offset 8–11 = brand. QuickTime usa "qt  "
  return (
    buffer.length > 11 &&
    buffer.slice(4, 8).toString("ascii") === "ftyp" &&
    buffer.slice(8, 12).toString("ascii") === "qt  "
  );
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
      "-vn", // só áudio
      "-c:a",
      "aac",
      "-b:a",
      "64k", // 64kbps — suficiente para voz
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

  if (isQuickTime(buffer)) {
    uploadBuffer = await extrairAudioM4a(buffer, fileName);
    uploadFileName = fileName.replace(/\.[^.]+$/, ".m4a");
    uploadMimeType = "audio/mp4";
  }

  if (uploadBuffer.length > LIMITE_BYTES) {
    throw new Error(
      `Arquivo "${fileName}" tem ${(uploadBuffer.length / 1024 / 1024).toFixed(1)}MB após extração de áudio. ` +
        `Whisper aceita até 25MB.`,
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
