import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

export function ValesAprovacaoAlex() {
  const { user } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(
        `id, titulo, criado_em, atualizado_em, responsavel_id, usuario_id, status_aprovacao_alex, status_interno, status, registro_motorista, nome_motorista, data_ocorrencia, anexos_chamado_interno!inner ( id, nome_arquivo ), formularios_espelho_danos ( registro_motorista, nome_motorista, data )`,
      )
      .eq('status', 'finalizado')
      .eq('status_aprovacao_alex', 'pendente')
      .or(
        'nome_arquivo.ilike.%autorização%,nome_arquivo.ilike.%autorizacao%,nome_arquivo.ilike.%escaneado%',
        { referencedTable: 'anexos_chamado_interno' },
      )
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    setChamados(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchChamados()
  }, [])

  const handleApproveClick = (chamado: any) => {
    setSelectedChamado(chamado)
    setIsApproveOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedChamado) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('chamados')
        .update({
          status_aprovacao_alex: 'aprovado',
          status_aprovacao: 'aprovacao_parcial',
          status_interno: null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'respondido',
        detalhes: 'Chamado aprovado por Alex e encaminhado para aprovação da diretoria.',
      })

      toast.success('Chamado aprovado e enviado para a diretoria!')
      setIsApproveOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao aprovar chamado: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectClick = (chamado: any) => {
    setSelectedChamado(chamado)
    setRejectReason('')
    setIsRejectOpen(true)
  }

  const handleRejectSubmit = async () => {
    if (!selectedChamado || !rejectReason.trim()) {
      toast.error('Informe a observação da rejeição')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: historico } = await supabase
        .from('historico_chamado')
        .select('usuario_id, acao, criado_em')
        .eq('chamado_id', selectedChamado.id)
        .order('criado_em', { ascending: false })

      const lastCollaborator = historico?.find(
        (h) => h.usuario_id !== user!.id && h.acao !== 'finalizado',
      )

      const restoreResponsavelId =
        lastCollaborator?.usuario_id || selectedChamado.responsavel_id || selectedChamado.usuario_id

      const { error } = await supabase
        .from('chamados')
        .update({
          status: 'em_andamento',
          status_aprovacao_alex: 'rejeitado',
          responsavel_id: restoreResponsavelId,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('mensagens_internas_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        mensagem: `[Chamado Desaprovado por Alex] ${rejectReason.trim()}`,
      })

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'reaberto',
        detalhes: `Chamado desaprovado por Alex. Motivo: ${rejectReason.trim()}`,
      })

      await supabase.from('notificacoes').insert({
        usuario_id: restoreResponsavelId,
        titulo: 'Chamado Reaberto',
        mensagem: `O chamado "${selectedChamado.titulo}" foi reaberto por Alex. Motivo: ${rejectReason.trim()}`,
        link: `/dashboard/chamados/${selectedChamado.id}`,
      })

      toast.success('Chamado rejeitado e reaberto com sucesso!')
      setIsRejectOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao rejeitar chamado: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDriverData = (chamado: any) => {
    const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
      ? chamado.formularios_espelho_danos[0]
      : chamado.formularios_espelho_danos

    if (!espelhoData) {
      return { registro: '-', nome: '-' }
    }

    return {
      registro: espelhoData.registro_motorista || '-',
      nome: espelhoData.nome_motorista || '-',
    }
  }

  const getOccurrenceDate = (chamado: any) => {
    if (chamado.data_ocorrencia) {
      return format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
    }

    const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
      ? chamado.formularios_espelho_danos[0]
      : chamado.formularios_espelho_danos

    if (espelhoData?.data) {
      return format(new Date(espelhoData.data + 'T12:00:00'), 'dd/MM/yyyy')
    }

    return '-'
  }

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chamados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Check className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum chamado pendente de aprovação
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chamado</TableHead>
                  <TableHead>Registro do Motorista</TableHead>
                  <TableHead>Nome do Motorista</TableHead>
                  <TableHead>Data da Ocorrência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chamados.map((chamado) => {
                  const driver = getDriverData(chamado)
                  return (
                    <TableRow key={chamado.id}>
                      <TableCell>
                        <Link
                          to={`/dashboard/chamados/${chamado.id}`}
                          className="font-medium text-primary hover:underline transition-colors"
                        >
                          {chamado.titulo || chamado.id}
                        </Link>
                      </TableCell>
                      <TableCell>{driver.registro}</TableCell>
                      <TableCell>{driver.nome}</TableCell>
                      <TableCell>{getOccurrenceDate(chamado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => handleApproveClick(chamado)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Aprovar</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleRejectClick(chamado)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Desaprovar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Deseja aprovar este chamado? Ele será encaminhado para a diretoria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApproveSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desaprovar Chamado</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O chamado será reaberto e o colaborador será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReasonAlex">Observação *</Label>
              <Textarea
                id="rejectReasonAlex"
                placeholder="Descreva o motivo da rejeição..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
