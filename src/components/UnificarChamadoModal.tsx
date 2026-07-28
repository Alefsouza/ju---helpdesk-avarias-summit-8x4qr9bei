import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Search, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function UnificarChamadoModal({
  isOpen,
  onClose,
  targetChamado,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  targetChamado: { id: string; titulo: string; pia?: string } | null
  onSuccess: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedId(null)
      setChamados([])
    }
  }, [isOpen])

  useEffect(() => {
    const fetchChamados = async () => {
      if (!isOpen || !targetChamado) return
      setLoading(true)

      let query = supabase
        .from('chamados')
        .select('id, titulo, status, pia, prioridade, criado_em')
        .neq('id', targetChamado.id)
        .in('status', ['aberto', 'em_atendimento'])
        .order('criado_em', { ascending: false })
        .limit(20)

      if (debouncedSearch) {
        const isUUID =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            debouncedSearch,
          )
        if (isUUID) {
          query = query.or(
            `titulo.ilike.%${debouncedSearch}%,pia.ilike.%${debouncedSearch}%,id.eq.${debouncedSearch}`,
          )
        } else {
          query = query.or(`titulo.ilike.%${debouncedSearch}%,pia.ilike.%${debouncedSearch}%`)
        }
      }

      const { data, error } = await query

      if (!error && data) {
        setChamados(data)
      }
      setLoading(false)
    }

    fetchChamados()
  }, [debouncedSearch, isOpen, targetChamado])

  const handleUnificar = async () => {
    if (!targetChamado || !selectedId) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('unificar-chamados', {
        body: {
          origem_id: selectedId,
          destino_id: targetChamado.id,
        },
      })

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao unificar chamados')
      }

      toast.success('Conteúdo do chamado secundário foi incorporado com sucesso!')
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao unificar chamados. Verifique as permissões.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTicket = chamados.find((c) => c.id === selectedId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Unificar Chamado</DialogTitle>
          <DialogDescription>
            Selecione o chamado de origem. Todas as mensagens, anexos e histórico do chamado
            selecionado serão movidos para o chamado atual, e o chamado selecionado será finalizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-3 rounded-lg border text-sm">
            <span className="font-semibold text-slate-700 block mb-1">
              Chamado Atual (Destino - O RA será mantido):
            </span>
            <div className="font-medium">{targetChamado?.titulo}</div>
            <div className="text-slate-500 text-xs mt-1 flex gap-3">
              <span>ID: {targetChamado?.id?.substring(0, 8)}</span>
              {targetChamado?.pia && <span>RA: {targetChamado.pia}</span>}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar chamado de origem por título, R.A. ou ID..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-md">
            <ScrollArea className="h-[250px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : chamados.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">
                  Nenhum chamado de origem encontrado.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {chamados.map((chamado) => (
                    <button
                      key={chamado.id}
                      onClick={() => setSelectedId(chamado.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-colors border',
                        selectedId === chamado.id
                          ? 'bg-primary/5 border-primary shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-slate-900 truncate">
                            {chamado.titulo}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            {chamado.pia && <span>R.A.: {chamado.pia}</span>}
                            <span>ID: {chamado.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {chamado.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedTicket && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-md flex gap-2">
              <LinkIcon className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Atenção:</strong> Os dados do chamado{' '}
                <strong>{selectedTicket.titulo}</strong> serão movidos para o chamado atual. O
                chamado selecionado será finalizado.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleUnificar}
            disabled={!selectedId || submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Unificando...' : 'Confirmar Unificação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
