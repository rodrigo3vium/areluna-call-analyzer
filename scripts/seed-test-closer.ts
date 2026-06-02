#!/usr/bin/env tsx
/**
 * Garante que o closer "Closer Teste" existe no banco.
 * Usado para validar o pipeline end-to-end em dev.
 * Não commitado como migration — é dado de teste descartável.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

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

  // Verifica se já existe
  const { data: existing } = await supabase
    .schema("comercial")
    .from("closers")
    .select("id, nome, ativo")
    .ilike("nome", "closer teste")
    .limit(1)
    .throwOnError();

  if (existing && existing.length > 0) {
    const c = existing[0];
    console.log(`✅ Closer já existe: ${c.nome} (id=${c.id}, ativo=${c.ativo})`);
    if (!c.ativo) {
      await supabase
        .schema("comercial")
        .from("closers")
        .update({ ativo: true })
        .eq("id", c.id)
        .throwOnError();
      console.log("   → Reativado (estava ativo=false)");
    }
    return;
  }

  // Insere
  const { data: inserted } = await supabase
    .schema("comercial")
    .from("closers")
    .insert({ nome: "Closer Teste", email: "teste@areluna.test", ativo: true })
    .select("id, nome")
    .single()
    .throwOnError();

  console.log(`✅ Closer criado: ${inserted!.nome} (id=${inserted!.id})`);
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
