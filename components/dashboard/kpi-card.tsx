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
    <Card
      className={cn(
        "p-7",
        destaque && "border-gold-400 bg-gradient-to-br from-gold-500/10 to-transparent",
      )}
    >
      <CardHeader className="p-0 pb-2">
        <CardTitle className="eyebrow font-sans text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="display-card tabular-nums text-foreground">{valorFormatado}</p>
        {delta != null && (
          <p className={cn("mt-1 text-xs font-medium", delta >= 0 ? "text-success" : "text-error")}>
            {delta >= 0 ? "+" : ""}
            {delta} vs período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
