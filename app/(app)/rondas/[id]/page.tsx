import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import type { SnapshotCalls } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-info";
  if (score >= 40) return "text-warning";
  return "text-error";
}

function BarChart({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

function RondaCalls({ snap }: { snap: SnapshotCalls }) {
  const classColors: Record<string, string> = {
    EXCELENTE: "bg-success/10 text-success",
    BOM: "bg-info/10 text-info",
    REGULAR: "bg-warning/10 text-warning",
    INSUFICIENTE: "bg-error/10 text-error",
  };
  const maxCloser = Math.max(...snap.por_closer.map((c) => c.total), 1);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Calls analisadas", valor: snap.total_calls, cls: "text-info" },
          {
            label: "Score médio",
            valor: snap.score_medio !== null ? snap.score_medio.toFixed(1) : "—",
            cls: snap.score_medio !== null ? scoreColor(snap.score_medio) : "text-muted-foreground",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-card border border-border bg-surface p-6 shadow-soft"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className={cn("text-2xl font-bold", k.cls)}>{k.valor}</p>
          </div>
        ))}
      </div>

      {snap.total_calls === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma call analisada neste período.</p>
      )}

      {/* Distribuição por classificação */}
      {Object.values(snap.distribuicao_classificacao).some((v) => v > 0) && (
        <section className="rounded-card border border-border bg-surface p-6 shadow-soft">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Distribuição por classificação
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(snap.distribuicao_classificacao).map(([cls, total]) => (
              <span
                key={cls}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  classColors[cls] ?? "bg-sand text-muted-foreground",
                )}
              >
                {cls.charAt(0) + cls.slice(1).toLowerCase()}: {total}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Performance por closer */}
      {snap.por_closer.length > 0 && (
        <section className="space-y-2 rounded-card border border-border bg-surface p-6 shadow-soft">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Performance por closer
          </h3>
          {snap.por_closer.map((c) => {
            const color =
              c.score_medio == null
                ? "bg-gold-500"
                : c.score_medio >= 80
                  ? "bg-success"
                  : c.score_medio >= 60
                    ? "bg-info"
                    : c.score_medio >= 40
                      ? "bg-warning"
                      : "bg-error";
            return (
              <BarChart
                key={c.closer_id}
                label={c.closer_nome}
                value={c.total}
                max={maxCloser}
                color={color}
              />
            );
          })}
        </section>
      )}

      {/* Calls insuficientes */}
      {snap.calls_insuficientes.length > 0 && (
        <section className="space-y-2 rounded-card border border-border bg-surface p-6 shadow-soft">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Calls insuficientes
          </h3>
          {snap.calls_insuficientes.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="text-sm text-foreground">
                  {c.closer_nome ?? "Closer não identificado"}
                </p>
                {c.diagnostico_ia && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.diagnostico_ia}</p>
                )}
              </div>
              <span className="ml-4 shrink-0 text-lg font-bold text-error">{c.score ?? "—"}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default async function RondaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: ronda } = await supabase
    .schema("comercial")
    .from("rondas")
    .select(
      "id, tipo, periodo_inicio, periodo_fim, status, snapshot, vazia, enviada_em, destinatarios",
    )
    .eq("id", id)
    .single();

  if (!ronda) notFound();

  const inicio = new Intl.DateTimeFormat("pt-BR").format(new Date(ronda.periodo_inicio));
  const fim = new Intl.DateTimeFormat("pt-BR").format(new Date(ronda.periodo_fim));

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Ronda"
        title={`Ronda Calls — ${inicio} a ${fim}`}
        right={
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                ronda.status === "enviada"
                  ? "bg-success/10 text-success"
                  : ronda.status === "erro"
                    ? "bg-error/10 text-error"
                    : "bg-sand text-muted-foreground",
              )}
            >
              {ronda.status}
            </span>
            {ronda.enviada_em && (
              <span className="text-xs text-muted-foreground">
                Enviada em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(ronda.enviada_em))}
              </span>
            )}
            {ronda.vazia && <span className="text-xs text-muted-foreground">Período vazio</span>}
          </div>
        }
      />

      <RondaCalls snap={ronda.snapshot as unknown as SnapshotCalls} />

      {Array.isArray(ronda.destinatarios) && (ronda.destinatarios as string[]).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Enviada para: {(ronda.destinatarios as string[]).join(", ")}
        </p>
      )}
    </div>
  );
}
