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
import { Input } from '@/components/ui/input'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, FileText, Loader2, AlertCircle, FileSignature } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

export default function ValesAprovacao() {
  const { user, profile } = useAuth()
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
      .select(`
        id, titulo, descricao, status_aprovacao, status_aprovacao_claudinei, aprovacoes_diretoria, criado_em,
        registro_motorista, nome_motorista, data_ocorrencia,
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, valor_orcamento, criado_em ),
        parcelas_vales ( id, valor_parcela, data_referencia ),
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( id, valor_orcamento, quantidade_parcelas, status, desconto_aplicado )
      `)
      .eq('status', 'finalizado')
      .or('status_aprovacao_alex.eq.aprovado,status_aprovacao_claudinei.eq.aprovado')
      .or('status_aprovacao.is.null,status_aprovacao.eq.aprovacao_parcial')
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const filtered =
      data?.filter((c: any) => {
        const anexos = c.anexos_chamado_interno || []
        const claudineiKeywords = [
          'vale',
          'quitação',
          'quitacao',
          'recibo',
          'nf',
          'nota fiscal',
          'boleto',
          'escaneado',
          'autorização',
          'autorizacao',
          'desconto',
        ]
        const hasApprovalTrigger = anexos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return claudineiKeywords.some((kw) => nome.includes(kw))
        })

        return hasApprovalTrigger
      }) || []

    setChamados(filtered)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.departamento === 'Diretoria') {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [profile])

  const handleApproveClick = (chamado: any) => {
    setSelectedChamado(chamado)
    setIsApproveOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedChamado) return
    setIsSubmitting(true)

    let hasDiscount = false
    if (
      selectedChamado.solicitacoes_parcelamento &&
      selectedChamado.solicitacoes_parcelamento.length > 0
    ) {
      const val = selectedChamado.solicitacoes_parcelamento[0].desconto_aplicado
      hasDiscount = val === true || val === 'true' || val === '1' || val === 1
    }

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []

    const newAprovacao = {
      usuario_id: user!.id,
      nome_completo: profile?.nome_completo,
      acao: 'aprovado',
      data_hora: new Date().toISOString(),
      desconto_aplicado: hasDiscount,
    }

    const nextAprovacoes = [...currentAprovacoes, newAprovacao]
    const isFinished = nextAprovacoes.length >= 2
    const isFullyApproved =
      isFinished && nextAprovacoes.every((a: any) => a.acao === 'aprovado' || !a.acao)
    const isRejected = isFinished && !isFullyApproved
    const nextStatusAprovacao = isFinished
      ? isFullyApproved
        ? 'aprovado'
        : 'reprovado'
      : 'aprovacao_parcial'

    try {
      const updatePayload: any = {
        status_aprovacao: nextStatusAprovacao,
        aprovacoes_diretoria: nextAprovacoes,
        atualizado_em: new Date().toISOString(),
      }

      if (isFinished && isRejected) {
        updatePayload.status = 'em_andamento'
        updatePayload.status_interno = 'Reprovado Diretoria'
      }

      const { error } = await supabase
        .from('chamados')
        .update(updatePayload)
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Aprovação Diretor',
        detalhes: isFinished
          ? isFullyApproved
            ? 'Vale aprovado pela diretoria com os valores previamente assinados (Aprovação Final)'
            : 'Vale reprovado após avaliação final'
          : 'Vale aprovado por um diretor com os valores previamente assinados (Aguardando segunda avaliação)',
      })

      if (isFinished && isRejected) {
        const motivos = nextAprovacoes
          .filter((a: any) => a.acao === 'recusado' && a.motivo)
          .map((a: any) => a.motivo)
          .join(' | ')
        await supabase.from('respostas_chamado').insert({
          chamado_id: selectedChamado.id,
          usuario_id: user!.id,
          mensagem: `Vale reprovado pela diretoria.${motivos ? ' Motivos: ' + motivos : ''}`,
        })
      }

      if (isFinished && isFullyApproved) {
        const ednaKeywords = ['vale', 'escaneado', 'desconto', 'autorização', 'autorizacao']
        const ednaAnexos = selectedChamado.anexos_chamado_interno || []
        const hasEdnaKeywords = ednaAnexos.some((a: any) => {
          const nome = (a.nome_arquivo || '').toLowerCase()
          return ednaKeywords.some((kw) => nome.includes(kw))
        })

        if (!hasEdnaKeywords) {
          await supabase.from('historico_chamado').insert({
            chamado_id: selectedChamado.id,
            usuario_id: user!.id,
            acao: 'Aprovação Diretor',
            detalhes: 'Aprovação final da diretoria concluída.',
          })
        } else {
          let totalValue = 0
          let parcelsCount = 1

          if (
            selectedChamado.solicitacoes_parcelamento &&
            selectedChamado.solicitacoes_parcelamento.length > 0
          ) {
            const sol = selectedChamado.solicitacoes_parcelamento[0]
            totalValue = Number(sol.valor_orcamento) || 0
            parcelsCount = Number(sol.quantidade_parcelas) || 1
          } else {
            const docOrcamento = selectedChamado.documentos?.find(
              (d: any) =>
                (d.tipo_documento === 'orcamento' || d.orcamento_url) && d.valor_orcamento,
            )
            if (docOrcamento) {
              totalValue = Number(docOrcamento.valor_orcamento) || 0
            }
          }

          if (totalValue > 0) {
            const { data: existingParcelas } = await supabase
              .from('parcelas_vales')
              .select('id')
              .eq('chamado_id', selectedChamado.id)

            if (!existingParcelas || existingParcelas.length === 0) {
              // Apply the same discount logic used by the gerar-pdf edge function
              // When desconto_aplicado is true, a 10% discount is applied to the original value
              const finalValue = hasDiscount ? Math.trunc(totalValue * 0.9 * 100) / 100 : totalValue

              const today = new Date()
              const baseDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .split('T')[0]

              const { data: calculadas, error: calcError } = await supabase.rpc(
                'calcular_parcelas_vale',
                {
                  p_valor_base: finalValue,
                  p_quantidade_parcelas: parcelsCount,
                  p_data_base: baseDateStr,
                },
              )

              if (calcError) {
                console.error('Erro ao calcular parcelas:', calcError)
              } else if (calculadas && calculadas.length > 0) {
                const parcelas = calculadas.map((p) => ({
                  chamado_id: selectedChamado.id,
                  valor_parcela: p.valor_parcela,
                  data_referencia: p.data_referencia,
                  aprovado_diretoria: true,
                  aprovado_em: new Date().toISOString(),
                }))

                const { error: parcelasError } = await supabase
                  .from('parcelas_vales')
                  .insert(parcelas)
                if (parcelasError) console.error('Error creating parcelas:', parcelasError)

                if (
                  selectedChamado.solicitacoes_parcelamento &&
                  selectedChamado.solicitacoes_parcelamento.length > 0
                ) {
                  await supabase
                    .from('solicitacoes_parcelamento')
                    .update({ status: 'aprovado', atualizado_em: new Date().toISOString() })
                    .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
                }
              }
            }
          }
        }
      }

      if (isFinished && isFullyApproved) {
        const docsAprovados = selectedChamado.documentos || []
        const hasReciboDoc = docsAprovados.some((d: any) => d.tipo_documento === 'Recibo')
        const hasNfBoletoDoc = docsAprovados.some(
          (d: any) =>
            d.tipo_documento === 'NF' ||
            d.tipo_documento === 'Nota Fiscal' ||
            d.tipo_documento === 'Boleto',
        )

        let routingStatus: string | null = null
        if (hasReciboDoc && hasNfBoletoDoc) {
          routingStatus = 'aguardando_contabil_e_financeiro'
        } else if (hasNfBoletoDoc) {
          routingStatus = 'aguardando_contabil'
        } else if (hasReciboDoc) {
          routingStatus = 'aguardando_financeiro'
        }

        if (routingStatus) {
          await supabase
            .from('chamados')
            .update({
              status_interno: routingStatus,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', selectedChamado.id)

          await supabase.from('historico_chamado').insert({
            chamado_id: selectedChamado.id,
            usuario_id: user!.id,
            acao: 'Roteamento Documentos',
            detalhes: `Chamado roteado para ${routingStatus.replace(/_/g, ' ')} baseado nos tipos de documentos.`,
          })
        }
      }

      if (isFinished && isRejected) {
        if (
          selectedChamado.solicitacoes_parcelamento &&
          selectedChamado.solicitacoes_parcelamento.length > 0
        ) {
          await supabase
            .from('solicitacoes_parcelamento')
            .update({ status: 'recusado', atualizado_em: new Date().toISOString() })
            .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
        }
      }

      toast.success(
        isFinished
          ? isFullyApproved
            ? 'Aprovação final da diretoria concluída!'
            : 'Vale reprovado finalizado!'
          : 'Aprovação registrada! Aguardando segundo diretor.',
      )
      setIsApproveOpen(false)
      fetchChamados()
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao aprovar vale: ' + error.message)
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
      toast.error('Informe o motivo da recusa')
      return
    }

    setIsSubmitting(true)

    const currentAprovacoes = Array.isArray(selectedChamado.aprovacoes_diretoria)
      ? selectedChamado.aprovacoes_diretoria
      : []

    const newAprovacao = {
      usuario_id: user!.id,
      nome_completo: profile?.nome_completo,
      acao: 'recusado',
      data_hora: new Date().toISOString(),
      motivo: rejectReason,
    }

    const nextAprovacoes = [...currentAprovacoes, newAprovacao]
    const isFinished = nextAprovacoes.length >= 2
    const nextStatusAprovacao = isFinished ? 'reprovado' : 'aprovacao_parcial'

    try {
      const updatePayload: any = {
        status_aprovacao: nextStatusAprovacao,
        aprovacoes_diretoria: nextAprovacoes,
        atualizado_em: new Date().toISOString(),
      }

      if (isFinished) {
        updatePayload.status = 'em_andamento'
        updatePayload.status_interno = 'Reprovado Diretoria'
      }

      const { error } = await supabase
        .from('chamados')
        .update(updatePayload)
        .eq('id', selectedChamado.id)

      if (error) throw error

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedChamado.id,
        usuario_id: user!.id,
        acao: 'Reprovação Diretor',
        detalhes: isFinished
          ? `Vale reprovado após avaliação final. Motivo: ${rejectReason}`
          : `Recusado por um diretor: ${rejectReason} (Aguardando segunda avaliação)`,
      })

      if (isFinished) {
        const motivos = nextAprovacoes
          .filter((a: any) => a.acao === 'recusado' && a.motivo)
          .map((a: any) => a.motivo)
          .join(' | ')
        await supabase.from('respostas_chamado').insert({
          chamado_id: selectedChamado.id,
          usuario_id: user!.id,
          mensagem: `Vale reprovado pela diretoria. Motivos: ${motivos}`,
        })

        if (
          selectedChamado.solicitacoes_parcelamento &&
          selectedChamado.solicitacoes_parcelamento.length > 0
        ) {
          await supabase
            .from('solicitacoes_parcelamento')
            .update({ status: 'recusado', atualizado_em: new Date().toISOString() })
            .eq('id', selectedChamado.solicitacoes_parcelamento[0].id)
        }
      }

      toast.success(
        isFinished ? 'Vale recusado com sucesso' : 'Recusa registrada! Aguardando segundo diretor.',
      )
      setIsRejectOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao recusar vale')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDriverData = (chamado: any) => {
    const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
      ? chamado.formularios_espelho_danos[0]
      : chamado.formularios_espelho_danos

    return {
      registro: espelhoData?.registro_motorista || chamado.registro_motorista || '-',
      nome: espelhoData?.nome_motorista || chamado.nome_motorista || '-',
    }
  }

  const getOrcamentoUrl = (chamado: any) => {
    if (!chamado.documentos || chamado.documentos.length === 0) return null
    const orcamentos = chamado.documentos.filter(
      (d: any) => d.tipo_documento === 'orcamento' || d.orcamento_url,
    )
    if (orcamentos.length > 0) {
      return orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
    }
    return null
  }

  const getAutorizacaoUrl = (chamado: any) => {
    if (!chamado.anexos_chamado_interno || chamado.anexos_chamado_interno.length === 0) return null
    const autorizacoes = chamado.anexos_chamado_interno.filter((a: any) => {
      const nome = (a.nome_arquivo || '').toLowerCase()
      return (
        nome.includes('autorização') ||
        nome.includes('autorizacao') ||
        nome.includes('desconto') ||
        nome.includes('escaneado')
      )
    })
    if (autorizacoes.length > 0) {
      return autorizacoes[0].arquivo_url
    }
    return null
  }

  if (profile?.departamento !== 'Diretoria') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para a Diretoria.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vales para Aprovação</h1>
          <p className="text-muted-foreground">Gerencie as aprovações de desconto em folha.</p>
        </div>
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
                Nenhum vale pendente de aprovação
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
                    <TableHead>Aprovações</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => {
                    const driver = getDriverData(chamado)
                    const orcamentoUrl = getOrcamentoUrl(chamado)
                    const autorizacaoUrl = getAutorizacaoUrl(chamado)
                    const aprovacoes = Array.isArray(chamado.aprovacoes_diretoria)
                      ? chamado.aprovacoes_diretoria
                      : []
                    return (
                      <TableRow key={chamado.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              to={`/dashboard/chamados/${chamado.id}`}
                              className="font-medium text-primary hover:underline transition-colors"
                            >
                              {chamado.titulo || '-'}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>{driver.registro}</TableCell>
                        <TableCell>{driver.nome}</TableCell>
                        <TableCell>
                          {chamado.data_ocorrencia
                            ? format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${aprovacoes.filter((a: any) => a.acao === 'aprovado' || !a.acao).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            />
                            <span>
                              {
                                aprovacoes.filter((a: any) => a.acao === 'aprovado' || !a.acao)
                                  .length
                              }
                              /2 Aprov.
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {orcamentoUrl ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={orcamentoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <FileText className="h-5 w-5" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Orçamento</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-muted-foreground/30 cursor-not-allowed">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Orçamento não anexado</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {autorizacaoUrl ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={autorizacaoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <FileSignature className="h-5 w-5" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Autorização de Desconto</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-muted-foreground/30 cursor-not-allowed">
                                    <FileSignature className="h-5 w-5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Autorização não anexada</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const userAprovacao = aprovacoes.find(
                              (a: any) => a.usuario_id === user!.id,
                            )
                            if (userAprovacao) {
                              const isAprovado =
                                userAprovacao.acao === 'aprovado' || !userAprovacao.acao
                              return (
                                <div className="flex justify-end items-center h-full min-h-[40px]">
                                  <span
                                    className={`text-sm font-medium px-2 py-1 rounded-md ${isAprovado ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                                  >
                                    {isAprovado ? 'Aprovado por você' : 'Recusado por você'}
                                  </span>
                                </div>
                              )
                            }

                            return (
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
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
            <DialogDescription>Deseja confirmar a aprovação deste vale?</DialogDescription>
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
            <DialogTitle>Recusar Vale</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O chamado retornará para análise.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Motivo</Label>
              <Input
                id="rejectReason"
                placeholder="Ex: Valor incorreto..."
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
