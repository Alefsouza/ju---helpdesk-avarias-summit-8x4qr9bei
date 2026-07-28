import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Loader2,
  ArrowLeft,
  AlertCircle,
  FileText,
  FileSignature,
  Search,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentAction } from '@/hooks/use-document-action'
import { downloadExcelFile } from '@/lib/excel-export'

export default function ValesAprovadosDP() {
  const { profile, loading: authLoading } = useAuth()
  const { handleDocumentAction, loadingAction } = useDocumentAction()
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [garageFilter, setGarageFilter] = useState('Todas')
  const [cancelTarget, setCancelTarget] = useState<{
    chamadoId: string
    totalParcelas: number
  } | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    if (!startDate || !endDate) return
    setLoading(true)

    const { data: parcelasData, error } = await supabase
      .from('parcelas_vales')
      .select(`
      id, 
      valor_parcela, 
      data_referencia,
      aprovado_em,
      vale_unificado,
      chamado_id, 
      aprovado_diretoria,
      chamados (
        id, 
        titulo,
        usuario_id, 
        nome_motorista, 
        registro_motorista, 
        status_aprovacao,
        aprovacoes_diretoria,
        garagem,
        formularios_espelho_danos ( registro_motorista, nome_motorista ),
        solicitacoes_parcelamento ( registro, nome, quantidade_parcelas ),
        documentos ( id, nome_arquivo, arquivo_url, tipo_documento, orcamento_url, criado_em ),
        anexos_chamado_interno ( id, nome_arquivo, arquivo_url, criado_em )
      )
    `)
      .eq('status', 'ativo')
      .gte('data_referencia', startDate)
      .lte('data_referencia', endDate)
      .order('data_referencia', { ascending: true })

    if (error) {
      toast.error('Erro ao buscar parcelas')
      setLoading(false)
      return
    }

    const validParcelas =
      parcelasData?.filter((p: any) => {
        const chamado = p.chamados
        if (!chamado) return false

        if (p.aprovado_diretoria === true) return true

        let aprovacoes: any[] = []
        try {
          if (Array.isArray(chamado.aprovacoes_diretoria)) {
            aprovacoes = chamado.aprovacoes_diretoria
          } else if (typeof chamado.aprovacoes_diretoria === 'string') {
            aprovacoes = JSON.parse(chamado.aprovacoes_diretoria)
          }
        } catch {
          /* intentionally ignored */
        }

        const hasAprovacao =
          Array.isArray(aprovacoes) &&
          aprovacoes.some((a: any) => String(a?.acao).toLowerCase() === 'aprovado')

        return chamado.status_aprovacao === 'aprovado' || hasAprovacao
      }) || []

    const userIds = [
      ...new Set(validParcelas.map((p: any) => p.chamados?.usuario_id).filter(Boolean)),
    ]

    let usersMap = new Map()
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo, registro, garagem')
        .in('id', userIds)

      usersMap = new Map((usersData || []).map((u) => [u.id, u]))
    }

    const chamadoIds = [...new Set(validParcelas.map((p: any) => p.chamado_id).filter(Boolean))]

    let parcelaSequenceMap = new Map<string, Map<string, number>>()
    if (chamadoIds.length > 0) {
      const { data: allParcelas } = await supabase
        .from('parcelas_vales')
        .select('chamado_id, data_referencia')
        .in('chamado_id', chamadoIds)
        .order('data_referencia', { ascending: true })

      if (allParcelas) {
        const byChamado = new Map<string, string[]>()
        for (const ap of allParcelas) {
          const arr = byChamado.get(ap.chamado_id) || []
          arr.push(ap.data_referencia)
          byChamado.set(ap.chamado_id, arr)
        }
        for (const [cid, dates] of byChamado.entries()) {
          const seqMap = new Map<string, number>()
          dates.forEach((d, idx) => seqMap.set(d, idx + 1))
          parcelaSequenceMap.set(cid, seqMap)
        }
      }
    }

    const formatted = validParcelas.map((p: any) => {
      const chamado = p.chamados
      const user = chamado?.usuario_id ? usersMap.get(chamado.usuario_id) : null

      const espelhoData = Array.isArray(chamado.formularios_espelho_danos)
        ? chamado.formularios_espelho_danos[0]
        : chamado.formularios_espelho_danos

      const solicitacaoData = Array.isArray(chamado.solicitacoes_parcelamento)
        ? chamado.solicitacoes_parcelamento[0]
        : chamado.solicitacoes_parcelamento

      const registro =
        solicitacaoData?.registro ||
        espelhoData?.registro_motorista ||
        chamado.registro_motorista ||
        user?.registro ||
        'N/A'
      const nome =
        solicitacaoData?.nome ||
        espelhoData?.nome_motorista ||
        chamado.nome_motorista ||
        user?.nome_completo ||
        'N/A'
      const garagem = chamado.garagem || user?.garagem || 'N/A'

      let orcamentoUrl = null
      let orcamentoId = null
      let orcamentoNome = null
      if (chamado.documentos && chamado.documentos.length > 0) {
        const orcamentos = chamado.documentos.filter(
          (d: any) => d.tipo_documento === 'orcamento' || d.orcamento_url,
        )
        if (orcamentos.length > 0) {
          orcamentoUrl = orcamentos[0].orcamento_url || orcamentos[0].arquivo_url
          orcamentoId = orcamentos[0].id
          orcamentoNome = orcamentos[0].nome_arquivo
        }
      }

      let autorizacaoUrl = null
      let autorizacaoId = null
      let autorizacaoNome = null

      if (chamado.anexos_chamado_interno && chamado.anexos_chamado_interno.length > 0) {
        const autorizacoes = chamado.anexos_chamado_interno.filter((a: any) => {
          const nomeArq = a.nome_arquivo?.toLowerCase() || ''
          return (
            nomeArq.includes('autorização') ||
            nomeArq.includes('autorizacao') ||
            nomeArq.includes('desconto') ||
            nomeArq.includes('parcelamento')
          )
        })
        if (autorizacoes.length > 0) {
          autorizacaoUrl = autorizacoes[0].arquivo_url
          autorizacaoId = autorizacoes[0].id
          autorizacaoNome = autorizacoes[0].nome_arquivo
        }
      }

      if (!autorizacaoUrl && chamado.documentos && chamado.documentos.length > 0) {
        const autorizacoesDoc = chamado.documentos.filter((d: any) => {
          const nomeArq = d.nome_arquivo?.toLowerCase() || ''
          return (
            d.tipo_documento === 'autorizacao_desconto' ||
            d.tipo_documento === 'autorizacao' ||
            nomeArq.includes('autorização') ||
            nomeArq.includes('autorizacao') ||
            nomeArq.includes('desconto') ||
            nomeArq.includes('parcelamento')
          )
        })
        if (autorizacoesDoc.length > 0) {
          autorizacaoUrl = autorizacoesDoc[0].arquivo_url
          autorizacaoId = autorizacoesDoc[0].id
          autorizacaoNome = autorizacoesDoc[0].nome_arquivo
        }
      }

      const valorCalculado = Number(p.valor_parcela)

      const seqMap = parcelaSequenceMap.get(p.chamado_id)
      const currentParcela = seqMap ? seqMap.get(p.data_referencia) : null
      const totalFromSolicitacao = solicitacaoData?.quantidade_parcelas || null
      const totalFromSequence = seqMap ? seqMap.size : null
      const totalParcelas = totalFromSolicitacao || totalFromSequence || null
      const parcelaInfo =
        currentParcela && totalParcelas ? `${currentParcela}/${totalParcelas}` : ''

      return {
        id: p.id,
        chamado_id: p.chamado_id,
        chamado_titulo: chamado?.titulo || '-',
        valor_parcela: valorCalculado,
        data_referencia: p.data_referencia,
        vale_unificado: (p as any).vale_unificado || false,
        aprovado_em: p.aprovado_em,
        aprovado_diretoria: p.aprovado_diretoria,
        nome,
        registro,
        garagem,
        parcelaInfo,
        orcamentoUrl,
        orcamentoId,
        orcamentoNome,
        autorizacaoUrl,
        autorizacaoId,
        autorizacaoNome,
      }
    })

    const parcelaCountByChamado = new Map<string, number>()
    for (const p of formatted) {
      parcelaCountByChamado.set(p.chamado_id, (parcelaCountByChamado.get(p.chamado_id) || 0) + 1)
    }
    for (const p of formatted) {
      ;(p as any).totalParcelasChamado = parcelaCountByChamado.get(p.chamado_id) || 1
    }

    setParcelas(formatted)
    setLoading(false)
  }
  const filteredParcelas = parcelas.filter((p) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      p.nome.toLowerCase().includes(searchLower) ||
      p.registro.toLowerCase().includes(searchLower) ||
      p.chamado_titulo.toLowerCase().includes(searchLower)

    const matchesGarage =
      garageFilter === 'Todas' ||
      (p.garagem && p.garagem.toLowerCase() === garageFilter.toLowerCase())

    return matchesSearch && matchesGarage
  })

  const handleCancelParcelas = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('parcelas_vales')
        .update({ status: 'cancelado' })
        .eq('chamado_id', cancelTarget.chamadoId)

      if (updateError) {
        throw updateError
      }

      toast.success('Parcelas canceladas com sucesso. O histórico foi preservado.')
      setCancelTarget(null)
      await fetchData()
    } catch (error) {
      console.error('Erro ao cancelar parcelas:', error)
      toast.error('Erro ao cancelar parcelas. Tente novamente.')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleExportReport = () => {
    if (filteredParcelas.length === 0) {
      return toast.info('Nenhuma parcela encontrada para exportação.')
    }

    toast.loading('Gerando relatório Excel...', { id: 'export-xls' })

    try {
      const rows = filteredParcelas.map((p) => ({
        values: [
          p.registro !== 'N/A' ? p.registro : '',
          p.nome !== 'N/A' ? p.nome : '',
          p.garagem !== 'N/A' ? p.garagem : '',
          format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy'),
          p.parcelaInfo || '-',
          Number(p.valor_parcela),
        ],
      }))

      const columns = [
        { header: 'Registro', width: 120 },
        { header: 'Nome', width: 220 },
        { header: 'Garagem', width: 120 },
        { header: 'Referência', width: 100 },
        { header: 'Parcela', width: 80 },
        { header: 'Valor Parcela', width: 130, format: 'Currency' },
      ]

      const today = format(new Date(), 'dd-MM-yyyy')
      downloadExcelFile(columns, rows, `Relatorio_Vales_Aprovados_${today}.xls`, 'Vales Aprovados')

      toast.success('Relatório Excel gerado com sucesso!', { id: 'export-xls' })
    } catch (error) {
      console.error('Erro ao gerar relatório Excel:', error)
      toast.error('Erro ao gerar relatório Excel.', { id: 'export-xls' })
    }
  }

  const handleDownload = () => {
    const exportableParcelas = filteredParcelas

    if (exportableParcelas.length === 0) {
      return toast.info('Nenhuma parcela encontrada para exportação.')
    }

    toast.loading('Gerando arquivo TXT...', { id: 'export-txt' })

    try {
      const txtRows = exportableParcelas.map((p) => {
        const rawRegistro = String(p.registro).replace(/\D/g, '') || '0'
        const registroPadded = rawRegistro.padStart(6, '0')

        const codigo = '261'

        const valueNum = Number(p.valor_parcela)
        const valueStr = valueNum.toFixed(2).replace('.', ',')
        const valorPadded = valueStr.padStart(15, '0')

        return `${registroPadded}\t${codigo}\t${valorPadded}`
      })

      const txtContent = txtRows.join('\n')
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)

      let filename = 'Via Sudeste - Imp.txt'
      if (garageFilter === 'Cursino') {
        filename = 'Via Sudeste Cursino - Imp.txt'
      } else if (garageFilter === 'Sapopemba') {
        filename = 'Via Sudeste Sapopemba - Imp.txt'
      }

      link.download = filename
      link.click()

      toast.success('Arquivo TXT gerado com sucesso!', { id: 'export-txt' })
    } catch (error) {
      toast.error('Erro ao gerar arquivo TXT.', { id: 'export-txt' })
    }
  }

  if (authLoading) {
    return null
  }

  if (profile?.departamento !== 'DP' && profile?.tipo_usuario !== 'dp') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">Esta página é exclusiva para o departamento DP.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {profile?.tipo_usuario === 'admin' && (
        <div className="mb-4">
          <Button variant="ghost" asChild className="-ml-4 text-slate-500 hover:text-slate-900">
            <Link to="/dashboard/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel Admin
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vales Aprovados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe as parcelas de vales e gere o relatório de descontos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-56">
            <label className="text-xs font-medium text-slate-600">Busca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                placeholder="Buscar registro, nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-slate-200 h-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-40">
            <label className="text-xs font-medium text-slate-600">Garagem</label>
            <Select value={garageFilter} onValueChange={setGarageFilter}>
              <SelectTrigger className="w-full bg-white border-slate-200 h-10">
                <SelectValue placeholder="Garagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Garagens</SelectItem>
                <SelectItem value="Cursino">Cursino</SelectItem>
                <SelectItem value="Sapopemba">Sapopemba</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-36">
            <label className="text-xs font-medium text-slate-600">Data Inicial</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border-slate-200 h-10"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-36">
            <label className="text-xs font-medium text-slate-600">Data Final</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border-slate-200 h-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
            <Button
              onClick={handleDownload}
              className="w-full sm:w-auto bg-[#225f3d] hover:bg-[#1a4a2f] h-10"
            >
              <Download className="w-4 h-4 mr-2" /> Exportar TXT
            </Button>
            <Button
              onClick={handleExportReport}
              variant="outline"
              className="w-full sm:w-auto border-[#225f3d] text-[#225f3d] hover:bg-[#225f3d] hover:text-white h-10"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Relatório
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Chamado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Garagem</TableHead>
                <TableHead>Valor Parcela</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Aprovado Em</TableHead>
                <TableHead className="pr-6 text-right">Documentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredParcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {p.vale_unificado && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center mr-1 align-middle">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Vale unificado, favor verificar.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {p.chamado_titulo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{p.registro}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>
                      {p.garagem !== 'N/A' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {p.garagem}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>R$ {Number(p.valor_parcela).toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(p.data_referencia + 'T00:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {p.parcelaInfo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          {p.parcelaInfo}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.aprovado_em ? format(new Date(p.aprovado_em), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        {p.orcamentoUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 p-0"
                                onClick={() =>
                                  handleDocumentAction(
                                    p.orcamentoId || p.id,
                                    p.orcamentoUrl,
                                    p.orcamentoNome || 'orcamento.pdf',
                                    'view',
                                  )
                                }
                                disabled={loadingAction === `${p.orcamentoId || p.id}-view`}
                              >
                                {loadingAction === `${p.orcamentoId || p.id}-view` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Orçamento</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <FileText className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Orçamento não anexado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {p.autorizacaoUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 p-0"
                                onClick={() =>
                                  handleDocumentAction(
                                    p.autorizacaoId || p.id,
                                    p.autorizacaoUrl,
                                    p.autorizacaoNome || 'autorizacao.pdf',
                                    'view',
                                  )
                                }
                                disabled={loadingAction === `${p.autorizacaoId || p.id}-view`}
                              >
                                {loadingAction === `${p.autorizacaoId || p.id}-view` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileSignature className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Autorização de Desconto</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <FileSignature className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Autorização não anexada</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 p-0"
                            onClick={() =>
                              setCancelTarget({
                                chamadoId: p.chamado_id,
                                totalParcelas: (p as any).totalParcelasChamado || 1,
                              })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancelar parcelas deste chamado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!cancelLoading) setCancelTarget(open ? cancelTarget : null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget
                ? `Deseja cancelar o pagamento? Esta ação cancelará todas as ${cancelTarget.totalParcelas} parcelas vinculadas a este chamado e não pode ser desfeita.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancelParcelas()
              }}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
