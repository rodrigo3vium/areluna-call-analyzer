import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

const STATUS_ANALISE_LABEL: Record<string, string> = {
  aguardando_transcricao: "Aguardando transcrição",
  aguardando_analise: "Aguardando análise",
  em_analise: "Em análise",
  analisada: "Analisada",
  erro: "Erro",
};

export default async function CallsPage() {
  const supabase = await createServiceClient();

  const [{ data: emProcessamento }, { data: analisadas }, { data: comErro }] = await Promise.all([
    supabase
      .schema("comercial")
      .from("calls")
      .select(
        "id, sharepoint_file_name, data_gravacao, status_analise, transcricao_status, closer:closers(nome)",
      )
      .in("status_analise", ["aguardando_transcricao", "aguardando_analise", "em_analise"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .schema("comercial")
      .from("calls")
      .select("id, sharepoint_file_name, data_gravacao, classificacao, score, closer:closers(nome)")
      .eq("status_analise", "analisada")
      .order("data_gravacao", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .schema("comercial")
      .from("calls")
      .select(
        "id, sharepoint_file_name, data_gravacao, transcricao_erro, transcricao_status, status_analise, closer:closers(nome)",
      )
      .eq("status_analise", "erro")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Calls"
        title="Calls"
        subtitle="Calls de fechamento com análise de performance"
      />

      <Tabs defaultValue="em_processamento">
        <TabsList>
          <TabsTrigger value="em_processamento">
            Em processamento
            {(emProcessamento?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-gold-200 px-1.5 py-0.5 text-[10px] text-primary-900">
                {emProcessamento?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analisadas">Analisadas</TabsTrigger>
          <TabsTrigger value="com_erro">
            Com erro
            {(comErro?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-error/10 px-1.5 py-0.5 text-[10px] text-error">
                {comErro?.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="em_processamento" className="mt-4">
          {(emProcessamento ?? []).length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">Nenhuma call em processamento</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Arquivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Closer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(emProcessamento ?? []).map((c) => {
                    const closer = Array.isArray(c.closer) ? c.closer[0] : c.closer;
                    return (
                      <tr key={c.id} className="hover:bg-sand">
                        <td className="px-4 py-3">
                          <Link
                            href={`/calls/${c.id}`}
                            className="font-medium text-foreground hover:text-gold-500 hover:underline"
                          >
                            {c.sharepoint_file_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {closer?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {STATUS_ANALISE_LABEL[c.status_analise] ?? c.status_analise}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analisadas" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Arquivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Closer
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
                {(analisadas ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma call analisada
                    </td>
                  </tr>
                ) : (
                  (analisadas ?? []).map((c) => {
                    const closer = Array.isArray(c.closer) ? c.closer[0] : c.closer;
                    return (
                      <tr key={c.id} className="hover:bg-sand">
                        <td className="px-4 py-3">
                          <Link
                            href={`/calls/${c.id}`}
                            className="font-medium text-foreground hover:text-gold-500 hover:underline"
                          >
                            {c.sharepoint_file_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {closer?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatarData(c.data_gravacao)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn("text-xs font-medium", classificacaoCor(c.classificacao))}
                          >
                            {c.classificacao ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-foreground">
                          {c.score ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="com_erro" className="mt-4">
          {(comErro ?? []).length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">Nenhuma call com erro</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Arquivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Closer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Erro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(comErro ?? []).map((c) => {
                    const closer = Array.isArray(c.closer) ? c.closer[0] : c.closer;
                    const erroTruncado = c.transcricao_erro
                      ? c.transcricao_erro.slice(0, 80) +
                        (c.transcricao_erro.length > 80 ? "…" : "")
                      : "Erro desconhecido";
                    return (
                      <tr key={c.id} className="hover:bg-sand">
                        <td className="px-4 py-3">
                          <Link
                            href={`/calls/${c.id}`}
                            className="font-medium text-foreground hover:text-gold-500 hover:underline"
                          >
                            {c.sharepoint_file_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {closer?.nome ?? "—"}
                        </td>
                        <td
                          className="max-w-[280px] px-4 py-3 text-xs text-error"
                          title={c.transcricao_erro ?? undefined}
                        >
                          {erroTruncado}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatarData(c.data_gravacao)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
