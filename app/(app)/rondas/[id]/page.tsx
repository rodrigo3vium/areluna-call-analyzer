import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { SnapshotWhatsapp, SnapshotCalls } from "@/lib/modules/gerador-ronda";

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
      <span className="w-28 shrink-0 truncate text-xs text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-slate-400">{value}</span>
    </div>
  );
}

function RondaWhatsapp({ snap }: { snap: SnapshotWhatsapp }) {
  const maxDist = Math.max(...snap.distribuicao_score.map((d) => d.total), 1);
  const maxTag = Math.max(...snap.top_tags_negativas.map((t) => t.total), 1);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Conversas", valor: snap.total_conversas, cls: "text-cyan-300" },
          {
            label: "Score médio",
            valor: snap.score_medio !== null ? snap.score_medio.toFixed(1) : "—",
            cls: snap.score_medio !== null ? scoreColor(snap.score_medio) : "text-slate-500",
          },
          { label: "Score +alto", valor: snap.score_mais_alto ?? "—", cls: "text-emerald-400" },
          { label: "Score +baixo", valor: snap.score_mais_baixo ?? "—", cls: "text-red-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={cn("text-2xl font-bold", k.cls)}>{k.valor}</p>
          </div>
        ))}
      </div>

      {snap.total_conversas === 0 && (
        <p className="text-sm text-slate-500">Nenhuma conversa analisada neste período.</p>
      )}

      {snap.distribuicao_score.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Distribuição de scores
          </h3>
          {snap.distribuicao_score.map((d) => (
            <BarChart
              key={d.faixa}
              label={d.faixa}
              value={d.total}
              max={maxDist}
              color="bg-cyan-500"
            />
          ))}
        </section>
      )}

      {snap.top_tags_negativas.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Principais problemas
          </h3>
          {snap.top_tags_negativas.slice(0, 8).map((t) => (
            <BarChart key={t.tag} label={t.tag} value={t.total} max={maxTag} color="bg-red-500" />
          ))}
        </section>
      )}

      {snap.top_tags_positivas.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Pontos positivos
          </h3>
          {snap.top_tags_positivas.slice(0, 8).map((t) => {
            const maxPos = Math.max(...snap.top_tags_positivas.map((x) => x.total), 1);
            return (
              <BarChart
                key={t.tag}
                label={t.tag}
                value={t.total}
                max={maxPos}
                color="bg-emerald-500"
              />
            );
          })}
        </section>
      )}

      {snap.conversas_criticas.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Conversas críticas (score &lt; 40)
          </h3>
          {snap.conversas_criticas.map((c) => (
            <div
              key={c.conversa_id}
              className="flex items-start justify-between border-b border-slate-700/60 py-2 last:border-0"
            >
              <div>
                <p className="text-sm text-slate-200">{c.lead_nome ?? "Lead sem nome"}</p>
                {c.resumo && <p className="mt-0.5 text-xs text-slate-500">{c.resumo}</p>}
              </div>
              <span className="ml-4 shrink-0 text-lg font-bold text-red-400">{c.score}</span>
            </div>
          ))}
        </section>
      )}

      {snap.origens.length > 0 && (
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Origens
          </h3>
          <div className="flex flex-wrap gap-2">
            {snap.origens.map((o) => (
              <span
                key={o.origem}
                className="rounded-full bg-slate-700/60 px-3 py-1 text-xs text-slate-300"
              >
                {o.origem}: <span className="font-medium text-slate-100">{o.total}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RondaCalls({ snap }: { snap: SnapshotCalls }) {
  const fasesLabels: Record<string, string> = {
    preparacao: "Preparação",
    abertura: "Abertura",
    diagnostico: "Diagnóstico",
    apresentacao_clinica: "Apresentação clínica",
    apresentacao_investimento: "Apresentação investimento",
    fechamento: "Fechamento",
    objecoes: "Objeções",
    sabotadores: "Sabotadores",
  };
  const classColors: Record<string, string> = {
    excelente: "bg-emerald-500/20 text-emerald-300",
    bom: "bg-blue-500/20 text-blue-300",
    regular: "bg-amber-500/20 text-amber-300",
    insuficiente: "bg-red-500/20 text-red-300",
  };

  return (
    <div className="space-y-4">
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

      {snap.distribuicao_classificacao.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Distribuição por classificação
          </h3>
          <div className="flex flex-wrap gap-2">
            {snap.distribuicao_classificacao.map((d) => (
              <span
                key={d.classificacao}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  classColors[d.classificacao] ?? "bg-slate-500/20 text-slate-400",
                )}
              >
                {d.classificacao}: {d.total}
              </span>
            ))}
          </div>
        </section>
      )}

      {Object.keys(snap.media_por_fase).length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Média por fase
          </h3>
          {Object.entries(snap.media_por_fase)
            .filter(([, v]) => v !== null)
            .sort((a, b) => (a[1] as number) - (b[1] as number))
            .map(([fase, val]) => {
              const v = val as number;
              const color =
                v >= 80
                  ? "bg-emerald-500"
                  : v >= 60
                    ? "bg-blue-500"
                    : v >= 40
                      ? "bg-amber-500"
                      : "bg-red-500";
              return (
                <BarChart
                  key={fase}
                  label={fasesLabels[fase] ?? fase}
                  value={v}
                  max={100}
                  color={color}
                />
              );
            })}
        </section>
      )}

      {snap.calls_insuficientes.length > 0 && (
        <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Calls insuficientes
          </h3>
          {snap.calls_insuficientes.map((c) => (
            <div
              key={c.call_id}
              className="flex items-start justify-between border-b border-slate-700/60 py-2 last:border-0"
            >
              <div>
                <p className="text-sm text-slate-200">{c.lead_nome ?? "Sem match"}</p>
                {c.diagnostico && <p className="mt-0.5 text-xs text-slate-500">{c.diagnostico}</p>}
              </div>
              <span className="ml-4 shrink-0 text-lg font-bold text-red-400">{c.score}</span>
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
  const tipoLabel = ronda.tipo === "whatsapp" ? "WhatsApp" : "Calls";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Ronda {tipoLabel} — {inicio} a {fim}
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

      {ronda.tipo === "whatsapp" ? (
        <RondaWhatsapp snap={ronda.snapshot as SnapshotWhatsapp} />
      ) : (
        <RondaCalls snap={ronda.snapshot as SnapshotCalls} />
      )}

      {Array.isArray(ronda.destinatarios) && (ronda.destinatarios as string[]).length > 0 && (
        <p className="text-xs text-slate-600">
          Enviada para: {(ronda.destinatarios as string[]).join(", ")}
        </p>
      )}
    </div>
  );
}
