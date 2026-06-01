import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  nome_clinica: string;
  destinatarios_whatsapp: string[];
  destinatarios_calls: string[];
  threshold_score_baixo: number;
  threshold_alerta_imediato_whatsapp: number;
  janela_analise_mensagens: number;
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
      destinatarios_whatsapp: body.destinatarios_whatsapp,
      destinatarios_calls: body.destinatarios_calls,
      threshold_score_baixo: body.threshold_score_baixo,
      threshold_alerta_imediato_whatsapp: body.threshold_alerta_imediato_whatsapp,
      janela_analise_mensagens: body.janela_analise_mensagens,
    })
    .eq("id", 1)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
