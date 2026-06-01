"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Mensagem genérica anti-enumeração: mesmo que o email não exista, retornamos sucesso
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/redefinir-senha`,
  });

  return { success: true };
}
