import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  acao: "confirmar" | "trocar" | "sem_lead";
  lead_id?: string;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json()) as Body;

  if (body.acao === "sem_lead") {
    await supabase
      .schema("comercial")
      .from("calls")
      .update({
        lead_id: null,
        match_status: "sem_lead",
        match_confirmado_por: user.id,
        match_confirmado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .throwOnError();
    return NextResponse.json({ ok: true });
  }

  if (!body.lead_id) {
    return NextResponse.json({ error: "lead_id obrigatório" }, { status: 400 });
  }

  await supabase
    .schema("comercial")
    .from("calls")
    .update({
      lead_id: body.lead_id,
      match_status: "confirmado",
      match_confirmado_por: user.id,
      match_confirmado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
