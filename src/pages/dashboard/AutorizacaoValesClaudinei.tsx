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
import { Check, X, Loader2, AlertCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export default function AutorizacaoValesClaudinei() {
  const { user } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isClaudinei = user?.email === 'claudinei.mariano@viasudeste.com'

  const RELEVANT_KEYWORDS = [
    'orcamento',
    'orçamento',
    'vale',
    'recibo',
    'nf',
    'nota fiscal',
    'escaneado',
    'autorizacao',
    'autorização',
  ]

  const buildAnexosOrFilter = () =>
    RELEVANT_KEYWORDS.map((kw) => `nome_arquivo.ilike.%${kw}%`).join(',')

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(
        `id, titulo, descricao, carro, criado_em, atualizado_em, status_aprovacao_claudinei,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em )`,
      )
      .eq('status_aprovacao_claudinei', 'pendente')
      .or(buildAnexosOrFilter(), { referencedTable: 'anexos_chamado_interno' })
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
    if (isClaudinei) {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [isClaudinei])

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
          status_aprovacao_claudinei: 'aprovado',
          status_aprovacao: 'pendente',
          aprovacoes_diretoria: [],
          status: 'finalizado',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'respondido',
        detalhes: 'Chamado aprovado por Claudinei e encaminhado para aprovação da diretoria.',
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
      toast.error('Informe a observação da recusa')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('chamados')
        .update({
          status_aprovacao_claudinei: 'recusado',
          status_interno: 'recusado_claudinei',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'reaberto',
        detalhes: `Chamado recusado por Claudinei. Motivo: ${rejectReason.trim()}`,
      })

      toast.success('Chamado recusado e retornado para o Jurídico!')
      setIsRejectOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao recusar chamado: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isClaudinei) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-1">
          Esta página é exclusiva para Claudinei Mariano.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Autorização de Vales</h1>
        <p className="text-muted-foreground">
          Aprove ou recuse chamados do Jurídico antes de enviá-los para a diretoria.
        </p>
      </div>

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
                    <TableHead>Carro</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Anexos Internos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => (
                    <TableRow key={chamado.id}>
                      <TableCell>
                        <Link
                          to={`/dashboard/chamados/${chamado.id}`}
                          className="font-medium text-primary hover:underline transition-colors"
                        >
                          {chamado.titulo || chamado.id}
                        </Link>
                      </TableCell>
                      <TableCell>{chamado.carro || '-'}</TableCell>
                      <TableCell className="max-w-xs">
                        <p
                          className="text-sm text-muted-foreground truncate"
                          title={chamado.descricao}
                        >
                          {chamado.descricao || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(chamado.anexos_chamado_interno || []).map((anexo: any) => (
                            <a
                              key={anexo.id}
                              href={anexo.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{anexo.nome_arquivo}</span>
                            </a>
                          ))}
                          {(!chamado.anexos_chamado_interno ||
                            chamado.anexos_chamado_interno.length === 0) && (
                            <span className="text-xs text-muted-foreground">Nenhum anexo</span>
                          )}
                        </div>
                      </TableCell>
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
                              <p>Recusar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
            <DialogTitle>Recusar Chamado</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O chamado será retornado para o Jurídico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReasonClaudinei">Observação *</Label>
              <Textarea
                id="rejectReasonClaudinei"
                placeholder="Descreva o motivo da recusa..."
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
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
