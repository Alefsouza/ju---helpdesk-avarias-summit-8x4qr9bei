import { useMemo } from 'react'
import {
  Pie,
  PieChart,
  Cell,
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { FilterX } from 'lucide-react'
import { format, subDays, isBefore } from 'date-fns'
import type { ChartFilters } from '@/hooks/use-chamados-dashboard'

const statusColors = {
  aberto: '#225f3d',
  em_atendimento: '#c8e6c9',
  finalizado: '#808080',
  unificado: '#a855f7',
}

const priorityColors = {
  media: '#c8e6c9',
  urgente: '#ef4444',
}

function filterChamados(data: any[], cf: ChartFilters, excludeKey?: string): any[] {
  return data.filter((c) => {
    if (excludeKey !== 'status' && cf.status?.length && !cf.status.includes(c.status)) return false
    if (
      excludeKey !== 'prioridade' &&
      cf.prioridade?.length &&
      !cf.prioridade.includes(c.prioridade)
    )
      return false
    if (excludeKey !== 'garagem' && cf.garagem?.length) {
      const g = c.garagem || 'Não Informada'
      if (!cf.garagem.includes(g)) return false
    }
    if (excludeKey !== 'responsavel' && cf.responsavel?.length) {
      const respId = c.responsavel?.id || 'unassigned'
      if (!cf.responsavel.includes(respId)) return false
    }
    if (excludeKey !== 'data' && cf.data?.length) {
      if (!c.criado_em) return false
      if (!cf.data.includes(c.criado_em.substring(0, 10))) return false
    }
    if (excludeKey !== 'overdue' && cf.overdue) {
      if (c.status === 'finalizado') return false
      if (!isBefore(new Date(c.criado_em), subDays(new Date(), 30))) return false
    }
    return true
  })
}

export function DashboardCharts({
  chamados,
  chartFilters,
  onChartClick,
  onClearFilters,
}: {
  chamados: any[]
  chartFilters: ChartFilters
  onChartClick: (
    type: 'status' | 'prioridade' | 'garagem' | 'responsavel' | 'data' | 'overdue',
    value: string,
    multiSelect?: boolean,
  ) => void
  onClearFilters: () => void
}) {
  const statusData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters, 'status')
    return [
      {
        id: 'aberto',
        name: 'Aberto',
        value: data.filter((c) => c.status === 'aberto').length,
        fill: statusColors.aberto,
      },
      {
        id: 'em_atendimento',
        name: 'Em Atendimento',
        value: data.filter((c) => c.status === 'em_atendimento').length,
        fill: statusColors.em_atendimento,
      },
      {
        id: 'finalizado',
        name: 'Finalizado',
        value: data.filter((c) => c.status === 'finalizado').length,
        fill: statusColors.finalizado,
      },
      {
        id: 'unificado',
        name: 'Unificado',
        value: data.filter((c) => c.status === 'unificado').length,
        fill: statusColors.unificado,
      },
    ]
  }, [chamados, chartFilters])

  const prioData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters, 'prioridade')
    return [
      {
        id: 'media',
        name: 'Média',
        value: data.filter((c) => c.prioridade === 'media').length,
        fill: priorityColors.media,
      },
      {
        id: 'urgente',
        name: 'Urgente',
        value: data.filter((c) => c.prioridade === 'urgente').length,
        fill: priorityColors.urgente,
      },
    ]
  }, [chamados, chartFilters])

  const garageData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters, 'garagem')
    const counts: Record<string, number> = {}
    data.forEach((c) => {
      const g = c.garagem || 'Não Informada'
      counts[g] = (counts[g] || 0) + 1
    })
    const colors = [
      '#225f3d',
      '#c8e6c9',
      '#4caf50',
      '#81c784',
      '#a5d6a7',
      '#66bb6a',
      '#388e3c',
      '#2e7d32',
      '#1b5e20',
    ]
    return Object.entries(counts)
      .map(([name, value], idx) => ({ id: name, name, value, fill: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
  }, [chamados, chartFilters])

  const respData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters, 'responsavel')
    const counts: Record<string, { name: string; value: number; id: string }> = {}
    data.forEach((c) => {
      const respId = c.responsavel?.id || 'unassigned'
      const respName = c.responsavel?.nome_completo || 'Sem Responsável'
      if (!counts[respId]) counts[respId] = { id: respId, name: respName, value: 0 }
      counts[respId].value += 1
    })
    return Object.values(counts)
      .sort((a, b) => b.value - a.value)
      .map((d) => ({ ...d, fill: '#225f3d' }))
  }, [chamados, chartFilters])

  const situacaoProcessoData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters)
    const options = [
      'Aguardando Julgamento',
      'Arquivado',
      'Cobrar Terceiro',
      'Convocação do Operador',
      'Notificação Extrajudicial',
      'Subjúdice',
    ]
    const counts: Record<string, number> = {}
    options.forEach((opt) => {
      counts[opt] = 0
    })
    data.forEach((c) => {
      if (c.situacao_processo) counts[c.situacao_processo] = (counts[c.situacao_processo] || 0) + 1
    })
    const colors = ['#225f3d', '#c8e6c9', '#4caf50', '#81c784', '#a5d6a7', '#66bb6a']
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value], idx) => ({ id: name, name, value, fill: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
  }, [chamados, chartFilters])

  const timelineData = useMemo(() => {
    const data = filterChamados(chamados, chartFilters, 'data')
    const counts: Record<string, number> = {}
    data.forEach((c) => {
      if (!c.criado_em) return
      const sortKey = c.criado_em.substring(0, 10)
      counts[sortKey] = (counts[sortKey] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([sortKey, value]) => {
        const [, mm, dd] = sortKey.split('-')
        return { date: `${dd}/${mm}`, fullDate: sortKey, value }
      })
  }, [chamados, chartFilters])

  const statusConfig = {
    aberto: { label: 'Aberto', color: statusColors.aberto },
    em_atendimento: { label: 'Em Atendimento', color: statusColors.em_atendimento },
    finalizado: { label: 'Finalizado', color: statusColors.finalizado },
    unificado: { label: 'Unificado', color: statusColors.unificado },
  }

  const prioConfig = {
    media: { label: 'Média', color: priorityColors.media },
    urgente: { label: 'Urgente', color: priorityColors.urgente },
  }

  const hasActiveFilters = Object.entries(chartFilters).some(([k, v]) =>
    k === 'overdue' ? v === true : Array.isArray(v) && v.length > 0,
  )

  const formatFilterValue = (type: string, value: string) => {
    if (type === 'data') {
      const parts = value.split('-')
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
      return value
    }
    if (type === 'responsavel' && value === 'unassigned') return 'Sem Responsável'
    if (type === 'responsavel') return respData.find((r) => r.id === value)?.name || value
    if (type === 'prioridade') return value === 'media' ? 'Média' : 'Urgente'
    if (type === 'status') {
      if (value === 'aberto') return 'Aberto'
      if (value === 'em_atendimento') return 'Em Atendimento'
      if (value === 'finalizado') return 'Finalizado'
      if (value === 'unificado') return 'Unificado'
    }
    return value
  }

  const filterChips: { type: string; value: string; label: string }[] = []
  if (chartFilters.overdue) {
    filterChips.push({ type: 'overdue', value: 'true', label: 'Overdue: Sim' })
  }
  const labelMap: Record<string, string> = {
    status: 'Status',
    prioridade: 'Prioridade',
    garagem: 'Garagem',
    responsavel: 'Resp',
    data: 'Data',
  }
  ;(['status', 'prioridade', 'garagem', 'responsavel', 'data'] as const).forEach((key) => {
    const arr = chartFilters[key]
    if (!arr) return
    arr.forEach((v) => {
      filterChips.push({
        type: key,
        value: v,
        label: `${labelMap[key]}: ${formatFilterValue(key, v)}`,
      })
    })
  })

  return (
    <div className="space-y-4 mb-6">
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filtros ativos:</span>
            {filterChips.map((chip, i) => (
              <div
                key={i}
                className="bg-[#225f3d]/10 text-[#225f3d] px-2.5 py-1 rounded-full text-xs font-medium border border-[#225f3d]/20 flex items-center gap-1 cursor-pointer hover:bg-[#225f3d]/20 transition-colors"
                onClick={() => onChartClick(chip.type as any, chip.value, true)}
                title="Clique para remover o filtro"
              >
                {chip.label}
                <FilterX className="h-3 w-3 ml-1 opacity-70" />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-600 border-slate-300 hover:bg-slate-100 shrink-0"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-stretch">
        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle h-full">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        className="shadow-[0px_0px_6px_0px_#000000] border-[inherit] cursor-pointer transition-opacity duration-200"
                        key={index}
                        fill={entry.fill}
                        onClick={(e) => onChartClick('status', entry.id, e.ctrlKey || e.metaKey)}
                        style={{
                          opacity:
                            chartFilters.status?.length && !chartFilters.status.includes(entry.id)
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle h-full">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Chamados por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={prioConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prioData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {prioData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={(e) =>
                          onChartClick('prioridade', entry.id, e.ctrlKey || e.metaKey)
                        }
                        style={{
                          opacity:
                            chartFilters.prioridade?.length &&
                            !chartFilters.prioridade.includes(entry.id)
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Bar>
                  <Legend
                    formatter={() => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        Quantidade
                      </span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle h-full">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Distribuição por Garagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ garagem: { label: 'Garagem', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={garageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {garageData.map((entry, index) => (
                      <Cell
                        className="shadow-[0px_0px_6px_0px_#000000] border-[inherit] cursor-pointer transition-opacity duration-200"
                        key={index}
                        fill={entry.fill}
                        onClick={(e) => onChartClick('garagem', entry.id, e.ctrlKey || e.metaKey)}
                        style={{
                          opacity:
                            chartFilters.garagem?.length && !chartFilters.garagem.includes(entry.id)
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle h-full">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Situação do Processo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ situacao: { label: 'Situação', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={situacaoProcessoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {situacaoProcessoData.map((entry, index) => (
                      <Cell
                        className="cursor-pointer transition-opacity duration-200"
                        key={index}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle lg:col-span-2 h-full">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
              Chamados por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ responsavel: { label: 'Responsável', color: '#225f3d' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={respData}
                  layout="vertical"
                  margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#212121' }}
                    width={90}
                    tickFormatter={(value) =>
                      value.length > 12 ? value.substring(0, 10) + '...' : value
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {respData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={(e) =>
                          onChartClick('responsavel', entry.id, e.ctrlKey || e.metaKey)
                        }
                        style={{
                          opacity:
                            chartFilters.responsavel?.length &&
                            !chartFilters.responsavel.includes(entry.id)
                              ? 0.3
                              : 1,
                        }}
                      />
                    ))}
                  </Bar>
                  <Legend
                    formatter={() => (
                      <span style={{ color: '#212121', fontSize: '12px', fontWeight: 500 }}>
                        Quantidade
                      </span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#f0f0f0] transition-all duration-200 hover:shadow-subtle mt-4">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-[24px] font-semibold text-[#225f3d]">
            Evolução de Chamados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ value: { label: 'Chamados', color: '#225f3d' } }}
            className="h-[350px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.fullDate) {
                    onChartClick('data', data.activePayload[0].payload.fullDate, false)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#212121' }}
                  dy={10}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#212121' }}
                  dx={-10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#225f3d"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    const isSelected = chartFilters.data?.includes(payload.fullDate) ?? false
                    return (
                      <circle
                        key={`dot-${payload.fullDate}`}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#c8e6c9' : '#225f3d'}
                        stroke={isSelected ? '#225f3d' : '#fff'}
                        strokeWidth={2}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={(e: any) => {
                          e.stopPropagation()
                          onChartClick('data', payload.fullDate, e.ctrlKey || e.metaKey)
                        }}
                      />
                    )
                  }}
                  activeDot={(props: any) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        key={`active-dot-${payload.fullDate}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#225f3d"
                        stroke="#fff"
                        strokeWidth={2}
                        className="cursor-pointer"
                        onClick={(e: any) => {
                          e.stopPropagation()
                          onChartClick('data', payload.fullDate, e.ctrlKey || e.metaKey)
                        }}
                      />
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
