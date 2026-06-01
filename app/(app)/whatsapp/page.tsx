import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function scoreColor(score: number | null) {
  if (score == null) return "text-slate-500";
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createServiceClient();

  let query = supabase
    .schema("comercial")
    .from("conversas")
    .select(
      "id, status, ultimo_score, ultima_mensagem_em, ultima_analise_em, lead:leads(nome, telefone)",
    )
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data: conversas } = await query;

  const statusLabels: Record<string, string> = {
    ativa: "Ativa",
    aguardando: "Aguardando",
    encerrada: "Encerrada",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Conversas WhatsApp</h1>
          <p className="text-sm text-slate-400">{conversas?.length ?? 0} conversas</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(statusLabels).map(([s, label]) => (
            <Link
              key={s}
              href={s === status ? "/whatsapp" : `/whatsapp?status=${s}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                s === status
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-700 hover:text-slate-200",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Lead</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                Última mensagem
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Analisada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {(conversas ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma conversa encontrada
                </td>
              </tr>
            ) : (
              (conversas ?? []).map((c) => {
                const lead = Array.isArray(c.lead) ? c.lead[0] : c.lead;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/whatsapp/${c.id}`}
                        className="font-medium text-slate-200 hover:text-cyan-300"
                      >
                        {lead?.nome ?? lead?.telefone ?? "—"}
                      </Link>
                      {lead?.telefone && <p className="text-xs text-slate-500">{lead.telefone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          scoreColor(c.ultimo_score),
                        )}
                      >
                        {c.ultimo_score ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatarData(c.ultima_mensagem_em)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatarData(c.ultima_analise_em)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
