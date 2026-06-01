"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Activity, Loader2 } from "lucide-react";
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
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold">Atlas OS Comercial</span>
        </div>
      </CardHeader>

      <CardContent>
        {mode === "login" && (
          <form action={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="você@clinica.com"
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
                placeholder="você@clinica.com"
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
