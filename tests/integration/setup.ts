import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase local defaults (supabase start)
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

export function getTestClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const TABLES_TO_CLEAN = [
  "auditoria",
  "lead_eventos",
  "analises_calls",
  "analises_whatsapp",
  "rondas",
  "eventos_brutos",
  "mensagens",
  "calls",
  "conversas",
  "leads",
  "evolution_instances",
] as const;

export async function limparDb(supabase: SupabaseClient) {
  for (const table of TABLES_TO_CLEAN) {
    await supabase.schema("comercial").from(table).delete().gte("created_at", "2000-01-01");
  }
}
