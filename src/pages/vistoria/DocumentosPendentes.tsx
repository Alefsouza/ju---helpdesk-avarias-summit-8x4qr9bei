import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { FileEdit, Eye, AlertTriangle, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Documento = {
  id: string
  chamado_id?: string | null
  garagem: string | null
  linha: string | null
  numero_carro: string | null
  data: string | null
  horario: string | null
  ocorrencia: string | null
  descricao_danos: string | null
  foto_url: string | null
  fotos_urls: string[] | null
  nome_responsavel: string | null
  registro_responsavel: string | null
  nome_motorista: string | null
  registro_motorista: string | null
  criado_em: string
  hasDuplicate?: boolean
}

export default function DocumentosPendentes() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)
  const [selectedViewDoc, setSelectedViewDoc] = useState<Documento | null>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Documento | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select(
          'id, chamado_id, garagem, linha, numero_carro, data, horario, ocorrencia, descricao_danos, foto_url, fotos_urls, nome_responsavel, registro_responsavel, nome_motorista, registro_motorista, criado_em',
        )
        .eq('tipo_documento', 'Vistoria')
        .is('numero_os', null)
        .eq('excluido_manutencao', false)
        .order('criado_em', { ascending: false })

      if (error) throw error

      const carrosParaVerificar = [...new Set(data?.map((d) => d.numero_carro).filter(Boolean))]

      let duplicadosSet = new Set<string>()
      if (carrosParaVerificar.length > 0) {
        const { data: espelhos } = await supabase
          .from('documentos')
          .select('numero_carro')
          .eq('tipo_documento', 'Espelho de Danos')
          .eq('excluido_manutencao', false)
          .in('numero_carro', carrosParaVerificar)

        if (espelhos) {
          duplicadosSet = new Set(espelhos.map((e) => e.numero_carro as string))
        }
      }

      const docsWithDuplicateFlag = (data || []).map((doc) => ({
        ...doc,
        hasDuplicate: doc.numero_carro ? duplicadosSet.has(doc.numero_carro) : false,
      }))

      setDocumentos(docsWithDuplicateFlag)
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos pendentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()

    const channel = supabase
      .channel('documentos_pendentes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documentos', filter: `tipo_documento=eq.Vistoria` },
        () => {
          fetchDocumentos()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
          filter: `tipo_documento=eq.Espelho de Danos`,
        },
        () => {
          fetchDocumentos()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleOpenModal = (doc: Documento) => {
    setSelectedDoc(doc)
    setNumeroOS('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setSelectedDoc(null)
    setNumeroOS('')
  }

  const handleOpenViewModal = (doc: Documento) => {
    setSelectedViewDoc(doc)
    setIsViewModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc('ocultar_documento_manutencao', { p_id: docToDelete.id })
      if (error) throw error
      toast({
        title: 'Sucesso',
        description: 'Documento excluído com sucesso.',
      })
      setDocumentos((docs) => docs.filter((d) => d.id !== docToDelete.id))
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir documento.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteAlertOpen(false)
      setDocToDelete(null)
    }
  }

  const handleSaveOS = async (forceSave = false) => {
    if (!numeroOS.trim()) {
      toast({
        title: 'Atenção',
        description: 'O número da OS é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedDoc) return

    setIsSaving(true)
    try {
      if (selectedDoc.numero_carro && !forceSave) {
        const { data: duplicates } = await supabase
          .from('documentos')
          .select('id')
          .eq('numero_carro', selectedDoc.numero_carro)
          .eq('excluido_manutencao', false)
          .eq('tipo_documento', 'Espelho de Danos')
          .neq('id', selectedDoc.id)

        if (duplicates && duplicates.length > 0) {
          setDuplicateAlertOpen(true)
          setIsSaving(false)
          return
        }
      }

      const espelhoId = crypto.randomUUID()
      let finalEspelhoId = espelhoId
      let shouldInsertForm = true

      if (selectedDoc.chamado_id) {
        const { data: existingForm } = await supabase
          .from('formularios_espelho_danos')
          .select('id')
          .eq('chamado_id', selectedDoc.chamado_id)
          .limit(1)
          .maybeSingle()

        if (existingForm) {
          finalEspelhoId = existingForm.id
          shouldInsertForm = false

          await supabase
            .from('formularios_espelho_danos')
            .update({
              numero_os: numeroOS.trim(),
              garagem: selectedDoc.garagem,
              data: selectedDoc.data,
              horario: selectedDoc.horario,
              ocorrencia: selectedDoc.ocorrencia,
              linha: selectedDoc.linha,
              numero_carro: selectedDoc.numero_carro,
              descricao_danos: selectedDoc.descricao_danos,
              registro_vistoriador: selectedDoc.registro_responsavel,
              nome_vistoriador: selectedDoc.nome_responsavel,
              registro_motorista: selectedDoc.registro_motorista,
              nome_motorista: selectedDoc.nome_motorista,
            })
            .eq('id', finalEspelhoId)
        }
      }

      if (shouldInsertForm) {
        const { error: formError } = await supabase.from('formularios_espelho_danos').insert({
          id: finalEspelhoId,
          chamado_id: selectedDoc.chamado_id || null,
          numero_os: numeroOS.trim(),
          garagem: selectedDoc.garagem,
          data: selectedDoc.data,
          horario: selectedDoc.horario,
          ocorrencia: selectedDoc.ocorrencia,
          linha: selectedDoc.linha,
          numero_carro: selectedDoc.numero_carro,
          descricao_danos: selectedDoc.descricao_danos,
          registro_vistoriador: selectedDoc.registro_responsavel,
          nome_vistoriador: selectedDoc.nome_responsavel,
          registro_motorista: selectedDoc.registro_motorista,
          nome_motorista: selectedDoc.nome_motorista,
        })
        if (formError) throw formError
      }

      // 1. Gerar PDF via Edge Function
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
        body: {
          id: selectedDoc.chamado_id || selectedDoc.id,
          espelho_id: finalEspelhoId,
          garagem: selectedDoc.garagem,
          linha: selectedDoc.linha,
          numero_carro: selectedDoc.numero_carro,
          data: formatDate(selectedDoc.data),
          horario: selectedDoc.horario,
          ocorrencia: selectedDoc.ocorrencia,
          descricao_danos: selectedDoc.descricao_danos,
          numero_os: numeroOS.trim(),
          nome_vistoriador: selectedDoc.nome_responsavel,
          registro_vistoriador: selectedDoc.registro_responsavel,
          nome_motorista: selectedDoc.nome_motorista,
          registro_motorista: selectedDoc.registro_motorista,
          fotos: selectedDoc.fotos_urls || (selectedDoc.foto_url ? [selectedDoc.foto_url] : []),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (pdfError) throw pdfError
      if (!pdfData || !pdfData.success) throw new Error(pdfData?.error || 'Erro ao gerar PDF')

      const { url, nome_arquivo } = pdfData

      // 2. Atualizar documento com número da OS e URL do PDF gerado
      const { data: updatedDoc, error } = await supabase
        .from('documentos')
        .update({
          numero_os: numeroOS.trim(),
          arquivo_url: url,
          nome_arquivo: nome_arquivo || `Espelho_Danos_OS_${numeroOS.trim()}.pdf`,
          tipo_documento: 'Espelho de Danos',
          formulario_id: finalEspelhoId,
        })
        .eq('id', selectedDoc.id)
        .select()
        .maybeSingle()

      if (error) throw error
      if (!updatedDoc) throw new Error('Documento não encontrado ou sem permissão para atualizar.')

      toast({
        title: 'Sucesso',
        description: 'Número da OS salvo e PDF gerado com sucesso. Documento concluído.',
      })

      if (selectedDoc.chamado_id) {
        // Se o documento já pertencia a um chamado, registramos o anexo interno e o histórico via RPC
        await supabase.rpc('registrar_espelho_danos', {
          p_chamado_id: selectedDoc.chamado_id,
          p_nome_arquivo: updatedDoc.nome_arquivo,
          p_arquivo_url: updatedDoc.arquivo_url,
          p_tamanho_bytes: 0,
        })
      } else {
        // 3. Criar chamado automaticamente em background se não havia chamado
        supabase.functions
          .invoke('criar-chamado-vistoria', {
            body: { documento: updatedDoc },
          })
          .then(({ error: functionError }) => {
            if (functionError) {
              console.error(
                'Erro retornado pela Edge Function criar-chamado-vistoria:',
                functionError,
              )
            }
          })
          .catch((err) => {
            console.error('Erro ao chamar Edge Function criar-chamado-vistoria:', err)
          })
      }

      setDocumentos((docs) => docs.filter((d) => d.id !== selectedDoc.id))
      handleCloseModal()
    } catch (error: any) {
      console.error('Erro ao salvar OS:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o número da OS e gerar o PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Documentos Pendentes</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Garagem</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição dos Danos</TableHead>
              <TableHead className="text-right w-[340px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24">
                  <div className="flex justify-center items-center h-full">
                    <Skeleton className="w-full max-w-[200px] h-8" />
                  </div>
                </TableCell>
              </TableRow>
            ) : documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  Nenhum documento de Vistoria pendente de OS encontrado no momento.
                </TableCell>
              </TableRow>
            ) : (
              documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.garagem || '-'}</TableCell>
                  <TableCell>{doc.linha || '-'}</TableCell>
                  <TableCell>{doc.numero_carro || '-'}</TableCell>
                  <TableCell>{formatDate(doc.data)}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={doc.descricao_danos || ''}>
                    {truncateText(doc.descricao_danos)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.hasDuplicate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center h-8 w-8 cursor-help">
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Já existe um espelho de danos para esse carro, por favor verificar.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenViewModal(doc)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(doc)}
                        className="text-[#225f3d] hover:text-[#1a4a2f] hover:bg-[#c8e6c9]/20 border-[#225f3d]/20"
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        Preencher OS
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          setDocToDelete(doc)
                          setDeleteAlertOpen(true)
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Preencher OS */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Preencher Número da OS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="os">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="os"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                placeholder="Ex: 12345"
                type="number"
                disabled={isSaving}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveOS()
                  }
                }}
              />
            </div>
            {selectedDoc && (
              <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-md border mt-2 space-y-2 overflow-x-hidden">
                <p>
                  <strong className="text-slate-900">Garagem:</strong> {selectedDoc.garagem || '-'}
                </p>
                <p>
                  <strong className="text-slate-900">Linha:</strong> {selectedDoc.linha || '-'}
                </p>
                <p>
                  <strong className="text-slate-900">Carro:</strong>{' '}
                  {selectedDoc.numero_carro || '-'}
                </p>
                <p>
                  <strong className="text-slate-900">Data:</strong> {formatDate(selectedDoc.data)}
                </p>
                <div className="break-words whitespace-pre-wrap">
                  <strong className="text-slate-900">Danos:</strong>{' '}
                  {selectedDoc.descricao_danos || '-'}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleSaveOS()}
              disabled={isSaving}
              className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Detalhes */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Vistoria</DialogTitle>
          </DialogHeader>
          {selectedViewDoc && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium mb-1">Garagem</p>
                  <p className="text-slate-900">{selectedViewDoc.garagem || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Linha</p>
                  <p className="text-slate-900">{selectedViewDoc.linha || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Carro</p>
                  <p className="text-slate-900">{selectedViewDoc.numero_carro || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Data / Horário</p>
                  <p className="text-slate-900">
                    {formatDate(selectedViewDoc.data)}{' '}
                    {selectedViewDoc.horario ? `às ${selectedViewDoc.horario}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Vistoriador</p>
                  <p className="text-slate-900">
                    {selectedViewDoc.nome_responsavel || '-'}
                    {selectedViewDoc.registro_responsavel
                      ? ` (${selectedViewDoc.registro_responsavel})`
                      : ''}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-1 text-sm">Ocorrência</p>
                <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedViewDoc.ocorrencia || '-'}
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-1 text-sm">Descrição dos Danos</p>
                <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedViewDoc.descricao_danos || '-'}
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-3 text-sm">Fotos Anexadas</p>
                {(() => {
                  const fotos = []
                  if (selectedViewDoc.foto_url) fotos.push(selectedViewDoc.foto_url)
                  if (Array.isArray(selectedViewDoc.fotos_urls)) {
                    fotos.push(...selectedViewDoc.fotos_urls)
                  }

                  if (fotos.length === 0) {
                    return (
                      <p className="text-sm text-slate-500 italic">
                        Nenhuma foto foi anexada nesta vistoria.
                      </p>
                    )
                  }

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {fotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            {selectedViewDoc && (
              <Button
                onClick={() => {
                  setIsViewModalOpen(false)
                  handleOpenModal(selectedViewDoc)
                }}
                className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
              >
                Preencher OS
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={duplicateAlertOpen} onOpenChange={setDuplicateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um espelho de danos para esse carro, por favor verificar. Deseja continuar e
              salvar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateAlertOpen(false)} disabled={isSaving}>
              Fechar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                setDuplicateAlertOpen(false)
                handleSaveOS(true)
              }}
              disabled={isSaving}
              className="bg-[#225f3d] hover:bg-[#1a4a2f] text-white"
            >
              Salvar e Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta vistoria? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
