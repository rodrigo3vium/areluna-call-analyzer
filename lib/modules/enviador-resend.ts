import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const MAX_TENTATIVAS = 3;

export async function enviarRonda(
  rondaId: string,
  assunto: string,
  html: string,
  destinatarios: string[],
  nomeCli: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (destinatarios.length === 0) {
    log.warn("enviador_resend.sem_destinatarios", { rondaId });
    return;
  }

  let ultimoErro: string | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      await getResend().emails.send({
        from: `${nomeCli} — Atlas OS <noreply@benitesalbuquerque.com.br>`,
        to: destinatarios,
        subject: assunto,
        html,
      });

      await supabase
        .schema("comercial")
        .from("rondas")
        .update({
          status: "enviada",
          enviada_em: new Date().toISOString(),
          destinatarios: destinatarios,
          erro_envio: null,
        })
        .eq("id", rondaId)
        .throwOnError();

      log.info("enviador_resend.enviado", { rondaId, destinatarios });
      return;
    } catch (err) {
      ultimoErro = err instanceof Error ? err.message : String(err);
      log.warn("enviador_resend.tentativa_falhou", { rondaId, tentativa, erro: ultimoErro });

      if (tentativa < MAX_TENTATIVAS) {
        await new Promise((r) => setTimeout(r, 1000 * tentativa));
      }
    }
  }

  const { data: atual } = await supabase
    .schema("comercial")
    .from("rondas")
    .select("reenvios")
    .eq("id", rondaId)
    .single();

  await supabase
    .schema("comercial")
    .from("rondas")
    .update({ status: "erro", erro_envio: ultimoErro, reenvios: (atual?.reenvios ?? 0) + 1 })
    .eq("id", rondaId);

  log.error("enviador_resend.falhou", { rondaId, erro: ultimoErro });
}
