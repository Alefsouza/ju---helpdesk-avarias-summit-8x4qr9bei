// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      anexos_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          nome_arquivo: string
          tamanho_mb: number
          tipo_arquivo: string
          url_arquivo: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          nome_arquivo: string
          tamanho_mb: number
          tipo_arquivo: string
          url_arquivo: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          nome_arquivo?: string
          tamanho_mb?: number
          tipo_arquivo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anexos_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      anexos_chamado_interno: {
        Row: {
          arquivo_url: string
          chamado_id: string
          criado_em: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number
          tipo_arquivo: string
          usuario_id: string
        }
        Insert: {
          arquivo_url: string
          chamado_id: string
          criado_em?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes: number
          tipo_arquivo: string
          usuario_id: string
        }
        Update: {
          arquivo_url?: string
          chamado_id?: string
          criado_em?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number
          tipo_arquivo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anexos_chamado_interno_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      auditoria_admin: {
        Row: {
          acao: string
          admin_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          acao: string
          admin_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          acao?: string
          admin_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      chamados: {
        Row: {
          aprovacoes_diretoria: Json | null
          atualizado_em: string
          carro: string
          criado_em: string
          data_ocorrencia: string | null
          descricao: string
          garagem: string | null
          id: string
          linha: string | null
          local_ocorrencia: string | null
          nome_cobrador: string | null
          nome_motorista: string | null
          numero_os: string | null
          operacao: string | null
          pia: string | null
          prioridade: string | null
          registro_cobrador: string | null
          registro_motorista: string | null
          responsavel_id: string | null
          situacao_processo: string | null
          status: string
          status_aprovacao: string | null
          status_aprovacao_alex: string | null
          status_aprovacao_claudinei: string | null
          status_interno: string | null
          status_juridico: string | null
          tipo_chamado: string | null
          titulo: string
          usuario_id: string
        }
        Insert: {
          aprovacoes_diretoria?: Json | null
          atualizado_em?: string
          carro: string
          criado_em?: string
          data_ocorrencia?: string | null
          descricao: string
          garagem?: string | null
          id?: string
          linha?: string | null
          local_ocorrencia?: string | null
          nome_cobrador?: string | null
          nome_motorista?: string | null
          numero_os?: string | null
          operacao?: string | null
          pia?: string | null
          prioridade?: string | null
          registro_cobrador?: string | null
          registro_motorista?: string | null
          responsavel_id?: string | null
          situacao_processo?: string | null
          status?: string
          status_aprovacao?: string | null
          status_aprovacao_alex?: string | null
          status_aprovacao_claudinei?: string | null
          status_interno?: string | null
          status_juridico?: string | null
          tipo_chamado?: string | null
          titulo: string
          usuario_id: string
        }
        Update: {
          aprovacoes_diretoria?: Json | null
          atualizado_em?: string
          carro?: string
          criado_em?: string
          data_ocorrencia?: string | null
          descricao?: string
          garagem?: string | null
          id?: string
          linha?: string | null
          local_ocorrencia?: string | null
          nome_cobrador?: string | null
          nome_motorista?: string | null
          numero_os?: string | null
          operacao?: string | null
          pia?: string | null
          prioridade?: string | null
          registro_cobrador?: string | null
          registro_motorista?: string | null
          responsavel_id?: string | null
          situacao_processo?: string | null
          status?: string
          status_aprovacao?: string | null
          status_aprovacao_alex?: string | null
          status_aprovacao_claudinei?: string | null
          status_interno?: string | null
          status_juridico?: string | null
          tipo_chamado?: string | null
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_url: string
          atualizado_em: string
          chamado_id: string | null
          criado_em: string
          data: string | null
          descricao_danos: string | null
          excluido_manutencao: boolean
          formulario_id: string | null
          foto_url: string | null
          fotos_manutencao: Json | null
          fotos_requisicao: Json | null
          fotos_urls: Json | null
          garagem: string | null
          horario: string | null
          id: string
          is_recusado: boolean | null
          linha: string | null
          motivo_recusa: string | null
          nome_arquivo: string
          nome_motorista: string | null
          nome_responsavel: string | null
          numero_carro: string | null
          numero_os: string | null
          ocorrencia: string | null
          orcamento_url: string | null
          registro_motorista: string | null
          registro_responsavel: string | null
          status_liberacao: string | null
          tipo_documento: string
          valor_orcamento: number | null
        }
        Insert: {
          arquivo_url: string
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          excluido_manutencao?: boolean
          formulario_id?: string | null
          foto_url?: string | null
          fotos_manutencao?: Json | null
          fotos_requisicao?: Json | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          is_recusado?: boolean | null
          linha?: string | null
          motivo_recusa?: string | null
          nome_arquivo: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          orcamento_url?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
          status_liberacao?: string | null
          tipo_documento: string
          valor_orcamento?: number | null
        }
        Update: {
          arquivo_url?: string
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          excluido_manutencao?: boolean
          formulario_id?: string | null
          foto_url?: string | null
          fotos_manutencao?: Json | null
          fotos_requisicao?: Json | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          is_recusado?: boolean | null
          linha?: string | null
          motivo_recusa?: string | null
          nome_arquivo?: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          orcamento_url?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
          status_liberacao?: string | null
          tipo_documento?: string
          valor_orcamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_formulario_id_fkey'
            columns: ['formulario_id']
            isOneToOne: true
            referencedRelation: 'formularios_espelho_danos'
            referencedColumns: ['id']
          },
        ]
      }
      formularios_espelho_danos: {
        Row: {
          atualizado_em: string
          chamado_id: string | null
          criado_em: string
          data: string | null
          descricao_danos: string | null
          garagem: string | null
          horario: string | null
          id: string
          linha: string | null
          nome_motorista: string | null
          nome_vistoriador: string | null
          numero_carro: string | null
          numero_os: string | null
          ocorrencia: string | null
          registro_motorista: string | null
          registro_vistoriador: string | null
        }
        Insert: {
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_vistoriador?: string | null
        }
        Update: {
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_vistoriador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'formularios_espelho_danos_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      formularios_ido: {
        Row: {
          assinatura_base64: string | null
          atualizado_em: string
          chamado_id: string
          colaborador_nome: string | null
          colaborador_registro: string | null
          criado_em: string
          id: string
          protocolo_ido: string | null
          testemunha_1_endereco: string | null
          testemunha_1_nome: string | null
          testemunha_1_sg: string | null
          testemunha_1_telefone: string | null
          testemunha_2_endereco: string | null
          testemunha_2_nome: string | null
          testemunha_2_sg: string | null
          testemunha_2_telefone: string | null
          testemunha_3_endereco: string | null
          testemunha_3_nome: string | null
          testemunha_3_sg: string | null
          testemunha_3_telefone: string | null
        }
        Insert: {
          assinatura_base64?: string | null
          atualizado_em?: string
          chamado_id: string
          colaborador_nome?: string | null
          colaborador_registro?: string | null
          criado_em?: string
          id?: string
          protocolo_ido?: string | null
          testemunha_1_endereco?: string | null
          testemunha_1_nome?: string | null
          testemunha_1_sg?: string | null
          testemunha_1_telefone?: string | null
          testemunha_2_endereco?: string | null
          testemunha_2_nome?: string | null
          testemunha_2_sg?: string | null
          testemunha_2_telefone?: string | null
          testemunha_3_endereco?: string | null
          testemunha_3_nome?: string | null
          testemunha_3_sg?: string | null
          testemunha_3_telefone?: string | null
        }
        Update: {
          assinatura_base64?: string | null
          atualizado_em?: string
          chamado_id?: string
          colaborador_nome?: string | null
          colaborador_registro?: string | null
          criado_em?: string
          id?: string
          protocolo_ido?: string | null
          testemunha_1_endereco?: string | null
          testemunha_1_nome?: string | null
          testemunha_1_sg?: string | null
          testemunha_1_telefone?: string | null
          testemunha_2_endereco?: string | null
          testemunha_2_nome?: string | null
          testemunha_2_sg?: string | null
          testemunha_2_telefone?: string | null
          testemunha_3_endereco?: string | null
          testemunha_3_nome?: string | null
          testemunha_3_sg?: string | null
          testemunha_3_telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'formularios_ido_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      frota_veiculos: {
        Row: {
          atualizado_em: string
          criado_em: string
          garagem: string
          id: string
          placa: string | null
          prefixo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          garagem: string
          id?: string
          placa?: string | null
          prefixo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          garagem?: string
          id?: string
          placa?: string | null
          prefixo?: string
        }
        Relationships: []
      }
      historico_chamado: {
        Row: {
          acao: string
          chamado_id: string
          criado_em: string
          detalhes: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          acao: string
          chamado_id: string
          criado_em?: string
          detalhes?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          acao?: string
          chamado_id?: string
          criado_em?: string
          detalhes?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'historico_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      mensagens_internas_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          mensagem: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          mensagem: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          mensagem?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mensagens_internas_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          titulo: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      parcelas_vales: {
        Row: {
          aprovado_diretoria: boolean | null
          aprovado_em: string | null
          chamado_id: string
          criado_em: string
          data_referencia: string
          id: string
          is_data_referencia_fixed: boolean | null
          status: string
          vale_unificado: boolean
          valor_parcela: number
        }
        Insert: {
          aprovado_diretoria?: boolean | null
          aprovado_em?: string | null
          chamado_id: string
          criado_em?: string
          data_referencia: string
          id?: string
          is_data_referencia_fixed?: boolean | null
          status?: string
          vale_unificado?: boolean
          valor_parcela: number
        }
        Update: {
          aprovado_diretoria?: boolean | null
          aprovado_em?: string | null
          chamado_id?: string
          criado_em?: string
          data_referencia?: string
          id?: string
          is_data_referencia_fixed?: boolean | null
          status?: string
          vale_unificado?: boolean
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: 'parcelas_vales_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      participantes_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'participantes_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      perfil_usuario: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          departamento: string | null
          email: string
          endereco: string | null
          foto_url: string | null
          garagem: string | null
          id: string
          nome_completo: string
          registro: string | null
          tipo_usuario: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          departamento?: string | null
          email: string
          endereco?: string | null
          foto_url?: string | null
          garagem?: string | null
          id: string
          nome_completo: string
          registro?: string | null
          tipo_usuario?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          departamento?: string | null
          email?: string
          endereco?: string | null
          foto_url?: string | null
          garagem?: string | null
          id?: string
          nome_completo?: string
          registro?: string | null
          tipo_usuario?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      rascunhos_chamado: {
        Row: {
          atualizado_em: string
          criado_em: string
          dados: Json
          id: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          id?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      registros: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          registro: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          registro: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          registro?: string
        }
        Relationships: []
      }
      respostas_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          mensagem: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          mensagem: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          mensagem?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'respostas_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      solicitacoes_parcelamento: {
        Row: {
          atualizado_em: string
          chamado_id: string
          criado_em: string
          desconto_aplicado: boolean | null
          id: string
          nome: string | null
          quantidade_parcelas: number
          registro: string | null
          status: string
          usuario_id: string
          valor_orcamento: number
        }
        Insert: {
          atualizado_em?: string
          chamado_id: string
          criado_em?: string
          desconto_aplicado?: boolean | null
          id?: string
          nome?: string | null
          quantidade_parcelas: number
          registro?: string | null
          status?: string
          usuario_id: string
          valor_orcamento: number
        }
        Update: {
          atualizado_em?: string
          chamado_id?: string
          criado_em?: string
          desconto_aplicado?: boolean | null
          id?: string
          nome?: string | null
          quantidade_parcelas?: number
          registro?: string | null
          status?: string
          usuario_id?: string
          valor_orcamento?: number
        }
        Relationships: [
          {
            foreignKeyName: 'solicitacoes_parcelamento_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anexar_foto_manutencao: {
        Args: {
          p_documento_id: string
          p_foto_url: string
          p_usuario_id?: string
        }
        Returns: undefined
      }
      buscar_garagem_por_placa: { Args: { p_placa: string }; Returns: string }
      buscar_veiculo_por_placa: { Args: { p_placa: string }; Returns: Json }
      calcular_parcelas_vale: {
        Args: {
          p_data_base?: string
          p_quantidade_parcelas: number
          p_valor_base: number
        }
        Returns: {
          data_referencia: string
          numero_parcela: number
          valor_parcela: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_coc: { Args: never; Returns: boolean }
      is_dp: { Args: never; Returns: boolean }
      is_juridico: { Args: never; Returns: boolean }
      is_responsavel: { Args: never; Returns: boolean }
      is_restricted_user: { Args: { p_user_id: string }; Returns: boolean }
      is_secretaria_tecnica: { Args: never; Returns: boolean }
      is_sinistro: { Args: never; Returns: boolean }
      is_sos: { Args: never; Returns: boolean }
      is_vistoriador: { Args: never; Returns: boolean }
      liberar_veiculo_manutencao: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      marcar_chamados_pendentes_por_inatividade: {
        Args: never
        Returns: undefined
      }
      ocultar_documento_manutencao: {
        Args: { p_id: string }
        Returns: undefined
      }
      registrar_anexo_interno_publico: {
        Args: {
          p_arquivo_url: string
          p_chamado_id: string
          p_detalhes_historico?: string
          p_nome_arquivo: string
          p_tamanho_bytes: number
          p_tipo_arquivo?: string
        }
        Returns: undefined
      }
      registrar_boletim_ido: {
        Args: {
          p_arquivo_url: string
          p_chamado_id: string
          p_nome_arquivo: string
          p_tamanho_bytes: number
        }
        Returns: undefined
      }
      registrar_espelho_danos: {
        Args: {
          p_arquivo_url: string
          p_chamado_id: string
          p_nome_arquivo: string
          p_tamanho_bytes: number
        }
        Returns: undefined
      }
      remover_foto_manutencao: {
        Args: {
          p_documento_id: string
          p_foto_url: string
          p_usuario_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
