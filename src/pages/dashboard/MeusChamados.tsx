import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Search, Trash2, AlertCircle, Plus, ArrowUpDown } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertTriangle } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

type Chamado = {
  id: string
  titulo: string
  status: string
  prioridade: string
  criado_em: string
  pia?: string | null
  carro?: string | null
  data_ocorrencia?: string | null
  descricao?: string
  is_duplicate?: boolean
  is_unified?: boolean
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 border-transparent',
  em_atendimento: 'bg-yellow-100 text-yellow-800 border-transparent',
  finalizado: 'bg-green-100 text-green-800 border-transparent',
}

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-800 border-transparent',
  media: 'bg-orange-100 text-orange-800 border-transparent',
  alta: 'bg-red-100 text-red-800 border-transparent',
  urgente: 'bg-red-600 text-white border-red-700',
}

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default function MeusChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [priorityFilter, setPriorityFilter] = useState('todas')
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'criado_em',
    direction: 'desc',
  })

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchChamados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: participations } = await supabase
        .from('participantes_chamado')
        .select('chamado_id')
        .eq('usuario_id', user.id)

      const partIds = participations?.map((p) => p.chamado_id) || []

      let query = supabase
        .from('chamados')
        .select('id, titulo, status, prioridade, criado_em, pia, carro, data_ocorrencia, descricao')
        .order(sortConfig.field, { ascending: sortConfig.direction === 'asc' })

      if (partIds.length > 0) {
        query = query.or(`usuario_id.eq.${user.id},id.in.(${partIds.join(',')})`)
      } else {
        query = query.eq('usuario_id', user.id)
      }

      if (sortConfig.field !== 'criado_em') {
        query = query.order('criado_em', { ascending: false })
      }

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }
      if (priorityFilter !== 'todas') {
        if (priorityFilter === 'nao_definida') {
          query = query.is('prioridade', null)
        } else {
          query = query.eq('prioridade', priorityFilter)
        }
      }
      if (debouncedSearch) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          debouncedSearch,
        )
        if (isUUID) {
          query = query.or(`titulo.ilike.%${debouncedSearch}%,id.eq.${debouncedSearch}`)
        } else {
          query = query.ilike('titulo', `%${debouncedSearch}%`)
        }
      }

      const { data, error: dbError } = await query
      if (dbError) throw dbError

      let finalData = data || []
      const carros = finalData.map((c) => c.carro).filter(Boolean)
      const duplicatesSet = new Set<string>()

      if (carros.length > 0) {
        const { data: possibleDuplicates } = await supabase
          .from('chamados')
          .select('id, carro, data_ocorrencia')
          .in('carro', carros)
          .in('status', ['aberto', 'em_atendimento'])

        if (possibleDuplicates) {
          finalData.forEach((c) => {
            if (c.carro && c.data_ocorrencia) {
              const hasDuplicate = possibleDuplicates.some(
                (d) =>
                  d.id !== c.id && d.carro === c.carro && d.data_ocorrencia === c.data_ocorrencia,
              )
              if (hasDuplicate) {
                duplicatesSet.add(c.id)
              }
            }
          })
        }
      }

      const chamadosComDuplicate = finalData.map((c) => ({
        ...c,
        is_duplicate: duplicatesSet.has(c.id),
        is_unified:
          c.status === 'finalizado' &&
          c.descricao?.includes('[SISTEMA]: Este chamado foi unificado'),
      }))

      setChamados(chamadosComDuplicate)
    } catch (err: any) {
      console.error(err)
      setError('Erro ao carregar chamados')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, sortConfig.field, sortConfig.direction])

  const fetchChamadosRef = useRef(fetchChamados)
  useEffect(() => {
    fetchChamadosRef.current = fetchChamados
  }, [fetchChamados])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

  useEffect(() => {
    const channel = supabase
      .channel('meus_chamados_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        fetchChamadosRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSort = (field: string) => {
    if (sortConfig.field === field) {
      setSortConfig({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      })
    } else {
      setSortConfig({
        field,
        direction: field === 'pia' ? 'asc' : 'desc',
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Autenticação necessária')

      const { error: delError } = await supabase.from('chamados').delete().eq('id', deleteId)
      if (delError) throw delError

      toast({
        title: 'Sucesso',
        description: 'Chamado excluído com sucesso.',
      })

      fetchChamados()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir chamado. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Chamados</h1>
          <p className="text-muted-foreground">Gerencie seus tickets de atendimento.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/dashboard/novo-chamado">
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Prioridades</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="nao_definida">Não Definida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 md:h-16 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
          <AlertCircle className="h-10 w-10 mb-3 text-red-500" />
          <p className="font-medium mb-4">{error}</p>
          <Button variant="outline" onClick={fetchChamados}>
            Tentar Novamente
          </Button>
        </div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-20 px-4 bg-muted/20 border border-dashed rounded-lg">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum chamado encontrado</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Não encontramos nenhum chamado correspondente aos filtros atuais ou você ainda não abriu
            nenhum ticket.
          </p>
          <Button asChild variant="secondary">
            <Link to="/dashboard/novo-chamado">Criar meu primeiro chamado</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('pia')}
                  >
                    <div className="flex items-center">
                      R.A.
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('criado_em')}
                  >
                    <div className="flex items-center">
                      Data de Criação
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chamados.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-slate-600">{c.pia || '—'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/chamados/${c.id}`}
                          className="hover:underline hover:text-primary transition-colors line-clamp-2"
                        >
                          {c.titulo}
                        </Link>
                        {c.is_duplicate && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Já existe um chamado para esse Carro, com a mesma data de
                                  ocorrência.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {c.is_unified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-4 w-4 text-green-500 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>
                                  Seu chamado foi integrado a outro que já estava aberto pela nossa
                                  equipe. Isso é uma boa notícia, pois já estávamos ciente do seu
                                  problema. Você pode acompanhar tudo no novo chamado que surgiu
                                  para você! Obrigado!
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[c.status] || ''}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          priorityColors[c.prioridade] ||
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }
                      >
                        {priorityLabels[c.prioridade] ||
                          (c.prioridade ? c.prioridade.toUpperCase() : 'NÃO DEFINIDA')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(c.criado_em)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(c.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Excluir chamado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {chamados.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-end items-start mb-1">
                    <span className="text-xs text-muted-foreground">{formatDate(c.criado_em)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/dashboard/chamados/${c.id}`}
                      className="font-semibold text-lg leading-tight hover:text-primary line-clamp-2"
                    >
                      {c.titulo}
                    </Link>
                    <div className="flex items-center gap-2">
                      {c.is_duplicate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Já existe um chamado para esse Carro, com a mesma data de
                                ocorrência.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {c.is_unified && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-5 w-5 text-green-500 shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>
                                Seu chamado foi integrado a outro que já estava aberto pela nossa
                                equipe. Isso é uma boa notícia, pois já estávamos ciente do seu
                                problema. Você pode acompanhar tudo no novo chamado que surgiu para
                                você! Obrigado!
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className={statusColors[c.status] || ''}>
                      {statusLabels[c.status] || c.status}
                    </Badge>
                    {c.pia && (
                      <Badge variant="outline" className="bg-slate-100 text-slate-700">
                        RA: {c.pia}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        priorityColors[c.prioridade] ||
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }
                    >
                      {priorityLabels[c.prioridade] ||
                        (c.prioridade ? c.prioridade.toUpperCase() : 'NÃO DEFINIDA')}
                    </Badge>
                  </div>

                  <div className="pt-3 mt-1 border-t flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(c.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Chamado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
