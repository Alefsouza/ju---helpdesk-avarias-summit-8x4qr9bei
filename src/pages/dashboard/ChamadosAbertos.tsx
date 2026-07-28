import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Inbox, AlertCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, isDuplicateTicket } from '@/lib/utils'

export default function ChamadosAbertos() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('todas')
  const [filterDate, setFilterDate] = useState<string>('')

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchChamados = async () => {
    setLoading(true)
    setError(false)
    try {
      const { data, error: err } = await supabase
        .from('chamados')
        .select('*')
        .eq('status', 'aberto')

      if (err) throw err

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c) => c.usuario_id))]
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

        const { data: activeChamados } = await supabase
          .from('chamados')
          .select('id, carro, titulo, data_ocorrencia, criado_em, status')
          .in('status', ['aberto', 'em_atendimento'])

        const allActiveChamados = activeChamados || []

        const chamadosComNome = data.map((c) => ({
          ...c,
          nome_usuario: perfilMap?.[c.usuario_id] || 'Usuário Desconhecido',
          is_duplicate: isDuplicateTicket(c, allActiveChamados),
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

  const fetchChamadosRef = useRef(fetchChamados)
  useEffect(() => {
    fetchChamadosRef.current = fetchChamados
  }, [fetchChamados])

  useEffect(() => {
    fetchChamados()

    const channel = supabase
      .channel('chamados_abertos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchChamadosRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handlePegarChamado = async (chamadoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!user) return

    setActionLoading(chamadoId)
    try {
      const { error: updateError } = await supabase
        .from('chamados')
        .update({ status: 'em_atendimento', responsavel_id: user.id })
        .eq('id', chamadoId)

      if (updateError) throw updateError

      const { error: histError } = await supabase
        .from('historico_chamado')
        .insert({ chamado_id: chamadoId, usuario_id: user.id, acao: 'atribuido' })

      if (histError) throw histError

      toast({ title: 'Chamado atribuído com sucesso!' })

      setChamados((prev) => prev.filter((c) => c.id !== chamadoId))
      navigate(`/dashboard/meus-atendimentos`)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao atribuir chamado', variant: 'destructive' })
      setActionLoading(null)
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

  const filteredChamados = chamados
    .filter((c) => {
      const term = debouncedSearch.toLowerCase()
      const matchesSearch =
        c.titulo.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        (c.pia && c.pia.toLowerCase().includes(term))
      const matchesPriority =
        filterPriority === 'todas' ||
        c.prioridade === filterPriority ||
        (filterPriority === 'nao_definida' && !c.prioridade)
      const matchesDate = !filterDate || c.criado_em.startsWith(filterDate)
      return matchesSearch && matchesPriority && matchesDate
    })
    .sort((a, b) => {
      const p: Record<string, number> = { urgente: 4, alta: 3, media: 2, baixa: 1 }
      const aP = p[a.prioridade] || 0
      const bP = p[b.prioridade] || 0
      if (aP !== bP) return bP - aP
      return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fila de Atendimento</h1>
          <p className="text-slate-500">Acompanhe e atribua os chamados aguardando atendimento.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por título ou R.A..."
            className="pl-9 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            type="date"
            className="bg-white shadow-sm w-full sm:w-[150px]"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-[150px] bg-white shadow-sm">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="nao_definida">Não Definida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Erro ao carregar chamados</h3>
          <p className="text-slate-500 mb-6">Ocorreu um problema ao buscar os dados da fila.</p>
          <Button onClick={fetchChamados}>Tentar novamente</Button>
        </div>
      ) : filteredChamados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
          <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum chamado aberto</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Não há chamados aguardando atendimento ou nenhum corresponde aos filtros.
          </p>
          {searchTerm || filterDate || filterPriority !== 'todas' ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setFilterDate('')
                setFilterPriority('todas')
              }}
            >
              Limpar filtros
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Título</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>R.A.</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((c) => (
                  <TableRow
                    key={c.id}
                    className={cn(
                      'cursor-pointer transition-colors group',
                      c.is_duplicate
                        ? 'bg-amber-50/40 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50/80',
                    )}
                    onClick={() => navigateToDetails(c.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900 line-clamp-1">{c.titulo}</div>
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Atenção: Já existe um chamado ativo (aberto ou em atendimento)
                                  para este veículo com a mesma Data de Ocorrência e Carro.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-slate-700">{c.nome_usuario}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-600">
                      {c.pia || '—'}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={c.prioridade} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(c.criado_em)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={(e) => handlePegarChamado(c.id, e)}
                        disabled={actionLoading === c.id}
                      >
                        {actionLoading === c.id ? 'Atribuindo...' : 'Pegar chamado'}
                        {!actionLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredChamados.map((c) => (
              <Card
                key={c.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  c.is_duplicate
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : 'hover:border-slate-300',
                )}
                onClick={() => navigateToDetails(c.id)}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{c.titulo}</h3>
                      {c.is_duplicate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Atenção: Já existe um chamado ativo (aberto ou em atendimento) para
                                este veículo com a mesma Data de Ocorrência e Carro.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <PriorityBadge priority={c.prioridade} />
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-md">
                    <span className="font-medium text-slate-700 truncate mr-2">
                      {c.nome_usuario}
                    </span>
                    {c.pia && (
                      <span className="font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-xs mr-2">
                        RA: {c.pia}
                      </span>
                    )}
                    <span className="whitespace-nowrap">{formatDate(c.criado_em)}</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={(e) => handlePegarChamado(c.id, e)}
                    disabled={actionLoading === c.id}
                  >
                    {actionLoading === c.id ? 'Atribuindo...' : 'Pegar chamado'}
                    {!actionLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
