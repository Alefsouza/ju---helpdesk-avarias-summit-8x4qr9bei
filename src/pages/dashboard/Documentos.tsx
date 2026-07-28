import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import {
  FileText,
  Download,
  Loader2,
  FolderOpen,
  Copy,
  ExternalLink,
  Search,
  X,
  Eye,
  Trash2,
  Images,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentAction } from '@/hooks/use-document-action'
import { Database } from '@/lib/supabase/types'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

type Documento = Database['public']['Tables']['documentos']['Row']

const ITEMS_PER_PAGE = 20

export default function Documentos() {
  const { profile } = useAuth()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [docToView, setDocToView] = useState<Documento | null>(null)
  const { handleDocumentAction, loadingAction } = useDocumentAction()

  const isResponsavel =
    profile?.tipo_usuario === 'responsavel' || profile?.tipo_usuario === 'sinistro'

  const filtrosRef = useRef({ search, tipoFiltro })
  useEffect(() => {
    filtrosRef.current = { search, tipoFiltro }
  }, [search, tipoFiltro])

  useEffect(() => {
    if (!isResponsavel) return

    const fetchDocumentos = async () => {
      try {
        const { data, error } = await supabase
          .from('documentos')
          .select('*')
          .in('tipo_documento', ['IDO', 'Espelho de Danos'])
          .order('criado_em', { ascending: false })

        if (error) throw error

        const docs = ((data as Documento[]) || []).filter(
          (doc) => doc.tipo_documento === 'IDO' || !!doc.numero_os,
        )
        setDocumentos(docs)
      } catch (error: any) {
        console.error('Erro ao buscar documentos:', error)
        toast.error('Não foi possível carregar os documentos.')
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentos()

    const channel = supabase
      .channel('documentos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newDoc = payload.new as Documento
            if (!['IDO', 'Espelho de Danos'].includes(newDoc.tipo_documento)) return

            // Only add/keep if it's IDO or has an OS
            const isValid = newDoc.tipo_documento === 'IDO' || !!newDoc.numero_os

            if (!isValid) {
              if (payload.eventType === 'UPDATE') {
                setDocumentos((prev) => prev.filter((d) => d.id !== newDoc.id))
              }
              return
            }

            setDocumentos((prev) => {
              if (prev.some((d) => d.id === newDoc.id)) {
                return prev.map((d) => (d.id === newDoc.id ? newDoc : d))
              }
              return [newDoc, ...prev]
            })

            const { search, tipoFiltro } = filtrosRef.current
            const matchSearch =
              newDoc.nome_responsavel?.toLowerCase().includes(search.toLowerCase()) ||
              newDoc.registro_responsavel?.toLowerCase().includes(search.toLowerCase()) ||
              newDoc.registro_motorista?.toLowerCase().includes(search.toLowerCase()) ||
              newDoc.linha?.toLowerCase().includes(search.toLowerCase()) ||
              newDoc.numero_os?.toLowerCase().includes(search.toLowerCase()) ||
              newDoc.tipo_documento.toLowerCase().includes(search.toLowerCase())

            const matchTipo = tipoFiltro === 'todos' || newDoc.tipo_documento === tipoFiltro

            if (matchSearch && matchTipo) {
              toast.success('Novo documento adicionado')
              setHighlightedDocId(newDoc.id)
              setCurrentPage(1)
              setTimeout(() => {
                setHighlightedDocId(null)
              }, 2000)
            }
          } else if (payload.eventType === 'DELETE') {
            setDocumentos((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isResponsavel])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, tipoFiltro])

  const documentosFiltrados = useMemo(() => {
    return documentos
      .filter((doc) => {
        const searchTerm = search.toLowerCase()
        const matchSearch =
          doc.nome_responsavel?.toLowerCase().includes(searchTerm) ||
          doc.registro_responsavel?.toLowerCase().includes(searchTerm) ||
          doc.registro_motorista?.toLowerCase().includes(searchTerm) ||
          doc.linha?.toLowerCase().includes(searchTerm) ||
          doc.numero_os?.toLowerCase().includes(searchTerm) ||
          doc.tipo_documento.toLowerCase().includes(searchTerm)

        const matchTipo = tipoFiltro === 'todos' || doc.tipo_documento === tipoFiltro
        return matchSearch && matchTipo
      })
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  }, [documentos, search, tipoFiltro])

  const totalPages = Math.ceil(documentosFiltrados.length / ITEMS_PER_PAGE)
  const paginatedDocs = documentosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleCopyLink = (path: string) => {
    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado para a área de transferência')
  }

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return

    try {
      setDeletingId(id)
      const { error } = await supabase.from('documentos').delete().eq('id', id)
      if (error) throw error
      // A atualização do estado ocorrerá via Realtime
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
      toast.error('Erro ao excluir documento')
    } finally {
      setDeletingId(null)
    }
  }

  const formatData = (doc: Documento) => {
    if (doc.data) {
      try {
        return format(parseISO(doc.data), 'dd/MM/yyyy')
      } catch {
        return doc.data
      }
    }
    return format(new Date(doc.criado_em), 'dd/MM/yyyy')
  }

  const parseFotos = (fotos: any): string[] => {
    if (!fotos) return []
    if (Array.isArray(fotos)) return fotos
    if (typeof fotos === 'string') {
      try {
        return JSON.parse(fotos)
      } catch {
        return []
      }
    }
    return []
  }

  if (!isResponsavel) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <FolderOpen className="w-12 h-12 mb-4 text-slate-300" />
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Documentos</h1>
        <p className="text-slate-500 mt-1">
          Gestão de formulários preenchidos (IDO, Espelho de Danos e Vistorias).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Formulário Espelho de Danos
            </CardTitle>
            <CardDescription>Link público para preenchimento de Espelho de Danos</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="bg-slate-50 px-3 py-2 rounded-md flex-1 truncate text-sm text-slate-500 border border-slate-200 select-all">
              {window.location.origin}/espelho-danos-fixo
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopyLink('/espelho-danos-fixo')}
              title="Copiar link"
              className="shrink-0"
            >
              <Copy className="w-4 h-4 text-slate-600" />
            </Button>
            <Button variant="outline" size="icon" asChild title="Abrir link" className="shrink-0">
              <a href="/espelho-danos-fixo" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Formulário Boletim de Ocorrência
            </CardTitle>
            <CardDescription>
              Link público para preenchimento de Boletim de Ocorrência (BO)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="bg-slate-50 px-3 py-2 rounded-md flex-1 truncate text-sm text-slate-500 border border-slate-200 select-all">
              {window.location.origin}/ido-fixo
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopyLink('/ido-fixo')}
              title="Copiar link"
              className="shrink-0"
            >
              <Copy className="w-4 h-4 text-slate-600" />
            </Button>
            <Button variant="outline" size="icon" asChild title="Abrir link" className="shrink-0">
              <a href="/ido-fixo" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por colaborador, registro, linha, OS..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="IDO">BO</SelectItem>
                <SelectItem value="Espelho de Danos">Espelho de Danos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(search || tipoFiltro !== 'todos') && (
            <Button
              variant="ghost"
              className="text-slate-500 hover:text-slate-900 shrink-0"
              onClick={() => {
                setSearch('')
                setTipoFiltro('todos')
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedDocs.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum documento encontrado</h3>
              <p className="text-slate-500 text-sm mt-1">
                Ajuste os filtros ou aguarde novos registros.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {paginatedDocs.map((doc) => (
                  <Card
                    key={doc.id}
                    className={`border shadow-sm overflow-hidden transition-colors duration-500 ${
                      highlightedDocId === doc.id
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-slate-200 bg-card'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-slate-50 font-normal">
                            {doc.tipo_documento === 'IDO' ? 'BO' : doc.tipo_documento}
                          </Badge>
                          <span className="text-xs text-slate-500">{formatData(doc)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-md text-sm space-y-2 border border-slate-100">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Colaborador:</span>
                          <span className="font-medium text-slate-700 text-right truncate">
                            {doc.nome_responsavel || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Registro:</span>
                          <span className="text-slate-700 truncate text-right">
                            {doc.registro_responsavel || doc.registro_motorista || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">OS:</span>
                          <span className="text-slate-700 truncate font-medium">
                            {doc.numero_os || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">Linha/Carro:</span>
                          <span className="text-slate-700 truncate">
                            {doc.linha || '-'} / {doc.numero_carro || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDocToView(doc)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!!loadingAction || deletingId === doc.id || !doc.arquivo_url}
                          onClick={() =>
                            doc.arquivo_url &&
                            handleDocumentAction(
                              doc.id,
                              doc.arquivo_url,
                              doc.nome_arquivo,
                              'download',
                            )
                          }
                        >
                          {loadingAction === `${doc.id}-download` ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Baixar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 px-2"
                          disabled={!!loadingAction || deletingId === doc.id}
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Excluir"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead>Tipo</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Carro</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocs.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className={`transition-colors duration-500 ${
                          highlightedDocId === doc.id ? 'bg-primary/5 hover:bg-primary/5' : ''
                        }`}
                      >
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 font-normal">
                            {doc.tipo_documento === 'IDO' ? 'BO' : doc.tipo_documento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[150px]">
                          {doc.nome_responsavel || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[100px]">
                          {doc.registro_responsavel || doc.registro_motorista || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[100px] font-medium">
                          {doc.numero_os || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[150px]">
                          {doc.linha || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[100px]">
                          {doc.numero_carro || '-'}
                        </TableCell>
                        <TableCell className="text-slate-500 whitespace-nowrap">
                          {formatData(doc)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2 items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                              onClick={() => setDocToView(doc)}
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-primary"
                              disabled={
                                !!loadingAction || deletingId === doc.id || !doc.arquivo_url
                              }
                              onClick={() =>
                                doc.arquivo_url &&
                                handleDocumentAction(
                                  doc.id,
                                  doc.arquivo_url,
                                  doc.nome_arquivo,
                                  'download',
                                )
                              }
                              title="Baixar arquivo"
                            >
                              {loadingAction === `${doc.id}-download` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={!!loadingAction || deletingId === doc.id}
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Excluir documento"
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <span className="text-sm text-slate-500">
                    Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!docToView} onOpenChange={(open) => !open && setDocToView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Detalhes do Documento</DialogTitle>
            <DialogDescription>
              Informações registradas no formulário de{' '}
              {docToView?.tipo_documento === 'IDO' ? 'BO' : docToView?.tipo_documento}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            {docToView && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Tipo</span>
                    <p className="font-medium text-slate-900">
                      {docToView.tipo_documento === 'IDO' ? 'BO' : docToView.tipo_documento}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Colaborador</span>
                    <p className="font-medium text-slate-900">
                      {docToView.nome_responsavel || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Registro</span>
                    <p className="font-medium text-slate-900">
                      {docToView.registro_responsavel || docToView.registro_motorista || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">OS</span>
                    <p className="font-medium text-slate-900">{docToView.numero_os || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Linha</span>
                    <p className="font-medium text-slate-900">{docToView.linha || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Carro</span>
                    <p className="font-medium text-slate-900">{docToView.numero_carro || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Data</span>
                    <p className="font-medium text-slate-900">{formatData(docToView)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Horário</span>
                    <p className="font-medium text-slate-900">{docToView.horario || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Ocorrência</span>
                    <p className="font-medium text-slate-900">{docToView.ocorrencia || '-'}</p>
                  </div>
                </div>

                {docToView.descricao_danos && (
                  <div className="space-y-2">
                    <span className="text-sm text-slate-500 font-medium">Descrição dos Danos</span>
                    <div className="bg-slate-50 p-4 rounded-md text-slate-700 whitespace-pre-wrap">
                      {docToView.descricao_danos}
                    </div>
                  </div>
                )}

                {parseFotos(docToView.fotos_urls).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Images className="w-5 h-5 text-slate-500" />
                      <h3 className="font-medium text-slate-900">Fotos Anexadas</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {parseFotos(docToView.fotos_urls).map((fotoUrl, idx) => (
                        <a
                          key={idx}
                          href={fotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video rounded-md overflow-hidden bg-slate-100 border border-slate-200 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={fotoUrl}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
