import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  valor: string | number | null;
  delta?: number | null;
  sufixo?: string;
  destaque?: boolean;
};

export function KpiCard({ titulo, valor, delta, sufixo, destaque }: Props) {
  const valorFormatado = valor == null ? "—" : `${valor}${sufixo ?? ""}`;

  return (
    <Card className={cn(destaque && "border-cyan-500/40 bg-cyan-950/20")}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-slate-400">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums text-slate-100">{valorFormatado}</p>
        {delta != null && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              delta >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta} vs período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
