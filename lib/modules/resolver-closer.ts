import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarTexto } from "@/lib/utils/normalizar";

export async function resolverCloserPorNome(
  nomeBruto: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  if (!nomeBruto) return null;

  const nomeNormalizado = normalizarTexto(nomeBruto);

  const { data } = await supabase
    .schema("comercial")
    .from("closers")
    .select("id, nome")
    .eq("ativo", true)
    .throwOnError();

  if (!data) return null;

  const match = data.find(
    (c: { id: string; nome: string }) => normalizarTexto(c.nome) === nomeNormalizado,
  );
  return match?.id ?? null;
}
