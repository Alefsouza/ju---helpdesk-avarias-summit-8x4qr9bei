import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useRegistroNome() {
  const [loadingRegistros, setLoadingRegistros] = useState<Record<string, boolean>>({})

  const buscarNome = useCallback(
    async (registro: string, tipo: 'vistoriador' | 'motorista'): Promise<string | null> => {
      const trimmed = registro.trim()
      if (!trimmed || trimmed.length < 2) return null

      setLoadingRegistros((prev) => ({ ...prev, [tipo]: true }))
      try {
        const { data, error } = await supabase
          .from('registros')
          .select('nome')
          .eq('registro', trimmed)
          .maybeSingle()

        if (error || !data) return null
        return data.nome
      } catch {
        return null
      } finally {
        setLoadingRegistros((prev) => ({ ...prev, [tipo]: false }))
      }
    },
    [],
  )

  return { loadingRegistros, buscarNome }
}
