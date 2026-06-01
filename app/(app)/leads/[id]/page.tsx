import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { LeadActions } from "./lead-actions";
import { cn } from "@/lib/utils";

const STATUS_COR: Record<string, string> = {
  novo: "bg-slate-500/20 text-slate-300",
  em_atendimento: "bg-cyan-500/20 text-cyan-300",
  sem_resposta: "bg-yellow-500/20 text-yellow-300",
  agendou: "bg-blue-500/20 text-blue-300",
  compareceu: "bg-purple-500/20 text-purple-300",
  perdido: "bg-red-500/20 text-red-300",
  fechou: "bg-emerald-500/20 text-emerald-300",
};

function formatarDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function LeadDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: lead } = await supabase
    .schema("comercial")
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const [{ data: conversas }, { data: calls }] = await Promise.all([
    supabase
      .schema("comercial")
      .from("conversas")
      .select("id, status, ultimo_score, ultima_mensagem_em, ultima_analise_em")
      .eq("lead_id", id)
      .order("ultima_mensagem_em", { ascending: false }),
    supabase
      .schema("comercial")
      .from("calls")
      .select(
        "id, titulo, realizada_em, match_status, analise:analises_calls(classificacao, score_geral)",
      )
      .eq("lead_id", id)
      .order("realizada_em", { ascending: false, nullsFirst: false }),
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/leads" className="text-sm text-slate-400 hover:text-slate-200">
            ← Leads
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">{lead.nome}</h1>
          <p className="text-sm text-slate-400">{lead.telefone}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold capitalize",
            STATUS_COR[lead.status] ?? "bg-slate-500/20 text-slate-300",
          )}
        >
          {lead.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info + ações */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-slate-300">Informações</h2>
            <dl className="space-y-2 text-xs">
              {lead.email && (
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-slate-300">{lead.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Origem</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="text-slate-300">{lead.origem ?? "—"}</span>
                  {lead.origem_status === "pendente" && (
                    <Badge variant="secondary" className="text-[10px]">
                      pendente
                    </Badge>
                  )}
                  {lead.origem_status === "manual" && (
                    <Badge variant="secondary" className="text-[10px]">
                      manual
                    </Badge>
                  )}
                </dd>
              </div>
              {lead.origem_confidence && (
                <div>
                  <dt className="text-slate-500">Confiança origem</dt>
                  <dd className="text-slate-300">
                    {Math.round(Number(lead.origem_confidence) * 100)}%
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Cadastrado em</dt>
                <dd className="text-slate-300">
                  {new Intl.DateTimeFormat("pt-BR").format(new Date(lead.created_at))}
                </dd>
              </div>
              {lead.status_origem === "manual" && (
                <div>
                  <dt className="text-slate-500">Status definido por</dt>
                  <dd className="text-slate-400">Usuário (manual)</dd>
                </div>
              )}
            </dl>
            {lead.observacoes && (
              <div className="mt-3 border-t border-slate-700 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Observações
                </p>
                <p className="mt-1 text-xs text-slate-400">{lead.observacoes}</p>
              </div>
            )}
          </div>

          <LeadActions leadId={id} statusAtual={lead.status} origemAtual={lead.origem} />
        </div>

        {/* Timeline */}
        <div className="space-y-4 lg:col-span-2">
          {/* Conversas */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-slate-300">
              Conversas WhatsApp ({conversas?.length ?? 0})
            </h2>
            {(conversas ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conversa registrada</p>
            ) : (
              <ul className="space-y-2">
                {(conversas ?? []).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/whatsapp/${c.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-700/40"
                    >
                      <div>
                        <p className="text-xs text-slate-500">
                          {c.ultima_mensagem_em ? formatarDataHora(c.ultima_mensagem_em) : "—"}
                        </p>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {c.status}
                        </Badge>
                      </div>
                      {c.ultimo_score != null && (
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            c.ultimo_score >= 70
                              ? "text-emerald-400"
                              : c.ultimo_score >= 40
                                ? "text-yellow-400"
                                : "text-red-400",
                          )}
                        >
                          {c.ultimo_score}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Calls */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-slate-300">
              Calls ({calls?.length ?? 0})
            </h2>
            {(calls ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma call vinculada</p>
            ) : (
              <ul className="space-y-2">
                {(calls ?? []).map((c) => {
                  const analise = Array.isArray(c.analise) ? c.analise[0] : c.analise;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/calls/${c.id}`}
                        className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-700/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-300">
                            {c.titulo ?? "Call sem título"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {c.realizada_em
                              ? new Intl.DateTimeFormat("pt-BR").format(new Date(c.realizada_em))
                              : "—"}
                          </p>
                        </div>
                        {analise?.score_geral != null && (
                          <span className="text-sm font-semibold tabular-nums text-slate-300">
                            {analise.score_geral}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
