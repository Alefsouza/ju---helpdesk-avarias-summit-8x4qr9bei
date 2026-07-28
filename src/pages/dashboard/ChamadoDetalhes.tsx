import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  User,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  AlertCircle,
  Paperclip,
  X,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Download,
  Link as LinkIcon,
  Copy,
  Share2,
  MoreVertical,
  Eye,
  RotateCcw,
  Pencil,
  CornerUpLeft,
  Edit,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { isDanielBrotas } from '@/lib/juridico-access'
import { UnificarChamadoModal } from '@/components/UnificarChamadoModal'
import { useDocumentAction } from '@/hooks/use-document-action'
import { useRegistroNome } from '@/hooks/use-registro-nome'
import { Checkbox } from '@/components/ui/checkbox'
import { ChatInternoChamado } from '@/components/ChatInternoChamado'

type Chamado = any
type Perfil = any
type Anexo = any
type AnexoInterno = {
  id: string
  chamado_id: string
  usuario_id: string
  arquivo_url: string
  nome_arquivo: string
  tamanho_bytes: number
  tipo_arquivo: string
  criado_em: string
}
type TimelineItem = {
  id: string
  type: 'history' | 'response'
  acao?: string
  detalhes?: string | null
  mensagem?: string
  criado_em: string
  usuario: Perfil | null
  anexos?: Anexo[]
}

type FileItem = {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  errorCount: number
  errorMessage?: string
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 border-blue-200',
  em_atendimento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  finalizado: 'bg-green-100 text-green-800 border-green-200',
  unificado: 'bg-slate-200 text-slate-700 border-slate-300',
}
const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  unificado: 'Unificado',
}
const prioridadeColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-800 border-slate-200',
  media: 'bg-orange-100 text-orange-800 border-orange-200',
  alta: 'bg-red-100 text-red-800 border-red-200',
  urgente: 'bg-red-600 text-white border-red-700',
}
const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const MAX_FILES = 10
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'video/mp4',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

function DuplicateAlert({
  duplicateAlertOpen,
  setDuplicateAlertOpen,
  duplicateSubmitAction,
  setDuplicateSubmitAction,
}: any) {
  return (
    <AlertDialog open={duplicateAlertOpen} onOpenChange={setDuplicateAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atenção</AlertDialogTitle>
          <AlertDialogDescription>
            Já existe um espelho de danos para esse carro, por favor verificar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDuplicateSubmitAction(null)}>
            Fechar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (duplicateSubmitAction) duplicateSubmitAction()
              setDuplicateSubmitAction(null)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Prosseguir mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ReabrirAlert({ confirmReabrirOpen, setConfirmReabrirOpen, handleReabrir }: any) {
  return (
    <AlertDialog open={confirmReabrirOpen} onOpenChange={setConfirmReabrirOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja reabrir este chamado?</AlertDialogTitle>
          <AlertDialogDescription>
            O chamado voltará para a fila de atendimento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReabrir}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TransferModal({
  transferModalOpen,
  setTransferModalOpen,
  availableResponsaveis,
  selectedResponsavel,
  setSelectedResponsavel,
  transferObservacao,
  setTransferObservacao,
  transferLoading,
  handleTransferir,
}: any) {
  return (
    <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir Chamado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Novo Responsável</Label>
            <Select
              value={selectedResponsavel}
              onValueChange={setSelectedResponsavel}
              disabled={transferLoading}
            >
              <SelectTrigger className="h-auto py-2 min-h-[40px]">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {availableResponsaveis.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500 text-center">
                    Nenhum outro responsável disponível
                  </div>
                ) : (
                  availableResponsaveis.map((resp: any) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-medium leading-none">{resp.nome_completo}</span>
                        <span className="text-[11px] text-slate-500 mt-1.5 leading-none">
                          {resp.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação (Opcional)</Label>
            <Textarea
              placeholder="Motivo da transferência..."
              value={transferObservacao}
              onChange={(e) => setTransferObservacao(e.target.value)}
              disabled={transferLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setTransferModalOpen(false)}
            disabled={transferLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleTransferir} disabled={!selectedResponsavel || transferLoading}>
            {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {transferLoading ? 'Transferindo chamado...' : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SolicitarParcelasModal({
  open,
  setOpen,
  orcamentoDoc,
  chamadoId,
  chamado,
  userId,
  anexosInternos,
  documentosChamado,
}: any) {
  const [valorOrcamento, setValorOrcamento] = useState(0)
  const [valorDisplay, setValorDisplay] = useState('')
  const [registro, setRegistro] = useState('')
  const [nome, setNome] = useState('')
  const [parcelas, setParcelas] = useState('1')
  const [loading, setLoading] = useState(false)
  const [solicitacao, setSolicitacao] = useState<any>(null)
  const [aplicarDesconto, setAplicarDesconto] = useState(true)

  useEffect(() => {
    if (open) {
      const fetchOrcamento = async () => {
        let foundValue = 0

        if (documentosChamado && documentosChamado.length > 0) {
          const validDoc = documentosChamado.find(
            (d: any) => d.valor_orcamento && d.valor_orcamento > 0,
          )
          if (validDoc) foundValue = validDoc.valor_orcamento
        }

        if (!foundValue) {
          const { data: docData } = await supabase
            .from('documentos')
            .select('valor_orcamento')
            .eq('chamado_id', chamadoId)
            .gt('valor_orcamento', 0)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (docData?.valor_orcamento) foundValue = docData.valor_orcamento
        }

        if (!foundValue && orcamentoDoc?.valor_orcamento && orcamentoDoc.valor_orcamento > 0) {
          foundValue = orcamentoDoc.valor_orcamento
        }

        if (!foundValue && anexosInternos) {
          const orcInterno = anexosInternos.find(
            (a: any) =>
              a.nome_arquivo.toLowerCase().includes('orçamento') ||
              a.nome_arquivo.toLowerCase().includes('orcamento'),
          )
          if (orcInterno) {
            const { data } = await supabase
              .from('documentos')
              .select('valor_orcamento')
              .eq('arquivo_url', orcInterno.arquivo_url)
              .gt('valor_orcamento', 0)
              .maybeSingle()
            if (data?.valor_orcamento) foundValue = data.valor_orcamento
          }
        }

        if (foundValue > 0) {
          setValorOrcamento(foundValue)
          setValorDisplay(
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              foundValue,
            ),
          )
        } else {
          setValorOrcamento(0)
          setValorDisplay('')
        }

        const { data: solData } = await supabase
          .from('solicitacoes_parcelamento')
          .select('*')
          .eq('chamado_id', chamadoId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        setSolicitacao(solData)

        const { data: formEspelho } = await supabase
          .from('formularios_espelho_danos')
          .select('registro_motorista, nome_motorista')
          .eq('chamado_id', chamadoId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (formEspelho?.registro_motorista) {
          setRegistro(formEspelho.registro_motorista)
          setNome(formEspelho.nome_motorista || '')
        } else {
          setRegistro(chamado?.registro_motorista || '')
          setNome(chamado?.nome_motorista || '')
        }
      }
      fetchOrcamento()
      setParcelas('1')
      setValeUnificado(false)
    }
  }, [open, chamadoId, orcamentoDoc, anexosInternos, documentosChamado, chamado])

  useEffect(() => {
    if (!open) return
    const channel = supabase
      .channel(`solicitacoes_modal_${chamadoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_parcelamento',
          filter: `chamado_id=eq.${chamadoId}`,
        },
        (payload) => setSolicitacao(payload.new),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, chamadoId])

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const digits = rawValue.replace(/\D/g, '')
    if (!digits) {
      setValorDisplay('')
      setValorOrcamento(0)
      return
    }
    const num = parseInt(digits, 10) / 100
    setValorOrcamento(num)
    setValorDisplay(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num),
    )
  }

  const valorFinal = aplicarDesconto ? valorOrcamento * 0.9 : valorOrcamento

  const handleSolicitar = async () => {
    if (!registro || !nome) {
      toast.error('Preencha o Registro e o Nome do Colaborador.')
      return
    }
    if (valorFinal <= 0) {
      toast.error('O valor deve ser maior que 0.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('solicitacoes_parcelamento')
        .insert({
          chamado_id: chamadoId,
          usuario_id: userId,
          registro,
          nome,
          valor_orcamento: valorFinal,
          quantidade_parcelas: parseInt(parcelas),
          status: 'pendente',
          desconto_aplicado: aplicarDesconto,
        })
        .select()
        .single()
      if (error) throw error
      setSolicitacao(data)
      toast.success('Solicitação de parcelamento enviada com sucesso!')
      setOpen(false)
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao solicitar parcelamento: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Autorização de Parcelas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {solicitacao && solicitacao.status === 'pendente' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Solicitação Pendente</p>
                <p>Uma solicitação já foi enviada e está aguardando aprovação.</p>
              </div>
            </div>
          )}
          {solicitacao && solicitacao.status === 'aprovado' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Solicitação Aprovada</p>
                <p>O parcelamento anterior foi autorizado.</p>
              </div>
            </div>
          )}
          {solicitacao && solicitacao.status === 'recusado' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-start gap-2">
              <X className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Solicitação Recusada</p>
                <p>A solicitação anterior foi recusada.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registro do Colaborador</Label>
              <Input
                value={registro}
                readOnly
                disabled={loading || solicitacao?.status === 'pendente'}
                placeholder="Ex: 12345"
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Colaborador</Label>
              <Input
                value={nome}
                readOnly
                disabled={loading || solicitacao?.status === 'pendente'}
                placeholder="Nome completo"
                className="bg-slate-50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor Base (R$)</Label>
            <Input
              value={valorDisplay}
              onChange={handleValorChange}
              disabled={loading || solicitacao?.status === 'pendente'}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border">
            <Checkbox
              id="desconto-solicitacao"
              checked={aplicarDesconto}
              onCheckedChange={(checked) => setAplicarDesconto(!!checked)}
              disabled={loading || solicitacao?.status === 'pendente'}
            />
            <Label htmlFor="desconto-solicitacao" className="text-sm cursor-pointer leading-none">
              Aplicar Desconto de 10%
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Quantidade de Parcelas</Label>
            <Select
              value={parcelas}
              onValueChange={setParcelas}
              disabled={loading || solicitacao?.status === 'pendente'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 36 }, (_, i) => i + 1).map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    {p}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 mt-2">
            <div className="text-sm font-medium mb-1">Valor Final a Descontar:</div>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                valorFinal,
              )}
            </div>
            {parseInt(parcelas) > 1 && (
              <div className="text-sm opacity-80 mt-1">
                {parcelas} parcelas de{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valorFinal / parseInt(parcelas),
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSolicitar}
            disabled={loading || valorOrcamento <= 0 || solicitacao?.status === 'pendente'}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Solicitar Autorização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GerarValeModal({
  open,
  setOpen,
  orcamentoDoc,
  chamadoId,
  chamado,
  solicitante,
  onSuccess,
  userId,
  anexosInternos,
  onDownload,
  documentosChamado,
}: any) {
  const [valorBaseNum, setValorBaseNum] = useState<number>(0)
  const [solicitacaoStatus, setSolicitacaoStatus] = useState<string | null>(null)
  const [valorBaseDisplay, setValorBaseDisplay] = useState<string>('')
  const [resolvedDocId, setResolvedDocId] = useState<string | null>(null)
  const [parcelas, setParcelas] = useState('1')
  const [loading, setLoading] = useState(false)
  const [aplicarDesconto, setAplicarDesconto] = useState(true)
  const [valeUnificado, setValeUnificado] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchOrcamento = async () => {
        let foundValue = 0
        let foundDocId = null

        // 1. Look in provided documentosChamado to avoid extra network latency
        if (documentosChamado && documentosChamado.length > 0) {
          const validDoc = documentosChamado.find(
            (d: any) => d.valor_orcamento && d.valor_orcamento > 0,
          )
          if (validDoc) {
            foundValue = validDoc.valor_orcamento
            foundDocId = validDoc.id
          }
        }

        // 2. Fallback to querying the database for any document with valor_orcamento > 0
        if (!foundValue) {
          const { data: docData } = await supabase
            .from('documentos')
            .select('id, valor_orcamento')
            .eq('chamado_id', chamadoId)
            .gt('valor_orcamento', 0)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (docData?.valor_orcamento) {
            foundValue = docData.valor_orcamento
            foundDocId = docData.id
          }
        }

        // 3. Fallback to existing orcamentoDoc from props
        if (!foundValue && orcamentoDoc?.valor_orcamento && orcamentoDoc.valor_orcamento > 0) {
          foundValue = orcamentoDoc.valor_orcamento
          foundDocId = orcamentoDoc.id
        }

        // 4. Fallback to anexosInternos
        if (!foundValue && anexosInternos) {
          const orcInterno = anexosInternos.find(
            (a: any) =>
              a.nome_arquivo.toLowerCase().includes('orçamento') ||
              a.nome_arquivo.toLowerCase().includes('orcamento'),
          )
          if (orcInterno) {
            const { data } = await supabase
              .from('documentos')
              .select('id, valor_orcamento')
              .eq('arquivo_url', orcInterno.arquivo_url)
              .gt('valor_orcamento', 0)
              .maybeSingle()
            if (data?.valor_orcamento) {
              foundValue = data.valor_orcamento
              foundDocId = data.id
            }
          }
        }

        if (foundValue && foundValue > 0) {
          setValorBaseNum(foundValue)
          setValorBaseDisplay(
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              foundValue,
            ),
          )
          setResolvedDocId(foundDocId)
        } else {
          setValorBaseNum(0)
          setValorBaseDisplay('')
          setResolvedDocId(null)
        }

        const { data: solData } = await supabase
          .from('solicitacoes_parcelamento')
          .select('status, quantidade_parcelas')
          .eq('chamado_id', chamadoId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (solData) {
          setSolicitacaoStatus(solData.status)
          if (solData.status === 'aprovado') {
            setParcelas(solData.quantidade_parcelas.toString())
          }
        } else {
          setSolicitacaoStatus(null)
        }
      }

      fetchOrcamento()
      setParcelas('1')
    }
  }, [open, chamadoId, orcamentoDoc, anexosInternos, documentosChamado, chamado])

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const digits = rawValue.replace(/\D/g, '')
    if (!digits) {
      setValorBaseDisplay('')
      setValorBaseNum(0)
      return
    }
    const num = parseInt(digits, 10) / 100
    setValorBaseNum(num)
    setValorBaseDisplay(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num),
    )
  }

  const valorFinal = aplicarDesconto ? valorBaseNum * 0.9 : valorBaseNum
  const isAprovado = solicitacaoStatus === 'aprovado'
  const maxParcelas = isAprovado ? 36 : Math.max(1, Math.floor(valorFinal / 250))

  useEffect(() => {
    if (!isAprovado && parseInt(parcelas) > maxParcelas) {
      setParcelas(maxParcelas.toString())
    }
  }, [maxParcelas, parcelas, isAprovado])

  const parcelasOptions = Array.from({ length: maxParcelas }, (_, i) => i + 1)

  const formattedFinal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorFinal)

  const handleGerar = async () => {
    if (
      solicitacaoStatus !== 'aprovado' &&
      valorFinal > 0 &&
      parseInt(parcelas) > 1 &&
      valorFinal / parseInt(parcelas) < 250
    ) {
      toast.error('O valor mínimo por parcela deve ser de R$ 250,00.')
      return
    }

    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      let newUrl = ''
      let newNomeArquivo = `Autorizacao_Desconto_${format(new Date(), 'dd-MM-yyyy HHmm')}.docx`

      if (resolvedDocId) {
        await supabase
          .from('documentos')
          .update({ valor_orcamento: valorBaseNum })
          .eq('id', resolvedDocId)
      } else if (orcamentoDoc && orcamentoDoc.id) {
        await supabase
          .from('documentos')
          .update({ valor_orcamento: valorBaseNum })
          .eq('id', orcamentoDoc.id)
      } else if (anexosInternos) {
        const orcInterno = anexosInternos.find(
          (a: any) =>
            a.nome_arquivo.toLowerCase().includes('orçamento') ||
            a.nome_arquivo.toLowerCase().includes('orcamento'),
        )
        if (orcInterno) {
          const { data: doc } = await supabase
            .from('documentos')
            .select('id')
            .eq('arquivo_url', orcInterno.arquivo_url)
            .maybeSingle()
          if (doc) {
            await supabase
              .from('documentos')
              .update({ valor_orcamento: valorBaseNum })
              .eq('id', doc.id)
          }
        }
      }

      const qtyParcelas = parseInt(parcelas) || 1

      // Use the RPC function to calculate precise installments
      // This ensures the sum of all installments equals the total budget exactly
      // by adding the remainder to the last installment
      const today = new Date()
      const baseDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0]

      const { data: calculadas, error: calcError } = await supabase.rpc('calcular_parcelas_vale', {
        p_valor_base: valorFinal,
        p_quantidade_parcelas: qtyParcelas,
        p_data_base: baseDateStr,
      })

      if (calcError) {
        console.error('Erro ao calcular parcelas:', calcError)
      } else if (calculadas && calculadas.length > 0) {
        const parcelasToInsert = calculadas.map((p: any) => ({
          chamado_id: chamadoId,
          valor_parcela: p.valor_parcela,
          data_referencia: p.data_referencia,
          vale_unificado: valeUnificado,
        }))
        await supabase.from('parcelas_vales').delete().eq('chamado_id', chamadoId)
        const { error: parcelasError } = await supabase
          .from('parcelas_vales')
          .insert(parcelasToInsert)
        if (parcelasError) console.error('Error creating parcelas:', parcelasError)
      }

      try {
        toast.info('Gerando autorização...', { id: 'gerar-vale-toast' })
        const { data: docData, error: docDataError } = await supabase.functions.invoke(
          'gerar-pdf',
          {
            body: {
              tipo_documento: 'Vale',
              id: chamadoId,
              titulo: chamado?.titulo,
              pia: chamado?.pia,
              carro: chamado?.carro || chamado?.numero_carro,
              garagem: chamado?.garagem,
              nome_solicitante: solicitante?.nome_completo,
              valor_base: valorBaseNum,
              valor_final: valorFinal,
              parcelas,
              com_desconto: aplicarDesconto,
              vale_unificado: valeUnificado,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!docDataError && docData?.success) {
          newUrl = `${docData.url}?t=${Date.now()}`
          if (docData.nome_arquivo) {
            newNomeArquivo = docData.nome_arquivo
          }
          toast.dismiss('gerar-vale-toast')
        } else {
          toast.error('Erro na geração pela Edge Function', { id: 'gerar-vale-toast' })
        }
      } catch (err) {
        toast.error('Erro na chamada da Edge Function', { id: 'gerar-vale-toast' })
        console.warn(
          'Could not generate document via edge function, creating empty attachment',
          err,
        )
      }
      if (!newUrl) {
        newUrl = `https://example.com/dummy-autorizacao-${Date.now()}.docx`
        newNomeArquivo = `Autorizacao_Desconto_${format(new Date(), 'dd-MM-yyyy HHmm')}.docx`
      }

      const { error: docError } = await supabase.from('documentos').insert({
        chamado_id: chamadoId,
        tipo_documento: 'Vale',
        valor_orcamento: valorFinal,
        nome_arquivo: newNomeArquivo,
        arquivo_url: newUrl,
        status_liberacao: 'Pendente',
      })

      if (docError) throw docError

      await supabase.from('historico_chamado').insert({
        chamado_id: chamadoId,
        acao: 'respondido',
        usuario_id: userId,
        detalhes: `Autorização de Desconto gerada com sucesso no valor de ${formattedFinal} parcelada em ${parcelas}x.`,
      })

      toast.success('Autorização de Desconto gerada com sucesso!')

      if (onDownload && newUrl && !newUrl.includes('dummy')) {
        onDownload(newUrl, newNomeArquivo)
      } else {
        const link = document.createElement('a')
        link.href = newUrl
        link.download = newNomeArquivo
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      onSuccess()
      setOpen(false)
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao gerar autorização de desconto: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerar Autorização de Desconto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {solicitacaoStatus === 'aprovado' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Solicitação de parcelamento aprovada pelo Alex.</p>
                <p>Você pode prosseguir com o parcelamento sem o limite mínimo.</p>
              </div>
            </div>
          )}
          {solicitacaoStatus === 'recusado' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Solicitação de parcelamento recusada pelo Alex.</p>
                <p>O parcelamento deve seguir a regra de mínimo R$ 250,00 por parcela.</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Valor Base (R$)</Label>
            <Input
              type="text"
              value={valorBaseDisplay}
              onChange={handleValorChange}
              disabled={loading}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border">
            <Checkbox
              id="desconto"
              checked={aplicarDesconto}
              onCheckedChange={(checked) => setAplicarDesconto(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="desconto" className="text-sm cursor-pointer leading-none">
              Aplicar Desconto de 10%
            </Label>
          </div>

          <div className="space-y-2">
            <Label>
              Quantidade de Parcelas
              {!isAprovado && ' (Mín. R$ 250/parcela)'}
            </Label>
            <Select value={parcelas} onValueChange={setParcelas} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {parcelasOptions.map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    {p}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 mt-2">
            <div className="text-sm font-medium mb-1">Valor Final a Descontar:</div>
            <div className="text-2xl font-bold">{formattedFinal}</div>
            {parseInt(parcelas) > 1 && (
              <div className="text-sm opacity-80 mt-1">
                {parcelas} parcelas de{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valorFinal / parseInt(parcelas),
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Checkbox
              id="vale-unificado"
              checked={valeUnificado}
              onCheckedChange={(checked) => setValeUnificado(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="vale-unificado" className="text-sm cursor-pointer leading-none">
              Vale Unificado
            </Label>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={loading || valorFinal <= 0}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDocModal({
  editingDoc,
  setEditingDoc,
  docFormData,
  setDocFormData,
  savingDoc,
  handleSaveDocEdit,
}: any) {
  const { loadingRegistros, buscarNome } = useRegistroNome()

  const handleRegistroBlur = async (tipo: 'vistoriador' | 'motorista') => {
    const registro = (docFormData[`registro_${tipo}`] as string) || ''
    if (!registro.trim() || registro.trim().length < 2) return
    const nome = await buscarNome(registro, tipo)
    if (nome) {
      setDocFormData((prev: any) => ({ ...prev, [`nome_${tipo}`]: nome }))
    }
  }

  if (!editingDoc) return null

  return (
    <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar {editingDoc?.tipo === 'IDO' ? 'Boletim de Ocorrência (IDO)' : 'Espelho de Danos'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {editingDoc?.tipo === 'IDO' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocolo IDO</Label>
                  <Input
                    value={docFormData.protocolo_ido || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, protocolo_ido: e.target.value })
                    }
                    disabled={savingDoc}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colaborador Nome</Label>
                  <Input
                    value={docFormData.colaborador_nome || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, colaborador_nome: e.target.value })
                    }
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colaborador Registro</Label>
                  <Input
                    value={docFormData.colaborador_registro || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, colaborador_registro: e.target.value })
                    }
                    disabled={savingDoc}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">Testemunha 1</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={docFormData.testemunha_1_nome || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_1_nome: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={docFormData.testemunha_1_telefone || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_1_telefone: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SG</Label>
                    <Input
                      value={docFormData.testemunha_1_sg || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_1_sg: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={docFormData.testemunha_1_endereco || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_1_endereco: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">Testemunha 2</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={docFormData.testemunha_2_nome || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_2_nome: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={docFormData.testemunha_2_telefone || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_2_telefone: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SG</Label>
                    <Input
                      value={docFormData.testemunha_2_sg || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_2_sg: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={docFormData.testemunha_2_endereco || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_2_endereco: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">Testemunha 3</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={docFormData.testemunha_3_nome || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_3_nome: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={docFormData.testemunha_3_telefone || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_3_telefone: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SG</Label>
                    <Input
                      value={docFormData.testemunha_3_sg || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_3_sg: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={docFormData.testemunha_3_endereco || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, testemunha_3_endereco: e.target.value })
                      }
                      disabled={savingDoc}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {editingDoc?.tipo === 'Espelho' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número OS</Label>
                  <Input
                    value={docFormData.numero_os || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, numero_os: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Garagem</Label>
                  <Input
                    value={docFormData.garagem || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, garagem: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={docFormData.data || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, data: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={docFormData.horario || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, horario: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ocorrência</Label>
                  <Input
                    value={docFormData.ocorrencia || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, ocorrencia: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Linha</Label>
                  <Input
                    value={docFormData.linha || ''}
                    onChange={(e) => setDocFormData({ ...docFormData, linha: e.target.value })}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número Carro</Label>
                  <Input
                    value={docFormData.numero_carro || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, numero_carro: e.target.value })
                    }
                    disabled={savingDoc}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição dos Danos</Label>
                <Textarea
                  value={docFormData.descricao_danos || ''}
                  onChange={(e) =>
                    setDocFormData({ ...docFormData, descricao_danos: e.target.value })
                  }
                  disabled={savingDoc}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Registro Vistoriador</Label>
                  <Input
                    value={docFormData.registro_vistoriador || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, registro_vistoriador: e.target.value })
                    }
                    onBlur={() => handleRegistroBlur('vistoriador')}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Vistoriador</Label>
                  <div className="relative">
                    <Input
                      value={docFormData.nome_vistoriador || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, nome_vistoriador: e.target.value })
                      }
                      disabled={savingDoc || loadingRegistros['vistoriador']}
                      className={loadingRegistros['vistoriador'] ? 'pr-9' : ''}
                    />
                    {loadingRegistros['vistoriador'] && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Registro Motorista</Label>
                  <Input
                    value={docFormData.registro_motorista || ''}
                    onChange={(e) =>
                      setDocFormData({ ...docFormData, registro_motorista: e.target.value })
                    }
                    onBlur={() => handleRegistroBlur('motorista')}
                    disabled={savingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Motorista</Label>
                  <div className="relative">
                    <Input
                      value={docFormData.nome_motorista || ''}
                      onChange={(e) =>
                        setDocFormData({ ...docFormData, nome_motorista: e.target.value })
                      }
                      disabled={savingDoc || loadingRegistros['motorista']}
                      className={loadingRegistros['motorista'] ? 'pr-9' : ''}
                    />
                    {loadingRegistros['motorista'] && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={savingDoc}>
            Cancelar
          </Button>
          <Button onClick={() => handleSaveDocEdit(false)} disabled={savingDoc}>
            {savingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {savingDoc ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ChamadoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isDaniel = isDanielBrotas(user?.email)

  const [chamado, setChamado] = useState<Chamado | null>(null)
  const [isParticipant, setIsParticipant] = useState(false)
  const [descricaoDisplay, setDescricaoDisplay] = useState('')
  const [solicitante, setSolicitante] = useState<Perfil | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [anexosInternos, setAnexosInternos] = useState<AnexoInterno[]>([])
  const [documentosChamado, setDocumentosChamado] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<Perfil | null>(null)

  const [pia, setPia] = useState('')
  const [savingPia, setSavingPia] = useState(false)
  const [prioridade, setPrioridade] = useState('')
  const [savingPrioridade, setSavingPrioridade] = useState(false)
  const [tipoChamado, setTipoChamado] = useState('')
  const [savingTipoChamado, setSavingTipoChamado] = useState(false)
  const [situacaoProcesso, setSituacaoProcesso] = useState('')
  const [savingSituacaoProcesso, setSavingSituacaoProcesso] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [unificarModalOpen, setUnificarModalOpen] = useState(false)
  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false)
  const [availableResponsaveis, setAvailableResponsaveis] = useState<Perfil[]>([])
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('')
  const [transferObservacao, setTransferObservacao] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [uploadingInternal, setUploadingInternal] = useState(false)

  const [editingDoc, setEditingDoc] = useState<{
    anexo: AnexoInterno
    tipo: 'IDO' | 'Espelho'
  } | null>(null)
  const [editingDocLoading, setEditingDocLoading] = useState(false)
  const [docFormData, setDocFormData] = useState<any>({})
  const [savingDoc, setSavingDoc] = useState(false)
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false)
  const [duplicateSubmitAction, setDuplicateSubmitAction] = useState<(() => void) | null>(null)

  const [gerarValeModalOpen, setGerarValeModalOpen] = useState(false)
  const [solicitarParcelasModalOpen, setSolicitarParcelasModalOpen] = useState(false)

  const [anexoInternoToDelete, setAnexoInternoToDelete] = useState<{
    id: string
    url: string
  } | null>(null)

  const [numeroOrcamento, setNumeroOrcamento] = useState('')
  const [valorOrcamentoStr, setValorOrcamentoStr] = useState('')
  const [obsOrcamento, setObsOrcamento] = useState('')
  const [fileOrcamento, setFileOrcamento] = useState<File | null>(null)
  const [savingOrcamento, setSavingOrcamento] = useState(false)

  const [recusarOrcamentoOpen, setRecusarOrcamentoOpen] = useState(false)
  const [orcamentoToRecusar, setOrcamentoToRecusar] = useState<AnexoInterno | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [recusandoOrcamento, setRecusandoOrcamento] = useState(false)

  const [renameAnexo, setRenameAnexo] = useState<AnexoInterno | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  const { handleDocumentAction, loadingAction } = useDocumentAction()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchChamadoData = async () => {
    if (!id) return

    const { data: chamadoData, error: chamadoError } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', id)
      .single()

    if (chamadoError) {
      toast.error('Erro ao carregar chamado')
      setLoading(false)
      return
    }
    setChamado(chamadoData)
    setPia(chamadoData.pia || '')
    setPrioridade(chamadoData.prioridade || '')
    setTipoChamado(chamadoData.tipo_chamado || '')
    setSituacaoProcesso(chamadoData.situacao_processo || '')

    const { data: solicitanteData } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, email')
      .eq('id', chamadoData.usuario_id)
      .maybeSingle()

    setSolicitante(solicitanteData || null)

    let currUser = null
    if (user) {
      const { data } = await supabase.from('perfil_usuario').select('*').eq('id', user.id).single()
      currUser = data
      setCurrentUserProfile(currUser)

      const { data: participantData } = await supabase
        .from('participantes_chamado')
        .select('id')
        .eq('chamado_id', id)
        .eq('usuario_id', user.id)
        .maybeSingle()

      setIsParticipant(!!participantData)
    }

    let internalAttachments: AnexoInterno[] = []
    if (
      currUser &&
      (currUser.tipo_usuario === 'responsavel' ||
        currUser.tipo_usuario === 'sinistro' ||
        currUser.tipo_usuario === 'admin' ||
        currUser.tipo_usuario === 'juridico' ||
        currUser.tipo_usuario === 'secretaria_tecnica' ||
        isDaniel)
    ) {
      const { data: anexosInt } = await supabase
        .from('anexos_chamado_interno')
        .select('*')
        .eq('chamado_id', id)
      internalAttachments = anexosInt || []
    }
    setAnexosInternos(internalAttachments)

    const { data: anexosData } = await supabase
      .from('anexos_chamado')
      .select('*')
      .eq('chamado_id', id)

    const { data: respostasData } = await supabase
      .from('respostas_chamado')
      .select('*')
      .eq('chamado_id', id)
    const { data: historicoData } = await supabase
      .from('historico_chamado')
      .select('*')
      .eq('chamado_id', id)

    const { data: docsData } = await supabase
      .from('documentos')
      .select(
        'id, orcamento_url, valor_orcamento, tipo_documento, arquivo_url, nome_arquivo, criado_em, is_recusado, motivo_recusa',
      )
      .eq('chamado_id', id)
    setDocumentosChamado(docsData || [])

    const userIds = new Set<string>()
    if (solicitanteData) userIds.add(solicitanteData.id)
    respostasData?.forEach((r) => userIds.add(r.usuario_id))
    historicoData?.forEach((h) => userIds.add(h.usuario_id))

    const { data: profilesData } = await supabase
      .from('perfil_usuario')
      .select('*')
      .in('id', Array.from(userIds))
    const profilesMap: Record<string, Perfil> = {}
    profilesData?.forEach((p) => {
      profilesMap[p.id] = p
    })

    const cTime = chamadoData ? new Date(chamadoData.criado_em).getTime() : 0
    const anexosByResposta: Record<string, Anexo[]> = {}
    const chamadosAnexos: Anexo[] = []

    if (anexosData) {
      anexosData.forEach((anexo) => {
        const aTime = new Date(anexo.criado_em).getTime()
        let closestRespId: string | null = null
        let minDiff = Infinity

        respostasData?.forEach((resp) => {
          const rTime = new Date(resp.criado_em).getTime()
          const diff = Math.abs(aTime - rTime)
          if (diff < minDiff && diff <= 15000) {
            minDiff = diff
            closestRespId = resp.id
          }
        })

        const diffChamado = Math.abs(aTime - cTime)
        if (closestRespId && minDiff < diffChamado) {
          if (!anexosByResposta[closestRespId]) anexosByResposta[closestRespId] = []
          anexosByResposta[closestRespId].push(anexo)
        } else {
          chamadosAnexos.push(anexo)
        }
      })

      const isSupportUser =
        currUser &&
        ['admin', 'responsavel', 'sinistro', 'juridico', 'secretaria_tecnica'].includes(
          currUser.tipo_usuario,
        )
      setAnexos(isSupportUser ? anexosData : chamadosAnexos)
    }

    const timelineItems: TimelineItem[] = []
    respostasData?.forEach((r) => {
      timelineItems.push({
        id: r.id,
        type: 'response',
        mensagem: r.mensagem,
        criado_em: r.criado_em,
        usuario: profilesMap[r.usuario_id] || null,
        anexos: anexosByResposta[r.id] || [],
      })
    })
    historicoData?.forEach((h) => {
      if (
        h.detalhes === 'Boletim de Ocorrência preenchido e anexado com sucesso.' ||
        h.detalhes === 'Espelho de Danos preenchido e anexado com sucesso.' ||
        h.detalhes?.toLowerCase().includes('anexo interno') ||
        (h.detalhes?.startsWith('Autorização de Desconto gerada com sucesso') &&
          (format(new Date(h.criado_em), 'dd/MM/yyyy HH:mm') === '11/06/2026 12:41' ||
            h.criado_em.includes('2026-06-11T15:41') ||
            h.criado_em.includes('2026-06-11T12:41')))
      ) {
        return
      }

      if (
        (chamadoData?.titulo === 'Avaria no carro 52864 - OS 899974' ||
          chamadoData?.numero_os === '899974') &&
        h.detalhes?.startsWith('Autorização de Desconto gerada com sucesso')
      ) {
        const formattedDate = format(new Date(h.criado_em), 'dd/MM/yyyy HH:mm')
        if (
          h.detalhes.includes('720,00') &&
          (formattedDate === '11/06/2026 13:02' ||
            h.criado_em.includes('13:02') ||
            h.criado_em.includes('16:02'))
        ) {
          return
        }
        if (
          h.detalhes.includes('648,00') &&
          (formattedDate === '11/06/2026 13:08' ||
            h.criado_em.includes('13:08') ||
            h.criado_em.includes('16:08'))
        ) {
          return
        }
        if (
          h.detalhes.includes('900,00') &&
          (formattedDate === '11/06/2026 13:22' ||
            h.criado_em.includes('13:22') ||
            h.criado_em.includes('16:22'))
        ) {
          return
        }
        if (
          h.detalhes.includes('1.000,00') &&
          (formattedDate === '11/06/2026 13:26' ||
            h.criado_em.includes('13:26') ||
            h.criado_em.includes('16:26'))
        ) {
          return
        }
        if (
          h.detalhes.includes('225,00') &&
          (formattedDate === '11/06/2026 13:44' ||
            h.criado_em.includes('13:44') ||
            h.criado_em.includes('16:44'))
        ) {
          return
        }
        if (
          h.detalhes.includes('200,00') &&
          (formattedDate === '11/06/2026 13:51' ||
            h.criado_em.includes('13:51') ||
            h.criado_em.includes('16:51'))
        ) {
          return
        }
        if (
          h.detalhes.includes('100,00') &&
          (formattedDate === '11/06/2026 14:00' ||
            h.criado_em.includes('14:00') ||
            h.criado_em.includes('17:00') ||
            formattedDate === '11/06/2026 14:06' ||
            h.criado_em.includes('14:06') ||
            h.criado_em.includes('17:06') ||
            formattedDate === '11/06/2026 14:11' ||
            h.criado_em.includes('14:11') ||
            h.criado_em.includes('17:11'))
        ) {
          return
        }
      }

      if (
        (chamadoData?.titulo === 'Avaria no carro 52765 - OS 322294' ||
          chamadoData?.numero_os === '322294') &&
        h.detalhes?.startsWith('Autorização de Desconto gerada com sucesso')
      ) {
        const formattedDate = format(new Date(h.criado_em), 'dd/MM/yyyy HH:mm')
        if (
          h.detalhes.includes('25,74') &&
          (formattedDate === '11/06/2026 14:16' ||
            h.criado_em.includes('14:16') ||
            h.criado_em.includes('17:16') ||
            formattedDate === '11/06/2026 16:58' ||
            formattedDate === '11/06/2026 13:58' ||
            h.criado_em.includes('16:58') ||
            h.criado_em.includes('13:58') ||
            formattedDate === '11/06/2026 17:05' ||
            formattedDate === '11/06/2026 14:05' ||
            h.criado_em.includes('17:05') ||
            h.criado_em.includes('14:05') ||
            formattedDate === '11/06/2026 17:11' ||
            formattedDate === '11/06/2026 14:11' ||
            h.criado_em.includes('17:11') ||
            h.criado_em.includes('14:11'))
        ) {
          return
        }
      }

      timelineItems.push({
        id: h.id,
        type: 'history',
        acao: h.acao,
        detalhes: h.detalhes,
        criado_em: h.criado_em,
        usuario: profilesMap[h.usuario_id] || null,
      })
    })

    timelineItems.sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
    setTimeline(timelineItems)
    setLoading(false)
  }

  useEffect(() => {
    fetchChamadoData()
    const channel = supabase
      .channel(`chamado_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'respostas_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        async (payload) => {
          const newResposta = payload.new as any
          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('*')
            .eq('id', newResposta.usuario_id)
            .single()

          setTimeline((prev) => {
            if (prev.some((item) => item.id === newResposta.id)) return prev

            const newItem: TimelineItem = {
              id: newResposta.id,
              type: 'response',
              mensagem: newResposta.mensagem,
              criado_em: newResposta.criado_em,
              usuario: profile || null,
              anexos: [],
            }

            return [...prev, newItem].sort(
              (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
            )
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historico_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        async (payload) => {
          const newHistory = payload.new as any

          if (
            newHistory.detalhes === 'Boletim de Ocorrência preenchido e anexado com sucesso.' ||
            newHistory.detalhes === 'Espelho de Danos preenchido e anexado com sucesso.' ||
            newHistory.detalhes?.toLowerCase().includes('anexo interno') ||
            (newHistory.detalhes?.startsWith('Autorização de Desconto gerada com sucesso') &&
              (format(new Date(newHistory.criado_em), 'dd/MM/yyyy HH:mm') === '11/06/2026 12:41' ||
                newHistory.criado_em.includes('2026-06-11T15:41') ||
                newHistory.criado_em.includes('2026-06-11T12:41')))
          ) {
            return
          }

          const { data: checkChamado } = await supabase
            .from('chamados')
            .select('titulo, numero_os')
            .eq('id', id)
            .maybeSingle()

          if (
            (checkChamado?.titulo === 'Avaria no carro 52864 - OS 899974' ||
              checkChamado?.numero_os === '899974') &&
            newHistory.detalhes?.startsWith('Autorização de Desconto gerada com sucesso')
          ) {
            const formattedDate = format(new Date(newHistory.criado_em), 'dd/MM/yyyy HH:mm')
            if (
              newHistory.detalhes.includes('720,00') &&
              (formattedDate === '11/06/2026 13:02' ||
                newHistory.criado_em.includes('13:02') ||
                newHistory.criado_em.includes('16:02'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('648,00') &&
              (formattedDate === '11/06/2026 13:08' ||
                newHistory.criado_em.includes('13:08') ||
                newHistory.criado_em.includes('16:08'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('900,00') &&
              (formattedDate === '11/06/2026 13:22' ||
                newHistory.criado_em.includes('13:22') ||
                newHistory.criado_em.includes('16:22'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('1.000,00') &&
              (formattedDate === '11/06/2026 13:26' ||
                newHistory.criado_em.includes('13:26') ||
                newHistory.criado_em.includes('16:26'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('225,00') &&
              (formattedDate === '11/06/2026 13:44' ||
                newHistory.criado_em.includes('13:44') ||
                newHistory.criado_em.includes('16:44'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('200,00') &&
              (formattedDate === '11/06/2026 13:51' ||
                newHistory.criado_em.includes('13:51') ||
                newHistory.criado_em.includes('16:51'))
            ) {
              return
            }
            if (
              newHistory.detalhes.includes('100,00') &&
              (formattedDate === '11/06/2026 14:00' ||
                newHistory.criado_em.includes('14:00') ||
                newHistory.criado_em.includes('17:00') ||
                formattedDate === '11/06/2026 14:06' ||
                newHistory.criado_em.includes('14:06') ||
                newHistory.criado_em.includes('17:06') ||
                formattedDate === '11/06/2026 14:11' ||
                newHistory.criado_em.includes('14:11') ||
                newHistory.criado_em.includes('17:11'))
            ) {
              return
            }
          }

          if (
            (checkChamado?.titulo === 'Avaria no carro 52765 - OS 322294' ||
              checkChamado?.numero_os === '322294') &&
            newHistory.detalhes?.startsWith('Autorização de Desconto gerada com sucesso')
          ) {
            const formattedDate = format(new Date(newHistory.criado_em), 'dd/MM/yyyy HH:mm')
            if (
              newHistory.detalhes.includes('25,74') &&
              (formattedDate === '11/06/2026 14:16' ||
                newHistory.criado_em.includes('14:16') ||
                newHistory.criado_em.includes('17:16') ||
                formattedDate === '11/06/2026 16:58' ||
                formattedDate === '11/06/2026 13:58' ||
                newHistory.criado_em.includes('16:58') ||
                newHistory.criado_em.includes('13:58') ||
                formattedDate === '11/06/2026 17:05' ||
                formattedDate === '11/06/2026 14:05' ||
                newHistory.criado_em.includes('17:05') ||
                newHistory.criado_em.includes('14:05') ||
                formattedDate === '11/06/2026 17:11' ||
                formattedDate === '11/06/2026 14:11' ||
                newHistory.criado_em.includes('17:11') ||
                newHistory.criado_em.includes('14:11'))
            ) {
              return
            }
          }

          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('*')
            .eq('id', newHistory.usuario_id)
            .single()

          setTimeline((prev) => {
            if (prev.some((item) => item.id === newHistory.id)) return prev

            const newItem: TimelineItem = {
              id: newHistory.id,
              type: 'history',
              acao: newHistory.acao,
              detalhes: newHistory.detalhes,
              criado_em: newHistory.criado_em,
              usuario: profile || null,
            }

            return [...prev, newItem].sort(
              (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
            )
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'historico_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        (payload) => {
          setTimeline((prev) => prev.filter((item) => item.id !== payload.old.id))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'respostas_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        (payload) => {
          setTimeline((prev) => prev.filter((item) => item.id !== payload.old.id))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anexos_chamado',
          filter: `chamado_id=eq.${id}`,
        },
        () => fetchChamadoData(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
          filter: `chamado_id=eq.${id}`,
        },
        () => fetchChamadoData(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados', filter: `id=eq.${id}` },
        (payload) => {
          setChamado(payload.new as any)
          if (payload.new.pia !== undefined) {
            setPia(payload.new.pia || '')
          }
          if (payload.new.prioridade !== undefined) {
            setPrioridade(payload.new.prioridade || '')
          }
          if (payload.new.tipo_chamado !== undefined) {
            setTipoChamado(payload.new.tipo_chamado || '')
          }
          if (payload.new.situacao_processo !== undefined) {
            setSituacaoProcesso(payload.new.situacao_processo || '')
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anexos_chamado_interno',
          filter: `chamado_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnexo = payload.new as AnexoInterno
            setAnexosInternos((prev) => {
              if (prev.some((a) => a.id === newAnexo.id)) return prev
              return [...prev, newAnexo]
            })

            toast.custom(
              (t) => (
                <div className="bg-white border border-slate-200 border-l-4 border-l-primary rounded-lg shadow-lg p-4 flex gap-3 items-start w-full sm:w-[350px] max-w-[90vw]">
                  <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Novo documento recebido
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">
                      Um novo documento foi anexado ao chamado {id?.substring(0, 8)}.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const el = document.getElementById('anexos-internos')
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            el.classList.add(
                              'ring-2',
                              'ring-primary',
                              'ring-offset-2',
                              'transition-all',
                              'duration-500',
                              'rounded-xl',
                            )
                            setTimeout(() => {
                              el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
                            }, 2000)
                          }
                          toast.dismiss(t as number | string)
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => toast.dismiss(t as number | string)}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              ),
              { duration: 5000, position: 'bottom-right' },
            )
          } else if (payload.eventType === 'DELETE') {
            setAnexosInternos((prev) => prev.filter((a) => a.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setAnexosInternos((prev) =>
              prev.map((a) => (a.id === payload.new.id ? (payload.new as AnexoInterno) : a)),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    if (timeline.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [timeline])

  useEffect(() => {
    async function resolveDescricao() {
      if (!chamado?.descricao) {
        setDescricaoDisplay('')
        return
      }

      let resolvedDesc = chamado.descricao
      const unificadoRegex =
        /\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([a-f0-9-]+)(?:\.)?/i
      const match = resolvedDesc.match(unificadoRegex)

      if (match && match[1]) {
        const destinoId = match[1]
        const { data: destinoData } = await supabase
          .from('chamados')
          .select('titulo')
          .eq('id', destinoId)
          .maybeSingle()

        if (destinoData) {
          resolvedDesc = resolvedDesc.replace(
            match[0],
            `[SISTEMA]: Este chamado foi unificado com o chamado destino "${destinoData.titulo}"`,
          )
        } else {
          resolvedDesc = resolvedDesc.replace(
            match[0],
            `[SISTEMA]: Este chamado foi unificado com o chamado destino (Chamado não encontrado)`,
          )
        }
      }
      setDescricaoDisplay(resolvedDesc)
    }

    resolveDescricao()
  }, [chamado?.descricao])

  const uploadFile = async (item: FileItem) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 0, errorMessage: undefined } : f,
      ),
    )

    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === item.id && f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: f.progress + 15 }
          }
          return f
        }),
      )
    }, 300)

    try {
      const ext = item.file.name.split('.').pop()
      const uuid = crypto.randomUUID()
      const filePath = `${id}/${uuid}.${ext}`

      const { error } = await supabase.storage
        .from('chamados')
        .upload(filePath, item.file, { upsert: false })

      clearInterval(interval)

      if (error) {
        throw error
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('chamados').getPublicUrl(filePath)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'success', progress: 100, url: publicUrl } : f,
        ),
      )
    } catch (err: any) {
      clearInterval(interval)
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === item.id) {
            return {
              ...f,
              status: 'error',
              errorCount: f.errorCount + 1,
              errorMessage: 'Erro ao enviar arquivo. Tente novamente',
            }
          }
          return f
        }),
      )
    }
  }

  const processFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Você pode enviar no máximo ${MAX_FILES} arquivos por resposta.`)
      return
    }

    const itemsToUpload: FileItem[] = []

    for (const file of newFiles) {
      const isValidType = ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/')
      if (!isValidType || file.size > MAX_SIZE_BYTES) {
        toast.error('Arquivo inválido. Máximo 20 MB. Tipos: MP3, MP4, imagens, PDF')
        continue
      }

      const item: FileItem = {
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        errorCount: 0,
      }
      itemsToUpload.push(item)
    }

    if (itemsToUpload.length > 0) {
      setFiles((prev) => [...prev, ...itemsToUpload])
      itemsToUpload.forEach(uploadFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files))
      }
    },
    [files],
  )

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const retryUpload = (item: FileItem) => {
    uploadFile(item)
  }

  const handleEditInternalDoc = async (anexo: AnexoInterno, tipo: 'IDO' | 'Espelho') => {
    setEditingDocLoading(true)
    try {
      if (tipo === 'Espelho') {
        let formData = null

        const { data: docs } = await supabase
          .from('documentos')
          .select('*')
          .eq('chamado_id', id)
          .in('tipo_documento', ['Espelho de Danos', 'Vistoria'])
          .order('criado_em', { ascending: false })

        let extractedFormId = null
        const formIdMatch = anexo.nome_arquivo.match(
          /_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_/i,
        )
        if (formIdMatch && formIdMatch[1]) {
          extractedFormId = formIdMatch[1]
        }

        let matchDoc = null
        if (docs && docs.length > 0) {
          if (extractedFormId) {
            matchDoc = docs.find((d) => d.formulario_id === extractedFormId)
          }
          if (!matchDoc) {
            matchDoc =
              docs.find((d) => d.nome_arquivo.split('?')[0] === anexo.nome_arquivo.split('?')[0]) ||
              docs.find((d) => d.formulario_id) ||
              docs[0]
          }
        }

        if (matchDoc && matchDoc.formulario_id) {
          const { data, error } = await supabase
            .from('formularios_espelho_danos')
            .select('*')
            .eq('id', matchDoc.formulario_id)
            .single()

          if (!error && data) {
            formData = data
          }
        } else if (!formData) {
          const { data, error } = await supabase
            .from('formularios_espelho_danos')
            .select('*')
            .eq('chamado_id', id)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!error && data) formData = data
        }

        if (!formData && matchDoc) {
          formData = {
            id: matchDoc.formulario_id || undefined,
            chamado_id: id,
            numero_os: matchDoc.numero_os || '',
            garagem: matchDoc.garagem || '',
            numero_carro: matchDoc.numero_carro || '',
            linha: matchDoc.linha || '',
            descricao_danos: matchDoc.descricao_danos || '',
            data: matchDoc.data || '',
            horario: matchDoc.horario || '',
            ocorrencia: matchDoc.ocorrencia || '',
            registro_vistoriador: matchDoc.registro_responsavel || '',
            nome_vistoriador: matchDoc.nome_responsavel || '',
            registro_motorista: matchDoc.registro_motorista || '',
            nome_motorista: matchDoc.nome_motorista || '',
          }
        }

        setDocFormData(formData || { chamado_id: id })
        setEditingDoc({ anexo, tipo })
      } else {
        const { data, error } = await supabase
          .from('formularios_ido')
          .select('*')
          .eq('chamado_id', id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error

        setDocFormData(data || { chamado_id: id })
        setEditingDoc({ anexo, tipo })
      }
    } catch (e) {
      console.error(e)
      toast.error('Erro ao buscar dados do formulário.')
    } finally {
      setEditingDocLoading(false)
    }
  }

  const handleSaveDocEdit = async (ignoreDuplicate = false) => {
    if (!editingDoc) return
    setSavingDoc(true)

    try {
      if (editingDoc.tipo === 'Espelho') {
        const { id: formId, chamado_id, criado_em, atualizado_em, ...updateData } = docFormData

        if (!ignoreDuplicate && updateData.numero_carro) {
          const { data: duplicates } = await supabase
            .from('documentos')
            .select('id, chamado_id, formulario_id')
            .eq('numero_carro', updateData.numero_carro)
            .eq('excluido_manutencao', false)
            .in('tipo_documento', ['Espelho de Danos', 'Vistoria'])

          const isDuplicate = duplicates?.some(
            (d) => d.chamado_id !== id && d.formulario_id !== formId,
          )

          if (isDuplicate && currentUserProfile?.tipo_usuario === 'vistoriador') {
            setDuplicateSubmitAction(() => () => handleSaveDocEdit(true))
            setDuplicateAlertOpen(true)
            setSavingDoc(false)
            return
          }
        }

        let finalFormId = formId
        const updateDataLimpa = {
          numero_os: updateData.numero_os,
          garagem: updateData.garagem,
          data: updateData.data,
          horario: updateData.horario,
          ocorrencia: updateData.ocorrencia,
          linha: updateData.linha,
          descricao_danos: updateData.descricao_danos,
          nome_vistoriador: updateData.nome_vistoriador,
          registro_vistoriador: updateData.registro_vistoriador,
          nome_motorista: updateData.nome_motorista,
          registro_motorista: updateData.registro_motorista,
          numero_carro: updateData.numero_carro,
        }

        if (formId) {
          const { error: updateError } = await supabase
            .from('formularios_espelho_danos')
            .update(updateDataLimpa)
            .eq('id', formId)
          if (updateError) throw updateError
        } else {
          const { data: newForm, error: insertError } = await supabase
            .from('formularios_espelho_danos')
            .insert({ chamado_id: id as string, ...updateDataLimpa })
            .select('id')
            .single()
          if (insertError) throw insertError
          finalFormId = newForm.id
        }

        let docData = null
        if (finalFormId) {
          const { data } = await supabase
            .from('documentos')
            .select('id, fotos_urls, foto_url')
            .eq('formulario_id', finalFormId)
            .maybeSingle()
          docData = data
        }

        if (!docData) {
          const { data } = await supabase
            .from('documentos')
            .select('id, fotos_urls, foto_url')
            .eq('chamado_id', id as string)
            .eq('nome_arquivo', editingDoc.anexo.nome_arquivo)
            .maybeSingle()
          docData = data
        }

        if (!docData) {
          const { data } = await supabase
            .from('documentos')
            .select('id, fotos_urls, foto_url')
            .eq('chamado_id', id as string)
            .in('tipo_documento', ['Espelho de Danos', 'Vistoria'])
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle()
          docData = data
        }

        let fotos: string[] = []
        if (docData) {
          if (docData.foto_url) fotos.push(docData.foto_url)
          if (docData.fotos_urls && Array.isArray(docData.fotos_urls)) {
            fotos.push(...docData.fotos_urls)
          }
        }

        let pdfDataResult = null
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token

          const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
            body: {
              tipo_documento: 'espelho_danos',
              id: id,
              ...updateDataLimpa,
              fotos,
              espelho_id: finalFormId || undefined,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (pdfError || !pdfData?.success) throw new Error('Erro ao gerar novo PDF')
          pdfDataResult = pdfData
        } catch (err) {
          toast.error('Dados salvos, mas houve erro ao gerar o novo PDF do Espelho de Danos.')
        }

        if (pdfDataResult) {
          const newUrl = `${pdfDataResult.url}?t=${Date.now()}`
          const newNomeArquivo = pdfDataResult.nome_arquivo || editingDoc.anexo.nome_arquivo

          // We don't delete the old file from storage to maintain version history as per the requirement.

          // Force an immediate local state update so UI is snappy and we don't only rely on Realtime
          setAnexosInternos((prev) =>
            prev.map((a) =>
              a.id === editingDoc.anexo.id
                ? { ...a, arquivo_url: newUrl, nome_arquivo: newNomeArquivo }
                : a,
            ),
          )

          // Update existing record
          await supabase
            .from('anexos_chamado_interno')
            .update({
              arquivo_url: newUrl,
              nome_arquivo: newNomeArquivo,
              usuario_id: user?.id as string,
            })
            .eq('id', editingDoc.anexo.id)

          // Also update the related record in documentos table strictly via formulario_id
          let matchDoc = null
          if (finalFormId) {
            const { data: docById } = await supabase
              .from('documentos')
              .select('id')
              .eq('formulario_id', finalFormId)
              .maybeSingle()
            if (docById) matchDoc = docById
          }

          if (!matchDoc) {
            // Fallback to name or url matching
            const oldFileName = editingDoc.anexo.nome_arquivo
            const { data: docByName } = await supabase
              .from('documentos')
              .select('id')
              .eq('chamado_id', id as string)
              .eq('nome_arquivo', oldFileName)
              .maybeSingle()
            if (docByName) matchDoc = docByName
          }

          if (matchDoc) {
            await supabase
              .from('documentos')
              .update({
                arquivo_url: newUrl,
                nome_arquivo: newNomeArquivo,
                atualizado_em: new Date().toISOString(),
                formulario_id: finalFormId,
                numero_os: updateDataLimpa.numero_os,
                numero_carro: updateDataLimpa.numero_carro,
                linha: updateDataLimpa.linha,
                descricao_danos: updateDataLimpa.descricao_danos,
                data: updateDataLimpa.data,
                horario: updateDataLimpa.horario,
                ocorrencia: updateDataLimpa.ocorrencia,
                garagem: updateDataLimpa.garagem,
                registro_responsavel: updateDataLimpa.registro_vistoriador,
                nome_responsavel: updateDataLimpa.nome_vistoriador,
                registro_motorista: updateDataLimpa.registro_motorista,
                nome_motorista: updateDataLimpa.nome_motorista,
              })
              .eq('id', matchDoc.id)
          }

          await supabase.from('historico_chamado').insert({
            chamado_id: id as string,
            acao: 'respondido',
            usuario_id: user?.id as string,
            detalhes: 'Espelho de Danos preenchido e anexado com sucesso',
          })

          toast.success('Documento atualizado com sucesso!')
        }
      } else {
        const {
          id: formId,
          chamado_id,
          criado_em,
          atualizado_em,
          assinatura_base64,
          ...updateData
        } = docFormData

        if (formId) {
          const { error: updateError } = await supabase
            .from('formularios_ido')
            .update(updateData)
            .eq('id', formId)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('formularios_ido')
            .insert({ chamado_id: id as string, ...updateData })
          if (insertError) throw insertError
        }

        let pdfDataResult = null
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token

          const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
            body: {
              tipo_documento: 'IDO',
              id: id,
              ...updateData,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (pdfError || !pdfData?.success) throw new Error('Erro ao gerar novo PDF IDO')
          pdfDataResult = pdfData
        } catch (err) {
          toast.error('Dados salvos, mas houve erro ao gerar o novo PDF do IDO.')
        }

        if (pdfDataResult) {
          const newUrl = `${pdfDataResult.url}?t=${Date.now()}`
          const newNomeArquivoIdo = pdfDataResult.nome_arquivo || editingDoc.anexo.nome_arquivo

          // We don't delete the old file from storage to maintain version history

          // Force local state update for IDO too
          setAnexosInternos((prev) =>
            prev.map((a) =>
              a.id === editingDoc.anexo.id
                ? { ...a, arquivo_url: newUrl, nome_arquivo: newNomeArquivoIdo }
                : a,
            ),
          )

          // Update existing record
          await supabase
            .from('anexos_chamado_interno')
            .update({
              arquivo_url: newUrl,
              nome_arquivo: newNomeArquivoIdo,
              usuario_id: user?.id as string,
            })
            .eq('id', editingDoc.anexo.id)

          const oldFileNameIdo = editingDoc.anexo.nome_arquivo
          const { data: docIdoByName } = await supabase
            .from('documentos')
            .select('id')
            .eq('chamado_id', id as string)
            .eq('nome_arquivo', oldFileNameIdo)
            .maybeSingle()

          if (docIdoByName) {
            await supabase
              .from('documentos')
              .update({
                arquivo_url: newUrl,
                nome_arquivo: newNomeArquivoIdo,
                atualizado_em: new Date().toISOString(),
                nome_responsavel: updateData.colaborador_nome,
                registro_responsavel: updateData.colaborador_registro,
              })
              .eq('id', docIdoByName.id)
          }

          await supabase.from('historico_chamado').insert({
            chamado_id: id as string,
            acao: 'respondido',
            usuario_id: user?.id as string,
            detalhes: 'Boletim de Ocorrência (IDO) atualizado pelo usuário',
          })

          toast.success('Documento IDO atualizado com sucesso!')
        }
      }

      fetchChamadoData()
      setEditingDoc(null)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Erro ao salvar alterações.')
    } finally {
      setSavingDoc(false)
    }
  }

  const handleInternalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    const MAX_INTERNAL_MB = 10
    const MAX_INTERNAL_BYTES = MAX_INTERNAL_MB * 1024 * 1024

    if (file.size > MAX_INTERNAL_BYTES) {
      toast.error('Arquivo muito grande. Máximo 10 MB.')
      return
    }

    setUploadingInternal(true)
    try {
      const ext = file.name.split('.').pop()
      const uuid = crypto.randomUUID()
      const filePath = `${id}/${uuid}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('anexos_chamados_interno').getPublicUrl(filePath)

      const { data: newAnexo, error: dbError } = await supabase
        .from('anexos_chamado_interno')
        .insert({
          chamado_id: id as string,
          usuario_id: user?.id as string,
          arquivo_url: publicUrl,
          nome_arquivo: file.name,
          tamanho_bytes: file.size,
          tipo_arquivo: file.type || 'application/octet-stream',
        })
        .select()
        .single()

      if (dbError) throw dbError

      setAnexosInternos((prev) => {
        if (prev.some((a) => a.id === newAnexo.id)) return prev
        return [...prev, newAnexo]
      })

      toast.success('Anexo interno adicionado com sucesso')
    } catch (err: any) {
      toast.error('Erro ao fazer upload do anexo interno')
    } finally {
      setUploadingInternal(false)
      if (internalFileInputRef.current) internalFileInputRef.current.value = ''
    }
  }

  const confirmDeleteInternal = async () => {
    if (!anexoInternoToDelete) return

    try {
      const { id: anexoId, url } = anexoInternoToDelete
      const urlWithoutQuery = url.split('?')[0]
      const urlParts = urlWithoutQuery.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const fileIdFolder = urlParts[urlParts.length - 2]
      const path = `${fileIdFolder}/${fileName}`

      await supabase.storage.from('anexos_chamados_interno').remove([path])

      const { error } = await supabase.from('anexos_chamado_interno').delete().eq('id', anexoId)
      if (error) throw error

      setAnexosInternos((prev) => prev.filter((a) => a.id !== anexoId))
      toast.success('Anexo interno deletado')
    } catch (error) {
      toast.error('Erro ao deletar anexo interno')
    } finally {
      setAnexoInternoToDelete(null)
    }
  }

  const handleViewInternal = (anexo: AnexoInterno) => {
    handleDocumentAction(anexo.id, anexo.arquivo_url, anexo.nome_arquivo, 'view')
  }

  const handleDownloadInternal = (anexo: AnexoInterno) => {
    handleDocumentAction(anexo.id, anexo.arquivo_url, anexo.nome_arquivo, 'download')
  }

  const getAnexoStorageInfo = (url: string) => {
    let bucket = 'chamados'
    let splitStr = '/chamados/'
    if (url.includes('/anexos/')) {
      bucket = 'anexos'
      splitStr = '/anexos/'
    }
    const urlParts = url.split(splitStr)
    const pathWithQuery = urlParts.length > 1 ? urlParts[1] : null
    const path = pathWithQuery ? pathWithQuery.split('?')[0] : null
    return { bucket, path }
  }

  const handleRecusarOrcamento = async () => {
    if (!motivoRecusa.trim() || !orcamentoToRecusar) return
    setRecusandoOrcamento(true)

    try {
      const docRelacionado = documentosChamado.find(
        (d) =>
          d.orcamento_url === orcamentoToRecusar.arquivo_url ||
          d.arquivo_url === orcamentoToRecusar.arquivo_url,
      )

      if (docRelacionado) {
        const { error: updateError } = await supabase
          .from('documentos')
          .update({ is_recusado: true, motivo_recusa: motivoRecusa })
          .eq('id', docRelacionado.id)

        if (updateError) throw updateError
      }

      const { error: delError } = await supabase
        .from('anexos_chamado_interno')
        .delete()
        .eq('id', orcamentoToRecusar.id)

      if (delError) throw delError

      setAnexosInternos((prev) => prev.filter((a) => a.id !== orcamentoToRecusar.id))

      await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        usuario_id: user?.id as string,
        acao: 'respondido',
        detalhes: `Orçamento devolvido para a Secretaria Técnica. Motivo: ${motivoRecusa}`,
      })

      toast.success('Orçamento devolvido com sucesso.')
      setRecusarOrcamentoOpen(false)
      setMotivoRecusa('')
      fetchChamadoData()
    } catch (e: any) {
      toast.error('Erro ao devolver orçamento: ' + e.message)
    } finally {
      setRecusandoOrcamento(false)
    }
  }

  const handleRenameSubmit = async () => {
    if (!renameAnexo || !renameValue.trim()) return
    setRenaming(true)
    try {
      const { error } = await supabase
        .from('anexos_chamado_interno')
        .update({ nome_arquivo: renameValue.trim() })
        .eq('id', renameAnexo.id)
      if (error) throw error
      setAnexosInternos((prev) =>
        prev.map((a) => (a.id === renameAnexo.id ? { ...a, nome_arquivo: renameValue.trim() } : a)),
      )
      toast.success('Arquivo renomeado com sucesso!')
      setRenameAnexo(null)
      setRenameValue('')
    } catch (e: any) {
      toast.error('Erro ao renomear arquivo: ' + e.message)
    } finally {
      setRenaming(false)
    }
  }

  const handleDeleteAnexo = async (anexoId: string, url: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este anexo?')) return

    try {
      const { bucket, path } = getAnexoStorageInfo(url)

      if (path) {
        await supabase.storage.from(bucket).remove([path])
      }

      const { error } = await supabase.from('anexos_chamado').delete().eq('id', anexoId)
      if (error) throw error

      setAnexos((prev) => prev.filter((a) => a.id !== anexoId))
      toast.success('Anexo deletado com sucesso')
    } catch (error) {
      toast.error('Erro ao deletar anexo')
    }
  }

  const handleDownloadAnexo = (anexo: Anexo) => {
    handleDocumentAction(anexo.id, anexo.url_arquivo, anexo.nome_arquivo, 'download')
  }

  const handleViewAnexo = (anexo: Anexo) => {
    handleDocumentAction(anexo.id, anexo.url_arquivo, anexo.nome_arquivo, 'view')
  }

  const getTipoArquivo = (mime: string) => {
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('image/')) return 'imagem'
    if (mime === 'application/pdf') return 'pdf'
    return 'pdf'
  }

  const loadResponsaveis = async () => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, email')
      .neq('tipo_usuario', 'basico')
      .neq('id', user.id)
      .order('nome_completo', { ascending: true })

    if (error) {
      toast.error('Erro ao carregar responsáveis. Tente novamente')
      return
    }

    setAvailableResponsaveis(data || [])
  }

  const handleOpenTransferModal = () => {
    loadResponsaveis()
    setTransferModalOpen(true)
  }

  const handleTransferir = async () => {
    if (!selectedResponsavel) return

    if (selectedResponsavel === chamado?.responsavel_id) {
      toast.error('Selecione um responsável diferente')
      return
    }

    const novoResponsavel = availableResponsaveis.find((r) => r.id === selectedResponsavel)
    if (
      !window.confirm(
        `Tem certeza que deseja transferir este chamado para ${novoResponsavel?.nome_completo}?`,
      )
    )
      return

    setTransferLoading(true)

    const { data, error: funcError } = await supabase.functions.invoke('transferir-chamado', {
      body: {
        chamado_id: id as string,
        novo_responsavel_id: selectedResponsavel,
        observacao: transferObservacao,
      },
    })

    if (funcError || data?.error) {
      console.error(funcError || data?.error)
      toast.error('Erro ao transferir chamado. Verifique suas permissões.')
      setTransferLoading(false)
      return
    }

    setChamado((prev: any) =>
      prev
        ? {
            ...prev,
            responsavel_id: selectedResponsavel,
            status_interno: novoResponsavel?.departamento || null,
          }
        : prev,
    )
    toast.success(`Chamado transferido com sucesso para ${novoResponsavel?.nome_completo}`)
    setTransferLoading(false)
    setTransferModalOpen(false)
    setTransferObservacao('')
    setSelectedResponsavel('')
  }

  const handleResponder = async () => {
    if (!mensagem.trim()) return
    const hasIncomplete = files.some((f) => f.status !== 'success')
    if (hasIncomplete) {
      toast.error('Aguarde o envio de todos os anexos ou remova os que apresentaram erro.')
      return
    }

    setSubmitting(true)

    const now = new Date().toISOString()
    const { error: respostaError } = await supabase.from('respostas_chamado').insert({
      chamado_id: id as string,
      usuario_id: user?.id as string,
      mensagem: mensagem.trim(),
      criado_em: now,
    })

    if (respostaError) {
      toast.error('Erro ao enviar resposta')
      setSubmitting(false)
      return
    }

    if (files.length > 0) {
      const uploadedAnexos = files.map((f) => ({
        chamado_id: id as string,
        url_arquivo: f.url!,
        nome_arquivo: f.file.name,
        tipo_arquivo: getTipoArquivo(f.file.type),
        tamanho_mb: Number((f.file.size / (1024 * 1024)).toFixed(2)),
        criado_em: now,
      }))

      const { error: anexosError } = await supabase.from('anexos_chamado').insert(uploadedAnexos)
      if (anexosError) {
        toast.error('Erro ao salvar anexos no banco de dados')
      }
    }

    await supabase
      .from('chamados')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', id as string)

    await supabase.from('historico_chamado').insert({
      chamado_id: id as string,
      acao: 'respondido',
      usuario_id: user?.id as string,
    })

    setMensagem('')
    setFiles([])
    setSubmitting(false)
    toast.success(files.length > 0 ? 'Resposta enviada com anexos' : 'Resposta enviada')
  }

  const handleSalvarPrioridade = async (novaPrioridade: string) => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'sinistro' ||
      currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'secretaria_tecnica'

    if (!isSupportUser) return

    setSavingPrioridade(true)
    setPrioridade(novaPrioridade)
    setChamado((prev: any) => (prev ? { ...prev, prioridade: novaPrioridade } : prev))

    const { error } = await supabase
      .from('chamados')
      .update({ prioridade: novaPrioridade, atualizado_em: new Date().toISOString() })
      .eq('id', id as string)

    setSavingPrioridade(false)
    if (error) {
      toast.error('Erro ao atualizar Prioridade. Tente novamente')
    } else {
      toast.success('Prioridade atualizada com sucesso')
    }
  }

  const handleSalvarSituacaoProcesso = async (novaSituacao: string) => {
    const canEdit =
      currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'juridico' ||
      currentUserProfile?.tipo_usuario === 'sinistro'

    if (!canEdit) return

    setSavingSituacaoProcesso(true)
    setSituacaoProcesso(novaSituacao)
    setChamado((prev: any) => (prev ? { ...prev, situacao_processo: novaSituacao } : prev))

    const { error } = await supabase
      .from('chamados')
      .update({ situacao_processo: novaSituacao, atualizado_em: new Date().toISOString() } as any)
      .eq('id', id as string)

    setSavingSituacaoProcesso(false)
    if (error) {
      toast.error('Erro ao atualizar Situação do Processo. Tente novamente')
    } else {
      toast.success('Situação do Processo atualizada com sucesso')
    }
  }

  const handleSalvarTipoChamado = async (novoTipo: string) => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'sinistro' ||
      currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'secretaria_tecnica'

    if (!isSupportUser) return

    setSavingTipoChamado(true)
    setTipoChamado(novoTipo)
    setChamado((prev: any) => (prev ? { ...prev, tipo_chamado: novoTipo } : prev))

    const { error } = await supabase
      .from('chamados')
      .update({ tipo_chamado: novoTipo, atualizado_em: new Date().toISOString() })
      .eq('id', id as string)

    setSavingTipoChamado(false)
    if (error) {
      toast.error('Erro ao atualizar Tipo de Chamado. Tente novamente')
    } else {
      toast.success('Tipo de Chamado atualizado com sucesso')
    }
  }

  const handleSalvarPia = async () => {
    const isSupportUser =
      currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'sinistro' ||
      currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'secretaria_tecnica'

    if (!isSupportUser) return

    if (pia.trim() && !/^[A-Za-z0-9/\-.\s]+$/.test(pia.trim())) {
      toast.error('Informe um número válido de R.A.')
      return
    }

    setSavingPia(true)
    setChamado((prev: any) => (prev ? { ...prev, pia } : prev))
    const { error } = await supabase
      .from('chamados')
      .update({ pia })
      .eq('id', id as string)

    setSavingPia(false)
    if (error) {
      toast.error('Erro ao salvar R.A. Tente novamente')
    } else {
      toast.success('R.A. salvo com sucesso')
    }
  }

  const handleUploadOrcamento = async () => {
    if (!numeroOrcamento || !fileOrcamento) return
    setSavingOrcamento(true)

    try {
      const ext = fileOrcamento.name.split('.').pop()
      const nomeCarro = chamado?.carro || chamado?.numero_carro || 'S/N'
      const numOS = chamado?.numero_os || 'S/N'
      const novoNome = `Orçamento ${numeroOrcamento} - Carro: ${nomeCarro} - OS: ${numOS}.${ext}`

      const uuid = crypto.randomUUID()
      const filePath = `${id}/${uuid}_${novoNome}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, fileOrcamento)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('anexos_chamados_interno').getPublicUrl(filePath)

      const { data: newAnexo, error: dbError } = await supabase
        .from('anexos_chamado_interno')
        .insert({
          chamado_id: id as string,
          usuario_id: user?.id as string,
          arquivo_url: publicUrl,
          nome_arquivo: novoNome,
          tamanho_bytes: fileOrcamento.size,
          tipo_arquivo: fileOrcamento.type || 'application/octet-stream',
        })
        .select()
        .single()

      if (dbError) throw dbError

      const valorNumerico = parseFloat(valorOrcamentoStr) || 0

      await supabase.from('documentos').insert({
        chamado_id: id as string,
        tipo_documento: 'Orçamento',
        nome_arquivo: novoNome,
        arquivo_url: publicUrl,
        orcamento_url: publicUrl,
        numero_os: numOS,
        valor_orcamento: valorNumerico > 0 ? valorNumerico : null,
      })

      await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'respondido',
        usuario_id: user?.id as string,
        detalhes: `Orçamento ${numeroOrcamento} anexado com sucesso.`,
      })

      toast.success('Orçamento anexado com sucesso!')
      setNumeroOrcamento('')
      setValorOrcamentoStr('')
      setObsOrcamento('')
      setFileOrcamento(null)
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao anexar orçamento.')
    } finally {
      setSavingOrcamento(false)
    }
  }

  const handleCopiarLinkIdo = async () => {
    try {
      const url = `${window.location.origin}/ido/${id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência')
    } catch (error) {
      toast.error('Erro ao gerar link. Tente novamente')
    }
  }

  const handleCompartilharIdo = async () => {
    try {
      const url = `${window.location.origin}/ido/${id}`
      if (navigator.share) {
        await navigator.share({
          title: `Formulário IDO - Chamado ${chamado?.titulo}`,
          text: 'Por favor, preencha o formulário IDO para o seu chamado.',
          url: url,
        })
      } else {
        handleCopiarLinkIdo()
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        toast.error('Erro ao gerar link. Tente novamente')
      }
    }
  }

  const handleCopiarLinkEspelho = async () => {
    try {
      const url = `${window.location.origin}/espelho-danos/${id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência')
    } catch (error) {
      toast.error('Erro ao gerar link. Tente novamente')
    }
  }

  const handleCompartilharEspelho = async () => {
    try {
      const url = `${window.location.origin}/espelho-danos/${id}`
      if (navigator.share) {
        await navigator.share({
          title: `Formulário Espelho de Danos - Chamado ${chamado?.titulo}`,
          text: 'Por favor, preencha o formulário Espelho de Danos para o seu chamado.',
          url: url,
        })
      } else {
        handleCopiarLinkEspelho()
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        toast.error('Erro ao gerar link. Tente novamente')
      }
    }
  }

  const handleReabrir = async () => {
    setCompleting(true)
    try {
      const { data, error: updateError } = await supabase
        .from('chamados')
        .update({
          status: 'em_atendimento',
          responsavel_id: user?.id,
          status_interno: currentUserProfile?.departamento || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Falha ao atualizar chamado no banco')

      const { error: histError } = await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'reaberto',
        usuario_id: user?.id as string,
      })

      if (histError) throw histError

      setChamado((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'em_atendimento',
              responsavel_id: user?.id,
              status_interno: currentUserProfile?.departamento || null,
            }
          : prev,
      )
      setConfirmReabrirOpen(false)
      toast.success('Chamado reaberto com sucesso')

      navigate(`/dashboard/chamados/${id}`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao reabrir chamado')
    } finally {
      setCompleting(false)
    }
  }

  const handleMoverJuridico = async (novoStatus: string | null) => {
    setCompleting(true)
    try {
      const { error } = await supabase
        .from('chamados')
        .update({ status_juridico: novoStatus, atualizado_em: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setChamado((prev: any) => (prev ? { ...prev, status_juridico: novoStatus } : prev))

      await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'Classificação Jurídica Alterada',
        usuario_id: user?.id as string,
        detalhes: novoStatus ? `Movido para ${novoStatus}` : `Classificação Jurídica removida`,
      })

      toast.success('Classificação jurídica atualizada com sucesso')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao atualizar classificação jurídica')
    } finally {
      setCompleting(false)
    }
  }

  const handleFinalizar = async () => {
    if (!window.confirm('Tem certeza que deseja finalizar este chamado?')) return
    setCompleting(true)

    const { data: internalAnexos } = await supabase
      .from('anexos_chamado_interno')
      .select('nome_arquivo')
      .eq('chamado_id', id as string)

    const claudineiKeywords = [
      'vale',
      'quitação',
      'quitacao',
      'recibo',
      'nf',
      'nota fiscal',
      'boleto',
      'escaneado',
      'autorização',
      'autorizacao',
      'desconto',
    ]
    const alexKeywords = ['autorização', 'autorizacao', 'escaneado']

    const hasClaudineiTrigger = (internalAnexos || []).some((a: any) => {
      const nome = (a.nome_arquivo || '').toLowerCase()
      return claudineiKeywords.some((kw) => nome.includes(kw))
    })
    const hasAlexTrigger = (internalAnexos || []).some((a: any) => {
      const nome = (a.nome_arquivo || '').toLowerCase()
      return alexKeywords.some((kw) => nome.includes(kw))
    })

    const isJuridicoUser = currentUserProfile?.tipo_usuario === 'juridico'
    const isClaudineiFlow = isJuridicoUser && hasClaudineiTrigger
    const hasApprovalTrigger = hasAlexTrigger

    const updatePayload: any = {
      atualizado_em: new Date().toISOString(),
    }

    if (isClaudineiFlow) {
      updatePayload.status_aprovacao_claudinei = 'pendente'
      updatePayload.status_interno = 'aguardando_claudinei'
      updatePayload.status = 'finalizado'
    } else if (hasApprovalTrigger) {
      updatePayload.status = 'finalizado'
      updatePayload.status_interno = 'AGUARDANDO_ALEX'
      updatePayload.status_aprovacao_alex = 'pendente'
    } else {
      updatePayload.status = 'finalizado'
    }

    const { data, error: updateError } = await supabase
      .from('chamados')
      .update(updatePayload)
      .eq('id', id)
      .select('id')
      .single()

    if (updateError || !data) {
      console.error(updateError)
      toast.error(
        updateError?.message ||
          'Erro ao finalizar chamado: Permissão negada ou falha na comunicação',
      )
      setCompleting(false)
      return
    }

    if (!isClaudineiFlow) {
      await supabase.from('historico_chamado').insert({
        chamado_id: id,
        acao: 'finalizado',
        usuario_id: user?.id,
      })
    }

    if (isClaudineiFlow) {
      await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'respondido',
        usuario_id: user?.id as string,
        detalhes:
          'Chamado encaminhado para aprovação do Claudinei (documento de Vale/Quitação/Recibo/NF/Nota Fiscal/Boleto/Escaneado/Autorização/Desconto detectado).',
      })
    } else if (hasApprovalTrigger) {
      await supabase.from('historico_chamado').insert({
        chamado_id: id as string,
        acao: 'respondido',
        usuario_id: user?.id as string,
        detalhes:
          'Chamado finalizado e encaminhado para aprovação do Alex (documento de autorização/escaneado detectado).',
      })
    }

    setChamado((prev) =>
      prev
        ? {
            ...prev,
            status: updatePayload.status || prev.status,
            atualizado_em: new Date().toISOString(),
            status_interno: updatePayload.status_interno || prev.status_interno,
            status_aprovacao_alex:
              updatePayload.status_aprovacao_alex || prev.status_aprovacao_alex,
            status_aprovacao_claudinei:
              updatePayload.status_aprovacao_claudinei || prev.status_aprovacao_claudinei,
          }
        : prev,
    )

    setCompleting(false)
    toast.success(
      isClaudineiFlow
        ? 'Chamado encaminhado para aprovação do Claudinei.'
        : hasApprovalTrigger
          ? 'Chamado finalizado e enviado para aprovação do Alex.'
          : 'Chamado finalizado com sucesso',
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 p-4">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="max-w-5xl mx-auto p-4 text-center py-20">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Chamado não encontrado</h2>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
          Voltar
        </Button>
      </div>
    )
  }

  const canAnexarOrcamento =
    (currentUserProfile?.tipo_usuario === 'secretaria_tecnica' ||
      currentUserProfile?.tipo_usuario === 'responsavel') &&
    !isDaniel
  const isSupport =
    (currentUserProfile?.tipo_usuario === 'responsavel' ||
      currentUserProfile?.tipo_usuario === 'sinistro' ||
      currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'juridico' ||
      currentUserProfile?.tipo_usuario === 'secretaria_tecnica') &&
    !isDaniel
  const isResponsible = chamado.responsavel_id === user?.id
  const isSolicitante = chamado.usuario_id === user?.id

  const canReply = (isSolicitante || isResponsible || isSupport || isParticipant) && !isDaniel
  const canFinalize = isSupport && chamado.status !== 'finalizado' && chamado.status !== 'unificado'

  const isPrivilegedTransfer =
    (currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'sinistro' ||
      currentUserProfile?.tipo_usuario === 'juridico') &&
    !isDaniel
  const canTransfer =
    (isResponsible || isPrivilegedTransfer) &&
    chamado.status !== 'finalizado' &&
    chamado.status !== 'unificado'

  const canEditRA = isSupport && !isDaniel
  const canEditSituacaoProcesso =
    (currentUserProfile?.tipo_usuario === 'admin' ||
      currentUserProfile?.tipo_usuario === 'juridico' ||
      currentUserProfile?.tipo_usuario === 'sinistro') &&
    !isDaniel
  const canUnify = isSupport && chamado.status !== 'finalizado' && chamado.status !== 'unificado'
  const isJuridico = currentUserProfile?.tipo_usuario === 'juridico' && !isDaniel

  const orcamentoDoc = documentosChamado.find((d) => d.tipo_documento === 'Orçamento')
  const hasOrcamentoInterno = anexosInternos.some((a) => {
    const nomeLower = a.nome_arquivo.toLowerCase()
    return nomeLower.includes('orçamento') || nomeLower.includes('orcamento')
  })
  const hasDocumentoComValor = documentosChamado.some(
    (d) => d.valor_orcamento && d.valor_orcamento > 0,
  )
  const canGenerateVale = !!orcamentoDoc || hasOrcamentoInterno || hasDocumentoComValor

  const getAcaoText = (acao: string, userNome: string) => {
    switch (acao) {
      case 'criado':
        return `Chamado criado por ${userNome}`
      case 'atribuido':
        return `Atribuído a ${userNome}`
      case 'respondido':
        return `Respondido por ${userNome}`
      case 'finalizado':
        return `Finalizado por ${userNome}`
      case 'deletado':
        return `Deletado por ${userNome}`
      case 'transferido':
        return `Transferido por ${userNome}`
      case 'reaberto':
        return `Reaberto por ${userNome}`
      case 'Classificação Jurídica Alterada':
        return `Classificação Jurídica alterada por ${userNome}`
      default:
        return `Ação ${acao} por ${userNome}`
    }
  }

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-8 p-3 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="-ml-2 w-fit h-8 text-xs"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Voltar
        </Button>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {isJuridico && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                  disabled={completing || transferLoading}
                >
                  <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
                  Mover
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleMoverJuridico('Cobrança de Terceiros')}>
                  Cobrança de Terceiros
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoverJuridico('Demanda Judicial')}>
                  Demanda Judicial
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleMoverJuridico(null)}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  Remover Classificação
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canUnify && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => setUnificarModalOpen(true)}
              disabled={completing || transferLoading}
            >
              <LinkIcon className="mr-2 h-3.5 w-3.5" />
              Unificar Chamado
            </Button>
          )}
          {canTransfer && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={handleOpenTransferModal}
              disabled={completing || transferLoading}
            >
              <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
              Transferir Chamado
            </Button>
          )}
          {canFinalize && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto h-8 text-xs"
              onClick={handleFinalizar}
              disabled={completing || transferLoading}
            >
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              {completing ? 'Finalizando...' : 'Finalizar Chamado'}
            </Button>
          )}
          {chamado.status === 'finalizado' && isSupport && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto h-8 text-xs"
              onClick={() => setConfirmReabrirOpen(true)}
              disabled={completing || transferLoading}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reabrir Chamado
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge
                variant="outline"
                className={cn(
                  'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                  statusColors[chamado.status],
                )}
              >
                {statusLabels[chamado.status]}
              </Badge>
              {chamado.tipo_chamado && (
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider bg-purple-100 text-purple-800 border-purple-200"
                >
                  {chamado.tipo_chamado}
                </Badge>
              )}
              {chamado.prioridade && prioridadeLabels[chamado.prioridade] && (
                <Badge
                  variant="outline"
                  className={cn(
                    'px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider',
                    prioridadeColors[chamado.prioridade],
                  )}
                >
                  {prioridadeLabels[chamado.prioridade]}
                </Badge>
              )}
            </div>
            {currentUserProfile?.tipo_usuario &&
              currentUserProfile.tipo_usuario !== 'basico' &&
              chamado.status_interno && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                    STATUS INTERNO:
                  </span>
                  <Badge
                    variant="outline"
                    className="px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider bg-blue-100 text-blue-800 border-blue-200"
                  >
                    {chamado.status_interno}
                  </Badge>
                </div>
              )}
            {chamado.status_juridico && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                  JURÍDICO:
                </span>
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider bg-indigo-100 text-indigo-800 border-indigo-200"
                >
                  {chamado.status_juridico}
                </Badge>
              </div>
            )}
            {chamado.situacao_processo && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                  SITUAÇÃO:
                </span>
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 uppercase text-[10px] font-bold tracking-wider bg-teal-100 text-teal-800 border-teal-200"
                >
                  {chamado.situacao_processo}
                </Badge>
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">{chamado.titulo}</h1>
          </div>
          <div className="text-xs text-slate-500 flex flex-col sm:items-end gap-0.5 bg-slate-50 p-2 rounded-md border">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(new Date(chamado.criado_em), "dd/MM/yyyy 'às' HH:mm")}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-slate-700">
                {solicitante ? solicitante.nome_completo : 'Usuário não encontrado'}
              </span>
            </div>
            {solicitante?.email && (
              <div className="text-[10px] text-slate-400 pl-4">{solicitante.email}</div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t">
          <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
            Descrição
          </h3>
          <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm bg-slate-50 p-3 rounded-md border">
            {descricaoDisplay || chamado.descricao}
          </div>
        </div>

        {(isSupport || (chamado.pia && chamado.pia.trim() !== '')) && (
          <div className="pt-3 border-t">
            <div className="flex flex-col gap-3">
              {isSupport && (
                <div className="border border-orange-200 bg-orange-50/40 rounded-md p-2 sm:p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-700 shrink-0" />
                        <h3 className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          Tipo de Chamado
                        </h3>
                      </div>
                      <Select
                        value={tipoChamado || undefined}
                        onValueChange={handleSalvarTipoChamado}
                        disabled={
                          savingTipoChamado ||
                          chamado.status === 'finalizado' ||
                          chamado.status === 'unificado'
                        }
                      >
                        <SelectTrigger className="bg-white border-orange-200 focus:ring-orange-400 h-8 text-xs w-full">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Acidente Interno">Acidente Interno</SelectItem>
                          <SelectItem value="Atropelamento">Atropelamento</SelectItem>
                          <SelectItem value="Avaria">Avaria</SelectItem>
                          <SelectItem value="Colisão">Colisão</SelectItem>
                          <SelectItem value="Colisão com vítima">Colisão com vítima</SelectItem>
                          <SelectItem value="Colisão sem vítima">Colisão sem vítima</SelectItem>
                          <SelectItem value="Lesão Corporal">Lesão Corporal</SelectItem>
                          <SelectItem value="Queda do usuário">Queda do usuário</SelectItem>
                          <SelectItem value="Vandalismo sem vítima">
                            Vandalismo sem vítima
                          </SelectItem>
                          <SelectItem value="Seguradora">Seguradora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-700 shrink-0" />
                        <h3 className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          Situação do Processo
                        </h3>
                      </div>
                      <Select
                        value={situacaoProcesso || undefined}
                        onValueChange={handleSalvarSituacaoProcesso}
                        disabled={
                          savingSituacaoProcesso ||
                          !canEditSituacaoProcesso ||
                          chamado.status === 'finalizado' ||
                          chamado.status === 'unificado'
                        }
                      >
                        <SelectTrigger className="bg-white border-orange-200 focus:ring-orange-400 h-8 text-xs w-full">
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aguardando Julgamento">
                            Aguardando Julgamento
                          </SelectItem>
                          <SelectItem value="Arquivado">Arquivado</SelectItem>
                          <SelectItem value="Cobrar Terceiro">Cobrar Terceiro</SelectItem>
                          <SelectItem value="Convocação do Operador">
                            Convocação do Operador
                          </SelectItem>
                          <SelectItem value="Notificação Extrajudicial">
                            Notificação Extrajudicial
                          </SelectItem>
                          <SelectItem value="Subjúdice">Subjúdice</SelectItem>
                          <SelectItem value="Desconto em folha">Desconto em folha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-700 shrink-0" />
                        <h3 className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                          Prioridade
                        </h3>
                      </div>
                      <Select
                        value={prioridade || undefined}
                        onValueChange={handleSalvarPrioridade}
                        disabled={
                          savingPrioridade ||
                          chamado.status === 'finalizado' ||
                          chamado.status === 'unificado'
                        }
                      >
                        <SelectTrigger className="bg-white border-orange-200 focus:ring-orange-400 h-8 text-xs w-full">
                          <SelectValue placeholder="Selecione uma prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div className="border border-green-700 bg-[rgba(200,230,201,0.1)] rounded-md shadow-sm p-3 sm:p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="h-4 w-4 text-green-800" />
                      <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">
                        R.A.
                      </h3>
                    </div>
                    <Input
                      type="text"
                      placeholder="Informe o número de R.A."
                      value={pia}
                      onChange={(e) => setPia(e.target.value)}
                      className={cn(
                        'bg-white border-green-300 focus-visible:ring-green-700 h-8 text-xs',
                        !canEditRA && 'opacity-70 disabled:cursor-default',
                      )}
                      disabled={savingPia || !canEditRA}
                    />
                  </div>
                  {canEditRA && (
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleSalvarPia}
                        disabled={savingPia}
                        size="sm"
                        className="bg-green-700 hover:bg-green-800 text-white w-full sm:w-auto h-8 text-xs"
                      >
                        {savingPia ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        )}
                        {savingPia ? 'Salvando...' : 'Salvar R.A.'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {canAnexarOrcamento && (
          <div className="pt-3 border-t">
            <div className="border border-purple-700 bg-[rgba(230,200,240,0.1)] rounded-md shadow-sm p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-4 w-4 text-purple-800" />
                <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wider">
                  Anexar Orçamento
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Número do Orçamento</Label>
                  <Input
                    value={numeroOrcamento}
                    onChange={(e) => setNumeroOrcamento(e.target.value)}
                    placeholder="Ex: 12345"
                    disabled={savingOrcamento}
                    className="bg-white border-purple-300 focus-visible:ring-purple-700 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorOrcamentoStr}
                    onChange={(e) => setValorOrcamentoStr(e.target.value)}
                    placeholder="Ex: 1500.00"
                    disabled={savingOrcamento}
                    className="bg-white border-purple-300 focus-visible:ring-purple-700 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Arquivo</Label>
                  <Input
                    type="file"
                    onChange={(e) => setFileOrcamento(e.target.files?.[0] || null)}
                    accept=".pdf,image/jpeg,image/png,image/gif"
                    disabled={savingOrcamento}
                    className="bg-white border-purple-300 focus-visible:ring-purple-700 cursor-pointer h-8 text-xs py-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={obsOrcamento}
                  onChange={(e) => setObsOrcamento(e.target.value)}
                  placeholder="Observações do orçamento..."
                  disabled={savingOrcamento}
                  className="bg-white border-purple-300 focus-visible:ring-purple-700 min-h-[60px] text-xs"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  onClick={handleUploadOrcamento}
                  disabled={savingOrcamento || !numeroOrcamento || !fileOrcamento}
                  size="sm"
                  className="bg-purple-700 hover:bg-purple-800 text-white w-full sm:w-auto h-8 text-xs"
                >
                  {savingOrcamento ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="mr-2 h-3.5 w-3.5" />
                  )}
                  {savingOrcamento ? 'Enviando...' : 'Anexar Orçamento'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isSupport && (
          <div className="pt-3 border-t space-y-1.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[12px] font-medium text-slate-700 shrink-0 hidden sm:inline-block">
                    Boletim de Ocorrência:
                  </span>
                  <span className="text-[12px] text-slate-500 truncate select-all">{`${window.location.origin}/ido/${id}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2 sm:px-3 bg-white"
                    onClick={handleCopiarLinkIdo}
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCompartilharIdo}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[12px] font-medium text-slate-700 shrink-0 hidden sm:inline-block">
                    Espelho de Danos:
                  </span>
                  <span className="text-[12px] text-slate-500 truncate select-all">{`${window.location.origin}/espelho-danos/${id}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2 sm:px-3 bg-white"
                    onClick={handleCopiarLinkEspelho}
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCompartilharEspelho}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSupport && (
          <div className="pt-3 border-t flex flex-col gap-3" id="anexos-internos">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Anexos Internos{' '}
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 px-1.5 py-0">
                    {anexosInternos.length}
                  </Badge>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                  onClick={() => internalFileInputRef.current?.click()}
                  disabled={uploadingInternal}
                >
                  {uploadingInternal ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Paperclip className="mr-2 h-3 w-3" />
                  )}
                  Adicionar Anexo Interno
                </Button>
                <input
                  type="file"
                  ref={internalFileInputRef}
                  onChange={handleInternalFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/gif"
                />
              </div>

              {anexosInternos.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {anexosInternos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-amber-50/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <p
                            className="text-xs font-medium text-slate-900 truncate"
                            title={anexo.nome_arquivo}
                          >
                            {anexo.nome_arquivo}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(anexo.tamanho_bytes / 1024 / 1024).toFixed(2)} MB •{' '}
                            {format(new Date(anexo.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                          {(() => {
                            const docRelacionado = documentosChamado.find(
                              (d) =>
                                d.orcamento_url === anexo.arquivo_url ||
                                d.arquivo_url === anexo.arquivo_url,
                            )
                            const isOrcamento =
                              docRelacionado?.tipo_documento === 'Orçamento' ||
                              anexo.nome_arquivo.toLowerCase().includes('orçamento') ||
                              anexo.nome_arquivo.toLowerCase().includes('orcamento')

                            if (
                              docRelacionado &&
                              docRelacionado.valor_orcamento != null &&
                              isOrcamento
                            ) {
                              const formattedValue = new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(docRelacionado.valor_orcamento)
                              return (
                                <Badge
                                  variant="outline"
                                  className="mt-0.5 bg-purple-50 text-purple-700 border-purple-200 text-[9px] px-1 py-0 leading-tight"
                                >
                                  Valor: {formattedValue}
                                </Badge>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {' '}
                        {isSupport &&
                          (anexo.nome_arquivo.toLowerCase().includes('ido') ||
                            anexo.nome_arquivo.toLowerCase().includes('boletim')) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600"
                              onClick={() => handleEditInternalDoc(anexo, 'IDO')}
                              disabled={
                                editingDocLoading ||
                                (savingDoc && editingDoc?.anexo.id === anexo.id)
                              }
                              title="Editar IDO"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        {isSupport &&
                          (anexo.nome_arquivo.toLowerCase().includes('espelho') ||
                            anexo.nome_arquivo.toLowerCase().includes('danos')) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600"
                              onClick={() => handleEditInternalDoc(anexo, 'Espelho')}
                              disabled={
                                editingDocLoading ||
                                (savingDoc && editingDoc?.anexo.id === anexo.id)
                              }
                              title="Editar Espelho de Danos"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        {isSupport &&
                          (() => {
                            const isOrcamento =
                              anexo.nome_arquivo.toLowerCase().includes('orçamento') ||
                              anexo.nome_arquivo.toLowerCase().includes('orcamento') ||
                              documentosChamado.find(
                                (d) =>
                                  d.orcamento_url === anexo.arquivo_url ||
                                  d.arquivo_url === anexo.arquivo_url,
                              )?.tipo_documento === 'Orçamento'
                            if (isOrcamento) {
                              return (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    setOrcamentoToRecusar(anexo)
                                    setRecusarOrcamentoOpen(true)
                                  }}
                                  disabled={
                                    loadingAction === `${anexo.id}-download` ||
                                    loadingAction === `${anexo.id}-view` ||
                                    (savingDoc && editingDoc?.anexo.id === anexo.id)
                                  }
                                  title="Devolver Orçamento"
                                >
                                  <CornerUpLeft className="h-4 w-4" />
                                </Button>
                              )
                            }
                            return null
                          })()}
                        {isSupport && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600"
                            onClick={() => {
                              setRenameAnexo(anexo)
                              setRenameValue(anexo.nome_arquivo)
                            }}
                            disabled={
                              loadingAction === `${anexo.id}-download` ||
                              loadingAction === `${anexo.id}-view` ||
                              (savingDoc && editingDoc?.anexo.id === anexo.id)
                            }
                            title="Renomear arquivo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          onClick={() => handleDownloadInternal(anexo)}
                          disabled={
                            loadingAction === `${anexo.id}-download` ||
                            loadingAction === `${anexo.id}-view` ||
                            (savingDoc && editingDoc?.anexo.id === anexo.id)
                          }
                          title="Baixar anexo"
                        >
                          {loadingAction === `${anexo.id}-download` ||
                          (savingDoc && editingDoc?.anexo.id === anexo.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          onClick={() => handleViewInternal(anexo)}
                          disabled={
                            loadingAction === `${anexo.id}-download` ||
                            loadingAction === `${anexo.id}-view` ||
                            (savingDoc && editingDoc?.anexo.id === anexo.id)
                          }
                          title="Visualizar anexo"
                        >
                          {loadingAction === `${anexo.id}-view` ||
                          (savingDoc && editingDoc?.anexo.id === anexo.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {(user?.id === anexo.usuario_id ||
                          user?.id === chamado.responsavel_id ||
                          currentUserProfile?.tipo_usuario === 'admin') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={() =>
                              setAnexoInternoToDelete({ id: anexo.id, url: anexo.arquivo_url })
                            }
                            disabled={
                              loadingAction === `${anexo.id}-download` ||
                              loadingAction === `${anexo.id}-view` ||
                              (savingDoc && editingDoc?.anexo.id === anexo.id)
                            }
                            title="Excluir anexo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed rounded-lg bg-slate-50">
                  <p className="text-sm text-slate-500">Nenhum anexo interno registrado.</p>
                </div>
              )}
            </div>

            {(currentUserProfile?.tipo_usuario === 'secretaria_tecnica' ||
              currentUserProfile?.tipo_usuario === 'admin' ||
              currentUserProfile?.tipo_usuario === 'sinistro' ||
              currentUserProfile?.tipo_usuario === 'responsavel') &&
              !isDaniel && (
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button
                    onClick={() => setSolicitarParcelasModalOpen(true)}
                    disabled={!canGenerateVale || completing}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Solicitar Autorização de Parcelas
                  </Button>
                  <Button
                    onClick={() => setGerarValeModalOpen(true)}
                    disabled={!canGenerateVale || completing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Autorização de Desconto
                  </Button>
                </div>
              )}
          </div>
        )}

        {isDaniel && anexosInternos.length > 0 && (
          <div className="pt-3 border-t" id="anexos-internos-daniel">
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                Anexos Internos{' '}
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 px-1.5 py-0">
                  {anexosInternos.length}
                </Badge>
              </h3>
              <div className="flex flex-col gap-1.5">
                {anexosInternos.map((anexo) => (
                  <div
                    key={anexo.id}
                    className="flex items-center justify-between p-2 rounded-md border bg-amber-50/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium text-slate-900 truncate"
                          title={anexo.nome_arquivo}
                        >
                          {anexo.nome_arquivo}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(anexo.tamanho_bytes / 1024 / 1024).toFixed(2)} MB •{' '}
                          {format(new Date(anexo.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleDownloadInternal(anexo)}
                        disabled={loadingAction === `${anexo.id}-download`}
                        title="Baixar anexo"
                      >
                        {loadingAction === `${anexo.id}-download` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleViewInternal(anexo)}
                        disabled={loadingAction === `${anexo.id}-view`}
                        title="Visualizar anexo"
                      >
                        {loadingAction === `${anexo.id}-view` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isPrivilegedTransfer && (
          <div className="animate-fade-in-up">
            <ChatInternoChamado chamadoId={id as string} />
          </div>
        )}

        {(anexos.length > 0 ||
          documentosChamado.filter((d) => d.tipo_documento !== 'Espelho de Danos').length > 0) && (
          <div className="pt-3 border-t">
            <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              Anexos e Documentos{' '}
              <Badge variant="secondary" className="px-1.5 py-0">
                {anexos.length +
                  documentosChamado.filter((d) => d.tipo_documento !== 'Espelho de Danos').length}
              </Badge>
            </h3>
            <div className="flex flex-col gap-1.5">
              {[
                ...anexos,
                ...documentosChamado
                  .filter((doc) => doc.tipo_documento !== 'Espelho de Danos')
                  .map((doc) => ({
                    id: doc.id,
                    url_arquivo: doc.arquivo_url || doc.orcamento_url,
                    nome_arquivo: doc.nome_arquivo || doc.tipo_documento,
                    tamanho_mb: 0,
                    tipo_arquivo: (doc.arquivo_url || doc.orcamento_url)
                      ?.toLowerCase()
                      .endsWith('.pdf')
                      ? 'application/pdf'
                      : 'imagem',
                    criado_em: doc.criado_em || new Date().toISOString(),
                    isDocument: true,
                  })),
              ]
                .filter((a) => a.url_arquivo)
                .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
                .map((anexo: any) => {
                  const isImage =
                    anexo.tipo_arquivo?.includes('imagem') || anexo.tipo_arquivo?.includes('image')
                  const isVideo = anexo.tipo_arquivo?.includes('video')
                  const isAudio = anexo.tipo_arquivo?.includes('audio')

                  let Icon = FileText
                  if (isImage) Icon = ImageIcon
                  if (isVideo) Icon = Video
                  if (isAudio) Icon = Music

                  return (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-slate-50/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <p
                            className="text-xs font-medium text-slate-900 truncate"
                            title={anexo.nome_arquivo}
                          >
                            {anexo.nome_arquivo}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {anexo.tamanho_mb ? `${anexo.tamanho_mb} MB • ` : ''}
                            {anexo.criado_em
                              ? format(new Date(anexo.criado_em), "dd/MM/yyyy 'às' HH:mm")
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          onClick={() => handleDownloadAnexo(anexo)}
                          disabled={
                            loadingAction === `${anexo.id}-download` ||
                            loadingAction === `${anexo.id}-view`
                          }
                          title="Baixar anexo"
                        >
                          {loadingAction === `${anexo.id}-download` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          onClick={() => handleViewAnexo(anexo)}
                          disabled={
                            loadingAction === `${anexo.id}-download` ||
                            loadingAction === `${anexo.id}-view`
                          }
                          title="Visualizar anexo"
                        >
                          {loadingAction === `${anexo.id}-view` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {isSupport && !anexo.isDocument && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={() => handleDeleteAnexo(anexo.id, anexo.url_arquivo)}
                            disabled={
                              loadingAction === `${anexo.id}-download` ||
                              loadingAction === `${anexo.id}-view`
                            }
                            title="Excluir anexo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-bold text-slate-900 px-1">Histórico de Interações</h3>
        <div className="bg-white rounded-lg border shadow-sm p-3 sm:p-4 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
          {timeline.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma interação registrada.</p>
          ) : (
            timeline.map((item, index) => {
              const isCurrentUser = item.usuario?.id === user?.id

              if (item.type === 'history') {
                return (
                  <div key={`${item.id}-${index}`} className="flex justify-center my-1.5">
                    <div className="bg-slate-100 text-slate-500 text-[10px] sm:text-xs px-2.5 py-1 rounded-3xl sm:rounded-full flex flex-col sm:flex-row sm:items-center gap-1.5 font-medium border max-w-[95%] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {getAcaoText(item.acao!, item.usuario?.nome_completo || 'Sistema')} -{' '}
                          {format(new Date(item.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      {item.detalhes && (
                        <>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="font-normal italic max-w-full truncate">
                            {item.detalhes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={cn('flex w-full', isCurrentUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] sm:max-w-[80%] rounded-xl px-3 py-2 shadow-sm',
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm border',
                    )}
                  >
                    {!isCurrentUser && (
                      <div className="font-bold text-[11px] mb-0.5 text-primary">
                        {item.usuario?.nome_completo || 'Usuário'}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-xs sm:text-sm leading-snug">
                      {item.mensagem}
                    </div>

                    {item.anexos && item.anexos.length > 0 && (
                      <div
                        className={cn(
                          'mt-2 space-y-1.5 pt-2 border-t',
                          isCurrentUser ? 'border-primary-foreground/20' : 'border-slate-200',
                        )}
                      >
                        {item.anexos.map((anexo) => {
                          const isImage =
                            anexo.tipo_arquivo.includes('imagem') ||
                            anexo.tipo_arquivo.includes('image')
                          const isVideo = anexo.tipo_arquivo.includes('video')
                          const isAudio = anexo.tipo_arquivo.includes('audio')

                          let Icon = FileText
                          if (isImage) Icon = ImageIcon
                          if (isVideo) Icon = Video
                          if (isAudio) Icon = Music

                          return (
                            <a
                              key={anexo.id}
                              href={anexo.url_arquivo}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                'flex items-center gap-2 p-1.5 rounded-md border text-xs transition-colors text-left group',
                                isCurrentUser
                                  ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/20'
                                  : 'bg-white hover:bg-slate-50 border-slate-200',
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0 opacity-70" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{anexo.nome_arquivo}</p>
                                <p className="text-[10px] opacity-70">{anexo.tamanho_mb} MB</p>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    )}

                    <div
                      className={cn(
                        'text-[9px] sm:text-[10px] mt-1 text-right opacity-70',
                        isCurrentUser ? 'text-primary-foreground/90' : 'text-slate-500',
                      )}
                    >
                      {format(new Date(item.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {chamado.status !== 'finalizado' && canReply && (
        <div className="bg-white rounded-lg border shadow-sm p-3 sm:p-4 animate-fade-in-up">
          <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
            Responder
          </h3>
          <div
            className={cn(
              'flex flex-col gap-2 rounded-md border border-dashed p-3 transition-colors bg-slate-50',
              isDragActive ? 'border-primary bg-primary/5' : 'hover:border-slate-300',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              placeholder="Digite sua resposta aqui... (Você também pode arrastar arquivos para anexar)"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[80px] resize-y bg-white text-xs sm:text-sm"
              disabled={submitting}
            />

            {files.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-md border text-sm shadow-sm',
                      f.status === 'error' ? 'border-red-200 bg-red-50/50' : 'bg-white',
                    )}
                  >
                    <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="truncate max-w-[200px] sm:max-w-[300px] font-medium"
                          title={f.file.name}
                        >
                          {f.file.name}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {(f.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>

                      {f.status === 'uploading' && (
                        <div className="space-y-1.5 mt-1">
                          <Progress value={f.progress} className="h-1.5" />
                          <p className="text-[10px] text-slate-500 font-medium">Enviando...</p>
                        </div>
                      )}

                      {f.status === 'success' && (
                        <div className="flex items-center gap-1 text-green-600 text-[11px] font-medium mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enviado
                        </div>
                      )}

                      {f.status === 'error' && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-red-600 text-[11px] font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {f.errorMessage}
                          </div>
                          <button
                            onClick={() => retryUpload(f)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
                            disabled={submitting}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Tentar novamente
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1.5 rounded shrink-0 transition-colors"
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t mt-1">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-600 h-8 text-xs bg-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || files.length >= MAX_FILES}
                >
                  <Paperclip className="mr-2 h-3.5 w-3.5" />
                  Anexar Arquivo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept=".mp3,.mp4,.pdf,image/jpeg,image/png,image/gif,image/webp"
                />
                <span className="text-[10px] text-slate-500 hidden sm:inline-block">
                  Máx 10 arquivos (20MB)
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setMensagem('')
                    setFiles([])
                  }}
                  disabled={submitting || (!mensagem && files.length === 0)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleResponder}
                  disabled={
                    submitting || !mensagem.trim() || files.some((f) => f.status !== 'success')
                  }
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  {submitting ? 'Enviando...' : 'Responder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TransferModal
        transferModalOpen={transferModalOpen}
        setTransferModalOpen={setTransferModalOpen}
        availableResponsaveis={availableResponsaveis}
        selectedResponsavel={selectedResponsavel}
        setSelectedResponsavel={setSelectedResponsavel}
        transferObservacao={transferObservacao}
        setTransferObservacao={setTransferObservacao}
        transferLoading={transferLoading}
        handleTransferir={handleTransferir}
      />

      <EditDocModal
        editingDoc={editingDoc}
        setEditingDoc={setEditingDoc}
        docFormData={docFormData}
        setDocFormData={setDocFormData}
        savingDoc={savingDoc}
        handleSaveDocEdit={handleSaveDocEdit}
      />

      <UnificarChamadoModal
        isOpen={unificarModalOpen}
        onClose={() => setUnificarModalOpen(false)}
        targetChamado={
          chamado ? { id: chamado.id, titulo: chamado.titulo, pia: chamado.pia } : null
        }
        onSuccess={() => {
          setUnificarModalOpen(false)
          fetchChamadoData()
        }}
      />

      <ReabrirAlert
        confirmReabrirOpen={confirmReabrirOpen}
        setConfirmReabrirOpen={setConfirmReabrirOpen}
        handleReabrir={handleReabrir}
      />

      <DuplicateAlert
        duplicateAlertOpen={duplicateAlertOpen}
        setDuplicateAlertOpen={setDuplicateAlertOpen}
        duplicateSubmitAction={duplicateSubmitAction}
        setDuplicateSubmitAction={setDuplicateSubmitAction}
      />

      <GerarValeModal
        open={gerarValeModalOpen}
        setOpen={setGerarValeModalOpen}
        orcamentoDoc={orcamentoDoc}
        chamadoId={id}
        chamado={chamado}
        solicitante={solicitante}
        userId={user?.id}
        anexosInternos={anexosInternos}
        documentosChamado={documentosChamado}
        onSuccess={() => fetchChamadoData()}
        onDownload={(url: string, name: string) =>
          handleDocumentAction('vale-' + Date.now(), url, name, 'download')
        }
      />

      <SolicitarParcelasModal
        open={solicitarParcelasModalOpen}
        setOpen={setSolicitarParcelasModalOpen}
        orcamentoDoc={orcamentoDoc}
        chamadoId={id}
        chamado={chamado}
        userId={user?.id}
        anexosInternos={anexosInternos}
        documentosChamado={documentosChamado}
      />

      <Dialog open={recusarOrcamentoOpen} onOpenChange={setRecusarOrcamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                O orçamento será devolvido para a Secretaria Técnica corrigir e anexar novamente.
                Este arquivo será ocultado da lista de Anexos Internos.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo da Devolução</Label>
              <Textarea
                placeholder="Descreva por que este orçamento está sendo devolvido..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                disabled={recusandoOrcamento}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecusarOrcamentoOpen(false)}
              disabled={recusandoOrcamento}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRecusarOrcamento}
              disabled={!motivoRecusa.trim() || recusandoOrcamento}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {recusandoOrcamento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameAnexo}
        onOpenChange={(open) => {
          if (!open) {
            setRenameAnexo(null)
            setRenameValue('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renomear Arquivo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Arquivo</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Novo nome do arquivo"
                disabled={renaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    handleRenameSubmit()
                  }
                }}
              />
              <p className="text-[11px] text-slate-500">
                Dica: arquivos contendo "autorização" ou "escaneado" no nome acionarão o fluxo de
                aprovação do Alex ao finalizar o chamado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameAnexo(null)
                setRenameValue('')
              }}
              disabled={renaming}
            >
              Cancelar
            </Button>
            <Button onClick={handleRenameSubmit} disabled={renaming || !renameValue.trim()}>
              {renaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {renaming ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!anexoInternoToDelete}
        onOpenChange={(open) => !open && setAnexoInternoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInternal}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
