import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  nome_clinica: string;
  destinatarios_calls: string[];
  threshold_score_baixo: number;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json()) as Body;

  await supabase
    .schema("comercial")
    .from("configuracoes")
    .update({
      nome_clinica: body.nome_clinica,
      destinatarios_calls: body.destinatarios_calls,
      threshold_score_baixo: body.threshold_score_baixo,
    })
    .eq("id", 1)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
