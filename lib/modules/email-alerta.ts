import { Resend } from "resend";
import { log } from "@/lib/log";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function notificarDeadLetter(evento: {
  id: string;
  fonte: string;
  external_id: string;
  ultimo_erro: string | null;
}) {
  const ba = process.env.BA_EMAIL ?? "rodrigo@benitesalbuquerque.com.br";

  try {
    await getResend().emails.send({
      from: "Atlas OS Comercial <noreply@benitesalbuquerque.com.br>",
      to: ba,
      subject: `[ALERTA] Dead-letter: ${evento.fonte}/${evento.external_id}`,
      html: `
        <p>Um evento entrou em dead-letter após 5 tentativas.</p>
        <ul>
          <li><strong>ID:</strong> ${evento.id}</li>
          <li><strong>Fonte:</strong> ${evento.fonte}</li>
          <li><strong>External ID:</strong> ${evento.external_id}</li>
          <li><strong>Último erro:</strong> ${evento.ultimo_erro ?? "desconhecido"}</li>
        </ul>
        <p>Verifique a tabela <code>comercial.eventos_brutos</code> para mais detalhes.</p>
      `,
    });
  } catch (err) {
    log.error("email_alerta.dead_letter_failed", {
      eventoId: evento.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function notificarScoreBaixo(lead: {
  id: string;
  nome: string;
  telefone: string;
  score: number;
  tipo: "whatsapp" | "call";
  destinatarios: string[];
}) {
  try {
    await getResend().emails.send({
      from: "Atlas OS Comercial <noreply@benitesalbuquerque.com.br>",
      to: lead.destinatarios,
      subject: `[ALERTA] Score baixo — ${lead.nome} (${lead.score})`,
      html: `
        <p>Uma ${lead.tipo === "whatsapp" ? "conversa WhatsApp" : "call"} recebeu score baixo.</p>
        <ul>
          <li><strong>Lead:</strong> ${lead.nome}</li>
          <li><strong>Telefone:</strong> ${lead.telefone}</li>
          <li><strong>Score:</strong> ${lead.score}</li>
        </ul>
        <p>Acesse o painel para ver os detalhes.</p>
      `,
    });
  } catch (err) {
    log.error("email_alerta.score_baixo_failed", {
      leadId: lead.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
