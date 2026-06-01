import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  apelido: string;
  evolution_url: string;
  evolution_api_key: string;
  instance_name: string;
  webhook_secret: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json()) as Body;

  const { data } = await supabase
    .schema("comercial")
    .from("evolution_instances")
    .insert({
      apelido: body.apelido,
      evolution_url: body.evolution_url,
      evolution_api_key: body.evolution_api_key,
      instance_name: body.instance_name,
      webhook_secret: body.webhook_secret,
      ativa: true,
    })
    .select("id")
    .single()
    .throwOnError();

  return NextResponse.json({ ok: true, id: data?.id });
}
