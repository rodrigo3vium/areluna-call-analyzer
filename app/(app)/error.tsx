"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-200">Algo deu errado</p>
        <p className="mt-1 text-sm text-slate-400">
          O erro foi registrado. Tente novamente ou recarregue a página.
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
