import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function classificacaoCor(cls: string | null) {
  const mapa: Record<string, string> = {
    excelente: "text-emerald-400",
    bom: "text-cyan-400",
    regular: "text-yellow-400",
    insuficiente: "text-red-400",
  };
  return cls ? (mapa[cls] ?? "text-slate-400") : "text-slate-500";
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

export default async function CallsPage() {
  const supabase = await createServiceClient();

  const [{ data: aguardando }, { data: analisadas }] = await Promise.all([
    supabase
      .schema("comercial")
      .from("calls")
      .select("id, titulo, realizada_em, match_status, match_sugestoes, lead:leads(nome, telefone)")
      .in("match_status", ["pendente", "sugerido"])
      .is("analisada_em", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .schema("comercial")
      .from("calls")
      .select(
        "id, titulo, realizada_em, match_status, lead:leads(nome, telefone), analise:analises_calls(classificacao, score_geral)",
      )
      .not("analisada_em", "is", null)
      .order("realizada_em", { ascending: false, nullsFirst: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Calls</h1>
        <p className="text-sm text-slate-400">Transcrições Plaud com análise de performance</p>
      </div>

      <Tabs defaultValue="aguardando">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="aguardando">
            Aguardando match
            {(aguardando?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300">
                {aguardando?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analisadas">Analisadas</TabsTrigger>
        </TabsList>

        <TabsContent value="aguardando" className="mt-4">
          {(aguardando ?? []).length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-sm text-slate-500">Nenhuma call aguardando match</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Call</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {(aguardando ?? []).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/calls/${c.id}`}
                          className="font-medium text-slate-200 hover:text-cyan-300"
                        >
                          {c.titulo ?? "Call sem título"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatarData(c.realizada_em)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{c.match_status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/calls/${c.id}`}
                          className="text-xs text-cyan-400 hover:underline"
                        >
                          Confirmar match →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analisadas" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Call</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Classificação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {(analisadas ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhuma call analisada
                    </td>
                  </tr>
                ) : (
                  (analisadas ?? []).map((c) => {
                    const lead = Array.isArray(c.lead) ? c.lead[0] : c.lead;
                    const analise = Array.isArray(c.analise) ? c.analise[0] : c.analise;
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/calls/${c.id}`}
                            className="font-medium text-slate-200 hover:text-cyan-300"
                          >
                            {c.titulo ?? "Call sem título"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {lead?.nome ?? lead?.telefone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatarData(c.realizada_em)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-xs font-medium capitalize",
                              classificacaoCor(analise?.classificacao ?? null),
                            )}
                          >
                            {analise?.classificacao ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-300">
                          {analise?.score_geral ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
