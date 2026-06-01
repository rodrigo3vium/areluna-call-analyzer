import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  status:
    | "novo"
    | "em_atendimento"
    | "sem_resposta"
    | "agendou"
    | "compareceu"
    | "perdido"
    | "fechou";
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json()) as Body;

  await supabase
    .schema("comercial")
    .from("leads")
    .update({
      status: body.status,
      status_origem: "manual",
      status_atualizado_em: new Date().toISOString(),
      status_atualizado_por: user.id,
    })
    .eq("id", id)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
