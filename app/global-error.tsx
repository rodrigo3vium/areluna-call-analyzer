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
      <body className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md text-center">
          <p className="text-4xl font-bold text-slate-200">500</p>
          <p className="mt-2 text-lg text-slate-400">Erro inesperado</p>
          <p className="mt-1 text-sm text-slate-500">O problema foi registrado automaticamente.</p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
