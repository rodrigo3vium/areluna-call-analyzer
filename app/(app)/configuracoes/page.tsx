import { createServiceClient } from "@/lib/supabase/server";
import { ConfigForm } from "./config-form";
import { EvolutionInstancesPanel } from "./evolution-instances-panel";
import { EmailTesteButton } from "./email-teste-button";

export default async function ConfiguracoesPage() {
  const supabase = await createServiceClient();

  const { data: config } = await supabase
    .schema("comercial")
    .from("configuracoes")
    .select(
      "nome_clinica, destinatarios_whatsapp, destinatarios_calls, threshold_score_baixo, threshold_alerta_imediato_whatsapp, janela_analise_mensagens",
    )
    .eq("id", 1)
    .single()
    .throwOnError();

  const { data: instances } = await supabase
    .schema("comercial")
    .from("evolution_instances")
    .select("id, apelido, evolution_url, evolution_api_key, instance_name, webhook_secret, ativa")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-400">
          Parâmetros gerais, destinatários e instâncias Evolution
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">Parâmetros gerais</h2>
        <ConfigForm config={config!} />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">Instâncias Evolution API</h2>
        <EvolutionInstancesPanel instances={instances ?? []} />
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
