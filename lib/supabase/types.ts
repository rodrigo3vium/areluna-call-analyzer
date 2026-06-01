export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  comercial: {
    Tables: {
      analises_calls: {
        Row: {
          acao_recomendada: string | null;
          call_id: string;
          classificacao: "excelente" | "bom" | "regular" | "insuficiente";
          created_at: string;
          diagnostico: string | null;
          fases: Json;
          id: string;
          modelo: string;
          prompt_versao: string;
          score_geral: number;
          tokens_entrada: number | null;
          tokens_saida: number | null;
        };
        Insert: {
          acao_recomendada?: string | null;
          call_id: string;
          classificacao: "excelente" | "bom" | "regular" | "insuficiente";
          created_at?: string;
          diagnostico?: string | null;
          fases?: Json;
          id?: string;
          modelo: string;
          prompt_versao?: string;
          score_geral: number;
          tokens_entrada?: number | null;
          tokens_saida?: number | null;
        };
        Update: {
          acao_recomendada?: string | null;
          call_id?: string;
          classificacao?: "excelente" | "bom" | "regular" | "insuficiente";
          created_at?: string;
          diagnostico?: string | null;
          fases?: Json;
          id?: string;
          modelo?: string;
          prompt_versao?: string;
          score_geral?: number;
          tokens_entrada?: number | null;
          tokens_saida?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "analises_calls_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
        ];
      };
      analises_whatsapp: {
        Row: {
          acao_recomendada: string | null;
          conversa_id: string;
          created_at: string;
          diagnostico: string | null;
          id: string;
          modelo: string;
          origem_confidence: number | null;
          origem_detectada: string | null;
          prompt_versao: string;
          resumo: string | null;
          score: number;
          tags_negativas: string[];
          tags_positivas: string[];
          tokens_entrada: number | null;
          tokens_saida: number | null;
          total_mensagens_analisadas: number;
        };
        Insert: {
          acao_recomendada?: string | null;
          conversa_id: string;
          created_at?: string;
          diagnostico?: string | null;
          id?: string;
          modelo: string;
          origem_confidence?: number | null;
          origem_detectada?: string | null;
          prompt_versao?: string;
          resumo?: string | null;
          score: number;
          tags_negativas?: string[];
          tags_positivas?: string[];
          tokens_entrada?: number | null;
          tokens_saida?: number | null;
          total_mensagens_analisadas?: number;
        };
        Update: {
          acao_recomendada?: string | null;
          conversa_id?: string;
          created_at?: string;
          diagnostico?: string | null;
          id?: string;
          modelo?: string;
          origem_confidence?: number | null;
          origem_detectada?: string | null;
          prompt_versao?: string;
          resumo?: string | null;
          score?: number;
          tags_negativas?: string[];
          tags_positivas?: string[];
          tokens_entrada?: number | null;
          tokens_saida?: number | null;
          total_mensagens_analisadas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "analises_whatsapp_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "conversas";
            referencedColumns: ["id"];
          },
        ];
      };
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
          analisada_em: string | null;
          created_at: string;
          duracao_segundos: number | null;
          gravacao_url: string | null;
          id: string;
          lead_id: string | null;
          match_confirmado_em: string | null;
          match_confirmado_por: string | null;
          match_status:
            | "pendente"
            | "sugerido"
            | "confirmado"
            | "confirmado_auto"
            | "sem_lead"
            | "revertido";
          match_sugestoes: Json | null;
          plaud_hash: string | null;
          plaud_id: string | null;
          realizada_em: string | null;
          telefone_extraido: string | null;
          titulo: string | null;
          transcricao: string | null;
          transcricao_origem: "plaud" | "whisper" | "manual" | null;
          updated_at: string;
        };
        Insert: {
          analisada_em?: string | null;
          created_at?: string;
          duracao_segundos?: number | null;
          gravacao_url?: string | null;
          id?: string;
          lead_id?: string | null;
          match_confirmado_em?: string | null;
          match_confirmado_por?: string | null;
          match_status?:
            | "pendente"
            | "sugerido"
            | "confirmado"
            | "confirmado_auto"
            | "sem_lead"
            | "revertido";
          match_sugestoes?: Json | null;
          plaud_hash?: string | null;
          plaud_id?: string | null;
          realizada_em?: string | null;
          telefone_extraido?: string | null;
          titulo?: string | null;
          transcricao?: string | null;
          transcricao_origem?: "plaud" | "whisper" | "manual" | null;
          updated_at?: string;
        };
        Update: {
          analisada_em?: string | null;
          created_at?: string;
          duracao_segundos?: number | null;
          gravacao_url?: string | null;
          id?: string;
          lead_id?: string | null;
          match_confirmado_em?: string | null;
          match_confirmado_por?: string | null;
          match_status?:
            | "pendente"
            | "sugerido"
            | "confirmado"
            | "confirmado_auto"
            | "sem_lead"
            | "revertido";
          match_sugestoes?: Json | null;
          plaud_hash?: string | null;
          plaud_id?: string | null;
          realizada_em?: string | null;
          telefone_extraido?: string | null;
          titulo?: string | null;
          transcricao?: string | null;
          transcricao_origem?: "plaud" | "whisper" | "manual" | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracoes: {
        Row: {
          created_at: string;
          destinatarios_calls: string[];
          destinatarios_whatsapp: string[];
          id: number;
          janela_analise_mensagens: number;
          nome_clinica: string;
          retencao_meses: number;
          threshold_alerta_imediato_whatsapp: number;
          threshold_score_baixo: number;
          updated_at: string;
          zapier_plaud_mapping: Json;
        };
        Insert: {
          created_at?: string;
          destinatarios_calls?: string[];
          destinatarios_whatsapp?: string[];
          id?: number;
          janela_analise_mensagens?: number;
          nome_clinica?: string;
          retencao_meses?: number;
          threshold_alerta_imediato_whatsapp?: number;
          threshold_score_baixo?: number;
          updated_at?: string;
          zapier_plaud_mapping?: Json;
        };
        Update: {
          created_at?: string;
          destinatarios_calls?: string[];
          destinatarios_whatsapp?: string[];
          id?: number;
          janela_analise_mensagens?: number;
          nome_clinica?: string;
          retencao_meses?: number;
          threshold_alerta_imediato_whatsapp?: number;
          threshold_score_baixo?: number;
          updated_at?: string;
          zapier_plaud_mapping?: Json;
        };
        Relationships: [];
      };
      conversas: {
        Row: {
          created_at: string;
          evolution_instance_id: string | null;
          id: string;
          lead_id: string | null;
          numero_whatsapp: string;
          status: "ativa" | "encerrada" | "aguardando";
          ultima_analise_em: string | null;
          ultima_mensagem_em: string | null;
          ultimo_score: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          evolution_instance_id?: string | null;
          id?: string;
          lead_id?: string | null;
          numero_whatsapp: string;
          status?: "ativa" | "encerrada" | "aguardando";
          ultima_analise_em?: string | null;
          ultima_mensagem_em?: string | null;
          ultimo_score?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          evolution_instance_id?: string | null;
          id?: string;
          lead_id?: string | null;
          numero_whatsapp?: string;
          status?: "ativa" | "encerrada" | "aguardando";
          ultima_analise_em?: string | null;
          ultima_mensagem_em?: string | null;
          ultimo_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversas_evolution_instance_id_fkey";
            columns: ["evolution_instance_id"];
            isOneToOne: false;
            referencedRelation: "evolution_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversas_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_brutos: {
        Row: {
          created_at: string;
          external_id: string;
          fonte: "evolution" | "zapier_plaud";
          id: string;
          payload: Json;
          processado_em: string | null;
          status: "pendente" | "processando" | "processado" | "erro" | "dead_letter" | "ignorado";
          tentativas: number;
          ultimo_erro: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          external_id: string;
          fonte: "evolution" | "zapier_plaud";
          id?: string;
          payload: Json;
          processado_em?: string | null;
          status?: "pendente" | "processando" | "processado" | "erro" | "dead_letter" | "ignorado";
          tentativas?: number;
          ultimo_erro?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          external_id?: string;
          fonte?: "evolution" | "zapier_plaud";
          id?: string;
          payload?: Json;
          processado_em?: string | null;
          status?: "pendente" | "processando" | "processado" | "erro" | "dead_letter" | "ignorado";
          tentativas?: number;
          ultimo_erro?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      evolution_instances: {
        Row: {
          apelido: string;
          ativa: boolean;
          created_at: string;
          evolution_api_key: string;
          evolution_url: string;
          id: string;
          instance_name: string;
          updated_at: string;
          webhook_secret: string;
        };
        Insert: {
          apelido: string;
          ativa?: boolean;
          created_at?: string;
          evolution_api_key: string;
          evolution_url: string;
          id?: string;
          instance_name: string;
          updated_at?: string;
          webhook_secret: string;
        };
        Update: {
          apelido?: string;
          ativa?: boolean;
          created_at?: string;
          evolution_api_key?: string;
          evolution_url?: string;
          id?: string;
          instance_name?: string;
          updated_at?: string;
          webhook_secret?: string;
        };
        Relationships: [];
      };
      lead_eventos: {
        Row: {
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          lead_id: string;
          payload: Json | null;
          tipo: "mensagem" | "call" | "status_change" | "analise" | "nota" | "match";
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          lead_id: string;
          payload?: Json | null;
          tipo: "mensagem" | "call" | "status_change" | "analise" | "nota" | "match";
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          lead_id?: string;
          payload?: Json | null;
          tipo?: "mensagem" | "call" | "status_change" | "analise" | "nota" | "match";
        };
        Relationships: [
          {
            foreignKeyName: "lead_eventos_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          origem:
            | "instagram"
            | "facebook"
            | "google"
            | "indicacao"
            | "organico"
            | "whatsapp_ativo"
            | "outro"
            | "desconhecido"
            | null;
          origem_confidence: number | null;
          origem_status: "detectado" | "pendente" | "manual" | "desconhecido";
          status:
            | "novo"
            | "em_atendimento"
            | "sem_resposta"
            | "agendou"
            | "compareceu"
            | "perdido"
            | "fechou";
          status_atualizado_em: string;
          status_atualizado_por: string | null;
          status_origem: "sistema" | "manual";
          telefone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          origem?:
            | "instagram"
            | "facebook"
            | "google"
            | "indicacao"
            | "organico"
            | "whatsapp_ativo"
            | "outro"
            | "desconhecido"
            | null;
          origem_confidence?: number | null;
          origem_status?: "detectado" | "pendente" | "manual" | "desconhecido";
          status?:
            | "novo"
            | "em_atendimento"
            | "sem_resposta"
            | "agendou"
            | "compareceu"
            | "perdido"
            | "fechou";
          status_atualizado_em?: string;
          status_atualizado_por?: string | null;
          status_origem?: "sistema" | "manual";
          telefone: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          origem?:
            | "instagram"
            | "facebook"
            | "google"
            | "indicacao"
            | "organico"
            | "whatsapp_ativo"
            | "outro"
            | "desconhecido"
            | null;
          origem_confidence?: number | null;
          origem_status?: "detectado" | "pendente" | "manual" | "desconhecido";
          status?:
            | "novo"
            | "em_atendimento"
            | "sem_resposta"
            | "agendou"
            | "compareceu"
            | "perdido"
            | "fechou";
          status_atualizado_em?: string;
          status_atualizado_por?: string | null;
          status_origem?: "sistema" | "manual";
          telefone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mensagens: {
        Row: {
          conteudo: string | null;
          conversa_id: string;
          created_at: string;
          duracao_segundos: number | null;
          enviada_em: string;
          fonte: "humano" | "automacao";
          id: string;
          media_url: string | null;
          message_id_evolution: string | null;
          remetente: string;
          tipo: "texto" | "audio" | "imagem" | "documento" | "outro";
        };
        Insert: {
          conteudo?: string | null;
          conversa_id: string;
          created_at?: string;
          duracao_segundos?: number | null;
          enviada_em?: string;
          fonte?: "humano" | "automacao";
          id?: string;
          media_url?: string | null;
          message_id_evolution?: string | null;
          remetente?: string;
          tipo?: "texto" | "audio" | "imagem" | "documento" | "outro";
        };
        Update: {
          conteudo?: string | null;
          conversa_id?: string;
          created_at?: string;
          duracao_segundos?: number | null;
          enviada_em?: string;
          fonte?: "humano" | "automacao";
          id?: string;
          media_url?: string | null;
          message_id_evolution?: string | null;
          remetente?: string;
          tipo?: "texto" | "audio" | "imagem" | "documento" | "outro";
        };
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "conversas";
            referencedColumns: ["id"];
          },
        ];
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
          tipo: "whatsapp" | "calls";
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
          tipo: "whatsapp" | "calls";
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
          tipo?: "whatsapp" | "calls";
          updated_at?: string;
          vazia?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      buscar_leads_fuzzy: {
        Args: {
          p_telefone?: string;
          p_nome?: string;
          p_limite?: number;
        };
        Returns: {
          id: string;
          nome: string;
          telefone: string;
          score: number;
        }[];
      };
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
