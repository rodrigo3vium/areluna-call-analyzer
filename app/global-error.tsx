"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-cream text-foreground">
        <div className="max-w-md text-center">
          <p className="text-4xl font-bold text-foreground">500</p>
          <p className="mt-2 text-lg text-muted-foreground">Erro inesperado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O problema foi registrado automaticamente.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-pill bg-gold-500 px-4 py-2 text-sm font-medium text-primary-900 hover:bg-gold-400"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
