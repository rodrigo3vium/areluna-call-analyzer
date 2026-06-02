import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data: config } = await serviceClient
    .schema("comercial")
    .from("configuracoes")
    .select("nome_clinica, destinatarios_calls")
    .eq("id", 1)
    .single();

  const destinatarios = (config?.destinatarios_calls ?? []) as string[];
  const unicos = [...new Set(destinatarios)];

  if (unicos.length === 0) {
    return NextResponse.json({ ok: false, message: "Nenhum destinatário configurado" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const clinica = config?.nome_clinica ?? "Areluna";

  try {
    await resend.emails.send({
      from: `${clinica} — Areluna <noreply@benitesalbuquerque.com.br>`,
      to: unicos,
      subject: `[Teste] Areluna Call Analyzer — ${clinica}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1e293b;">
          <h2 style="color: #0891b2;">Email de teste — ${clinica}</h2>
          <p>Este é um email de teste do Areluna Call Analyzer.</p>
          <p>Se você recebeu este email, o envio via Resend está funcionando corretamente.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Areluna Call Analyzer — Análise de calls de fechamento</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true, message: `Enviado para ${unicos.join(", ")}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: `Erro: ${msg}` });
  }
}
