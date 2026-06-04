import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ConfigForm } from "./config-form";
import { EmailTesteButton } from "./email-teste-button";

function mascarar(valor: string | undefined) {
  if (!valor) return "não configurado";
  if (valor.length <= 8) return "***";
  return valor.slice(0, 4) + "•".repeat(valor.length - 8) + valor.slice(-4);
}

export default async function ConfiguracoesPage() {
  const supabase = await createServiceClient();

  const { data: config } = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select("nome_clinica, destinatarios_calls, threshold_score_baixo")
    .eq("id", 1)
    .single()
    .throwOnError();

  const sharepoint = {
    tenantId: process.env.SHAREPOINT_TENANT_ID,
    clientId: process.env.SHAREPOINT_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
    siteId: process.env.SHAREPOINT_SITE_ID,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    folderItemId: process.env.SHAREPOINT_FOLDER_ITEM_ID,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        subtitle="Parâmetros gerais, SharePoint e destinatários"
      />

      <section className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Parâmetros gerais</h2>
        <ConfigForm config={config!} />
      </section>

      <section className="space-y-4 rounded-card border border-border bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Integração SharePoint</h2>
        <p className="text-xs text-muted-foreground">
          Credenciais configuradas via variáveis de ambiente no Vercel. Para alterar, acesse o
          painel do Vercel → Settings → Environment Variables.
        </p>
        <dl className="space-y-2 text-xs">
          {[
            { label: "Tenant ID", valor: sharepoint.tenantId },
            { label: "Client ID", valor: sharepoint.clientId },
            { label: "Client Secret", valor: mascarar(sharepoint.clientSecret) },
            { label: "Site ID", valor: sharepoint.siteId },
            { label: "Drive ID", valor: sharepoint.driveId },
            { label: "Folder Item ID", valor: sharepoint.folderItemId },
          ].map(({ label, valor }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd
                className={
                  valor && valor !== "não configurado"
                    ? "rounded bg-sand px-1.5 py-0.5 font-mono text-foreground"
                    : "text-muted-foreground"
                }
              >
                {valor ?? "não configurado"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[10px] text-muted-foreground">
          Variáveis: SHAREPOINT_TENANT_ID · SHAREPOINT_CLIENT_ID · SHAREPOINT_CLIENT_SECRET ·
          SHAREPOINT_SITE_ID · SHAREPOINT_DRIVE_ID · SHAREPOINT_FOLDER_ITEM_ID
          <br />
          IDs resolvidos via:{" "}
          <code className="rounded bg-sand px-1 py-0.5 text-foreground">
            tsx scripts/resolve-sharepoint-ids.ts &lt;URL&gt;
          </code>
        </p>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Testes</h2>
        <p className="text-xs text-muted-foreground">
          Envia um email de teste para todos os destinatários configurados.
        </p>
        <EmailTesteButton />
      </section>
    </div>
  );
}
