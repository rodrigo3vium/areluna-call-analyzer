import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  origem:
    | "instagram"
    | "facebook"
    | "google"
    | "indicacao"
    | "organico"
    | "whatsapp_ativo"
    | "outro"
    | "desconhecido";
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
      origem: body.origem,
      origem_status: "manual",
      origem_confidence: null,
    })
    .eq("id", id)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
