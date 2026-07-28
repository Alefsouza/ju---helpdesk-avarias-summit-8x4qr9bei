import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, AlertCircle, FileText, Check, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const NF_TYPES = ['NF', 'Nota Fiscal', 'Boleto']

export default function ValoresAprovadosContabil() {
  const { user, profile } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchChamados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chamados')
      .select(
        `id, titulo, status_interno, criado_em, registro_motorista, nome_motorista, data_ocorrencia, numero_os,
         documentos ( id, nome_arquivo, arquivo_url, tipo_documento, valor_orcamento )`,
      )
      .eq('status_aprovacao', 'aprovado')
      .order('atualizado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const filtered =
      data?.filter((c: any) => {
        const docs = c.documentos || []
        return docs.some((d: any) => NF_TYPES.includes(d.tipo_documento))
      }) || []

    setChamados(filtered)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.tipo_usuario === 'contabil') {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [profile])

  const handleApprove = async () => {
    if (!selectedId) return
    setIsSubmitting(true)
    try {
      await supabase
        .from('chamados')
        .update({
          status_interno: 'aprovado_contabil',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedId)

      await supabase.from('historico_chamado').insert({
        chamado_id: selectedId,
        usuario_id: user!.id,
        acao: 'Aprovação Contábil',
        detalhes: 'Chamado aprovado pelo Contábil. Aguardando Financeiro.',
      })

      toast.success('Chamado aprovado com sucesso!')
      setIsApproveOpen(false)
      fetchChamados()
    } catch (error: any) {
      toast.error('Erro ao aprovar chamado')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (profile?.tipo_usuario !== 'contabil') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para o Contábil.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Valores Aprovados</h1>
        <p className="text-muted-foreground">Chamados com NF/Boleto para aprovação do Contábil.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chamados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Check className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum chamado disponível</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamado</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Data Ocorrência</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => {
                    const docs = chamado.documentos || []
                    const nfDocs = docs.filter((d: any) => NF_TYPES.includes(d.tipo_documento))
                    const isApproved = chamado.status_interno === 'aprovado_contabil'
                    const valorDoc = docs.find((d: any) => d.valor_orcamento)
                    return (
                      <TableRow key={chamado.id}>
                        <TableCell>
                          <Link
                            to={`/dashboard/chamados/${chamado.id}`}
                            className="font-medium text-primary hover:underline transition-colors"
                          >
                            {chamado.titulo || '-'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{chamado.nome_motorista || '-'}</div>
                            <div className="text-muted-foreground">
                              {chamado.registro_motorista || '-'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {chamado.data_ocorrencia
                            ? format(new Date(chamado.data_ocorrencia + 'T12:00:00'), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {nfDocs.map((doc: any) => (
                              <a
                                key={doc.id}
                                href={doc.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <FileText className="h-5 w-5" />
                              </a>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {valorDoc?.valor_orcamento
                            ? `R$ ${Number(valorDoc.valor_orcamento).toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md bg-green-50 text-green-700">
                              <BadgeCheck className="h-4 w-4" /> Aprovado
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedId(chamado.id)
                                setIsApproveOpen(true)
                              }}
                            >
                              Aprovar
                            </Button>
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

      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Deseja confirmar a aprovação deste chamado? Ele será enviado para o Financeiro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
