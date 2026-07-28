import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { isDuplicateTicket } from '@/lib/utils'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export interface ChamadosFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  prioridade?: string
  situacaoProcesso?: string
  statusInterno?: string
  responsavel?: string
  period?: string
  dateRange?: { from?: Date; to?: Date }
  chartFilters?: ChartFilters
}

export interface ChartFilters {
  status?: string[]
  prioridade?: string[]
  garagem?: string[]
  responsavel?: string[]
  data?: string[]
  overdue?: boolean
}

export function useChamadosDashboard(filters: ChamadosFilters = {}) {
  const [chamados, setChamados] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const filtersKey = JSON.stringify(filters)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('chamados')
        .select('*', { count: 'exact' })
        .order('criado_em', { ascending: false })

      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.prioridade && filters.prioridade !== 'all')
        query = query.eq('prioridade', filters.prioridade)
      if (filters.situacaoProcesso && filters.situacaoProcesso !== 'all')
        query = query.eq('situacao_processo', filters.situacaoProcesso)
      if (filters.statusInterno && filters.statusInterno !== 'all')
        query = query.eq('status_interno', filters.statusInterno)

      if (filters.responsavel && filters.responsavel !== 'all') {
        if (filters.responsavel === 'unassigned') query = query.is('responsavel_id', null)
        else query = query.eq('responsavel_id', filters.responsavel)
      }

      if (filters.period && filters.period !== 'all' && filters.period !== 'custom') {
        const days = parseInt(filters.period)
        if (days) query = query.gte('criado_em', subDays(new Date(), days).toISOString())
      }

      if (filters.period === 'custom' && filters.dateRange?.from) {
        query = query.gte('criado_em', startOfDay(filters.dateRange.from).toISOString())
        if (filters.dateRange.to)
          query = query.lte('criado_em', endOfDay(filters.dateRange.to).toISOString())
      }

      if (filters.chartFilters) {
        const cf = filters.chartFilters
        if (cf.status && cf.status.length > 0) query = query.in('status', cf.status)
        if (cf.prioridade && cf.prioridade.length > 0) query = query.in('prioridade', cf.prioridade)
        if (cf.garagem && cf.garagem.length > 0) {
          const hasNull = cf.garagem.includes('Não Informada')
          const named = cf.garagem.filter((g) => g !== 'Não Informada')
          if (hasNull && named.length > 0) {
            query = query.or(`garagem.is.null,garagem.in.(${named.join(',')})`)
          } else if (hasNull) {
            query = query.is('garagem', null)
          } else {
            query = query.in('garagem', named)
          }
        }
        if (cf.responsavel && cf.responsavel.length > 0) {
          const hasUnassigned = cf.responsavel.includes('unassigned')
          const ids = cf.responsavel.filter((r) => r !== 'unassigned')
          if (hasUnassigned && ids.length > 0) {
            query = query.or(`responsavel_id.is.null,responsavel_id.in.(${ids.join(',')})`)
          } else if (hasUnassigned) {
            query = query.is('responsavel_id', null)
          } else {
            query = query.in('responsavel_id', ids)
          }
        }
        if (cf.data && cf.data.length > 0) {
          const dateConds = cf.data.map((d) => {
            const [y, m, dd] = d.split('-').map(Number)
            const dateObj = new Date(y, m - 1, dd)
            return `and(criado_em.gte.${startOfDay(dateObj).toISOString()},criado_em.lte.${endOfDay(dateObj).toISOString()})`
          })
          query = query.or(dateConds.join(','))
        }
        if (cf.overdue) {
          query = query
            .neq('status', 'finalizado')
            .lt('criado_em', subDays(new Date(), 30).toISOString())
        }
      }

      if (filters.search) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          filters.search.trim(),
        )
        if (isUUID) {
          query = query.eq('id', filters.search.trim())
        } else {
          query = query.ilike('titulo', `%${filters.search}%`)
        }
      }

      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const [chamadosRes, respRes, activeChamadosRes] = await Promise.all([
        query,
        supabase.from('perfil_usuario').select('id, nome_completo, tipo_usuario'),
        supabase
          .from('chamados')
          .select('id, carro, data_ocorrencia, criado_em, status')
          .in('status', ['aberto', 'em_atendimento']),
      ])

      if (chamadosRes.error) throw chamadosRes.error
      if (respRes.error) throw respRes.error

      const currentChamados = chamadosRes.data || []
      const allUsers = respRes.data || []
      const activeChamados = activeChamadosRes.data || []

      let respostasData: any[] = []
      let historicoData: any[] = []

      if (currentChamados.length > 0) {
        if (currentChamados.length <= 100) {
          const ids = currentChamados.map((c) => c.id)
          const [respostasRes, historicoRes] = await Promise.all([
            supabase
              .from('respostas_chamado')
              .select('id, chamado_id, criado_em')
              .in('chamado_id', ids),
            supabase
              .from('historico_chamado')
              .select('id, chamado_id, acao, criado_em')
              .in('chamado_id', ids),
          ])
          respostasData = respostasRes.data || []
          historicoData = historicoRes.data || []
        } else {
          const [respostasRes, historicoRes] = await Promise.all([
            supabase.from('respostas_chamado').select('id, chamado_id, criado_em'),
            supabase.from('historico_chamado').select('id, chamado_id, acao, criado_em'),
          ])
          respostasData = respostasRes.data || []
          historicoData = historicoRes.data || []
        }
      }

      const mapped = currentChamados.map((c) => {
        const is_duplicate = isDuplicateTicket(c, activeChamados)

        return {
          ...c,
          responsavel: allUsers.find((r) => r.id === c.responsavel_id) || null,
          respostas: respostasData.filter((r) => r.chamado_id === c.id),
          historico: historicoData.filter((h) => h.chamado_id === c.id),
          is_duplicate,
        }
      })

      const assignedIds = new Set(currentChamados.map((c) => c.responsavel_id).filter(Boolean))
      const filterRoles = [
        'responsavel',
        'sinistro',
        'admin',
        'juridico',
        'secretaria_tecnica',
        'coc',
        'sos',
      ]
      const responsaveisDropdown = allUsers.filter(
        (u) => assignedIds.has(u.id) || filterRoles.includes(u.tipo_usuario),
      )

      setChamados(mapped)
      setTotalCount(chamadosRes.count || 0)
      setResponsaveis(responsaveisDropdown)
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => {
    fetchData()

    const channelName = `dashboard_changes_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'respostas_chamado' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_chamado' }, () =>
        fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  return { chamados, responsaveis, loading, error, totalCount, refetch: fetchData }
}
