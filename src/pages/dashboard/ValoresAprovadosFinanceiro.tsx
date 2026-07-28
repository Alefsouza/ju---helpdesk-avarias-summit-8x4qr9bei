import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, AlertCircle, FileText, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

export default function ValoresAprovadosFinanceiro() {
  const { profile } = useAuth()
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
        const hasRecibo = docs.some((d: any) => d.tipo_documento === 'Recibo')
        const isContabilApproved = c.status_interno === 'aprovado_contabil'
        return hasRecibo || isContabilApproved
      }) || []

    setChamados(filtered)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.tipo_usuario === 'financeiro') {
      fetchChamados()
    } else {
      setLoading(false)
    }
  }, [profile])

  if (profile?.tipo_usuario !== 'financeiro') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para o Financeiro.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Valores Aprovados</h1>
        <p className="text-muted-foreground">
          Chamados aprovados pela Diretoria com documentos para Financeiro.
        </p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => {
                    const docs = chamado.documentos || []
                    const recibo = docs.find((d: any) => d.tipo_documento === 'Recibo')
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
                          {recibo ? (
                            <a
                              href={recibo.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <FileText className="h-5 w-5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">Contábil aprovado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {valorDoc?.valor_orcamento
                            ? `R$ ${Number(valorDoc.valor_orcamento).toFixed(2)}`
                            : '-'}
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
  )
}
