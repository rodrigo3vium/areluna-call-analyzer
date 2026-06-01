import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  evolution_url: string;
  evolution_api_key: string;
  instance_name: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { evolution_url, evolution_api_key, instance_name } = (await request.json()) as Body;

  try {
    const url = `${evolution_url.replace(/\/$/, "")}/instance/connectionState/${instance_name}`;
    const res = await fetch(url, {
      headers: { apikey: evolution_api_key },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, message: `Evolution retornou ${res.status}` });
    }

    const data = (await res.json()) as { state?: string; instance?: { state?: string } };
    const state = data.state ?? data.instance?.state ?? "desconhecido";
    return NextResponse.json({ ok: true, message: `Conectado — estado: ${state}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: `Erro: ${msg}` });
  }
}
