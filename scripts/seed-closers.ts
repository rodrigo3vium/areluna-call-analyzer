#!/usr/bin/env tsx
/**
 * Cadastra os closers reais da Areluna, com nome = nome da pasta no SharePoint.
 * O resolver (resolver-closer.ts) vincula a call ao closer por
 * normalizarTexto(nome) === normalizarTexto(pasta), então o nome aqui precisa
 * bater com a pasta. Emails são placeholder — ajustar para os reais depois.
 *
 * Idempotente: não duplica se o closer já existir (match case-insensitive por nome).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const CLOSERS = [
  { nome: "Talita", email: "talita@areluna.pt" },
  { nome: "Susana", email: "susana@areluna.pt" },
  { nome: "Vanessa", email: "vanessa@areluna.pt" },
];

async function main() {
  const { config } = await import("dotenv").catch(() => ({ config: () => {} }));
  config({ path: ".env.local" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);

  for (const { nome, email } of CLOSERS) {
    const { data: existing } = await supabase
      .schema("comercial")
      .from("closers")
      .select("id, nome, ativo")
      .ilike("nome", nome)
      .limit(1)
      .throwOnError();

    if (existing && existing.length > 0) {
      const c = existing[0];
      if (!c.ativo) {
        await supabase
          .schema("comercial")
          .from("closers")
          .update({ ativo: true })
          .eq("id", c.id)
          .throwOnError();
        console.log(`✅ ${c.nome} já existia — reativado (id=${c.id})`);
      } else {
        console.log(`✅ ${c.nome} já existe e ativo (id=${c.id})`);
      }
      continue;
    }

    const { data: inserted } = await supabase
      .schema("comercial")
      .from("closers")
      .insert({ nome, email, ativo: true })
      .select("id, nome")
      .single()
      .throwOnError();

    console.log(`✅ Closer criado: ${inserted!.nome} (id=${inserted!.id})`);
  }
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
