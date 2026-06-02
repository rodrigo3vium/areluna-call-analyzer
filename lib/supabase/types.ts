export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  comercial: {
    Tables: {
      auditoria: {
        Row: {
          acao: "read" | "create" | "update" | "delete";
          id: string;
          payload: Json | null;
          recurso: string;
          recurso_id: string | null;
          timestamp: string;
          user_id: string | null;
        };
        Insert: {
          acao: "read" | "create" | "update" | "delete";
          id?: string;
          payload?: Json | null;
          recurso: string;
          recurso_id?: string | null;
          timestamp?: string;
          user_id?: string | null;
        };
        Update: {
          acao?: "read" | "create" | "update" | "delete";
          id?: string;
          payload?: Json | null;
          recurso?: string;
          recurso_id?: string | null;
          timestamp?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      autorizados: {
        Row: {
          created_at: string;
          id: string;
          role: "dono" | "head" | "admin";
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: "dono" | "head" | "admin";
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: "dono" | "head" | "admin";
          user_id?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          acao_recomendada: string | null;
          classificacao: "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE" | null;
          closer_id: string | null;
          created_at: string;
          data_gravacao: string | null;
          diagnostico_ia: string | null;
          duracao_minutos: number | null;
          id: string;
          performance_por_criterio: Json | null;
          pontos_melhoria: Json | null;
          score: number | null;
          sharepoint_file_id: string;
          sharepoint_file_name: string;
          sharepoint_file_url: string | null;
          status_analise:
            | "aguardando_transcricao"
            | "aguardando_analise"
            | "em_analise"
            | "analisada"
            | "erro";
          transcricao: string | null;
          transcricao_erro: string | null;
          transcricao_status: "pendente" | "em_processamento" | "concluida" | "erro";
          updated_at: string;
        };
        Insert: {
          acao_recomendada?: string | null;
          classificacao?: "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE" | null;
          closer_id?: string | null;
          created_at?: string;
          data_gravacao?: string | null;
          diagnostico_ia?: string | null;
          duracao_minutos?: number | null;
          id?: string;
          performance_por_criterio?: Json | null;
          pontos_melhoria?: Json | null;
          score?: number | null;
          sharepoint_file_id: string;
          sharepoint_file_name: string;
          sharepoint_file_url?: string | null;
          status_analise?:
            | "aguardando_transcricao"
            | "aguardando_analise"
            | "em_analise"
            | "analisada"
            | "erro";
          transcricao?: string | null;
          transcricao_erro?: string | null;
          transcricao_status?: "pendente" | "em_processamento" | "concluida" | "erro";
          updated_at?: string;
        };
        Update: {
          acao_recomendada?: string | null;
          classificacao?: "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE" | null;
          closer_id?: string | null;
          created_at?: string;
          data_gravacao?: string | null;
          diagnostico_ia?: string | null;
          duracao_minutos?: number | null;
          id?: string;
          performance_por_criterio?: Json | null;
          pontos_melhoria?: Json | null;
          score?: number | null;
          sharepoint_file_id?: string;
          sharepoint_file_name?: string;
          sharepoint_file_url?: string | null;
          status_analise?:
            | "aguardando_transcricao"
            | "aguardando_analise"
            | "em_analise"
            | "analisada"
            | "erro";
          transcricao?: string | null;
          transcricao_erro?: string | null;
          transcricao_status?: "pendente" | "em_processamento" | "concluida" | "erro";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_closer_id_fkey";
            columns: ["closer_id"];
            isOneToOne: false;
            referencedRelation: "closers";
            referencedColumns: ["id"];
          },
        ];
      };
      closers: {
        Row: {
          ativo: boolean;
          created_at: string;
          email: string | null;
          id: string;
          nome: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          email?: string | null;
          id?: string;
          nome: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          email?: string | null;
          id?: string;
          nome?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      configuracoes: {
        Row: {
          created_at: string;
          destinatarios_calls: string[];
          id: number;
          nome_clinica: string;
          retencao_meses: number;
          threshold_score_baixo: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          destinatarios_calls?: string[];
          id?: number;
          nome_clinica?: string;
          retencao_meses?: number;
          threshold_score_baixo?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          destinatarios_calls?: string[];
          id?: number;
          nome_clinica?: string;
          retencao_meses?: number;
          threshold_score_baixo?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      rondas: {
        Row: {
          created_at: string;
          destinatarios: Json | null;
          enviada_em: string | null;
          erro_envio: string | null;
          id: string;
          periodo_fim: string;
          periodo_inicio: string;
          reenvios: number;
          snapshot: Json;
          status: "pendente" | "gerada" | "enviada" | "erro";
          tipo: "calls";
          updated_at: string;
          vazia: boolean;
        };
        Insert: {
          created_at?: string;
          destinatarios?: Json | null;
          enviada_em?: string | null;
          erro_envio?: string | null;
          id?: string;
          periodo_fim: string;
          periodo_inicio: string;
          reenvios?: number;
          snapshot?: Json;
          status?: "pendente" | "gerada" | "enviada" | "erro";
          tipo?: "calls";
          updated_at?: string;
          vazia?: boolean;
        };
        Update: {
          created_at?: string;
          destinatarios?: Json | null;
          enviada_em?: string | null;
          erro_envio?: string | null;
          id?: string;
          periodo_fim?: string;
          periodo_inicio?: string;
          reenvios?: number;
          snapshot?: Json;
          status?: "pendente" | "gerada" | "enviada" | "erro";
          tipo?: "calls";
          updated_at?: string;
          vazia?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard: {
        Args: {
          p_inicio: string;
          p_fim: string;
        };
        Returns: Json;
      };
      get_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_authorized: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["comercial"]["Tables"]> =
  Database["comercial"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["comercial"]["Tables"]> =
  Database["comercial"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["comercial"]["Tables"]> =
  Database["comercial"]["Tables"][T]["Update"];

export type DbFunctions = Database["comercial"]["Functions"];
