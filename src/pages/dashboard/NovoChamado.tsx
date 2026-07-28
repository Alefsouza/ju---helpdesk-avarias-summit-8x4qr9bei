import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  UploadCloud,
  X,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  CalendarIcon,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDraft, getSyncDraft } from '@/hooks/use-draft'
import {
  saveStoredFile,
  getStoredFiles,
  deleteStoredFile,
  clearStoredFiles,
  type StoredFile,
} from '@/lib/indexeddb'
import { compressImage } from '@/lib/image-compression'

type FileCategory =
  | 'boletim'
  | 'orcamento_confianca'
  | 'orcamento_carmg'
  | 'cnh'
  | 'documento_veiculo'
  | 'fotos_videos'
  | 'anexo_lesao'
  | 'apolice'
  | 'valor_acordo'

const detectOS = () => {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
    return 'ios'
  if (/Win/i.test(ua)) return 'windows'
  return 'desktop'
}

const getCategoryConfigs = (os: string) => {
  const isAndroid = os === 'android'
  const acceptVal = isAndroid ? 'image/*' : 'image/*,application/pdf'
  const allowedVal = isAndroid ? ['image/'] : ['image/', 'application/pdf']
  const helperTextDynamic = isAndroid ? 'Imagens (Máx 20MB cada)' : 'Imagens e PDF (Máx 20MB cada)'
  const helperTextImagesOnly = isAndroid
    ? 'Imagens (Máx 20MB cada)'
    : 'Somente imagens (Máx 20MB cada)'

  const SEGURADORA_CATEGORIES = [
    {
      id: 'boletim' as const,
      title: 'Boletim de Ocorrência',
      description: 'Anexe o boletim de ocorrência do sinistro',
      required: true,
      min: 1,
      max: 1,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'apolice' as const,
      title: 'Apólice',
      description: 'Anexe a apólice do seguro',
      required: true,
      min: 1,
      max: 1,
      accept: 'image/*',
      allowedPrefixes: ['image/'],
      helperText: helperTextImagesOnly,
    },
    {
      id: 'valor_acordo' as const,
      title: 'Valor do acordo',
      description: 'Anexe o documento com o valor do acordo',
      required: true,
      min: 1,
      max: 1,
      accept: 'image/*',
      allowedPrefixes: ['image/'],
      helperText: helperTextImagesOnly,
    },
  ]

  const ATTACHMENT_CATEGORIES = [
    {
      id: 'boletim' as const,
      title: 'Boletim de Ocorrência',
      description: 'Anexe o boletim de ocorrência do sinistro',
      required: true,
      min: 1,
      max: 1,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'orcamento_confianca' as const,
      title: '02 Orçamentos de funilarias de sua confiança',
      description: 'Anexe 2 orçamentos de funilarias diferentes',
      required: true,
      min: 2,
      max: 2,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'orcamento_carmg' as const,
      title: '01 Orçamento da Nossa funilaria credenciada',
      description:
        'CARMG Funilaria e Pintura - R. Bom Pastor, 2454 - Ipiranga - Contato: (11) 94004-1866 / Marcos',
      required: false,
      min: 0,
      max: 1,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'cnh' as const,
      title: 'CNH',
      description: 'Anexe a Carteira Nacional de Habilitação do condutor',
      required: true,
      min: 1,
      max: 1,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'documento_veiculo' as const,
      title: 'Documento do veículo',
      description: 'Anexe o documento do veículo (CRLV ou RG do veículo)',
      required: true,
      min: 1,
      max: 1,
      accept: acceptVal,
      allowedPrefixes: allowedVal,
      helperText: helperTextDynamic,
    },
    {
      id: 'fotos_videos' as const,
      title: 'Fotos do veículo avariado',
      description: 'Anexe fotos do veículo com os danos',
      required: false,
      min: 0,
      max: 10,
      accept: 'image/*',
      allowedPrefixes: ['image/'],
      helperText: helperTextImagesOnly,
    },
  ]

  const LESAO_ATTACHMENT = {
    id: 'anexo_lesao' as const,
    title: 'Anexos (Opcional)',
    description: 'Anexe fotos relacionadas à ocorrência',
    required: false,
    min: 0,
    max: 10,
    accept: 'image/*',
    allowedPrefixes: ['image/'],
    helperText: helperTextImagesOnly,
  }

  const UNIQUE_CATEGORIES = Array.from(
    new Map(
      [...ATTACHMENT_CATEGORIES, ...SEGURADORA_CATEGORIES, LESAO_ATTACHMENT].map((c) => [c.id, c]),
    ).values(),
  )

  return { SEGURADORA_CATEGORIES, ATTACHMENT_CATEGORIES, LESAO_ATTACHMENT, UNIQUE_CATEGORIES }
}

type FileItem = Omit<StoredFile, 'category'> & { category: FileCategory }

const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const formSchema = z.object({
  tipoChamado: z.enum(['Colisão', 'Lesão Corporal', 'Seguradora', ''], {
    required_error: 'Tipo de chamado é obrigatório',
  }),
  situacaoProcesso: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  dataOcorrencia: z
    .any()
    .refine((val) => val !== undefined && val !== null, 'Data da ocorrência é obrigatória'),
  descricao: z.string().min(20, 'A descrição deve ter no mínimo 20 caracteres'),
  placaOnibus: z
    .string({ required_error: 'A placa do veículo é obrigatória' })
    .min(1, 'A placa do veículo é obrigatória')
    .length(8, 'A placa deve conter 7 caracteres alfanuméricos (ex: ABC 1234)')
    .regex(/^[A-Z]{3} [A-Z0-9]{4}$/, 'Formato inválido. Use ABC 1234 ou ABC 1D23'),
})

type FormValues = z.infer<typeof formSchema>

export default function NovoChamado() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const os = detectOS()
  const { SEGURADORA_CATEGORIES, ATTACHMENT_CATEGORIES, LESAO_ATTACHMENT, UNIQUE_CATEGORIES } =
    getCategoryConfigs(os)

  const initialDraft = getSyncDraft('draft-novo-chamado')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoChamado: initialDraft?.tipoChamado || '',
      situacaoProcesso: initialDraft?.situacaoProcesso || '',
      titulo: initialDraft?.titulo || '',
      descricao: initialDraft?.descricao || '',
      placaOnibus: initialDraft?.placaOnibus || '',
      dataOcorrencia: initialDraft?.dataOcorrencia
        ? new Date(initialDraft.dataOcorrencia)
        : undefined,
    },
  })

  const { draftRestored, setDraftRestored, clearDraft } = useDraft(
    form,
    'draft-novo-chamado',
    user?.id,
  )

  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({})
  const [identifiedGaragem, setIdentifiedGaragem] = useState<string | null>(null)
  const [identifiedPrefixo, setIdentifiedPrefixo] = useState<string | null>(null)
  const [isSearchingPlaca, setIsSearchingPlaca] = useState(false)

  const [files, setFiles] = useState<FileItem[]>([])
  const [dragActiveId, setDragActiveId] = useState<FileCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isInitialFilesMount = useRef(true)

  useEffect(() => {
    if (!user) return

    const loadFiles = async () => {
      if (!isInitialFilesMount.current) return
      isInitialFilesMount.current = false

      // Clear legacy localStorage just in case
      localStorage.removeItem('draft-novo-chamado-files')

      try {
        const storedFiles = await getStoredFiles()
        if (storedFiles && storedFiles.length > 0) {
          setFiles(storedFiles as FileItem[])

          for (const f of storedFiles) {
            if (!f.file && f.status !== 'success') {
              updateItemState(f.id, (prev) => ({
                ...prev,
                status: 'lost',
                errorMessage: 'Arquivo perdido durante recarregamento',
              }))
              continue
            }
            if (f.status === 'pending' || f.status === 'uploading' || f.status === 'error') {
              uploadFile(f as FileItem, user)
            }
          }
        }
      } catch (error) {
        console.error('Error loading files from IDB', error)
      }
    }

    loadFiles()
  }, [user])

  const toastMostrado = useRef(false)

  useEffect(() => {
    if (draftRestored && !toastMostrado.current) {
      toast.success('Rascunho recuperado com sucesso!')
      toastMostrado.current = true

      const dataObj = form.getValues('dataOcorrencia')
      if (dataObj && typeof dataObj === 'string') {
        form.setValue('dataOcorrencia', new Date(dataObj), { shouldValidate: true })
      }
    }
  }, [draftRestored, form])

  const tipoChamado = form.watch('tipoChamado')
  const titulo = form.watch('titulo') || ''
  const dataOcorrencia = form.watch('dataOcorrencia')
  const descricao = form.watch('descricao') || ''
  const placaOnibus = form.watch('placaOnibus') || ''

  const categoriesToRender =
    tipoChamado === 'Lesão Corporal'
      ? [LESAO_ATTACHMENT]
      : tipoChamado === 'Seguradora'
        ? SEGURADORA_CATEGORIES
        : ATTACHMENT_CATEGORIES

  const getCategoryInfo = (id: FileCategory) => {
    if (id === 'anexo_lesao') return LESAO_ATTACHMENT
    return [...ATTACHMENT_CATEGORIES, ...SEGURADORA_CATEGORIES].find((c) => c.id === id)!
  }

  const processFiles = async (newFiles: File[], categoryId: FileCategory) => {
    const categoryInfo = getCategoryInfo(categoryId)
    const currentFiles = files.filter((f) => f.category === categoryId)

    if (currentFiles.length + newFiles.length > categoryInfo.max) {
      toast.error(
        `Você pode enviar no máximo ${categoryInfo.max} arquivo(s) em ${categoryInfo.title}.`,
      )
      return
    }

    const itemsToUpload: FileItem[] = []

    for (const rawFile of newFiles) {
      const isValidType = categoryInfo.allowedPrefixes.some((prefix) =>
        rawFile.type.startsWith(prefix),
      )
      if (!isValidType) {
        if (categoryInfo.accept.includes('application/pdf')) {
          toast.error('Formato de arquivo não suportado. Por favor, envie uma imagem ou PDF.')
        } else {
          toast.error(`Apenas imagens são permitidas para esta categoria: ${rawFile.name}`)
        }
        continue
      }

      if (rawFile.size > MAX_SIZE_BYTES) {
        toast.error(`O arquivo ${rawFile.name} excede o limite de 20MB.`)
        continue
      }

      const file = await compressImage(rawFile)

      const item: FileItem = {
        id: crypto.randomUUID(),
        category: categoryId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        errorCount: 0,
      }
      itemsToUpload.push(item)
    }

    if (itemsToUpload.length > 0) {
      setFiles((prev) => [...prev, ...itemsToUpload])
      setAttachmentErrors((prev) => ({ ...prev, [categoryId]: '' }))

      for (const item of itemsToUpload) {
        await saveStoredFile(item).catch((err) => {
          console.error('Storage limit reached or IDB failed', err)
          toast.error('Aviso: Falha ao salvar arquivo localmente. O envio continuará.')
        })
        uploadFile(item)
      }
    }
  }

  const updateItemState = (id: string, updater: (f: FileItem) => FileItem) => {
    setFiles((prev) => {
      let updatedObj: FileItem | undefined
      const next = prev.map((f) => {
        if (f.id === id) {
          updatedObj = updater(f)
          return updatedObj
        }
        return f
      })
      if (updatedObj) saveStoredFile(updatedObj).catch(() => {})
      return next
    })
  }

  const uploadFile = async (item: FileItem, currentUser?: any) => {
    const u = currentUser || user
    if (!u || !item.file) return

    updateItemState(item.id, (f) => ({
      ...f,
      status: 'uploading',
      progress: 0,
      errorMessage: undefined,
    }))

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
      const ext = item.name.split('.').pop()
      const filePath = `${u.id}/${crypto.randomUUID()}.${ext}`

      const { error } = await supabase.storage
        .from('anexos')
        .upload(filePath, item.file, { upsert: false })

      clearInterval(interval)
      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('anexos').getPublicUrl(filePath)

      updateItemState(item.id, (f) => ({
        ...f,
        status: 'success',
        progress: 100,
        url: publicUrl,
      }))
    } catch (err) {
      clearInterval(interval)
      updateItemState(item.id, (f) => {
        const count = f.errorCount + 1
        return {
          ...f,
          status: 'error',
          errorCount: count,
          errorMessage:
            count >= 3
              ? 'Não conseguimos enviar este arquivo. Tente outro'
              : 'Erro no envio. Tente novamente',
        }
      })
    }
  }

  const handleDrop = (e: React.DragEvent, categoryId: FileCategory) => {
    e.preventDefault()
    setDragActiveId(null)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), categoryId)
    }
  }

  const handleDragOver = (e: React.DragEvent, categoryId: FileCategory) => {
    e.preventDefault()
    setDragActiveId(categoryId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActiveId(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, categoryId: FileCategory) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), categoryId)
    }
    e.target.value = ''
  }

  const removeFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    await deleteStoredFile(id)
  }

  const retryUpload = (item: FileItem) => {
    if (item.errorCount >= 3 || !item.file) return
    uploadFile(item)
  }

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getTipoArquivo = (mime: string) => {
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('image/')) return 'imagem'
    if (mime === 'application/pdf') return 'pdf'
    return 'pdf'
  }

  useEffect(() => {
    if (!placaOnibus || placaOnibus.length !== 8) {
      setIdentifiedGaragem(null)
      setIdentifiedPrefixo(null)
      return
    }

    const searchTimer = setTimeout(async () => {
      setIsSearchingPlaca(true)
      try {
        const cleanSearch = placaOnibus.replace(/[^a-zA-Z0-9]/g, '')

        const { data, error } = await supabase.rpc(
          'buscar_veiculo_por_placa' as any,
          {
            p_placa: cleanSearch,
          } as any,
        )

        if (error) throw error

        const result = data as { garagem: string; prefixo: string } | null

        if (result && result.garagem) {
          setIdentifiedGaragem(result.garagem)
          setIdentifiedPrefixo(result.prefixo)
        } else {
          setIdentifiedGaragem('NOT_FOUND')
          setIdentifiedPrefixo(null)
        }
      } catch (err) {
        console.error('Error searching frota:', err)
        setIdentifiedGaragem('NOT_FOUND')
        setIdentifiedPrefixo(null)
      } finally {
        setIsSearchingPlaca(false)
      }
    }, 500)

    return () => clearTimeout(searchTimer)
  }, [placaOnibus])

  const handleValidationError = (errors: typeof form.formState.errors) => {
    const fieldOrder: (keyof FormValues)[] = [
      'tipoChamado',
      'placaOnibus',
      'titulo',
      'dataOcorrencia',
      'descricao',
    ]
    for (const fieldName of fieldOrder) {
      if (errors[fieldName]) {
        const element = document.getElementById(`field-${fieldName}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            const input = element.querySelector(
              'input, textarea, button, [role="combobox"]',
            ) as HTMLElement | null
            if (input) input.focus()
          }, 400)
        }
        break
      }
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return

    const { tipoChamado, situacaoProcesso, titulo, dataOcorrencia, descricao, placaOnibus } = values

    const hasIncomplete = files.some((f) => f.status !== 'success')
    if (hasIncomplete) {
      toast.error('Valide todos os anexos antes de enviar')
      return
    }

    let hasAttachmentErrors = false
    const newAttachmentErrors: Record<string, string> = {}

    if (tipoChamado) {
      let catsToCheck: any[] = []

      if (tipoChamado === 'Seguradora') catsToCheck = SEGURADORA_CATEGORIES
      else if (tipoChamado === 'Colisão') catsToCheck = ATTACHMENT_CATEGORIES
      else catsToCheck = [LESAO_ATTACHMENT]

      catsToCheck.forEach((cat) => {
        const count = files.filter((f) => f.category === cat.id).length
        if (cat.required && count === 0) {
          newAttachmentErrors[cat.id] = 'Este anexo é obrigatório'
          hasAttachmentErrors = true
        } else if (count > 0 && count < cat.min) {
          newAttachmentErrors[cat.id] = `Mínimo de ${cat.min} arquivo(s)`
          hasAttachmentErrors = true
        }
      })

      if (tipoChamado === 'Colisão') {
        const orcamentoConfiancaCount = files.filter(
          (f) => f.category === 'orcamento_confianca',
        ).length
        if (orcamentoConfiancaCount < 2) {
          newAttachmentErrors['orcamento_confianca'] = 'Mínimo de 2 orçamentos obrigatórios'
          hasAttachmentErrors = true
        }
      }

      const isAnyAttachmentRequired = catsToCheck.some((cat) => cat.required)
      const hasAnyValidAttachment = files.filter((f) => f.status === 'success').length > 0
      if (isAnyAttachmentRequired && !hasAnyValidAttachment) {
        toast.error('É obrigatório enviar pelo menos um anexo válido.')
        hasAttachmentErrors = true
      }

      setAttachmentErrors(newAttachmentErrors)

      if (hasAttachmentErrors) {
        toast.error('Preencha todos os anexos obrigatórios')
        return
      }
    }

    if (isSearchingPlaca || !identifiedGaragem) {
      toast.error('Aguarde a validação do veículo.')
      return
    }

    if (identifiedGaragem === 'NOT_FOUND') {
      toast.error('Esse carro não pertence a frota da Via Sudeste.')
      return
    }

    setIsSubmitting(true)
    try {
      let finalTitulo = titulo
      if (
        profile?.tipo_usuario === 'basico' &&
        identifiedPrefixo &&
        identifiedGaragem !== 'NOT_FOUND'
      ) {
        finalTitulo = `${titulo} - Carro: ${identifiedPrefixo}`
      }

      if (tipoChamado === 'Seguradora') {
        const carroText = identifiedPrefixo || placaOnibus
        finalTitulo = `${titulo} - Carro: ${carroText}`
      }

      const { data: chamado, error: chamadoError } = await supabase
        .from('chamados')
        .insert({
          titulo: finalTitulo,
          descricao,
          tipo_chamado: tipoChamado,
          prioridade: null,
          usuario_id: user.id,
          responsavel_id: null,
          status: 'aberto',
          garagem: identifiedGaragem !== 'NOT_FOUND' ? identifiedGaragem : null,
          carro: placaOnibus,
          data_ocorrencia: format(new Date(dataOcorrencia), 'yyyy-MM-dd'),
          situacao_processo: situacaoProcesso || null,
          criado_em: new Date().toISOString(),
        } as any)
        .select()
        .single()

      if (chamadoError) throw chamadoError

      if (files.length > 0) {
        if (tipoChamado === 'Seguradora') {
          const documentosData = files.map((f) => {
            let tipo_doc = 'Boletim de Ocorrência'
            if (f.category === 'apolice') tipo_doc = 'Apólice'
            if (f.category === 'valor_acordo') tipo_doc = 'Valor do acordo'

            return {
              chamado_id: chamado.id,
              tipo_documento: tipo_doc,
              nome_arquivo: f.name,
              arquivo_url: f.url!,
            }
          })
          const { error: docError } = await supabase.from('documentos').insert(documentosData)
          if (docError) throw docError
        } else {
          let orcamentoCount = 1
          const documentosData = files.map((f) => {
            let tipo_doc = 'Outros'
            let categoryTitle = 'Anexo'

            if (tipoChamado === 'Lesão Corporal') {
              tipo_doc = 'Anexo Lesão Corporal'
              categoryTitle = 'Anexo Lesão Corporal'
            } else {
              if (f.category === 'orcamento_confianca') {
                tipo_doc = 'Orçamento'
                categoryTitle = `Orçamento ${orcamentoCount}`
                orcamentoCount++
              } else if (f.category === 'orcamento_carmg') {
                tipo_doc = 'Orçamento'
                categoryTitle = 'Orçamento CARMG'
              } else if (f.category === 'boletim') {
                tipo_doc = 'Boletim de Ocorrência'
                categoryTitle = 'Boletim de Ocorrência'
              } else if (f.category === 'cnh') {
                tipo_doc = 'CNH'
                categoryTitle = 'CNH'
              } else if (f.category === 'documento_veiculo') {
                tipo_doc = 'Documento do veículo'
                categoryTitle = 'Documento do Veículo'
              } else if (f.category === 'fotos_videos') {
                tipo_doc = 'Fotos/Vídeos'
                categoryTitle = 'Fotos/Vídeos'
              }
            }

            return {
              chamado_id: chamado.id,
              tipo_documento: tipo_doc,
              nome_arquivo: `[${categoryTitle}] - ${f.name}`,
              arquivo_url: f.url!,
            }
          })
          const { error: docError } = await supabase.from('documentos').insert(documentosData)
          if (docError) throw docError
        }
      }

      await supabase.from('historico_chamado').insert({
        chamado_id: chamado.id,
        acao: 'criado',
        usuario_id: user.id,
      })

      clearDraft()
      localStorage.removeItem('draft-novo-chamado-files')
      await clearStoredFiles()
      toast.success('Chamado aberto com sucesso')
      navigate(`/dashboard/chamados/${chamado.id}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao abrir chamado. Tente novamente')
    } finally {
      setIsSubmitting(false)
    }
  }, handleValidationError)

  const isSubmitDisabled =
    isSubmitting ||
    files.some((f) => f.status !== 'success') ||
    isSearchingPlaca ||
    identifiedGaragem === 'NOT_FOUND'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up p-4 mb-20">
      <div className="hidden" aria-hidden="true">
        {UNIQUE_CATEGORIES.map((cat) => (
          <input
            key={`hidden-input-${cat.id}`}
            id={`file-upload-${cat.id}`}
            type="file"
            onChange={(e) => handleFileInput(e, cat.id)}
            multiple={cat.max > 1}
            accept={cat.accept}
          />
        ))}
      </div>

      {draftRestored && (
        <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Rascunho Restaurado</h3>
              <p className="mt-1 text-sm">
                Encontramos dados preenchidos anteriormente. Seus <strong>anexos</strong> foram
                preservados.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraftRestored(false)}
            className="-mt-2 -mr-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Abrir Novo Chamado</h1>
        <p className="text-muted-foreground mt-2">
          Selecione o tipo de ocorrência e preencha os dados necessários.
        </p>
      </div>

      <Card>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-4">
              <div className="space-y-2 scroll-mt-24" id="field-tipoChamado">
                <Label htmlFor="tipoChamado">Tipo de Ocorrência *</Label>
                <Controller
                  control={form.control}
                  name="tipoChamado"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={async (val: 'Colisão' | 'Lesão Corporal' | 'Seguradora') => {
                        const currentVal = field.value
                        if (currentVal && currentVal !== '' && currentVal !== val) {
                          form.setValue('titulo', '')
                          form.setValue('descricao', '')
                          form.setValue('dataOcorrencia', undefined)
                          form.setValue('placaOnibus', '')
                          setFiles([])
                          await clearStoredFiles()
                          setIdentifiedGaragem(null)
                          setIdentifiedPrefixo(null)
                        }
                        field.onChange(val)
                      }}
                    >
                      <SelectTrigger id="tipoChamado" className="bg-white">
                        <SelectValue placeholder="Selecione o tipo de chamado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Colisão">Colisão (Danos ao veículo)</SelectItem>
                        <SelectItem value="Lesão Corporal">Lesão Corporal (Física)</SelectItem>
                        <SelectItem value="Seguradora">Seguradora</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {tipoChamado && (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-4">
                  {profile && ['admin', 'juridico', 'sinistro'].includes(profile?.tipo_usuario) && (
                    <div className="space-y-2 scroll-mt-24" id="field-situacaoProcesso">
                      <Label htmlFor="situacaoProcesso">Situação do Processo (Opcional)</Label>
                      <Controller
                        control={form.control}
                        name="situacaoProcesso"
                        render={({ field }) => (
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger id="situacaoProcesso" className="bg-white">
                              <SelectValue placeholder="Selecione a situação do processo" />
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
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                  <div className="space-y-2 scroll-mt-24" id="field-placaOnibus">
                    <Label htmlFor="placaOnibus">Placa do nosso ônibus *</Label>
                    <Controller
                      control={form.control}
                      name="placaOnibus"
                      render={({ field }) => (
                        <Input
                          id="placaOnibus"
                          placeholder="Ex: ABC 1234"
                          value={field.value}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                            if (value.length > 3) {
                              value = value.substring(0, 3) + ' ' + value.substring(3, 7)
                            }
                            field.onChange(value)
                          }}
                          maxLength={8}
                        />
                      )}
                    />
                    {form.formState.errors.placaOnibus && (
                      <p className="text-sm font-medium text-red-500">
                        {form.formState.errors.placaOnibus.message}
                      </p>
                    )}
                    {isSearchingPlaca && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando veículo...
                      </p>
                    )}
                    {!isSearchingPlaca && identifiedGaragem === 'NOT_FOUND' && (
                      <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> Esse carro não pertence a frota da Via
                        Sudeste.
                      </p>
                    )}
                    {!isSearchingPlaca &&
                      identifiedGaragem &&
                      identifiedGaragem !== 'NOT_FOUND' && (
                        <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3" /> Veículo identificado: Garagem{' '}
                          {identifiedGaragem}
                          {identifiedPrefixo && ` - Carro: ${identifiedPrefixo}`}
                        </p>
                      )}
                  </div>

                  <div className="space-y-2 scroll-mt-24" id="field-titulo">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      placeholder={
                        tipoChamado === 'Colisão'
                          ? 'Ex: Colisão na lateral direita'
                          : 'Ex: Queda de passageiro no interior do veículo'
                      }
                      {...form.register('titulo')}
                      required
                    />
                  </div>

                  <div className="space-y-2 flex flex-col scroll-mt-24" id="field-dataOcorrencia">
                    <Label htmlFor="dataOcorrencia">Data da Ocorrência *</Label>
                    <Controller
                      control={form.control}
                      name="dataOcorrencia"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value && field.value instanceof Date ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : field.value ? (
                                format(new Date(field.value), 'PPP', { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                field.value
                                  ? field.value instanceof Date
                                    ? field.value
                                    : new Date(field.value)
                                  : undefined
                              }
                              onSelect={field.onChange}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {form.formState.errors.dataOcorrencia && (
                      <p className="text-sm font-medium text-red-500">
                        {form.formState.errors.dataOcorrencia.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 scroll-mt-24" id="field-descricao">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Descreva detalhadamente a ocorrência..."
                      className="min-h-[120px]"
                      {...form.register('descricao')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-base font-semibold">
                      {tipoChamado === 'Lesão Corporal'
                        ? 'Anexos (Opcional)'
                        : 'Anexos Necessários'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {tipoChamado === 'Lesão Corporal'
                        ? 'Você pode anexar fotos (somente imagens) relacionadas à ocorrência.'
                        : 'Forneça as documentações em formato de imagem abaixo para a abertura do sinistro.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {categoriesToRender.map((cat) => {
                      const catFiles = files.filter((f) => f.category === cat.id)
                      return (
                        <div
                          key={cat.id}
                          className="space-y-3 p-4 border rounded-lg bg-slate-50/50"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-2">
                                {cat.title}{' '}
                                {cat.required && <span className="text-red-500">*</span>}
                                {cat.required ? (
                                  <span className="text-red-600 text-[10px] font-medium bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Obrigatório
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] font-medium bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Opcional
                                  </span>
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {cat.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap bg-white px-2 py-1 rounded-md border font-medium">
                              {catFiles.length} / {cat.max}
                            </span>
                          </div>

                          {attachmentErrors[cat.id] && (
                            <p className="text-sm font-medium text-red-500 mt-1">
                              {attachmentErrors[cat.id]}
                            </p>
                          )}
                          {catFiles.length < cat.max && (
                            <label
                              htmlFor={`file-upload-${cat.id}`}
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${dragActiveId === cat.id ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'}`}
                              onDrop={(e) => handleDrop(e, cat.id)}
                              onDragOver={(e) => handleDragOver(e, cat.id)}
                              onDragLeave={handleDragLeave}
                            >
                              <UploadCloud
                                className={`h-8 w-8 ${dragActiveId === cat.id ? 'text-primary' : 'text-slate-400'}`}
                              />
                              <div className="text-sm font-medium mt-1">
                                Clique ou arraste{' '}
                                {cat.max > 1 ? 'arquivos aqui' : 'um arquivo aqui'}
                              </div>
                              <div className="text-xs text-muted-foreground">{cat.helperText}</div>
                            </label>
                          )}

                          {catFiles.length > 0 && (
                            <div className="space-y-2 mt-3">
                              {catFiles.map((f) => (
                                <div
                                  key={f.id}
                                  className={`flex items-center gap-3 p-2.5 border rounded-md shadow-sm ${f.status === 'error' || f.status === 'lost' ? 'border-red-200 bg-red-50/50' : 'bg-white'}`}
                                >
                                  <div className="bg-slate-100 p-1.5 rounded shrink-0">
                                    <FileIcon className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <p className="text-sm font-medium truncate pr-4">{f.name}</p>
                                      <span className="text-[10px] text-slate-500 shrink-0">
                                        {formatSize(f.size)}
                                      </span>
                                    </div>

                                    {f.status === 'uploading' && (
                                      <div className="space-y-1">
                                        <Progress value={f.progress} className="h-1" />
                                        <p className="text-[10px] text-slate-500">Enviando...</p>
                                      </div>
                                    )}

                                    {f.status === 'success' && (
                                      <div className="flex items-center gap-1 text-green-600 text-[10px] font-medium">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Enviado
                                      </div>
                                    )}

                                    {(f.status === 'error' || f.status === 'lost') && (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium">
                                          <AlertCircle className="h-3 w-3" />
                                          {f.errorMessage}
                                        </div>
                                        {f.errorCount < 3 && f.status === 'error' && (
                                          <button
                                            type="button"
                                            onClick={() => retryUpload(f)}
                                            className="text-[10px] text-red-600 underline flex items-center gap-1 w-fit hover:text-red-700"
                                          >
                                            <RefreshCw className="h-2.5 w-2.5" /> Tentar novamente
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(f.id)}
                                    className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-slate-50/50 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/meus-chamados')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              {files.some((f) => f.status !== 'success') && files.length > 0 && (
                <span className="text-sm text-amber-600 font-medium hidden sm:inline-block">
                  Aguarde o envio dos anexos
                </span>
              )}
              <Button type="submit" disabled={isSubmitDisabled}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Abrindo...
                  </>
                ) : (
                  'Abrir Chamado'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
