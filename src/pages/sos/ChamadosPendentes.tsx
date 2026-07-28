import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Eye, ClipboardEdit, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function ChamadosPendentesSos() {
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [osModalOpen, setOsModalOpen] = useState(false)
  const [selectedChamado, setSelectedChamado] = useState<any>(null)

  const [osNumber, setOsNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchChamados = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chamados')
        .select(`
          *,
          anexos_chamado ( id, nome_arquivo, url_arquivo, tipo_arquivo ),
          anexos_chamado_interno ( id, nome_arquivo, arquivo_url, tipo_arquivo )
        `)
        .in('status', ['Pendente', 'pendente'])
        .order('criado_em', { ascending: false })

      if (error) throw error
      setChamados(data || [])
    } catch (err: any) {
      toast.error('Erro ao buscar chamados pendentes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChamados()

    const channel = supabase
      .channel('chamados_sos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchChamados()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleOpenView = (chamado: any) => {
    setSelectedChamado(chamado)
    setViewModalOpen(true)
  }

  const handleOpenOs = (chamado: any) => {
    setSelectedChamado(chamado)
    setOsNumber('')
    setOsModalOpen(true)
  }

  const handleSaveOs = async () => {
    if (!osNumber.trim()) {
      toast.error('O número da OS é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      const tituloAtualizado = selectedChamado.carro
        ? `${selectedChamado.titulo} - ${selectedChamado.carro}`
        : selectedChamado.titulo

      const { error } = await supabase
        .from('chamados')
        .update({
          numero_os: osNumber.trim(),
          status: 'aberto',
          titulo: tituloAtualizado,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedChamado.id)

      if (error) throw error

      const anexos = getAnexos(selectedChamado)
      const imageAnexos = anexos.filter((a: any) => a.tipo_arquivo?.includes('image'))
      const fotosUrls = imageAnexos.map((a: any) => a.url_arquivo)

      let arquivoUrl = anexos.length > 0 ? anexos[0].url_arquivo : '#'
      let nomeArquivo = anexos.length > 0 ? anexos[0].nome_arquivo : `OS_${osNumber.trim()}.pdf`

      try {
        const dateObj = new Date(selectedChamado.criado_em)
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`
        const horario = dateObj.toTimeString().substring(0, 5)

        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
          body: {
            id: selectedChamado.id,
            garagem: selectedChamado.operacao,
            linha: selectedChamado.linha,
            numero_carro: selectedChamado.carro,
            data: formattedDate,
            horario,
            ocorrencia: selectedChamado.tipo_chamado,
            descricao_danos: selectedChamado.descricao,
            numero_os: osNumber.trim(),
            nome_vistoriador: selectedChamado.nome_cobrador || 'Equipe COC',
            registro_vistoriador: selectedChamado.registro_cobrador,
            nome_motorista: selectedChamado.nome_motorista,
            registro_motorista: selectedChamado.registro_motorista,
            fotos: fotosUrls,
          },
        })

        if (!pdfError && pdfData?.success) {
          arquivoUrl = pdfData.url
          nomeArquivo = pdfData.nome_arquivo
        }
      } catch (pdfErr) {
        console.error('Erro ao gerar PDF do chamado:', pdfErr)
      }

      const { error: docError } = await supabase.from('documentos').insert({
        chamado_id: selectedChamado.id,
        tipo_documento: 'Espelho de Danos',
        numero_os: osNumber.trim(),
        numero_carro: selectedChamado.carro,
        linha: selectedChamado.linha,
        descricao_danos: selectedChamado.descricao,
        ocorrencia: selectedChamado.tipo_chamado,
        nome_motorista: selectedChamado.nome_motorista,
        registro_motorista: selectedChamado.registro_motorista,
        nome_responsavel: selectedChamado.nome_cobrador || 'Equipe COC',
        data: selectedChamado.criado_em
          ? new Date(selectedChamado.criado_em).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        horario: selectedChamado.criado_em
          ? new Date(selectedChamado.criado_em).toTimeString().substring(0, 5)
          : new Date().toTimeString().substring(0, 5),
        arquivo_url: arquivoUrl,
        nome_arquivo: nomeArquivo,
        foto_url: imageAnexos.length > 0 ? imageAnexos[0].url_arquivo : null,
        fotos_urls: fotosUrls.length > 0 ? fotosUrls : null,
        garagem: selectedChamado.operacao || null,
      })

      if (docError) {
        console.error('Erro ao criar documento para manutenção:', docError)
      }

      toast.success('OS preenchida com sucesso! Chamado enviado para a fila e manutenção.')
      setOsModalOpen(false)
      fetchChamados()
    } catch (err: any) {
      toast.error('Erro ao salvar OS')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAnexos = (chamado: any) => {
    const anexos: any[] = []
    if (chamado?.anexos_chamado) anexos.push(...chamado.anexos_chamado)
    if (chamado?.anexos_chamado_interno) {
      const internos = chamado.anexos_chamado_interno.map((a: any) => ({
        ...a,
        url_arquivo: a.arquivo_url,
      }))
      anexos.push(...internos)
    }
    return anexos
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chamados Pendentes</h1>
        <p className="text-slate-500">
          Gestão de chamados abertos pela equipe COC aguardando emissão de OS.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#225f3d]" />
              <p>Buscando chamados pendentes...</p>
            </div>
          ) : chamados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 bg-[#225f3d]/10 rounded-full flex items-center justify-center mb-4">
                <ClipboardEdit className="h-8 w-8 text-[#225f3d]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Nenhum chamado pendente</h3>
              <p className="text-slate-500 max-w-sm">
                Todos os chamados abertos pelo COC já tiveram suas OS preenchidas.
              </p>
            </div>
          ) : (
            <div className="rounded-md border-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="min-w-[150px]">Título</TableHead>
                    <TableHead className="min-w-[150px]">Operação / Local</TableHead>
                    <TableHead className="min-w-[180px]">Motorista / Cobrador</TableHead>
                    <TableHead className="min-w-[120px]">Carro / Linha</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium text-slate-600">
                        {format(new Date(c.criado_em), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{c.titulo}</div>
                        <div className="text-sm text-slate-500 line-clamp-1" title={c.descricao}>
                          {c.descricao}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.operacao || '-'}</div>
                        <div
                          className="text-sm text-slate-500 truncate max-w-[150px]"
                          title={c.local_ocorrencia}
                        >
                          {c.local_ocorrencia || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">Mot:</span> {c.nome_motorista || '-'}{' '}
                          {c.registro_motorista ? `(${c.registro_motorista})` : ''}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Cob:</span> {c.nome_cobrador || '-'}{' '}
                          {c.registro_cobrador ? `(${c.registro_cobrador})` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.carro || '-'}</div>
                        <div className="text-sm text-slate-500">{c.linha || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenView(c)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-[#225f3d] hover:text-[#225f3d] hover:bg-[#c8e6c9]/20"
                            onClick={() => handleOpenOs(c)}
                            title="Preencher OS"
                          >
                            <ClipboardEdit className="h-4 w-4" />
                          </Button>
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

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Chamado</DialogTitle>
            <DialogDescription>
              Visualizando todos os dados informados pela equipe COC.
            </DialogDescription>
          </DialogHeader>

          {selectedChamado && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <p className="text-sm font-medium text-slate-500">Título</p>
                <p className="text-base font-medium">{selectedChamado.titulo}</p>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1">
                <p className="text-sm font-medium text-slate-500">Descrição</p>
                <div className="p-3 bg-slate-50 rounded-md whitespace-pre-wrap text-sm border">
                  {selectedChamado.descricao || 'Sem descrição'}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 border-b pb-2">Dados Operacionais</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Operação</p>
                    <p className="text-sm">{selectedChamado.operacao || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Local</p>
                    <p className="text-sm">{selectedChamado.local_ocorrencia || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Carro</p>
                    <p className="text-sm">{selectedChamado.carro || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Linha</p>
                    <p className="text-sm">{selectedChamado.linha || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Tipo de Avaria</p>
                    <p className="text-sm">{selectedChamado.tipo_chamado || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 border-b pb-2">Envolvidos</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Motorista</p>
                    <p className="text-sm">
                      {selectedChamado.nome_motorista || '-'}{' '}
                      {selectedChamado.registro_motorista
                        ? `(${selectedChamado.registro_motorista})`
                        : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Cobrador</p>
                    <p className="text-sm">
                      {selectedChamado.nome_cobrador || '-'}{' '}
                      {selectedChamado.registro_cobrador
                        ? `(${selectedChamado.registro_cobrador})`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              {getAnexos(selectedChamado).length > 0 && (
                <div className="col-span-1 md:col-span-2 space-y-3 pt-2">
                  <h4 className="font-semibold text-slate-900 border-b pb-2">Anexos</h4>
                  <div className="flex flex-col gap-2">
                    {getAnexos(selectedChamado).map((anexo: any, idx: number) => (
                      <a
                        key={idx}
                        href={anexo.url_arquivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 rounded-md border bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-[#225f3d] font-medium"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {anexo.nome_arquivo || `Anexo ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
            <Button
              className="bg-[#225f3d] hover:bg-[#1a4a2f]"
              onClick={() => {
                setViewModalOpen(false)
                handleOpenOs(selectedChamado)
              }}
            >
              Preencher OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preencher OS */}
      <Dialog open={osModalOpen} onOpenChange={setOsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Preencher Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Informe o número da OS gerada para este chamado. O chamado será movido para a Fila de
              Atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="os">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="os"
                placeholder="Ex: 12345"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveOs()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveOs}
              disabled={isSubmitting}
              className="bg-[#225f3d] hover:bg-[#1a4a2f]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar OS'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
