import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

const STATUS_COR: Record<string, string> = {
  pendente: "bg-sand text-muted-foreground",
  gerada: "bg-info/10 text-info",
  enviada: "bg-success/10 text-success",
  erro: "bg-error/10 text-error",
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
      <PageHeader
        eyebrow="Rondas"
        title="Rondas semanais"
        subtitle="Histórico dos relatórios semanais de calls"
      />

      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Período
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Enviada em
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(rondas ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma ronda encontrada
                </td>
              </tr>
            ) : (
              (rondas ?? []).map((r) => {
                const inicio = new Intl.DateTimeFormat("pt-BR").format(new Date(r.periodo_inicio));
                const fim = new Intl.DateTimeFormat("pt-BR").format(new Date(r.periodo_fim));
                return (
                  <tr key={r.id} className="hover:bg-sand">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rondas/${r.id}`}
                        className="font-medium text-gold-500 hover:underline"
                      >
                        {inicio} — {fim}
                      </Link>
                      {r.vazia && (
                        <span className="ml-2 text-[10px] text-muted-foreground">(vazia)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_COR[r.status] ?? "bg-sand text-muted-foreground",
                        )}
                      >
                        {r.status}
                      </span>
                      {r.erro_envio && (
                        <p
                          className="mt-0.5 max-w-[200px] truncate text-[10px] text-error"
                          title={r.erro_envio}
                        >
                          {r.erro_envio}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
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
