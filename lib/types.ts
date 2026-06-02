import type { Tables } from "@/lib/supabase/types";

// =====================================================================
// Enums
// =====================================================================
export type TranscricaoStatus = "pendente" | "em_processamento" | "concluida" | "erro";

export type StatusAnalise =
  | "aguardando_transcricao"
  | "aguardando_analise"
  | "em_analise"
  | "analisada"
  | "erro";

export type Classificacao = "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE";

// =====================================================================
// Closer — derivado da tabela closers
// =====================================================================
export type Closer = Tables<"closers">;

// =====================================================================
// Call — derivado da tabela calls
// =====================================================================
export type Call = Tables<"calls">;

// Call com closer expandido (join)
export type CallComCloser = Call & {
  closer: Pick<Closer, "id" | "nome" | "email"> | null;
};

// =====================================================================
// Snapshot de ronda (calls)
// =====================================================================
export type SnapshotCalls = {
  total_calls: number;
  score_medio: number | null;
  distribuicao_classificacao: {
    EXCELENTE: number;
    BOM: number;
    REGULAR: number;
    INSUFICIENTE: number;
  };
  por_closer: Array<{
    closer_id: string;
    closer_nome: string;
    total: number;
    score_medio: number | null;
  }>;
  calls_insuficientes: Array<{
    id: string;
    closer_nome: string | null;
    score: number | null;
    data_gravacao: string | null;
    diagnostico_ia: string | null;
  }>;
};
