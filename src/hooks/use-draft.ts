import { useEffect, useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { supabase } from '@/lib/supabase/client'

const isValueEmpty = (v: any): boolean => {
  if (v === '' || v === null || v === undefined) return true
  if (v instanceof Date) return false
  if (v instanceof File || v instanceof Blob) return false
  if (Array.isArray(v)) return v.length === 0 || v.every(isValueEmpty)
  if (typeof v === 'object') return Object.values(v).every(isValueEmpty)
  return false
}

export function getSyncDraft(storageKey: string) {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to parse draft from localStorage', e)
  }
  return null
}

export function useDraft<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
  userId?: string,
) {
  const [draftRestored, setDraftRestored] = useState(false)
  const isRestoring = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadDraft = async () => {
      let parsed = null

      if (userId) {
        try {
          const { data } = await supabase
            .from('rascunhos_chamado')
            .select('dados')
            .eq('usuario_id', userId)
            .single()

          if (data?.dados) {
            parsed = data.dados
          }
        } catch (e) {
          console.error('Failed to load draft from Supabase', e)
        }
      }

      if (!parsed) {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try {
            parsed = JSON.parse(saved)
          } catch (e) {
            console.error('Failed to parse draft from localStorage', e)
          }
        }
      }

      if (parsed) {
        delete parsed.fotos_dano
        delete parsed.assinatura_base64

        const isCompletelyEmpty = Object.values(parsed).every(isValueEmpty)

        if (!isCompletelyEmpty) {
          const currentValues = form.getValues()
          const merged = { ...currentValues, ...parsed }

          form.reset(merged)
          setDraftRestored(true)
        }
      }

      setTimeout(() => {
        isRestoring.current = false
      }, 500)
    }

    loadDraft()
  }, [form, storageKey, userId])

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isRestoring.current) return

      const toSave = { ...value }
      delete toSave.fotos_dano
      delete toSave.assinatura_base64

      const isCompletelyEmpty = Object.values(toSave).every(isValueEmpty)

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(async () => {
        if (!isCompletelyEmpty) {
          localStorage.setItem(storageKey, JSON.stringify(toSave))

          if (userId) {
            try {
              await supabase.from('rascunhos_chamado').upsert(
                {
                  usuario_id: userId,
                  dados: toSave as any,
                  atualizado_em: new Date().toISOString(),
                },
                { onConflict: 'usuario_id' },
              )
            } catch (e) {
              console.error('Failed to save draft to Supabase', e)
            }
          }
        } else {
          localStorage.removeItem(storageKey)
          if (userId) {
            try {
              await supabase.from('rascunhos_chamado').delete().eq('usuario_id', userId)
            } catch (e) {
              console.error('Failed to delete draft from Supabase', e)
            }
          }
        }
      }, 1000)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [form, storageKey, userId])

  const clearDraft = async () => {
    localStorage.removeItem(storageKey)
    setDraftRestored(false)
    if (userId) {
      try {
        await supabase.from('rascunhos_chamado').delete().eq('usuario_id', userId)
      } catch (e) {
        console.error('Failed to clear draft from Supabase', e)
      }
    }
  }

  return { draftRestored, clearDraft, setDraftRestored }
}
