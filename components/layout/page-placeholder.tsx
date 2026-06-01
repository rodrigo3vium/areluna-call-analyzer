import { Card, CardContent } from "@/components/ui/card";

export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="flex-1 p-8">
        <Card className="border-dashed bg-card/50">
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Em construção
            </span>
            <p className="max-w-md text-sm text-muted-foreground">
              Esta tela será construída na {phase} do roadmap. A estrutura de navegação já está em
              pé pra validar paleta, tipografia e fluxo de rotas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
