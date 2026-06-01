#!/usr/bin/env tsx
/**
 * npm run admin:create-user
 *
 * Cria um usuário em Supabase Auth via Admin API,
 * insere na tabela comercial.autorizados,
 * e dispara um recovery link via Resend para o usuário definir senha.
 *
 * Uso:
 *   npm run admin:create-user -- --email head@clinica.com --role head --name "João Silva"
 *
 * Requer env vars (pode usar .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   NEXT_PUBLIC_APP_URL
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const ROLES = ["dono", "head", "admin"] as const;
type Role = (typeof ROLES)[number];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const email = get("--email");
  const role = get("--role") as Role | undefined;
  const name = get("--name") ?? "";

  if (!email) {
    console.error("Erro: --email é obrigatório");
    process.exit(1);
  }
  if (!role || !ROLES.includes(role)) {
    console.error(`Erro: --role deve ser um de: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  return { email, role, name };
}

async function main() {
  // Carregar .env.local se existir
  const { config } = await import("dotenv").catch(() => ({ config: () => {} }));
  config({ path: ".env.local" });

  const { email, role, name } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
    process.exit(1);
  }
  if (!resendApiKey) {
    console.error("Erro: RESEND_API_KEY é obrigatório");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const resend = new Resend(resendApiKey);

  console.log(`\nCriando usuário: ${email} (${role})...`);

  // 1. Criar usuário via Admin API (sem enviar email de confirmação)
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    if (createError.message.includes("already registered")) {
      console.error(`Erro: email ${email} já está cadastrado`);
    } else {
      console.error("Erro ao criar usuário:", createError.message);
    }
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✓ Usuário criado: ${userId}`);

  // 2. Inserir em comercial.autorizados
  await supabase.from("autorizados").insert({ user_id: userId, role }).throwOnError();

  console.log(`✓ Inserido em autorizados como ${role}`);

  // 3. Gerar recovery link para o usuário definir senha
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${appUrl}/auth/definir-senha`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Erro ao gerar recovery link:", linkError?.message);
    process.exit(1);
  }

  const recoveryLink = linkData.properties.action_link;
  console.log(`✓ Recovery link gerado`);

  // 4. Enviar email via Resend
  const { error: emailError } = await resend.emails.send({
    from: "Atlas OS Comercial <noreply@benitesalbuquerque.com.br>",
    to: email,
    subject: "Defina sua senha — Atlas OS Comercial",
    html: buildInviteEmail(name || email, recoveryLink, role),
  });

  if (emailError) {
    console.error("Erro ao enviar email:", emailError.message);
    console.log(`\nLink de acesso (envie manualmente):\n${recoveryLink}`);
    process.exit(1);
  }

  console.log(`✓ Email enviado para ${email}`);
  console.log(`\nUsuário ${email} criado com sucesso como ${role}.`);
}

function buildInviteEmail(nameOrEmail: string, link: string, role: Role): string {
  const roleLabel: Record<Role, string> = {
    dono: "Dono(a)",
    head: "Head Comercial",
    admin: "Administrador(a)",
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Bem-vindo ao Atlas OS Comercial</title></head>
<body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <h2 style="color: #0ea5e9; margin-bottom: 8px;">Atlas OS Comercial</h2>
  <p>Olá, <strong>${nameOrEmail}</strong>.</p>
  <p>Sua conta foi criada com o perfil de <strong>${roleLabel[role]}</strong>.</p>
  <p>Clique no botão abaixo para definir sua senha e acessar o sistema:</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}"
       style="background: #0ea5e9; color: white; padding: 12px 24px;
              border-radius: 6px; text-decoration: none; font-weight: bold;">
      Definir minha senha
    </a>
  </p>
  <p style="font-size: 13px; color: #64748b;">
    Este link expira em 24 horas. Se você não esperava este email, pode ignorá-lo.
  </p>
</body>
</html>
  `.trim();
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
