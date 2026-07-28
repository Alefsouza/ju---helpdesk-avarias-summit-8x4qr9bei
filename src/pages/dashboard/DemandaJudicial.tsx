import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Gavel,
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { isMariaJuridico } from '@/lib/juridico-access'
import { useToast } from '@/hooks/use-toast'
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

export default function DemandaJudicial() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [date, setDate] = useState<DateRange | undefined>()

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )
  const [confirmReabrirId, setConfirmReabrirId] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      supabase
        .from('perfil_usuario')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setCurrentUserProfile(data)
        })
    }
  }, [user])

  const isMaria = isMariaJuridico(user?.email)

  const isSupport =
    currentUserProfile?.tipo_usuario === 'responsavel' ||
    currentUserProfile?.tipo_usuario === 'sinistro' ||
    currentUserProfile?.tipo_usuario === 'admin' ||
    currentUserProfile?.tipo_usuario === 'juridico' ||
    isMaria

  const defaultWidths: Record<string, number> = {
    pia: 120,
    titulo: 300,
    solicitante: 180,
    prioridade: 120,
    colaborador: 180,
    atualizacao: 160,
    acoes: 100,
  }

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('demanda_col_widths')
      return saved ? JSON.parse(saved) : defaultWidths
    } catch {
      return defaultWidths
    }
  })

  const [resizingCol, setResizingCol] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)

  const onDragStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingCol(colId)
    setStartX(e.clientX)
    setStartWidth(columnWidths[colId] || defaultWidths[colId] || 150)
  }

  useEffect(() => {
    if (!resizingCol) return
    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(50, startWidth + diff)
      setColumnWidths((prev) => {
        const updated = { ...prev, [resizingCol]: newWidth }
        localStorage.setItem('demanda_col_widths', JSON.stringify(updated))
        return updated
      })
    }
    const onMouseUp = () => setResizingCol(null)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [resizingCol, startX, startWidth])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchChamados = async () => {
    if (!user) return
    setLoading(true)
    setError(false)
    try {
      let query = supabase
        .from('chamados')
        .select('*')
        .eq('status_juridico', 'Demanda Judicial')
        .order('atualizado_em', { ascending: false })
        .limit(200)

      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`
        query = query.or(
          `titulo.ilike.${term},carro.ilike.${term},registro_motorista.ilike.${term},registro_cobrador.ilike.${term},descricao.ilike.${term},pia.ilike.${term}`,
        )
      }

      if (date?.from) {
        query = query.gte('criado_em', date.from.toISOString())
      }
      if (date?.to) {
        const toDate = new Date(date.to)
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('criado_em', toDate.toISOString())
      }

      const { data, error: err } = await query

      if (err) throw err

      if (data && data.length > 0) {
        const userIds = [
          ...new Set(data.flatMap((c) => [c.usuario_id, c.responsavel_id]).filter(Boolean)),
        ]
        const { data: perfis } = await supabase
          .from('perfil_usuario')
          .select('id, nome_completo')
          .in('id', userIds)

        const perfilMap = perfis?.reduce(
          (acc, p) => {
            acc[p.id] = p.nome_completo
            return acc
          },
          {} as Record<string, string>,
        )

        const chamadosComNome = data.map((c) => ({
          ...c,
          nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
          nome_responsavel: c.responsavel_id
            ? perfilMap?.[c.responsavel_id] || 'Sem responsável'
            : 'Sem responsável',
        }))

        setChamados(chamadosComNome)
      } else {
        setChamados([])
      }
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChamados()
  }, [user, debouncedSearch, date])

  const handleReabrir = async (chamadoId: string) => {
    setCompletingId(chamadoId)
    setConfirmReabrirId(null)
    try {
      const { data, error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'aberto',
          responsavel_id: user?.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', chamadoId)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Falha ao atualizar chamado no banco')

      const { error: histError } = await supabase
        .from('historico_chamado')
        .insert({ chamado_id: chamadoId, usuario_id: user?.id, acao: 'reaberto' })

      if (histError) throw histError

      toast({ title: 'Chamado reaberto com sucesso!' })

      navigate(`/dashboard/chamados/${chamadoId}`)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao reabrir chamado', variant: 'destructive' })
    } finally {
      setCompletingId(null)
    }
  }

  const navigateToDetails = (id: string) => navigate(`/dashboard/chamados/${id}`)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const PriorityBadge = ({ priority }: { priority: string | null }) => {
    if (!priority)
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
          NÃO DEFINIDA
        </Badge>
      )
    const colors: Record<string, string> = {
      alta: 'bg-red-100 text-red-800 border-red-200',
      media: 'bg-orange-100 text-orange-800 border-orange-200',
      baixa: 'bg-slate-100 text-slate-800 border-slate-200',
      urgente: 'bg-red-600 text-white border-red-700',
    }
    return (
      <Badge variant="outline" className={colors[priority] || ''}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' }
        return null
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedChamados = [...chamados].sort((a, b) => {
    if (sortConfig) {
      const aVal = String(a[sortConfig.key] || '').toLowerCase()
      const bVal = String(b[sortConfig.key] || '').toLowerCase()
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    }
    return new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Demanda Judicial</h1>
          <p className="text-slate-500">Chamados classificados como Demanda Judicial.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Pesquisar por Título, R.A., Carro, Descrição..."
            className="pl-9 bg-white shadow-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full sm:w-[300px] justify-start text-left font-normal bg-white shadow-sm',
                  !date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(date.to, 'dd/MM/yyyy', { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, 'dd/MM/yyyy', { locale: ptBR })
                  )
                ) : (
                  <span>Filtrar por data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Erro ao carregar chamados</h3>
          <p className="text-slate-500 mb-6">Ocorreu um problema ao buscar os chamados.</p>
          <Button onClick={fetchChamados}>Tentar novamente</Button>
        </div>
      ) : sortedChamados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <Gavel className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum chamado encontrado</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Não há chamados correspondentes aos filtros selecionados.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-x-auto w-full relative select-none z-0">
            <Table style={{ tableLayout: 'fixed', minWidth: 'max-content' }} className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('pia')}
                    style={{ width: columnWidths.pia }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">R.A.</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'pia')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('titulo')}
                    style={{ width: columnWidths.titulo }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Título</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'titulo')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('nome_usuario')}
                    style={{ width: columnWidths.solicitante }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Solicitante</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'solicitante')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('prioridade')}
                    style={{ width: columnWidths.prioridade }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Prioridade</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'prioridade')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('nome_responsavel')}
                    style={{ width: columnWidths.colaborador }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate">Colaborador</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'colaborador')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead
                    className="relative cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSort('atualizado_em')}
                    style={{ width: columnWidths.atualizacao }}
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      <span className="truncate whitespace-nowrap">Atualizado Em</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize bg-slate-200 hover:bg-slate-400 active:bg-slate-600 z-10 transition-colors"
                      onMouseDown={(e) => onDragStart(e, 'atualizacao')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

                  <TableHead className="relative text-right" style={{ width: columnWidths.acoes }}>
                    <div className="pr-2">Ações</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedChamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors h-[60px]">
                    <TableCell className="align-middle">
                      <div
                        className="line-clamp-2 font-semibold text-slate-700"
                        title={c.pia || ''}
                      >
                        {c.pia || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="line-clamp-2 font-medium text-slate-900" title={c.titulo}>
                        {c.titulo}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm">
                      <div
                        className="line-clamp-2 font-medium text-slate-700"
                        title={c.nome_usuario}
                      >
                        {c.nome_usuario}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <PriorityBadge priority={c.prioridade} />
                    </TableCell>
                    <TableCell className="align-middle text-sm">
                      <div
                        className="line-clamp-2 font-medium text-slate-700"
                        title={c.nome_responsavel}
                      >
                        {c.nome_responsavel}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(c.atualizado_em)}
                    </TableCell>
                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToDetails(c.id)}
                          title="Ver Detalhes"
                          className="px-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {isSupport && c.status === 'finalizado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmReabrirId(c.id)
                            }}
                            disabled={completingId === c.id}
                            title="Reabrir Chamado"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 z-0">
            {sortedChamados.map((c) => (
              <Card key={c.id} className="border-slate-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                        R.A.: {c.pia || '—'}
                      </div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PriorityBadge priority={c.prioridade} />
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-800 border-slate-200"
                    >
                      {c.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 truncate mr-2">
                        Solicitante: {c.nome_usuario}
                      </span>
                      <span className="whitespace-nowrap">{formatDate(c.atualizado_em)}</span>
                    </div>
                    <div className="font-medium text-slate-700 truncate">
                      Colaborador: {c.nome_responsavel}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigateToDetails(c.id)}
                      title="Ver Detalhes"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {isSupport && c.status === 'finalizado' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmReabrirId(c.id)
                        }}
                        disabled={completingId === c.id}
                        title="Reabrir Chamado"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <AlertDialog
        open={!!confirmReabrirId}
        onOpenChange={(open) => !open && setConfirmReabrirId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja reabrir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado voltará para a fila de atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReabrirId && handleReabrir(confirmReabrirId)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
