import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MatchActions } from "./match-actions";

const FASES_LABELS: Record<string, string> = {
  preparacao: "Preparação",
  abertura: "Abertura",
  diagnostico: "Diagnóstico",
  apresentacao_clinica: "Apres. Clínica",
  apresentacao_investimento: "Apres. Investimento",
  fechamento: "Fechamento",
  objecoes: "Objeções",
  sabotadores: "Sabotadores",
};

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    excelente: "bg-emerald-500/20 text-emerald-300",
    bom: "bg-cyan-500/20 text-cyan-300",
    regular: "bg-yellow-500/20 text-yellow-300",
    insuficiente: "bg-red-500/20 text-red-300",
  };
  return cls ? (mapa[cls] ?? "bg-slate-500/20 text-slate-300") : "bg-slate-500/20 text-slate-300";
}

export default async function CallDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: call } = await supabase
    .schema("comercial")
    .from("calls")
    .select("*, lead:leads(id, nome, telefone, status), match_sugestoes")
    .eq("id", id)
    .single();

  if (!call) notFound();

  const { data: analises } = await supabase
    .schema("comercial")
    .from("analises_calls")
    .select("*")
    .eq("call_id", id)
    .order("created_at", { ascending: false });

  const analise = analises?.[0] ?? null;
  const lead = Array.isArray(call.lead) ? call.lead[0] : call.lead;
  const fases = (analise?.fases ?? {}) as Record<string, { score: number; observacao: string }>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/calls" className="text-sm text-slate-400 hover:text-slate-200">
            ← Calls
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">
            {call.titulo ?? "Call sem título"}
          </h1>
          <p className="text-sm text-slate-400">
            {call.duracao_segundos
              ? `${Math.floor(call.duracao_segundos / 60)} min`
              : "Duração desconhecida"}
          </p>
        </div>
        {analise && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${classificacaoCor(analise.classificacao)}`}
          >
            {analise.classificacao}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Fases + diagnóstico */}
        <div className="space-y-4 lg:col-span-2">
          {analise ? (
            <>
              {/* Performance por fase */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-300">Performance por fase</h2>
                  <span className="text-2xl font-bold tabular-nums text-slate-100">
                    {analise.score_geral}
                    <span className="text-sm font-normal text-slate-500">/100</span>
                  </span>
                </div>
                <div className="space-y-3">
                  {Object.entries(FASES_LABELS).map(([key, label]) => {
                    const fase = fases[key];
                    if (!fase) return null;
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-400">{label}</span>
                          <span
                            className={
                              fase.score >= 70
                                ? "text-emerald-400"
                                : fase.score >= 40
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }
                          >
                            {fase.score}
                          </span>
                        </div>
                        <Progress value={fase.score} className="h-1.5" />
                        {fase.observacao && (
                          <p className="mt-0.5 text-[11px] text-slate-500">{fase.observacao}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnóstico + ação */}
              <div className="grid gap-3 sm:grid-cols-2">
                {analise.diagnostico && (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Diagnóstico
                    </p>
                    <p className="text-sm text-slate-300">{analise.diagnostico}</p>
                  </div>
                )}
                {analise.acao_recomendada && (
                  <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-cyan-600">
                      Ação recomendada
                    </p>
                    <p className="text-sm text-slate-300">{analise.acao_recomendada}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-sm text-slate-500">Análise pendente</p>
            </div>
          )}

          {/* Transcrição */}
          {call.transcricao && (
            <details className="rounded-xl border border-slate-700 bg-slate-800/40">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-200">
                Transcrição completa
              </summary>
              <div className="border-t border-slate-700 px-4 py-3">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
                  {call.transcricao}
                </p>
              </div>
            </details>
          )}
        </div>

        {/* Sidebar: match + lead */}
        <div className="space-y-4">
          {/* Match */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-slate-300">Match</h2>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary">{call.match_status}</Badge>
            </div>

            {lead ? (
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-200">{lead.nome}</p>
                <p className="text-xs text-slate-500">{lead.telefone}</p>
                <Link
                  href={`/leads/${lead.id}`}
                  className="mt-1 block text-xs text-cyan-400 hover:underline"
                >
                  Ver lead →
                </Link>
              </div>
            ) : null}

            <MatchActions
              callId={id}
              matchStatus={call.match_status}
              leadAtual={lead ? { id: lead.id, nome: lead.nome, telefone: lead.telefone } : null}
              sugestoes={
                Array.isArray(call.match_sugestoes)
                  ? (call.match_sugestoes as Array<{
                      lead_id: string;
                      nome: string;
                      telefone: string;
                      confidence: number;
                    }>)
                  : []
              }
            />
          </div>

          {/* Info call */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-2 text-sm font-medium text-slate-300">Detalhes</h2>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Origem transcrição</dt>
                <dd className="text-slate-300">{call.transcricao_origem ?? "—"}</dd>
              </div>
              {call.realizada_em && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Realizada em</dt>
                  <dd className="text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(call.realizada_em))}
                  </dd>
                </div>
              )}
              {call.telefone_extraido && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Telefone extraído</dt>
                  <dd className="text-slate-300">{call.telefone_extraido}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
