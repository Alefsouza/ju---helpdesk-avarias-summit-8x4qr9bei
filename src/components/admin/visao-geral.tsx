import { useState } from 'react'
import { useChamadosDashboard, type ChartFilters } from '@/hooks/use-chamados-dashboard'
import { DashboardCards } from './dashboard-cards'
import { DashboardCharts } from './dashboard-charts'
import { DashboardTable, type TableFilters } from './dashboard-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, FilterX, Filter } from 'lucide-react'

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

export function VisaoGeral() {
  const [chartFilters, setChartFilters] = useState<ChartFilters>({})
  const [tableFilters, setTableFilters] = useState<TableFilters>(INITIAL_TABLE_FILTERS)

  const { chamados, responsaveis, loading, error, refetch } = useChamadosDashboard({
    search: tableFilters.debouncedSearch,
    status: tableFilters.status,
    situacaoProcesso: tableFilters.situacaoProcesso,
    statusInterno: tableFilters.statusInterno,
    responsavel: tableFilters.responsavel,
    period: tableFilters.period,
    dateRange: tableFilters.dateRange,
    chartFilters,
  })

  const handleChartClick = (
    type: 'status' | 'prioridade' | 'garagem' | 'responsavel' | 'data' | 'overdue' | 'clear',
    value: string,
    multiSelect: boolean = false,
  ) => {
    setChartFilters((prev) => {
      if (type === 'clear') return {}
      if (type === 'overdue') return { ...prev, overdue: !prev.overdue }
      const current = (prev[type] as string[] | undefined) || []
      if (multiSelect) {
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [type]: next.length > 0 ? next : undefined }
      }
      if (current.length === 1 && current[0] === value) {
        return { ...prev, [type]: undefined }
      }
      return { ...prev, [type]: [value] }
    })
  }

  const handleClearChartFilters = () => setChartFilters({})

  const handleClearAllFilters = () => {
    setChartFilters({})
    setTableFilters(INITIAL_TABLE_FILTERS)
  }

  const hasTableFilters =
    tableFilters.search !== '' ||
    tableFilters.period !== 'all' ||
    !!tableFilters.dateRange ||
    tableFilters.status !== 'all' ||
    tableFilters.situacaoProcesso !== 'all' ||
    tableFilters.statusInterno !== 'all' ||
    tableFilters.responsavel !== 'all'

  const hasChartFilters = Object.entries(chartFilters).some(([k, v]) =>
    k === 'overdue' ? v === true : Array.isArray(v) && v.length > 0,
  )

  const hasAnyFilters = hasTableFilters || hasChartFilters

  if (loading && chamados.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-slate-50">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro ao carregar dashboard</h2>
        <p className="text-slate-500 mb-4 text-sm">
          Ocorreu um problema ao conectar com o banco de dados.
        </p>
        <Button onClick={refetch}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {hasAnyFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in bg-[#225f3d]/5 p-3 rounded-lg border border-[#225f3d]/15">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#225f3d]/10 text-[#225f3d] border-[#225f3d]/20 hover:bg-[#225f3d]/10">
              <Filter className="h-3 w-3 mr-1" /> Visão Filtrada
            </Badge>
            <span className="text-sm text-slate-600 font-medium">
              {chamados.length} chamado{chamados.length !== 1 ? 's' : ''} correspondem aos filtros
              aplicados
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllFilters}
            className="text-slate-600 border-slate-300 hover:bg-slate-100 shrink-0"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Limpar Todos os Filtros
          </Button>
        </div>
      )}
      <DashboardCards
        chamados={chamados}
        chartFilters={chartFilters}
        onCardClick={handleChartClick}
      />
      <DashboardCharts
        chamados={chamados}
        chartFilters={chartFilters}
        onChartClick={handleChartClick}
        onClearFilters={handleClearChartFilters}
      />
      <DashboardTable
        chamados={chamados}
        responsaveis={responsaveis}
        chartFilters={chartFilters}
        tableFilters={tableFilters}
        onTableFiltersChange={setTableFilters}
        loading={loading}
      />
    </div>
  )
}
