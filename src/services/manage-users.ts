import { supabase } from '@/lib/supabase/client'

export const updateAdminUser = async (
  userId: string,
  data: {
    nome_completo?: string
    tipo_usuario?: string
    ativo?: boolean
    whatsapp?: string
    endereco?: string
    departamento?: string
    garagem?: string | null
    registro?: string | null
  },
) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'update', userId, ...data },
  })
}

export const createAdminUser = async (data: {
  email: string
  nome_completo: string
  tipo_usuario: string
  ativo?: boolean
  whatsapp?: string
  endereco?: string
  departamento?: string
  garagem?: string | null
  registro?: string | null
}) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'create', ...data },
  })
}

export const deleteAdminUser = async (userId: string) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'delete', userId },
  })
}

export const changePasswordUser = async (userId: string, newPassword: string, email: string) => {
  return await supabase.functions.invoke('manage-users', {
    body: { action: 'change_password', userId, newPassword, email },
  })
}
