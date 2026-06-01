import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ReanalisarButton } from "./reanalisar-button";

function formatarDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ScoreBadge({ score }: { score: number }) {
  const cor =
    score >= 70
      ? "bg-emerald-500/20 text-emerald-300"
      : score >= 40
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-red-500/20 text-red-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}
    >
      {score}/100
    </span>
  );
}

export default async function WhatsappDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: conversa } = await supabase
    .schema("comercial")
    .from("conversas")
    .select(
      "*, lead:leads(id, nome, telefone, status, origem), evolution_instance:evolution_instances(apelido)",
    )
    .eq("id", id)
    .single();

  if (!conversa) notFound();

  const [{ data: mensagens }, { data: analises }] = await Promise.all([
    supabase
      .schema("comercial")
      .from("mensagens")
      .select("id, tipo, fonte, conteudo, remetente, enviada_em")
      .eq("conversa_id", id)
      .order("enviada_em", { ascending: true }),
    supabase
      .schema("comercial")
      .from("analises_whatsapp")
      .select("*")
      .eq("conversa_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const lead = Array.isArray(conversa.lead) ? conversa.lead[0] : conversa.lead;
  const ultimaAnalise = analises?.[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/whatsapp" className="text-sm text-slate-400 hover:text-slate-200">
              ← Conversas
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">
            {lead?.nome ?? lead?.telefone ?? "Lead desconhecido"}
          </h1>
          <p className="text-sm text-slate-400">{lead?.telefone}</p>
        </div>
        <div className="flex items-center gap-2">
          {conversa.ultimo_score != null && <ScoreBadge score={conversa.ultimo_score} />}
          <ReanalisarButton conversaId={id} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chat */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40">
            <div className="border-b border-slate-700 px-4 py-3">
              <p className="text-sm font-medium text-slate-300">
                Conversa ({mensagens?.length ?? 0} mensagens)
              </p>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {(mensagens ?? []).length === 0 ? (
                <p className="text-center text-sm text-slate-500">Nenhuma mensagem</p>
              ) : (
                (mensagens ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.remetente === "lead" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.remetente === "lead"
                          ? "bg-slate-700 text-slate-200"
                          : "bg-cyan-600/30 text-cyan-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.conteudo ?? `[${m.tipo}]`}</p>
                      <p className="mt-1 text-right text-[10px] opacity-60">
                        {formatarDataHora(m.enviada_em)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Análise + histórico */}
        <div className="space-y-4">
          {/* Última análise */}
          {ultimaAnalise ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-300">Análise IA</h2>
                <ScoreBadge score={ultimaAnalise.score} />
              </div>

              {ultimaAnalise.tags_positivas?.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {ultimaAnalise.tags_positivas.map((t: string) => (
                    <span
                      key={t}
                      className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {ultimaAnalise.tags_negativas?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {ultimaAnalise.tags_negativas.map((t: string) => (
                    <span
                      key={t}
                      className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {ultimaAnalise.resumo && (
                <p className="mb-2 text-xs text-slate-400">{ultimaAnalise.resumo}</p>
              )}
              {ultimaAnalise.diagnostico && (
                <div className="rounded-lg bg-slate-700/40 p-2.5">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Diagnóstico
                  </p>
                  <p className="text-xs text-slate-300">{ultimaAnalise.diagnostico}</p>
                </div>
              )}
              {ultimaAnalise.acao_recomendada && (
                <div className="mt-2 rounded-lg bg-cyan-900/20 p-2.5">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-600">
                    Ação recomendada
                  </p>
                  <p className="text-xs text-slate-300">{ultimaAnalise.acao_recomendada}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center">
              <p className="text-sm text-slate-500">Nenhuma análise disponível</p>
              <p className="mt-1 text-xs text-slate-600">
                A análise roda automaticamente após 1h de silêncio
              </p>
            </div>
          )}

          {/* Histórico de análises */}
          {(analises ?? []).length > 1 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h2 className="mb-2 text-sm font-medium text-slate-300">Histórico</h2>
              <ul className="space-y-1.5">
                {(analises ?? []).slice(1).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{formatarDataHora(a.created_at)}</span>
                    <ScoreBadge score={a.score} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info lead */}
          {lead && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h2 className="mb-2 text-sm font-medium text-slate-300">Lead</h2>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <Badge variant="secondary">{lead.status}</Badge>
                  </dd>
                </div>
                {lead.origem && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Origem</dt>
                    <dd className="text-slate-300">{lead.origem}</dd>
                  </div>
                )}
              </dl>
              <Link
                href={`/leads/${lead.id}`}
                className="mt-2 block text-xs text-cyan-400 hover:underline"
              >
                Ver perfil completo →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
