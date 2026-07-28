import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Search, Bus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CarrosLiberadosProps {
  garagemFilter?: string
  title?: string
}

export default function CarrosLiberadosPlantao({
  garagemFilter = 'Cursino',
  title = 'Carros Liberados - Plantão',
}: CarrosLiberadosProps) {
  const { user } = useAuth()
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    fetchDocumentos()

    const subscriptionDocs = supabase
      .channel(`public:documentos_liberados_${garagemFilter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
        },
        () => {
          fetchDocumentos()
        },
      )
      .subscribe()

    const subscriptionChamados = supabase
      .channel(`public:chamados_operacao_${garagemFilter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chamados',
        },
        () => {
          fetchDocumentos()
        },
      )
      .subscribe()

    return () => {
      subscriptionDocs.unsubscribe()
      subscriptionChamados.unsubscribe()
    }
  }, [garagemFilter])

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*, chamados(id, status, tipo_chamado, operacao)')
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos'])
        .not('numero_os', 'is', null)
        .neq('numero_os', '')
        .ilike('garagem', garagemFilter)

      if (error) throw error

      const validDocs = (data || []).filter((d) => {
        if (d.chamados && Array.isArray(d.chamados)) {
          return !d.chamados.some((c: any) => c.status === 'operacao' || c.operacao === 'Enviado')
        }
        if (d.chamados && !Array.isArray(d.chamados)) {
          const c = d.chamados as any
          return c.status !== 'operacao' && c.operacao !== 'Enviado'
        }
        return true
      })

      setDocumentos(validDocs)
    } catch (error) {
      console.error('Error fetching documentos:', error)
      toast.error('Erro ao carregar os dados em tempo real')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarOperacao = async (docId: string, chamadoId: string | null) => {
    try {
      if (chamadoId) {
        const { data: chamado, error: fetchError } = await supabase
          .from('chamados')
          .select('tipo_chamado, titulo')
          .eq('id', chamadoId)
          .single()

        if (fetchError) throw fetchError

        const isManutencao = chamado?.tipo_chamado === 'OS de Manutenção'
        const updateData: any = {
          atualizado_em: new Date().toISOString(),
          operacao: 'Enviado',
        }

        if (isManutencao) {
          updateData.status = 'operacao'
        }

        const { error } = await supabase.from('chamados').update(updateData).eq('id', chamadoId)

        if (error) throw error

        const currentUser = user?.id || (await supabase.auth.getUser()).data.user?.id
        if (currentUser) {
          await supabase.from('historico_chamado').insert({
            chamado_id: chamadoId,
            acao: 'respondido',
            usuario_id: currentUser,
            detalhes: isManutencao
              ? 'Carro liberado e enviado para operação. Status do chamado atualizado para operação.'
              : 'Carro liberado e enviado para operação. Status do chamado administrativo mantido.',
          })
        }
      }
      toast.success('Carro enviado para operação com sucesso')
      setDocumentos((prev) => prev.filter((d) => d.id !== docId))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erro ao enviar para operação')
    }
  }

  const filtered = documentos
    .filter((d) => {
      const term = search.toLowerCase()
      const matchSearch =
        (d.numero_os?.toLowerCase() || '').includes(term) ||
        (d.numero_carro?.toLowerCase() || '').includes(term) ||
        (d.linha?.toLowerCase() || '').includes(term)

      const isLiberado =
        d.excluido_manutencao === true || d.status_liberacao === 'Liberado com Pendência'
      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'liberado' &&
          isLiberado &&
          d.status_liberacao !== 'Liberado com Pendência') ||
        (statusFilter === 'liberado_pendencia' &&
          d.status_liberacao === 'Liberado com Pendência') ||
        (statusFilter === 'manutencao' && !isLiberado)

      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      const aLiberado =
        a.excluido_manutencao === true || a.status_liberacao === 'Liberado com Pendência'
      const bLiberado =
        b.excluido_manutencao === true || b.status_liberacao === 'Liberado com Pendência'
      if (aLiberado && !bLiberado) return -1
      if (!aLiberado && bLiberado) return 1

      const dateA = new Date(a.atualizado_em || a.criado_em).getTime()
      const dateB = new Date(b.atualizado_em || b.criado_em).getTime()
      return dateB - dateA
    })

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Bus className="h-8 w-8 text-primary" />
              {title}
            </h1>
            <p className="text-gray-500 mt-1">
              Acompanhamento em tempo real das operações de manutenção
            </p>
          </div>
        </div>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar OS, carro ou linha..."
                  className="pl-9 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="liberado">Liberados</SelectItem>
                    <SelectItem value="liberado_pendencia">Liberados com Pendência</SelectItem>
                    <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Bus className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-lg font-medium text-gray-900">Nenhuma OS registrada</p>
                <p className="text-sm">Tente ajustar seus filtros ou aguarde novas atualizações.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold whitespace-nowrap">OS</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Data e Hora</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Carro</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Linha</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right font-semibold whitespace-nowrap">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => {
                      const isLiberado =
                        d.excluido_manutencao === true ||
                        d.status_liberacao === 'Liberado com Pendência'
                      const dateObj = new Date(d.atualizado_em || d.criado_em)
                      const formattedDate = format(dateObj, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })

                      const chamadoId = d.chamados
                        ? Array.isArray(d.chamados)
                          ? d.chamados[0]?.id
                          : d.chamados.id
                        : null

                      return (
                        <TableRow key={d.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-medium">#{d.numero_os}</TableCell>
                          <TableCell className="text-gray-600 whitespace-nowrap">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center bg-gray-100 px-2.5 py-0.5 rounded-full text-sm font-medium text-gray-800">
                              {d.numero_carro || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600">{d.linha || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border
                                ${
                                  isLiberado
                                    ? d.status_liberacao === 'Liberado com Pendência'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                            >
                              {isLiberado ? d.status_liberacao || 'Liberado' : 'Manutenção'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isLiberado ? (
                              <div className="flex justify-end pr-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      onClick={() => handleEnviarOperacao(d.id, chamadoId)}
                                      className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Enviar carro p/ operação</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <span className="text-rose-600 text-sm font-medium pr-2">
                                Manutenção
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
