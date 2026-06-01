import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const STATUS_COR: Record<string, string> = {
  novo: "bg-slate-500/20 text-slate-300",
  em_atendimento: "bg-cyan-500/20 text-cyan-300",
  sem_resposta: "bg-yellow-500/20 text-yellow-300",
  agendou: "bg-blue-500/20 text-blue-300",
  compareceu: "bg-purple-500/20 text-purple-300",
  perdido: "bg-red-500/20 text-red-300",
  fechou: "bg-emerald-500/20 text-emerald-300",
};

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string; origem?: string }>;
}) {
  const { status, pagina, origem } = await searchParams;
  const pag = Math.max(Number(pagina ?? "1"), 1);
  const from = (pag - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createServiceClient();

  let query = supabase
    .schema("comercial")
    .from("leads")
    .select("id, nome, telefone, status, origem, origem_status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (origem) query = query.eq("origem_status", origem);

  const { data: leads, count } = await query;
  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  const STATUS_LISTA = [
    "novo",
    "em_atendimento",
    "sem_resposta",
    "agendou",
    "compareceu",
    "perdido",
    "fechou",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-400">{count ?? 0} leads cadastrados</p>
        </div>
        <Link
          href="/leads/pendentes"
          className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
        >
          Classificar origens pendentes →
        </Link>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/leads"
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            !status ? "bg-slate-600 text-slate-200" : "text-slate-400 hover:bg-slate-700",
          )}
        >
          Todos
        </Link>
        {STATUS_LISTA.map((s) => (
          <Link
            key={s}
            href={s === status ? "/leads" : `/leads?status=${s}`}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              s === status ? "bg-slate-600 text-slate-200" : "text-slate-400 hover:bg-slate-700",
            )}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Telefone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Origem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {(leads ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum lead encontrado
                </td>
              </tr>
            ) : (
              (leads ?? []).map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="font-medium text-slate-200 hover:text-cyan-300"
                    >
                      {l.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{l.telefone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        STATUS_COR[l.status] ?? "bg-slate-500/20 text-slate-300",
                      )}
                    >
                      {l.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.origem ? (
                      <span className="text-xs text-slate-400">{l.origem}</span>
                    ) : (
                      <span className="text-xs text-slate-600">
                        {l.origem_status === "pendente" ? "pendente" : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("pt-BR").format(new Date(l.created_at))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2">
          {pag > 1 && (
            <Link
              href={`/leads?pagina=${pag - 1}${status ? `&status=${status}` : ""}`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700"
            >
              ← Anterior
            </Link>
          )}
          <span className="px-3 py-1.5 text-xs text-slate-500">
            {pag} / {totalPaginas}
          </span>
          {pag < totalPaginas && (
            <Link
              href={`/leads?pagina=${pag + 1}${status ? `&status=${status}` : ""}`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
