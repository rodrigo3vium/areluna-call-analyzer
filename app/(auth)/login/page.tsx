"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, requestPasswordReset } from "./actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignIn(formData: FormData) {
    setError(null);
    const result = await signIn(formData);
    if (result?.error) setError(result.error);
  }

  async function handleForgot(formData: FormData) {
    setError(null);
    await requestPasswordReset(formData);
    setSuccess(true);
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <CardHeader className="items-center px-0 pb-6 text-center">
        <span className="font-serif text-3xl font-light tracking-[0.28em] text-foreground">
          ARELUNA
        </span>
        <span className="eyebrow mt-1 text-[10px] tracking-[0.18em] text-gold-500">
          ATLAS · COMERCIAL OS
        </span>
      </CardHeader>

      <CardContent className="px-0">
        {mode === "login" && (
          <form action={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="você@areluna.pt"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SubmitButton>Entrar</SubmitButton>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
              }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {mode === "forgot" && !success && (
          <form action={handleForgot} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe seu email e enviaremos um link para redefinir a senha.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="você@areluna.pt"
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SubmitButton>Enviar link</SubmitButton>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar ao login
            </button>
          </form>
        )}

        {mode === "forgot" && success && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se esse email estiver cadastrado, você receberá um link em instantes. Verifique também
              a caixa de spam.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMode("login");
                setSuccess(false);
              }}
            >
              Voltar ao login
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
