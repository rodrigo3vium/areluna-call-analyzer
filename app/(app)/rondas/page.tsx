import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const STATUS_COR: Record<string, string> = {
  pendente: "bg-slate-500/20 text-slate-400",
  gerada: "bg-blue-500/20 text-blue-300",
  enviada: "bg-emerald-500/20 text-emerald-300",
  erro: "bg-red-500/20 text-red-300",
};

export default async function RondasPage() {
  const supabase = await createServiceClient();

  const { data: rondas } = await supabase
    .schema("comercial")
    .from("rondas")
    .select("id, tipo, periodo_inicio, periodo_fim, status, enviada_em, vazia, erro_envio")
    .order("periodo_inicio", { ascending: false })
    .limit(60);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Rondas semanais</h1>
        <p className="text-sm text-slate-400">Histórico dos relatórios semanais de calls</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Período</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Enviada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {(rondas ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma ronda encontrada
                </td>
              </tr>
            ) : (
              (rondas ?? []).map((r) => {
                const inicio = new Intl.DateTimeFormat("pt-BR").format(new Date(r.periodo_inicio));
                const fim = new Intl.DateTimeFormat("pt-BR").format(new Date(r.periodo_fim));
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rondas/${r.id}`}
                        className="font-medium text-slate-200 hover:text-cyan-300"
                      >
                        {inicio} — {fim}
                      </Link>
                      {r.vazia && <span className="ml-2 text-[10px] text-slate-600">(vazia)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_COR[r.status] ?? "bg-slate-500/20 text-slate-400",
                        )}
                      >
                        {r.status}
                      </span>
                      {r.erro_envio && (
                        <p
                          className="mt-0.5 max-w-[200px] truncate text-[10px] text-red-400"
                          title={r.erro_envio}
                        >
                          {r.erro_envio}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.enviada_em
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(r.enviada_em))
                        : "—"}
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
