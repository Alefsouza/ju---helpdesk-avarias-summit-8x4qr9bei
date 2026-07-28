import { useState, useMemo, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Search, FilterX, ExternalLink, CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { ChartFilters } from '@/hooks/use-chamados-dashboard'

export interface TableFilters {
  search: string
  debouncedSearch: string
  period: string
  dateRange: { from?: Date; to?: Date } | undefined
  status: string
  situacaoProcesso: string
  statusInterno: string
  responsavel: string
}

const INITIAL_TABLE_FILTERS: TableFilters = {
  search: '',
  debouncedSearch: '',
  period: 'all',
  dateRange: undefined,
  status: 'all',
  situacaoProcesso: 'all',
  statusInterno: 'all',
  responsavel: 'all',
}

const statusColor: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  em_atendimento: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  finalizado: 'bg-[#404040] text-white hover:bg-[#404040]/90 border-transparent',
  unificado: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
}

const statusLabel: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  unificado: 'Unificado',
}

const situacaoProcessoColor: Record<string, string> = {
  'Aguardando Julgamento': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  Arquivado: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  'Cobrar Terceiro': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  'Convocação do Operador': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'Notificação Extrajudicial': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  Subjúdice: 'bg-red-100 text-red-800 hover:bg-red-100',
}

const SITUACAO_OPTIONS = [
  'Aguardando Julgamento',
  'Arquivado',
  'Cobrar Terceiro',
  'Convocação do Operador',
  'Notificação Extrajudicial',
  'Subjúdice',
]

export function DashboardTable({
  chamados,
  responsaveis,
  chartFilters,
  tableFilters,
  onTableFiltersChange,
  loading,
}: {
  chamados: any[]
  responsaveis: any[]
  chartFilters?: ChartFilters
  tableFilters: TableFilters
  onTableFiltersChange: Dispatch<SetStateAction<TableFilters>>
  loading?: boolean
}) {
  const [page, setPage] = useState(1)
  const limit = 20

  const update = (patch: Partial<TableFilters>) =>
    onTableFiltersChange((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    const timer = setTimeout(() => {
      onTableFiltersChange((prev) =>
        prev.debouncedSearch === prev.search ? prev : { ...prev, debouncedSearch: prev.search },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [tableFilters.search, onTableFiltersChange])

  useEffect(() => {
    setPage(1)
  }, [
    tableFilters.debouncedSearch,
    tableFilters.status,
    tableFilters.situacaoProcesso,
    tableFilters.statusInterno,
    tableFilters.responsavel,
    tableFilters.period,
    tableFilters.dateRange,
    chartFilters,
  ])

  const uniqueStatusInterno = useMemo(() => {
    const s = new Set<string>()
    chamados.forEach((c) => {
      if (c.status_interno) s.add(c.status_interno)
    })
    return Array.from(s).sort()
  }, [chamados])

  const uniqueSituacaoProcesso = useMemo(() => {
    const s = new Set<string>()
    chamados.forEach((c) => {
      if (c.situacao_processo) s.add(c.situacao_processo)
    })
    return Array.from(s).sort()
  }, [chamados])

  const clearFilters = () => {
    onTableFiltersChange(INITIAL_TABLE_FILTERS)
    setPage(1)
  }

  const totalCount = chamados.length
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * limit
  const displayChamados = chamados.slice(start, start + limit)

  const hasLocalFilters =
    tableFilters.search !== '' ||
    tableFilters.period !== 'all' ||
    !!tableFilters.dateRange ||
    tableFilters.status !== 'all' ||
    tableFilters.situacaoProcesso !== 'all' ||
    tableFilters.statusInterno !== 'all' ||
    tableFilters.responsavel !== 'all'

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const maxPagesToShow = 5
    let startPage = Math.max(1, safePage - 2)
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (safePage > 1) setPage(safePage - 1)
              }}
              className={cn(safePage === 1 && 'pointer-events-none opacity-50')}
            />
          </PaginationItem>
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage(1)
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === safePage}
                onClick={(e) => {
                  e.preventDefault()
                  setPage(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage(totalPages)
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (safePage < totalPages) setPage(safePage + 1)
              }}
              className={cn(safePage === totalPages && 'pointer-events-none opacity-50')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <Card className="flex-1 shadow-sm border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle">
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-[#225f3d]">
            Chamados Filtrados
            <span className="ml-2 text-sm font-normal text-slate-500">({totalCount} no total)</span>
          </h3>
          {hasLocalFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-500 hover:text-slate-700"
            >
              <FilterX className="h-4 w-4 mr-1" /> Limpar filtros da tabela
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] placeholder:text-slate-500"
              placeholder="Buscar por Título ou ID..."
              value={tableFilters.search}
              onChange={(e) => update({ search: e.target.value })}
            />
          </div>
          <div className="flex gap-2 w-full">
            <Select value={tableFilters.period} onValueChange={(v) => update({ period: v })}>
              <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] flex-1">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {tableFilters.period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal bg-[#f0f0f0] border-[#f0f0f0] text-[#212121] flex-1 px-3',
                      !tableFilters.dateRange && 'text-slate-500',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tableFilters.dateRange?.from ? (
                      tableFilters.dateRange.to ? (
                        <span className="text-xs truncate">
                          {format(tableFilters.dateRange.from, 'dd/MM/yy')} -{' '}
                          {format(tableFilters.dateRange.to, 'dd/MM/yy')}
                        </span>
                      ) : (
                        <span className="text-xs">
                          {format(tableFilters.dateRange.from, 'dd/MM/yy')}
                        </span>
                      )
                    ) : (
                      <span className="text-xs">Selecione...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={tableFilters.dateRange?.from}
                    selected={tableFilters.dateRange}
                    onSelect={(range) => update({ dateRange: range ?? undefined })}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Select value={tableFilters.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="unificado">Unificado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={tableFilters.situacaoProcesso}
            onValueChange={(v) => update({ situacaoProcesso: v })}
          >
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Situação do Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Situações</SelectItem>
              {SITUACAO_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              {uniqueSituacaoProcesso
                .filter((s) => !SITUACAO_OPTIONS.includes(s))
                .map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={tableFilters.statusInterno}
            onValueChange={(v) => update({ statusInterno: v })}
          >
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Status Interno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status Interno</SelectItem>
              {uniqueStatusInterno.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tableFilters.responsavel}
            onValueChange={(v) => update({ responsavel: v })}
          >
            <SelectTrigger className="bg-[#f0f0f0] border-[#f0f0f0] text-[#212121]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Responsáveis</SelectItem>
              <SelectItem value="unassigned">Sem Responsável</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {displayChamados.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-[#f0f0f0] rounded-lg border-dashed">
            <FilterX className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-lg font-medium">Nenhum chamado encontrado</h3>
            <p className="text-slate-500 mb-4 text-sm">
              Tente ajustar ou remover os filtros aplicados.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-md border border-[#f0f0f0] overflow-x-auto relative min-h-[300px]">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-[#225f3d]" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#c8e6c9] hover:bg-[#c8e6c9]/90 border-[#f0f0f0]">
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Título
                    </TableHead>
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Status
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-[#225f3d] font-semibold text-[14px]">
                      Situação do Processo
                    </TableHead>
                    <TableHead className="text-[#225f3d] font-semibold text-[14px]">
                      Responsável
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-[#225f3d] font-semibold text-[14px]">
                      Status Interno
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-[#225f3d] font-semibold text-[14px]">
                      Criado em
                    </TableHead>
                    <TableHead className="text-right text-[#225f3d] font-semibold text-[14px]">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayChamados.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-[#f0f0f0] odd:bg-white even:bg-[#fbfbfb] hover:bg-[#f0f0f0]/50 transition-colors"
                    >
                      <TableCell className="font-medium text-[#212121] max-w-[250px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{c.titulo}</span>
                          {c.is_duplicate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Atenção: Já existe um chamado ativo (aberto ou em atendimento)
                                    para este veículo com a mesma data de criação ou ocorrência.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor[c.status]} variant="secondary">
                          {statusLabel[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {c.situacao_processo ? (
                          <Badge
                            className={
                              situacaoProcessoColor[c.situacao_processo] ||
                              'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                            variant="secondary"
                          >
                            {c.situacao_processo}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[#212121]">
                        {c.responsavel?.nome_completo || 'Não atribuído'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-[#212121] truncate max-w-[150px]">
                        {c.status_interno || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-[#212121]">
                        {format(new Date(c.criado_em), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-[#225f3d] hover:text-[#225f3d] hover:bg-[#c8e6c9]/50"
                        >
                          <Link to={`/dashboard/chamados/${c.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" /> Ver detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-4 relative min-h-[300px]">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-[#225f3d]" />
                </div>
              )}
              {displayChamados.map((c) => (
                <Card
                  key={c.id}
                  className="border-[#f0f0f0] shadow-sm hover:shadow-subtle transition-all"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium leading-tight">{c.titulo}</h4>
                          {c.is_duplicate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Atenção: Já existe um chamado ativo (aberto ou em atendimento)
                                    para este veículo com a mesma data de criação ou ocorrência.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusColor[c.status]} variant="secondary">
                        {statusLabel[c.status]}
                      </Badge>
                      {c.situacao_processo && (
                        <Badge
                          className={
                            situacaoProcessoColor[c.situacao_processo] ||
                            'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                          variant="secondary"
                        >
                          {c.situacao_processo}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="truncate mr-2 font-medium">
                          {c.responsavel?.nome_completo || 'Não atribuído'}
                        </span>
                        <span className="shrink-0">
                          {format(new Date(c.criado_em), 'dd/MM/yy')}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-700">STATUS INTERNO:</span>{' '}
                        {c.status_interno || '-'}
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full mt-2">
                      <Link to={`/dashboard/chamados/${c.id}`}>Ver detalhes</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {renderPagination()}
          </>
        )}
      </CardContent>
    </Card>
  )
}
