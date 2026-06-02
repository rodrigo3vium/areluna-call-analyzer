import { createServiceClient } from "@/lib/supabase/server";
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
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-400">Parâmetros gerais, SharePoint e destinatários</p>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">Parâmetros gerais</h2>
        <ConfigForm config={config!} />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">Integração SharePoint</h2>
        <p className="text-xs text-slate-500">
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
              <dt className="text-slate-500">{label}</dt>
              <dd
                className={
                  valor && valor !== "não configurado"
                    ? "font-mono text-slate-300"
                    : "text-slate-600"
                }
              >
                {valor ?? "não configurado"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[10px] text-slate-600">
          Variáveis: SHAREPOINT_TENANT_ID · SHAREPOINT_CLIENT_ID · SHAREPOINT_CLIENT_SECRET ·
          SHAREPOINT_SITE_ID · SHAREPOINT_DRIVE_ID · SHAREPOINT_FOLDER_ITEM_ID
          <br />
          IDs resolvidos via: <code>tsx scripts/resolve-sharepoint-ids.ts &lt;URL&gt;</code>
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">Testes</h2>
        <p className="text-xs text-slate-500">
          Envia um email de teste para todos os destinatários configurados.
        </p>
        <EmailTesteButton />
      </section>
    </div>
  );
}
