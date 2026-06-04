import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export default async function ClosersPage() {
  const supabase = await createServiceClient();

  const { data: closers } = await supabase
    .schema("comercial")
    .from("closers")
    .select("id, nome, email, ativo, created_at")
    .order("nome", { ascending: true });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Closers" title="Closers" subtitle="Time de fechamento cadastrado" />

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sand">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(closers ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum closer cadastrado ainda
                </td>
              </tr>
            ) : (
              (closers ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-sand">
                  <td className="px-4 py-3">
                    <Link
                      href={`/closers/${c.id}`}
                      className="font-medium text-gold-500 hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        c.ativo ? "bg-success/10 text-success" : "bg-sand text-muted-foreground",
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
