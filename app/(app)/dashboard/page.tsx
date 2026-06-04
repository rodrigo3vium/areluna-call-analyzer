import { Suspense } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ScoreChart } from "@/components/dashboard/score-chart";
import { PeriodoSelector } from "@/components/dashboard/periodo-selector";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

function calcularPeriodo(dias: number) {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - dias * 86_400_000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

function scoreBadgeVariant(score: number | null): "success" | "warning" | "error" | "muted" {
  if (score == null) return "muted";
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "error";
}

type DashboardData = {
  kpis: {
    calls_no_periodo: number;
    calls_analisadas: number;
    calls_aguardando: number;
    score_medio_calls: number | null;
    delta_score_calls: number | null;
  };
  serie_temporal: Array<{
    semana: string;
    score_calls: number | null;
  }>;
  calls_recentes: Array<{
    id: string;
    closer_nome: string | null;
    classificacao: string | null;
    score: number | null;
    data_gravacao: string | null;
  }>;
  por_closer: Array<{
    closer_id: string;
    closer_nome: string;
    total: number;
    score_medio: number | null;
  }>;
};

async function DashboardConteudo({ dias }: { dias: number }) {
  const supabase = await createServiceClient();
  const { inicio, fim } = calcularPeriodo(dias);

  const { data } = await supabase
    .schema("comercial")
    .rpc("get_dashboard", { p_inicio: inicio, p_fim: fim });

  const d = (data as DashboardData | null) ?? {
    kpis: {
      calls_no_periodo: 0,
      calls_analisadas: 0,
      calls_aguardando: 0,
      score_medio_calls: null,
      delta_score_calls: null,
    },
    serie_temporal: [],
    calls_recentes: [],
    por_closer: [],
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard titulo="Calls no período" valor={d.kpis.calls_no_periodo} />
        <KpiCard titulo="Calls analisadas" valor={d.kpis.calls_analisadas} />
        <KpiCard titulo="Em processamento" valor={d.kpis.calls_aguardando} />
        <KpiCard
          titulo="Score médio"
          valor={d.kpis.score_medio_calls}
          delta={d.kpis.delta_score_calls}
          sufixo="/100"
          destaque
        />
      </div>

      {/* Gráfico */}
      {d.serie_temporal.length > 0 && (
        <Card className="p-7">
          <h2 className="eyebrow mb-4 text-muted-foreground">Evolução de score (12 semanas)</h2>
          <ScoreChart dados={d.serie_temporal} />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calls recentes */}
        <Card className="p-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow text-muted-foreground">Calls recentes</h2>
            <Link href="/calls" className="text-xs text-gold-500 hover:underline">
              Ver todas
            </Link>
          </div>
          {d.calls_recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma call no período</p>
          ) : (
            <ul className="space-y-2">
              {d.calls_recentes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/calls/${c.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-sand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.closer_nome ?? "Closer não identificado"}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.classificacao ?? "—"}</p>
                    </div>
                    {c.score != null && (
                      <Badge variant={scoreBadgeVariant(c.score)} className="ml-2 shrink-0">
                        {c.score}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Por closer */}
        <Card className="p-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow text-muted-foreground">Por closer</h2>
            <Link href="/closers" className="text-xs text-gold-500 hover:underline">
              Ver todos
            </Link>
          </div>
          {d.por_closer.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado no período</p>
          ) : (
            <ul className="space-y-2">
              {d.por_closer.map((c) => (
                <li key={c.closer_id}>
                  <Link
                    href={`/closers/${c.closer_id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-sand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.closer_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.total} calls</p>
                    </div>
                    {c.score_medio != null && (
                      <Badge variant={scoreBadgeVariant(c.score_medio)} className="ml-2 shrink-0">
                        {c.score_medio}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: diasParam } = await searchParams;
  const dias = Math.min(Math.max(Number(diasParam ?? "7"), 7), 90) || 7;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão Geral"
        title="Dashboard"
        subtitle="Visão consolidada das calls de fechamento"
        right={
          <Suspense>
            <PeriodoSelector />
          </Suspense>
        }
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-sand" />
            ))}
          </div>
        }
      >
        <DashboardConteudo dias={dias} />
      </Suspense>
    </div>
  );
}
