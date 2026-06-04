import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    EXCELENTE: "bg-success/10 text-success",
    BOM: "bg-info/10 text-info",
    REGULAR: "bg-warning/10 text-warning",
    INSUFICIENTE: "bg-error/10 text-error",
  };
  return cls ? (mapa[cls] ?? "bg-sand text-muted-foreground") : "bg-sand text-muted-foreground";
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
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3">
          <p className="text-sm font-medium text-error">Erro no processamento</p>
          <p className="mt-0.5 text-xs text-error/80">{call.transcricao_erro}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/calls" className="eyebrow text-muted-foreground hover:text-foreground">
            ← Calls
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground">
            {call.sharepoint_file_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {call.duracao_minutos ? `${call.duracao_minutos} min` : "Duração desconhecida"}
            {closer && (
              <>
                {" · "}
                <Link href={`/closers/${closer.id}`} className="text-gold-500 hover:underline">
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
                <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-foreground">
                      Performance por critério
                    </h2>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {call.score}
                      <span className="text-sm font-normal text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(performancePorCriterio).map(([criterio, score]) => (
                      <div key={criterio}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">
                            {criterio.replace(/_/g, " ")}
                          </span>
                          <span
                            className={
                              score >= 70
                                ? "text-success"
                                : score >= 40
                                  ? "text-warning"
                                  : "text-error"
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
                  <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Diagnóstico
                    </p>
                    <p className="text-sm text-foreground">{call.diagnostico_ia}</p>
                  </div>
                )}
                {call.acao_recomendada && (
                  <div className="rounded-card border border-border bg-gold-500/10 p-6 shadow-soft">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gold-500">
                      Ação recomendada
                    </p>
                    <p className="text-sm text-foreground">{call.acao_recomendada}</p>
                  </div>
                )}
              </div>

              {/* Pontos de melhoria */}
              {pontosMelhoria.length > 0 && (
                <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
                  <h2 className="mb-3 text-sm font-medium text-foreground">Pontos de melhoria</h2>
                  <ul className="space-y-1.5">
                    {pontosMelhoria.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="mt-0.5 shrink-0 text-warning">→</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">
                {call.status_analise === "erro"
                  ? `Erro na análise${call.transcricao_erro ? `: ${call.transcricao_erro}` : ""}`
                  : "Análise em processamento…"}
              </p>
            </div>
          )}

          {/* Transcrição */}
          {call.transcricao && (
            <details className="rounded-card border border-border bg-surface shadow-soft">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground hover:text-muted-foreground">
                Transcrição completa
              </summary>
              <div className="border-t border-border px-4 py-3">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {call.transcricao}
                </p>
              </div>
            </details>
          )}
        </div>

        {/* Sidebar: detalhes */}
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
            <h2 className="mb-2 text-sm font-medium text-foreground">Detalhes</h2>
            <dl className="space-y-1.5 text-xs">
              {call.data_gravacao && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Data da gravação</dt>
                  <dd className="text-foreground">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(call.data_gravacao))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Closer</dt>
                <dd className="text-foreground">{closer?.nome ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">{call.status_analise}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Transcrição</dt>
                <dd className="text-foreground">{call.transcricao_status}</dd>
              </div>
              {call.sharepoint_file_url && (
                <div className="pt-1">
                  <a
                    href={call.sharepoint_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold-500 hover:underline"
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
