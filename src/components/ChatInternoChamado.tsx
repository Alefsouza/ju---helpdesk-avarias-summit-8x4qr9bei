import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type MensagemInterna = {
  id: string
  chamado_id: string
  usuario_id: string
  mensagem: string
  criado_em: string
  usuario?: {
    nome_completo: string
    email: string
  } | null
}

type PerfilMap = Record<string, { nome_completo: string; email: string }>

export function ChatInternoChamado({ chamadoId }: { chamadoId: string }) {
  const { user } = useAuth()
  const [mensagens, setMensagens] = useState<MensagemInterna[]>([])
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [perfilMap, setPerfilMap] = useState<PerfilMap>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMensagens = useCallback(async () => {
    const { data, error } = await supabase
      .from('mensagens_internas_chamado')
      .select('*')
      .eq('chamado_id', chamadoId)
      .order('criado_em', { ascending: true })

    if (error) {
      console.error('Erro ao carregar mensagens internas:', error)
      setLoading(false)
      return
    }

    const userIds = Array.from(new Set((data || []).map((m: MensagemInterna) => m.usuario_id)))
    let newPerfilMap: PerfilMap = {}
    if (userIds.length > 0) {
      const { data: perfis } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo, email')
        .in('id', userIds)
      perfis?.forEach((p) => {
        newPerfilMap[p.id] = { nome_completo: p.nome_completo, email: p.email }
      })
    }

    const mapped: MensagemInterna[] = (data || []).map((m: MensagemInterna) => ({
      ...m,
      usuario: newPerfilMap[m.usuario_id] || null,
    }))

    setPerfilMap(newPerfilMap)
    setMensagens(mapped)
    setLoading(false)
  }, [chamadoId])

  useEffect(() => {
    fetchMensagens()
    const channel = supabase
      .channel(`mensagens_internas_${chamadoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_internas_chamado',
          filter: `chamado_id=eq.${chamadoId}`,
        },
        async (payload) => {
          const nova = payload.new as MensagemInterna
          const { data: perfil } = await supabase
            .from('perfil_usuario')
            .select('nome_completo, email')
            .eq('id', nova.usuario_id)
            .maybeSingle()

          setPerfilMap((prev) => ({
            ...prev,
            [nova.usuario_id]: {
              nome_completo: perfil?.nome_completo || 'Usuário',
              email: perfil?.email || '',
            },
          }))

          setMensagens((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev
            return [
              ...prev,
              {
                ...nova,
                usuario: perfil
                  ? { nome_completo: perfil.nome_completo, email: perfil.email }
                  : null,
              },
            ]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensagens_internas_chamado',
          filter: `chamado_id=eq.${chamadoId}`,
        },
        (payload) => {
          setMensagens((prev) => prev.filter((m) => m.id !== payload.old.id))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chamadoId, fetchMensagens])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const handleEnviar = async () => {
    if (!mensagem.trim() || !user?.id) return
    setSubmitting(true)
    const { error } = await supabase.from('mensagens_internas_chamado').insert({
      chamado_id: chamadoId,
      usuario_id: user.id,
      mensagem: mensagem.trim(),
    })

    if (error) {
      toast.error('Erro ao enviar mensagem interna: ' + error.message)
    } else {
      setMensagem('')
    }
    setSubmitting(false)
  }

  const getAuthorName = (m: MensagemInterna) => {
    if (m.usuario?.nome_completo) return m.usuario.nome_completo
    if (perfilMap[m.usuario_id]?.nome_completo) return perfilMap[m.usuario_id].nome_completo
    return 'Usuário'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-amber-600" />
          Conversa Interna
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-200 px-1.5 py-0 uppercase text-[9px] font-bold tracking-wider"
          >
            Restrito
          </Badge>
        </h3>
      </div>

      <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-amber-700" />
          <span className="text-[11px] font-medium text-amber-800">
            Apenas Admin, Sinistro e Jurídico podem visualizar esta conversa.
          </span>
        </div>

        <div className="flex flex-col gap-2 p-3 max-h-[400px] overflow-y-auto bg-amber-50/30">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-amber-700/70">
                Nenhuma mensagem interna ainda. Inicie a conversa acima.
              </p>
            </div>
          ) : (
            mensagens.map((m, index) => {
              const isCurrentUser = m.usuario_id === user?.id
              const authorName = getAuthorName(m)
              return (
                <div
                  key={`${m.id}-${index}`}
                  className={cn('flex w-full', isCurrentUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] sm:max-w-[80%] rounded-xl px-3 py-2 shadow-sm border',
                      isCurrentUser
                        ? 'bg-amber-200 text-slate-900 rounded-tr-sm border-amber-300'
                        : 'bg-amber-100 text-slate-800 rounded-tl-sm border-amber-200',
                    )}
                  >
                    <div className="font-bold text-[11px] mb-0.5 text-amber-900">
                      {authorName}
                      {isCurrentUser && (
                        <span className="font-normal text-amber-700 ml-1">(você)</span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-xs sm:text-sm leading-snug">
                      {m.mensagem}
                    </div>
                    <div
                      className={cn(
                        'text-[9px] sm:text-[10px] mt-1 text-right opacity-70',
                        isCurrentUser ? 'text-amber-800' : 'text-slate-500',
                      )}
                    >
                      {format(new Date(m.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className={cn(
            'flex flex-col gap-2 rounded-md border-t border-amber-200 p-3 transition-colors bg-white',
          )}
        >
          <Textarea
            placeholder="Digite uma mensagem interna (visível apenas para a equipe restrita)..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            className="min-h-[70px] resize-y bg-white text-xs sm:text-sm border-amber-200 focus-visible:ring-amber-400"
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleEnviar()
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleEnviar}
              disabled={submitting || !mensagem.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5" />
              )}
              {submitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
