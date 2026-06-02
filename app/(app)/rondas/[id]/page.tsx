import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { SnapshotCalls } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
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
      <span className="w-32 shrink-0 truncate text-xs text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-slate-400">{value}</span>
    </div>
  );
}

function RondaCalls({ snap }: { snap: SnapshotCalls }) {
  const classColors: Record<string, string> = {
    EXCELENTE: "bg-emerald-500/20 text-emerald-300",
    BOM: "bg-blue-500/20 text-blue-300",
    REGULAR: "bg-amber-500/20 text-amber-300",
    INSUFICIENTE: "bg-red-500/20 text-red-300",
  };
  const maxCloser = Math.max(...snap.por_closer.map((c) => c.total), 1);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Calls analisadas", valor: snap.total_calls, cls: "text-cyan-300" },
          {
            label: "Score médio",
            valor: snap.score_medio !== null ? snap.score_medio.toFixed(1) : "—",
            cls: snap.score_medio !== null ? scoreColor(snap.score_medio) : "text-slate-500",
          },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={cn("text-2xl font-bold", k.cls)}>{k.valor}</p>
          </div>
        ))}
      </div>

      {snap.total_calls === 0 && (
        <p className="text-sm text-slate-500">Nenhuma call analisada neste período.</p>
      )}

      {/* Distribuição por classificação */}
      {Object.values(snap.distribuicao_classificacao).some((v) => v > 0) && (
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Distribuição por classificação
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(snap.distribuicao_classificacao).map(([cls, total]) => (
              <span
                key={cls}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  classColors[cls] ?? "bg-slate-500/20 text-slate-400",
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
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Performance por closer
          </h3>
          {snap.por_closer.map((c) => {
            const color =
              c.score_medio == null
                ? "bg-slate-500"
                : c.score_medio >= 80
                  ? "bg-emerald-500"
                  : c.score_medio >= 60
                    ? "bg-blue-500"
                    : c.score_medio >= 40
                      ? "bg-amber-500"
                      : "bg-red-500";
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
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Calls insuficientes
          </h3>
          {snap.calls_insuficientes.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between border-b border-slate-700/60 py-2 last:border-0"
            >
              <div>
                <p className="text-sm text-slate-200">
                  {c.closer_nome ?? "Closer não identificado"}
                </p>
                {c.diagnostico_ia && (
                  <p className="mt-0.5 text-xs text-slate-500">{c.diagnostico_ia}</p>
                )}
              </div>
              <span className="ml-4 shrink-0 text-lg font-bold text-red-400">{c.score ?? "—"}</span>
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Ronda Calls — {inicio} a {fim}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                ronda.status === "enviada"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : ronda.status === "erro"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-slate-500/20 text-slate-400",
              )}
            >
              {ronda.status}
            </span>
            {ronda.enviada_em && (
              <span className="text-xs text-slate-500">
                Enviada em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(ronda.enviada_em))}
              </span>
            )}
            {ronda.vazia && <span className="text-xs text-slate-600">Período vazio</span>}
          </div>
        </div>
      </div>

      <RondaCalls snap={ronda.snapshot as unknown as SnapshotCalls} />

      {Array.isArray(ronda.destinatarios) && (ronda.destinatarios as string[]).length > 0 && (
        <p className="text-xs text-slate-600">
          Enviada para: {(ronda.destinatarios as string[]).join(", ")}
        </p>
      )}
    </div>
  );
}
