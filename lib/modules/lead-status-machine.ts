import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadStatus =
  | "novo"
  | "em_atendimento"
  | "sem_resposta"
  | "agendou"
  | "compareceu"
  | "perdido"
  | "fechou";

const PRIORITY: Record<LeadStatus, number> = {
  novo: 1,
  em_atendimento: 2,
  sem_resposta: 3,
  agendou: 4,
  compareceu: 5,
  perdido: 6,
  fechou: 7,
};

export function calcularNovoStatus(
  statusAtual: LeadStatus,
  statusOrigem: "sistema" | "manual",
  statusSugerido: LeadStatus,
): LeadStatus | null {
  if (statusOrigem === "manual") return null;
  if (PRIORITY[statusSugerido] > PRIORITY[statusAtual]) return statusSugerido;
  return null;
}

export async function recomputarStatusLead(
  leadId: string,
  statusSugerido: LeadStatus,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: lead } = await supabase
    .schema("comercial")
    .from("leads")
    .select("status, status_origem")
    .eq("id", leadId)
    .single()
    .throwOnError();

  if (!lead) return;

  const novoStatus = calcularNovoStatus(
    lead.status as LeadStatus,
    lead.status_origem as "sistema" | "manual",
    statusSugerido,
  );

  if (novoStatus === null) return;

  await supabase
    .schema("comercial")
    .from("leads")
    .update({
      status: novoStatus,
      status_origem: "sistema",
      status_atualizado_em: new Date().toISOString(),
    })
    .eq("id", leadId)
    .throwOnError();
}
