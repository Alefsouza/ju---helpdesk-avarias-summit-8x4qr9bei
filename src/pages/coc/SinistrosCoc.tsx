import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Search } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SinistrosCoc() {
  const [sinistros, setSinistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState<'all' | 'month' | 'day'>('all')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedSinistro, setSelectedSinistro] = useState<any>(null)

  const fetchSinistros = async () => {
    try {
      const { data: allowedUsers } = await supabase
        .from('perfil_usuario')
        .select('id')
        .eq('tipo_usuario', 'coc')

      const allowedUserIds = allowedUsers?.map((u: any) => u.id) || []

      if (allowedUserIds.length === 0) {
        setSinistros([])
        return
      }

      const { data, error } = await supabase
        .from('chamados')
        .select(`
          *,
          anexos_chamado(url_arquivo)
        `)
        .in('usuario_id', allowedUserIds)
        .order('criado_em', { ascending: false })

      if (error) throw error

      const filteredData = (data || []).filter((s) => {
        const checkboxMarked =
          s.tipo_chamado === 'Contém vítimas, mas não tem avarias' ||
          s.tipo_chamado === 'Avaria sem vítima' ||
          s.tipo_chamado === 'true' ||
          s.tipo_chamado === true

        return !checkboxMarked
      })

      setSinistros(filteredData)
    } catch (error: any) {
      toast.error('Erro ao buscar sinistros: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSinistros()

    const channel = supabase
      .channel('sinistros_coc_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchSinistros()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const uniqueMonths = useMemo(() => {
    const months = new Set(sinistros.map((s) => format(parseISO(s.criado_em), 'yyyy-MM')))
    return Array.from(months).sort().reverse()
  }, [sinistros])

  const formatMonth = (m: string) => {
    const str = format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: ptBR })
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  useEffect(() => {
    if (filterType === 'month' && !selectedMonth && uniqueMonths.length > 0) {
      setSelectedMonth(uniqueMonths[0])
    }
  }, [filterType, selectedMonth, uniqueMonths])

  const filteredSinistros = useMemo(() => {
    return sinistros.filter((s) => {
      if (filterType === 'month' && selectedMonth) {
        if (format(parseISO(s.criado_em), 'yyyy-MM') !== selectedMonth) {
          return false
        }
      }

      if (filterType === 'day' && selectedDay) {
        if (format(parseISO(s.criado_em), 'yyyy-MM-dd') !== selectedDay) {
          return false
        }
      }

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchCarro = s.carro?.toLowerCase().includes(query)
        const matchTitulo = s.titulo?.toLowerCase().includes(query)
        const matchMotorista = s.nome_motorista?.toLowerCase().includes(query)

        if (!matchCarro && !matchTitulo && !matchMotorista) {
          return false
        }
      }

      return true
    })
  }, [sinistros, filterType, selectedMonth, selectedDay, searchQuery])

  const openView = (s: any) => {
    setSelectedSinistro(s)
    setViewModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Sinistros</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="space-y-2 w-full sm:w-48 shrink-0">
          <Label>Filtrar por Período</Label>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as 'all' | 'month' | 'day')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="day">Por Dia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterType === 'month' && (
          <div className="space-y-2 w-full sm:w-48 shrink-0 animate-fade-in">
            <Label>Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {uniqueMonths.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhum dado
                  </SelectItem>
                ) : (
                  uniqueMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonth(m)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {filterType === 'day' && (
          <div className="space-y-2 w-full sm:w-48 shrink-0 animate-fade-in">
            <Label>Data Específica</Label>
            <Input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2 flex-1">
          <Label>Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por carro, título ou motorista..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[140px] min-w-[80px] h-12 px-4 flex items-center">
                    Operações
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[200px] min-w-[180px] h-12 px-4 flex items-center">
                    Data
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[250px] min-w-[100px] h-12 px-4 flex items-center">
                    Título
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[180px] min-w-[100px] h-12 px-4 flex items-center">
                    Motorista
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[180px] min-w-[100px] h-12 px-4 flex items-center">
                    Cobrador
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[100px] min-w-[60px] h-12 px-4 flex items-center">
                    Linha
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[100px] min-w-[60px] h-12 px-4 flex items-center">
                    Carro
                  </div>
                </TableHead>
                <TableHead className="p-0 border-r border-slate-200/50 hover:bg-slate-50 transition-colors">
                  <div className="resize-x overflow-hidden w-[200px] min-w-[100px] h-12 px-4 flex items-center">
                    Local
                  </div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredSinistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Nenhum sinistro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSinistros.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.operacao || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(s.criado_em), "dd/MM/yyyy 'às' HH:mm:ss")}
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate" title={s.titulo}>
                      {s.titulo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.nome_motorista || '-'} <br />
                      <span className="text-xs text-slate-500">{s.registro_motorista || ''}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.nome_cobrador || '-'} <br />
                      <span className="text-xs text-slate-500">{s.registro_cobrador || ''}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{s.linha || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.carro || '-'}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={s.local_ocorrencia}>
                      {s.local_ocorrencia || '-'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(s)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Sinistro</DialogTitle>
          </DialogHeader>

          {selectedSinistro && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Título</p>
                <p className="text-sm">{selectedSinistro.titulo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Data de Criação</p>
                <p className="text-sm">
                  {format(parseISO(selectedSinistro.criado_em), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-slate-500">Descrição</p>
                <p className="text-sm bg-slate-50 p-3 rounded-md whitespace-pre-wrap">
                  {selectedSinistro.descricao}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Motorista</p>
                <p className="text-sm">
                  {selectedSinistro.nome_motorista || '-'} (Reg:{' '}
                  {selectedSinistro.registro_motorista || '-'})
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Colaborador</p>
                <p className="text-sm">
                  {selectedSinistro.nome_cobrador || '-'} (Reg:{' '}
                  {selectedSinistro.registro_cobrador || '-'})
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Cargo</p>
                <p className="text-sm">-</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Linha</p>
                <p className="text-sm">{selectedSinistro.linha || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Carro</p>
                <p className="text-sm">{selectedSinistro.carro || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Local</p>
                <p className="text-sm">{selectedSinistro.local_ocorrencia || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Operações</p>
                <p className="text-sm">{selectedSinistro.operacao || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Tipo de Avaria</p>
                <p className="text-sm">{selectedSinistro.tipo_chamado || '-'}</p>
              </div>

              {selectedSinistro.anexos_chamado?.[0] && (
                <div className="space-y-1 sm:col-span-2 mt-4">
                  <p className="text-sm font-medium text-slate-500 mb-2">Anexo</p>
                  {selectedSinistro.anexos_chamado[0].url_arquivo
                    .toLowerCase()
                    .match(/\.(jpeg|jpg|gif|png)$/) ? (
                    <img
                      src={selectedSinistro.anexos_chamado[0].url_arquivo}
                      alt="Anexo"
                      className="max-w-full h-auto rounded-md border border-slate-200"
                    />
                  ) : (
                    <a
                      href={selectedSinistro.anexos_chamado[0].url_arquivo}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-md"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar Documento
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
