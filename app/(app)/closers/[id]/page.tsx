import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    EXCELENTE: "text-emerald-400",
    BOM: "text-cyan-400",
    REGULAR: "text-yellow-400",
    INSUFICIENTE: "text-red-400",
  };
  return cls ? (mapa[cls] ?? "text-slate-400") : "text-slate-500";
}

function scoreBadgeVariant(score: number | null): "default" | "secondary" | "destructive" {
  if (score == null) return "secondary";
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "destructive";
}

export default async function CloserDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: closer } = await supabase
    .schema("comercial")
    .from("closers")
    .select("id, nome, email, ativo, created_at")
    .eq("id", id)
    .single();

  if (!closer) notFound();

  const { data: calls } = await supabase
    .schema("comercial")
    .from("calls")
    .select("id, sharepoint_file_name, data_gravacao, classificacao, score, status_analise")
    .eq("closer_id", id)
    .order("data_gravacao", { ascending: false, nullsFirst: false })
    .limit(50);

  const analisadas = (calls ?? []).filter((c) => c.status_analise === "analisada");
  const scoresMedio =
    analisadas.length > 0
      ? Math.round(
          (analisadas.reduce((acc, c) => acc + Number(c.score ?? 0), 0) / analisadas.length) * 10,
        ) / 10
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/closers" className="text-sm text-slate-400 hover:text-slate-200">
          ← Closers
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-100">{closer.nome}</h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              closer.ativo
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-slate-500/20 text-slate-400",
            )}
          >
            {closer.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
        {closer.email && <p className="text-sm text-slate-400">{closer.email}</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Total de calls</p>
          <p className="text-2xl font-bold text-cyan-300">{(calls ?? []).length}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Analisadas</p>
          <p className="text-2xl font-bold text-slate-100">{analisadas.length}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Score médio</p>
          <p className="text-2xl font-bold text-slate-100">{scoresMedio ?? "—"}</p>
        </div>
      </div>

      {/* Calls */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-300">Calls</h2>
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Arquivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                  Classificação
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {(calls ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma call registrada
                  </td>
                </tr>
              ) : (
                (calls ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/calls/${c.id}`}
                        className="font-medium text-slate-200 hover:text-cyan-300"
                      >
                        {c.sharepoint_file_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.data_gravacao
                        ? new Intl.DateTimeFormat("pt-BR").format(new Date(c.data_gravacao))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn("text-xs font-medium", classificacaoCor(c.classificacao))}
                      >
                        {c.classificacao ??
                          (c.status_analise !== "analisada" ? c.status_analise : "—")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.score != null ? (
                        <Badge
                          variant={scoreBadgeVariant(c.score as number)}
                          className="tabular-nums"
                        >
                          {c.score}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
