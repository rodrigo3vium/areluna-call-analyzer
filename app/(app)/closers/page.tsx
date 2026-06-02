import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function ClosersPage() {
  const supabase = await createServiceClient();

  const { data: closers } = await supabase
    .schema("comercial")
    .from("closers")
    .select("id, nome, email, ativo, created_at")
    .order("nome", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Closers</h1>
          <p className="text-sm text-slate-400">Time de fechamento cadastrado</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {(closers ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum closer cadastrado ainda
                </td>
              </tr>
            ) : (
              (closers ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/closers/${c.id}`}
                      className="font-medium text-slate-200 hover:text-cyan-300"
                    >
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        c.ativo
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-400",
                      )}
                    >
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
