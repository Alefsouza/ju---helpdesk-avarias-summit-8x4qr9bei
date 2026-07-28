import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Ticket,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  GitMerge,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { subDays, isAfter, isBefore } from 'date-fns'
import { useMemo } from 'react'
import type { ChartFilters } from '@/hooks/use-chamados-dashboard'

export function DashboardCards({
  chamados,
  chartFilters,
  onCardClick,
}: {
  chamados: any[]
  chartFilters?: ChartFilters
  onCardClick?: (
    type: 'status' | 'prioridade' | 'garagem' | 'responsavel' | 'data' | 'overdue' | 'clear',
    value: string,
    multiSelect: boolean,
  ) => void
}) {
  const filtered = useMemo(() => {
    if (!chartFilters) return chamados
    return chamados.filter((c) => {
      if (chartFilters.status?.length && !chartFilters.status.includes(c.status)) return false
      if (chartFilters.prioridade?.length && !chartFilters.prioridade.includes(c.prioridade))
        return false
      if (chartFilters.garagem?.length) {
        const g = c.garagem || 'Não Informada'
        if (!chartFilters.garagem.includes(g)) return false
      }
      if (chartFilters.responsavel?.length) {
        const respId = c.responsavel?.id || 'unassigned'
        if (!chartFilters.responsavel.includes(respId)) return false
      }
      if (chartFilters.data?.length) {
        if (!c.criado_em) return false
        if (!chartFilters.data.includes(c.criado_em.substring(0, 10))) return false
      }
      if (chartFilters.overdue) {
        if (c.status === 'finalizado') return false
        if (!isBefore(new Date(c.criado_em), subDays(new Date(), 30))) return false
      }
      return true
    })
  }, [chamados, chartFilters])

  const total = filtered.length
  const abertos = filtered.filter((c) => c.status === 'aberto').length
  const emAtendimento = filtered.filter((c) => c.status === 'em_atendimento').length
  const finalizados = filtered.filter((c) => c.status === 'finalizado').length
  const unificados = filtered.filter((c) => c.status === 'unificado').length

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sixtyDaysAgo = subDays(now, 60)

  const overdues = filtered.filter((c) => {
    if (c.status === 'finalizado') return false
    return isBefore(new Date(c.criado_em), thirtyDaysAgo)
  }).length

  const calcTrend = (status?: string) => {
    const current = filtered.filter(
      (c) => isAfter(new Date(c.criado_em), thirtyDaysAgo) && (status ? c.status === status : true),
    ).length
    const previous = filtered.filter(
      (c) =>
        isAfter(new Date(c.criado_em), sixtyDaysAgo) &&
        isBefore(new Date(c.criado_em), thirtyDaysAgo) &&
        (status ? c.status === status : true),
    ).length
    if (previous === 0) return current > 0 ? { up: true, val: '+100%' } : { up: null, val: '0%' }
    const percent = Math.round(((current - previous) / previous) * 100)
    return { up: percent > 0, val: `${percent > 0 ? '+' : ''}${percent}%` }
  }

  const trends = {
    total: calcTrend(),
    abertos: calcTrend('aberto'),
    emAtendimento: calcTrend('em_atendimento'),
    finalizados: calcTrend('finalizado'),
    unificados: calcTrend('unificado'),
  }

  const hasActiveFilters = chartFilters
    ? Object.entries(chartFilters).some(([k, v]) =>
        k === 'overdue' ? v === true : Array.isArray(v) && v.length > 0,
      )
    : false

  const isCardActive = (type: string, value: string) => {
    if (type === 'clear') return !hasActiveFilters
    if (type === 'overdue') return chartFilters?.overdue === true
    const arr = chartFilters?.[type as keyof ChartFilters] as string[] | undefined
    return arr?.includes(value) ?? false
  }

  const renderTrend = (up: boolean | null, val: string) => (
    <div
      className={cn(
        'flex items-center text-[12px] mt-1 font-medium',
        up === true ? 'text-[#225f3d]' : 'text-slate-400',
      )}
    >
      {up === true ? (
        <TrendingUp className="h-3 w-3 mr-1" />
      ) : up === false ? (
        <TrendingDown className="h-3 w-3 mr-1" />
      ) : (
        <Minus className="h-3 w-3 mr-1" />
      )}
      <span>{val} em relação ao mês anterior</span>
    </div>
  )

  const cards = [
    {
      title: 'Total de Chamados',
      value: total,
      icon: Ticket,
      filterType: 'clear' as const,
      filterValue: '',
      up: trends.total.up as boolean | null,
      trend: trends.total.val,
    },
    {
      title: 'Chamados Abertos',
      value: abertos,
      icon: Activity,
      filterType: 'status' as const,
      filterValue: 'aberto',
      up: trends.abertos.up as boolean | null,
      trend: trends.abertos.val,
    },
    {
      title: 'Em Atendimento',
      value: emAtendimento,
      icon: Clock,
      filterType: 'status' as const,
      filterValue: 'em_atendimento',
      up: trends.emAtendimento.up as boolean | null,
      trend: trends.emAtendimento.val,
    },
    {
      title: 'Chamados Finalizados',
      value: finalizados,
      icon: CheckCircle,
      filterType: 'status' as const,
      filterValue: 'finalizado',
      up: trends.finalizados.up as boolean | null,
      trend: trends.finalizados.val,
    },
    {
      title: 'Chamados > 30 dias',
      value: overdues,
      icon: AlertTriangle,
      filterType: 'overdue' as const,
      filterValue: 'true',
      up: null as boolean | null,
      trend: '',
    },
    {
      title: 'Chamados Unificados',
      value: unificados,
      icon: GitMerge,
      filterType: 'status' as const,
      filterValue: 'unificado',
      up: trends.unificados.up as boolean | null,
      trend: trends.unificados.val,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
      {cards.map((card, i) => {
        const active = isCardActive(card.filterType, card.filterValue)
        return (
          <Card
            key={i}
            className={cn(
              'border-[#f0f0f0] bg-white transition-all duration-200 hover:shadow-subtle cursor-pointer select-none',
              active && 'border-[#225f3d] ring-2 ring-[#225f3d]/30 bg-[#c8e6c9]/20',
            )}
            onClick={(e) =>
              onCardClick?.(card.filterType, card.filterValue, e.ctrlKey || e.metaKey)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
              <CardTitle className="text-[14px] font-medium text-[#212121]">{card.title}</CardTitle>
              <card.icon className={cn('h-4 w-4', active ? 'text-[#225f3d]' : 'text-slate-400')} />
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-[32px] font-bold text-[#225f3d] leading-none mb-1">
                {card.value}
              </div>
              {card.filterType !== 'overdue' && renderTrend(card.up, card.trend)}
              {card.filterType === 'overdue' && (
                <div className="text-[12px] mt-1 font-medium text-slate-400">
                  Abertos há mais de 30 dias
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
