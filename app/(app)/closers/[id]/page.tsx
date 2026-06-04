import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    EXCELENTE: "text-success",
    BOM: "text-info",
    REGULAR: "text-warning",
    INSUFICIENTE: "text-error",
  };
  return cls ? (mapa[cls] ?? "text-muted-foreground") : "text-muted-foreground";
}

function scoreBadgeVariant(score: number | null): "success" | "warning" | "error" | "muted" {
  if (score == null) return "muted";
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "error";
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
        <Link href="/closers" className="text-sm text-muted-foreground hover:text-foreground">
          ← Closers
        </Link>
        <PageHeader
          eyebrow="Closer"
          title={closer.nome}
          subtitle={closer.email ?? undefined}
          right={
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                closer.ativo ? "bg-success/10 text-success" : "bg-sand text-muted-foreground",
              )}
            >
              {closer.ativo ? "Ativo" : "Inativo"}
            </span>
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total de calls
          </p>
          <p className="text-2xl font-bold text-gold-500">{(calls ?? []).length}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Analisadas</p>
          <p className="text-2xl font-bold text-foreground">{analisadas.length}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score médio</p>
          <p className="text-2xl font-bold text-foreground">{scoresMedio ?? "—"}</p>
        </div>
      </div>

      {/* Calls */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Calls</h2>
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sand">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Arquivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Classificação
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(calls ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma call registrada
                  </td>
                </tr>
              ) : (
                (calls ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-sand">
                    <td className="px-4 py-3">
                      <Link
                        href={`/calls/${c.id}`}
                        className="font-medium text-gold-500 hover:underline"
                      >
                        {c.sharepoint_file_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
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
                        <span className="text-xs text-muted-foreground">—</span>
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
