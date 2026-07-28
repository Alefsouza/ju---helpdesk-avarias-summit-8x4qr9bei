import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { deleteAdminUser, updateAdminUser } from '@/services/manage-users'

export function useGestaoEquipe() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('perfil_usuario')
      .select('*')
      .neq('tipo_usuario', 'basico')
      .order('criado_em', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const toggleActive = async (u: any) => {
    const newStatus = !u.ativo
    try {
      const { data, error } = await updateAdminUser(u.id, { ativo: newStatus })
      if (error || data?.error) throw error || new Error(data?.error)
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`)
      loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status')
    }
  }

  const handleDelete = async (u: any) => {
    if (
      !window.confirm(
        'Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.',
      )
    )
      return
    try {
      const { data, error } = await deleteAdminUser(u.id)
      if (error || data?.error) throw error || new Error(data?.error)
      toast.success('Usuário deletado com sucesso')
      loadUsers()
    } catch (err) {
      toast.error('Erro ao deletar usuário')
    }
  }

  return { users, loading, loadUsers, toggleActive, handleDelete }
}
