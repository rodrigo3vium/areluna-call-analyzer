import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    EXCELENTE: "bg-emerald-500/20 text-emerald-300",
    BOM: "bg-cyan-500/20 text-cyan-300",
    REGULAR: "bg-yellow-500/20 text-yellow-300",
    INSUFICIENTE: "bg-red-500/20 text-red-300",
  };
  return cls ? (mapa[cls] ?? "bg-slate-500/20 text-slate-300") : "bg-slate-500/20 text-slate-300";
}

export default async function CallDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: call } = await supabase
    .schema("comercial")
    .from("calls")
    .select("*, closer:closers(id, nome, email)")
    .eq("id", id)
    .single();

  if (!call) notFound();

  const closer = Array.isArray(call.closer) ? call.closer[0] : call.closer;
  const performancePorCriterio = (call.performance_por_criterio ?? {}) as Record<string, number>;
  const pontosMelhoria = (call.pontos_melhoria ?? []) as string[];

  return (
    <div className="space-y-4">
      {/* Banner de erro de processamento */}
      {call.transcricao_erro && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3">
          <p className="text-sm font-medium text-red-400">Erro no processamento</p>
          <p className="mt-0.5 text-xs text-red-300/80">{call.transcricao_erro}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/calls" className="text-sm text-slate-400 hover:text-slate-200">
            ← Calls
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">{call.sharepoint_file_name}</h1>
          <p className="text-sm text-slate-400">
            {call.duracao_minutos ? `${call.duracao_minutos} min` : "Duração desconhecida"}
            {closer && (
              <>
                {" · "}
                <Link href={`/closers/${closer.id}`} className="text-cyan-400 hover:underline">
                  {closer.nome}
                </Link>
              </>
            )}
          </p>
        </div>
        {call.classificacao && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              classificacaoCor(call.classificacao),
            )}
          >
            {call.classificacao}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Performance + diagnóstico */}
        <div className="space-y-4 lg:col-span-2">
          {call.status_analise === "analisada" ? (
            <>
              {/* Performance por critério */}
              {Object.keys(performancePorCriterio).length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-300">Performance por critério</h2>
                    <span className="text-2xl font-bold tabular-nums text-slate-100">
                      {call.score}
                      <span className="text-sm font-normal text-slate-500">/100</span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(performancePorCriterio).map(([criterio, score]) => (
                      <div key={criterio}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-400">
                            {criterio.replace(/_/g, " ")}
                          </span>
                          <span
                            className={
                              score >= 70
                                ? "text-emerald-400"
                                : score >= 40
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }
                          >
                            {score}
                          </span>
                        </div>
                        <Progress value={score} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnóstico + ação */}
              <div className="grid gap-3 sm:grid-cols-2">
                {call.diagnostico_ia && (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Diagnóstico
                    </p>
                    <p className="text-sm text-slate-300">{call.diagnostico_ia}</p>
                  </div>
                )}
                {call.acao_recomendada && (
                  <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-cyan-600">
                      Ação recomendada
                    </p>
                    <p className="text-sm text-slate-300">{call.acao_recomendada}</p>
                  </div>
                )}
              </div>

              {/* Pontos de melhoria */}
              {pontosMelhoria.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                  <h2 className="mb-3 text-sm font-medium text-slate-300">Pontos de melhoria</h2>
                  <ul className="space-y-1.5">
                    {pontosMelhoria.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-sm text-slate-500">
                {call.status_analise === "erro"
                  ? `Erro na análise${call.transcricao_erro ? `: ${call.transcricao_erro}` : ""}`
                  : "Análise em processamento…"}
              </p>
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

        {/* Sidebar: detalhes */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="mb-2 text-sm font-medium text-slate-300">Detalhes</h2>
            <dl className="space-y-1.5 text-xs">
              {call.data_gravacao && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Data da gravação</dt>
                  <dd className="text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(call.data_gravacao))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Closer</dt>
                <dd className="text-slate-300">{closer?.nome ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-300">{call.status_analise}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Transcrição</dt>
                <dd className="text-slate-300">{call.transcricao_status}</dd>
              </div>
              {call.sharepoint_file_url && (
                <div className="pt-1">
                  <a
                    href={call.sharepoint_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Ver no SharePoint →
                  </a>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
