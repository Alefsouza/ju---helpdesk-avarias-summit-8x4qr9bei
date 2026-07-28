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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, Download, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function EspelhosDanos() {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [viewDoc, setViewDoc] = useState<any | null>(null)
  const [editOsDoc, setEditOsDoc] = useState<any | null>(null)
  const [osInput, setOsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [month, setMonth] = useState<string>('all')
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())

  const { profile } = useAuth()
  const userType = profile?.tipo_usuario
  const userGaragem = profile?.garagem

  useEffect(() => {
    if (!userType) return

    const fetchDocs = async () => {
      let query = supabase.from('documentos').select('*').eq('tipo_documento', 'Espelho de Danos')

      if (userType === 'vistoriador' && userGaragem) {
        query = query.eq('garagem', userGaragem)
      }

      const { data } = await query.order('criado_em', { ascending: false })

      if (data) setDocumentos(data)
    }

    fetchDocs()

    const channel = supabase
      .channel('espelhos_danos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
          filter: 'tipo_documento=eq.Espelho de Danos',
        },
        (payload) => {
          if (userType === 'vistoriador' && userGaragem) {
            const newRecord = payload.new as any
            if (newRecord && newRecord.garagem && newRecord.garagem !== userGaragem) {
              return
            }
          }
          fetchDocs()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userType, userGaragem])

  const handleSaveOs = async () => {
    if (!editOsDoc || !osInput.trim()) return
    setIsSaving(true)

    const { error } = await supabase
      .from('documentos')
      .update({ numero_os: osInput.trim() })
      .eq('id', editOsDoc.id)

    setIsSaving(false)
    if (error) {
      toast.error('Erro ao salvar OS')
    } else {
      toast.success('OS preenchida com sucesso')
      setEditOsDoc(null)
      setOsInput('')
    }
  }

  const filteredDocumentos = documentos.filter((doc) => {
    let matchesSearch = true
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      matchesSearch =
        (doc.linha?.toLowerCase() || '').includes(term) ||
        (doc.numero_carro?.toLowerCase() || '').includes(term) ||
        (doc.numero_os?.toLowerCase() || '').includes(term)
    }

    let matchesDate = true
    if (month !== 'all' || year !== 'all') {
      if (doc.data) {
        const [y, m] = doc.data.split('-')
        if (month !== 'all' && m !== month) matchesDate = false
        if (year !== 'all' && y !== year) matchesDate = false
      } else {
        matchesDate = false
      }
    }

    return matchesSearch && matchesDate
  })

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Espelhos de Danos</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por Linha, Carro ou número da OS..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              <SelectItem value="01">Janeiro</SelectItem>
              <SelectItem value="02">Fevereiro</SelectItem>
              <SelectItem value="03">Março</SelectItem>
              <SelectItem value="04">Abril</SelectItem>
              <SelectItem value="05">Maio</SelectItem>
              <SelectItem value="06">Junho</SelectItem>
              <SelectItem value="07">Julho</SelectItem>
              <SelectItem value="08">Agosto</SelectItem>
              <SelectItem value="09">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 max-w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="min-w-[100px]">Data</TableHead>
                  <TableHead className="min-w-[150px]">Garagem</TableHead>
                  <TableHead className="min-w-[100px]">Linha</TableHead>
                  <TableHead className="min-w-[100px]">Carro</TableHead>
                  <TableHead className="min-w-[120px]">OS</TableHead>
                  <TableHead className="w-[140px] min-w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocumentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhum Espelho de Danos encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocumentos.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        {doc.data ? doc.data.split('-').reverse().join('/') : '-'}
                      </TableCell>
                      <TableCell>{doc.garagem || '-'}</TableCell>
                      <TableCell>{doc.linha || '-'}</TableCell>
                      <TableCell>{doc.numero_carro || '-'}</TableCell>
                      <TableCell>
                        {doc.numero_os ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {doc.numero_os}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewDoc(doc)}
                            title="Visualizar"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Baixar PDF"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          >
                            <a
                              href={doc.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditOsDoc(doc)
                              setOsInput(doc.numero_os || '')
                            }}
                            title="Editar OS"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Modal Visualização */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white text-[#333333] border-none shadow-lg rounded-xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle className="text-xl font-bold">Detalhes do Documento</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] mt-4 pr-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Garagem</span>
                <span className="text-[#333333]">{viewDoc?.garagem || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Linha</span>
                <span className="text-[#333333]">{viewDoc?.linha || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Carro</span>
                <span className="text-[#333333]">{viewDoc?.numero_carro || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Data / Horário</span>
                <span className="text-[#333333]">
                  {viewDoc?.data ? viewDoc.data.split('-').reverse().join('/') : '-'}{' '}
                  {viewDoc?.horario || ''}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Vistoriador</span>
                <span className="text-[#333333]">
                  {viewDoc?.nome_responsavel || viewDoc?.nome_motorista || '-'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Número da OS</span>
                <span className="text-[#333333]">{viewDoc?.numero_os || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Ocorrência</span>
                <span className="text-[#333333]">{viewDoc?.ocorrencia || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#333333]">Descrição dos Danos</span>
                <span className="text-[#333333] whitespace-pre-wrap">
                  {viewDoc?.descricao_danos || '-'}
                </span>
              </div>

              {(viewDoc?.foto_url || (viewDoc?.fotos_urls && viewDoc.fotos_urls.length > 0)) && (
                <div className="flex flex-col mt-2">
                  <span className="font-bold text-[#333333] mb-2">Fotos Anexadas</span>
                  <div className="flex flex-wrap gap-2">
                    {viewDoc.foto_url && (
                      <img
                        src={viewDoc.foto_url}
                        alt="Foto principal"
                        className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setExpandedPhoto(viewDoc.foto_url)}
                      />
                    )}
                    {viewDoc.fotos_urls?.map((url: string, index: number) =>
                      url ? (
                        <img
                          key={index}
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setExpandedPhoto(url)}
                        />
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6 flex gap-2 sm:justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setViewDoc(null)}
              className="bg-white border-[#333333] text-[#333333] hover:bg-slate-50"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setEditOsDoc(viewDoc)
                setOsInput(viewDoc?.numero_os || '')
                setViewDoc(null)
              }}
              className="bg-[#1A522E] text-white hover:bg-[#1A522E]/90"
            >
              Preencher OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar OS */}
      <Dialog open={!!editOsDoc} onOpenChange={(open) => !open && setEditOsDoc(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Preencher Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="os">Número da OS</Label>
              <Input
                id="os"
                value={osInput}
                onChange={(e) => setOsInput(e.target.value)}
                placeholder="Digite o número da OS"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOsDoc(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOs} disabled={isSaving || !osInput.trim()}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Foto Ampliada */}
      <Dialog open={!!expandedPhoto} onOpenChange={(open) => !open && setExpandedPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none flex justify-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black/70 [&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center">
          <DialogTitle className="sr-only">Foto Ampliada</DialogTitle>
          {expandedPhoto && (
            <img
              src={expandedPhoto}
              alt="Foto Ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
