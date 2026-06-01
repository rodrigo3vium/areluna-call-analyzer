import { Suspense } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ScoreChart } from "@/components/dashboard/score-chart";
import { PeriodoSelector } from "@/components/dashboard/periodo-selector";
import { Badge } from "@/components/ui/badge";

function calcularPeriodo(dias: number) {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - dias * 86_400_000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

function scoreBadgeVariant(score: number | null): "default" | "secondary" | "destructive" {
  if (score == null) return "secondary";
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "destructive";
}

type DashboardData = {
  kpis: {
    leads_ativos: number;
    score_medio_whatsapp: number | null;
    score_medio_calls: number | null;
    taxa_fechamento: number | null;
    delta_score_whatsapp: number | null;
    delta_score_calls: number | null;
  };
  serie_temporal: Array<{
    semana: string;
    score_whatsapp: number | null;
    score_calls: number | null;
  }>;
  conversas_recentes: Array<{
    id: string;
    lead_nome: string | null;
    lead_telefone: string;
    ultimo_score: number | null;
    ultima_mensagem_em: string;
    ultimo_resumo: string | null;
    tags_negativas: string[];
  }>;
  calls_recentes: Array<{
    id: string;
    titulo: string | null;
    lead_nome: string | null;
    realizada_em: string | null;
    match_status: string;
    classificacao: string | null;
    score_geral: number | null;
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
      leads_ativos: 0,
      score_medio_whatsapp: null,
      score_medio_calls: null,
      taxa_fechamento: null,
      delta_score_whatsapp: null,
      delta_score_calls: null,
    },
    serie_temporal: [],
    conversas_recentes: [],
    calls_recentes: [],
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard titulo="Leads ativos" valor={d.kpis.leads_ativos} />
        <KpiCard
          titulo="Score médio WhatsApp"
          valor={d.kpis.score_medio_whatsapp}
          delta={d.kpis.delta_score_whatsapp}
          sufixo="/100"
          destaque
        />
        <KpiCard
          titulo="Score médio Calls"
          valor={d.kpis.score_medio_calls}
          delta={d.kpis.delta_score_calls}
          sufixo="/100"
          destaque
        />
        <KpiCard titulo="Taxa de fechamento" valor={d.kpis.taxa_fechamento} sufixo="%" />
      </div>

      {/* Gráfico */}
      {d.serie_temporal.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h2 className="mb-4 text-sm font-medium text-slate-400">
            Evolução de scores (12 semanas)
          </h2>
          <ScoreChart dados={d.serie_temporal} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversas recentes */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Conversas recentes</h2>
            <Link href="/whatsapp" className="text-xs text-cyan-400 hover:underline">
              Ver todas
            </Link>
          </div>
          {d.conversas_recentes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma conversa no período</p>
          ) : (
            <ul className="space-y-2">
              {d.conversas_recentes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/whatsapp/${c.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-700/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {c.lead_nome ?? c.lead_telefone}
                      </p>
                      {c.ultimo_resumo && (
                        <p className="truncate text-xs text-slate-500">{c.ultimo_resumo}</p>
                      )}
                    </div>
                    {c.ultimo_score != null && (
                      <Badge variant={scoreBadgeVariant(c.ultimo_score)} className="ml-2 shrink-0">
                        {c.ultimo_score}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Calls recentes */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Calls recentes</h2>
            <Link href="/calls" className="text-xs text-cyan-400 hover:underline">
              Ver todas
            </Link>
          </div>
          {d.calls_recentes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma call no período</p>
          ) : (
            <ul className="space-y-2">
              {d.calls_recentes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/calls/${c.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-700/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {c.lead_nome ?? c.titulo ?? "Call sem título"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.classificacao ?? "—"} · {c.match_status}
                      </p>
                    </div>
                    {c.score_geral != null && (
                      <Badge variant={scoreBadgeVariant(c.score_geral)} className="ml-2 shrink-0">
                        {c.score_geral}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">Visão consolidada do comercial</p>
        </div>
        <Suspense>
          <PeriodoSelector />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        }
      >
        <DashboardConteudo dias={dias} />
      </Suspense>
    </div>
  );
}
