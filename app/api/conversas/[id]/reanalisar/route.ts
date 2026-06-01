import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { analisarConversasPendentes } from "@/lib/modules/analisador-whatsapp";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Zera ultima_analise_em para forçar re-análise no próximo ciclo (ou aqui mesmo)
  const serviceClient = await createServiceClient();

  await serviceClient
    .schema("comercial")
    .from("conversas")
    .update({ ultima_analise_em: null })
    .eq("id", id)
    .throwOnError();

  // Roda análise imediatamente para esta conversa
  await analisarConversasPendentes(serviceClient);

  return NextResponse.json({ ok: true });
}
