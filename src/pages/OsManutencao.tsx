import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Download,
  Search,
  Wrench,
  CheckCircle,
  Camera,
  Loader2,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface OsManutencaoProps {
  garagemFilter?: string
  title?: string
}

interface GroupedOs {
  numero_os: string
  ids: string[]
  records: any[]
  data: string | null
  horario: string | null
  numero_carro: string | null
  nome_responsavel: string | null
  registro_responsavel: string | null
  nome_motorista: string | null
  registro_motorista: string | null
  garagem: string | null
  linha: string | null
  descricao_danos: string | null
  ocorrencia: string | null
  status_liberacao: string | null
  arquivo_url: string | null
  foto_url: string | null
  fotos_urls: string[]
  fotos_manutencao: string[]
  fotos_requisicao: string[]
  chamado_id: string | null
  mostRecentRecord: any
}

const normArr = (v: any): string[] => {
  if (!v) return []
  if (Array.isArray(v)) return v.filter((x: any) => typeof x === 'string' && x.trim() !== '')
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.filter((x: any) => typeof x === 'string')
    } catch {
      return [v]
    }
  }
  return []
}

const pickMostRecent = (records: any[]): any => {
  if (records.length === 0) return null
  return [...records].sort((a, b) => {
    const da = new Date(a.atualizado_em || a.criado_em || 0).getTime()
    const db = new Date(b.atualizado_em || b.criado_em || 0).getTime()
    return db - da
  })[0]
}

const pickBestDescription = (
  records: any[],
  field: 'descricao_danos' | 'ocorrencia',
): string | null => {
  const values = records
    .map((r) => r[field])
    .filter((v) => v && typeof v === 'string' && v.trim() !== '')
  if (values.length === 0) return null
  const unique = Array.from(new Set(values.map((v) => v.trim())))
  if (unique.length === 1) return unique[0]
  return unique.join('\n---\n')
}

const groupByOs = (docs: any[]): GroupedOs[] => {
  const map = new Map<string, any[]>()

  for (const doc of docs) {
    const os = (doc.numero_os || '').toString().trim()
    if (!os) {
      const key = `__no_os_${doc.id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
      continue
    }
    if (!map.has(os)) map.set(os, [])
    map.get(os)!.push(doc)
  }

  const groups: GroupedOs[] = []

  for (const [os, records] of Array.from(map.entries())) {
    const mostRecent = pickMostRecent(records)

    const fotos_urls = Array.from(new Set(records.flatMap((r) => normArr(r.fotos_urls))))
    const fotos_manutencao = Array.from(
      new Set(records.flatMap((r) => normArr(r.fotos_manutencao))),
    )
    const fotos_requisicao = Array.from(
      new Set(records.flatMap((r) => normArr(r.fotos_requisicao))),
    )
    const foto_urls = records.map((r) => r.foto_url).filter((v) => v && typeof v === 'string')
    const unique_foto_url = foto_urls.length > 0 ? foto_urls[0] : null

    const merged_fotos_urls = Array.from(new Set([...fotos_urls, ...foto_urls]))

    const descricao_danos = pickBestDescription(records, 'descricao_danos')
    const ocorrencia = pickBestDescription(records, 'ocorrencia')

    const status_liberacao =
      records.map((r) => r.status_liberacao).find((v) => v && typeof v === 'string') ||
      mostRecent?.status_liberacao ||
      null

    const arquivo_url =
      records.map((r) => r.arquivo_url).find((v) => v && typeof v === 'string' && v !== '') || null

    groups.push({
      numero_os: os.startsWith('__no_os_') ? '' : os,
      ids: records.map((r) => r.id),
      records,
      data: mostRecent?.data || null,
      horario: mostRecent?.horario || null,
      numero_carro:
        records.map((r) => r.numero_carro).find((v) => v && typeof v === 'string') ||
        mostRecent?.numero_carro ||
        null,
      nome_responsavel:
        records.map((r) => r.nome_responsavel).find((v) => v && typeof v === 'string') ||
        mostRecent?.nome_responsavel ||
        null,
      registro_responsavel:
        records.map((r) => r.registro_responsavel).find((v) => v && typeof v === 'string') ||
        mostRecent?.registro_responsavel ||
        null,
      nome_motorista:
        records.map((r) => r.nome_motorista).find((v) => v && typeof v === 'string') ||
        mostRecent?.nome_motorista ||
        null,
      registro_motorista:
        records.map((r) => r.registro_motorista).find((v) => v && typeof v === 'string') ||
        mostRecent?.registro_motorista ||
        null,
      garagem: mostRecent?.garagem || null,
      linha:
        records.map((r) => r.linha).find((v) => v && typeof v === 'string') ||
        mostRecent?.linha ||
        null,
      descricao_danos,
      ocorrencia,
      status_liberacao,
      arquivo_url,
      foto_url: unique_foto_url,
      fotos_urls: merged_fotos_urls,
      fotos_manutencao,
      fotos_requisicao,
      chamado_id: mostRecent?.chamado_id || null,
      mostRecentRecord: mostRecent,
    })
  }

  groups.sort((a, b) => {
    const da = new Date(
      a.mostRecentRecord?.atualizado_em || a.mostRecentRecord?.criado_em || 0,
    ).getTime()
    const db = new Date(
      b.mostRecentRecord?.atualizado_em || b.mostRecentRecord?.criado_em || 0,
    ).getTime()
    return db - da
  })

  return groups
}

export default function OsManutencao({
  garagemFilter = 'Cursino',
  title = 'OS - Manutenção',
}: OsManutencaoProps) {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [docToRelease, setDocToRelease] = useState<GroupedOs | null>(null)
  const [isReleasing, setIsReleasing] = useState(false)
  const [viewDoc, setViewDoc] = useState<GroupedOs | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<GroupedOs | null>(null)
  const [numeroOS, setNumeroOS] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false)
  const [duplicateSubmitAction, setDuplicateSubmitAction] = useState<(() => void) | null>(null)
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false)
  const [photoManagerDoc, setPhotoManagerDoc] = useState<GroupedOs | null>(null)

  const [stagedNewPhotos, setStagedNewPhotos] = useState<File[]>([])
  const [stagedNewPhotoUrls, setStagedNewPhotoUrls] = useState<string[]>([])
  const [stagedDeletedPhotos, setStagedDeletedPhotos] = useState<string[]>([])

  const [stagedNewPhotosReq, setStagedNewPhotosReq] = useState<File[]>([])
  const [stagedNewPhotoUrlsReq, setStagedNewPhotoUrlsReq] = useState<string[]>([])
  const [stagedDeletedPhotosReq, setStagedDeletedPhotosReq] = useState<string[]>([])

  const [isSavingPhotos, setIsSavingPhotos] = useState(false)

  const [isStandaloneUploadOpen, setIsStandaloneUploadOpen] = useState(false)
  const [standaloneOS, setStandaloneOS] = useState('')
  const [standalonePhotos, setStandalonePhotos] = useState<File[]>([])
  const [standalonePhotoUrls, setStandalonePhotoUrls] = useState<string[]>([])
  const [isUploadingStandalone, setIsUploadingStandalone] = useState(false)
  const standaloneFileInputRef = useRef<HTMLInputElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const groupedDocs = useMemo(() => groupByOs(documentos), [documentos])

  const fetchDocumentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select('*, chamados(carro)')
        .in('tipo_documento', ['Vistoria', 'Espelho de Danos', 'OS de Manutenção'])
        .not('numero_os', 'is', null)
        .neq('numero_os', '')
        .neq('excluido_manutencao' as any, true)
        .ilike('garagem', garagemFilter)
        .order('criado_em', { ascending: false })

      if (error) throw error

      setDocumentos(data || [])
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseStandalone = () => {
    setIsStandaloneUploadOpen(false)
    setStandaloneOS('')
    setStandalonePhotos([])
    standalonePhotoUrls.forEach((url) => URL.revokeObjectURL(url))
    setStandalonePhotoUrls([])
  }

  const handleStandalonePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newFiles = Array.from(files)
    const newUrls = newFiles.map((file) => URL.createObjectURL(file))
    setStandalonePhotos((prev) => [...prev, ...newFiles])
    setStandalonePhotoUrls((prev) => [...prev, ...newUrls])
    if (e.target) e.target.value = ''
  }

  const handleRemoveStandalonePhoto = (index: number) => {
    setStandalonePhotos((prev) => prev.filter((_, i) => i !== index))
    setStandalonePhotoUrls((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index])
      updated.splice(index, 1)
      return updated
    })
  }

  const handleSubmitStandalone = async () => {
    if (!standaloneOS.trim() || standalonePhotos.length === 0) return

    setIsUploadingStandalone(true)
    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < standalonePhotos.length; i++) {
        const file = standalonePhotos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `os_avulsa_${standaloneOS}_${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(fileName)
        uploadedUrls.push(publicUrlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('documentos').insert({
        numero_os: standaloneOS.trim(),
        tipo_documento: 'OS de Manutenção',
        nome_arquivo: `Evidencia_OS_${standaloneOS.trim()}`,
        arquivo_url: uploadedUrls[0],
        fotos_manutencao: uploadedUrls,
        garagem: garagemFilter,
      })

      if (insertError) throw insertError

      toast({
        title: 'Sucesso',
        description: 'Fotos enviadas com sucesso. Sincronização em andamento.',
      })

      handleCloseStandalone()
      fetchDocumentos()
    } catch (error: any) {
      console.error('Erro ao enviar fotos avulsas:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao enviar as fotos.',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingStandalone(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()

    const channelName = `documentos_os_changes_${garagemFilter}`
    const channel = supabase
      .channel(channelName)
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [garagemFilter])

  const filteredDocs = groupedDocs.filter(
    (doc) =>
      doc.numero_os?.toLowerCase().includes(search.toLowerCase()) ||
      doc.numero_carro?.toLowerCase().includes(search.toLowerCase()) ||
      doc.nome_responsavel?.toLowerCase().includes(search.toLowerCase()) ||
      doc.descricao_danos?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDownload = (url: string | null, e: React.MouseEvent) => {
    e.preventDefault()
    if (!url) return
    const downloadUrl = url + (url.includes('?') ? '&download=' : '?download=')
    window.open(downloadUrl, '_blank')
  }

  const handleOpenPhotoManager = (doc: GroupedOs) => {
    setPhotoManagerDoc(doc)
    setStagedNewPhotos([])
    setStagedNewPhotoUrls([])
    setStagedDeletedPhotos([])
    setStagedNewPhotosReq([])
    setStagedNewPhotoUrlsReq([])
    setStagedDeletedPhotosReq([])
    setIsPhotoManagerOpen(true)
  }

  const handleClosePhotoManager = () => {
    if (isSavingPhotos) return
    setIsPhotoManagerOpen(false)
    setPhotoManagerDoc(null)
    setStagedNewPhotos([])
    stagedNewPhotoUrls.forEach((url) => URL.revokeObjectURL(url))
    setStagedNewPhotoUrls([])
    setStagedDeletedPhotos([])
    setStagedNewPhotosReq([])
    stagedNewPhotoUrlsReq.forEach((url) => URL.revokeObjectURL(url))
    setStagedNewPhotoUrlsReq([])
    setStagedDeletedPhotosReq([])
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const newUrls = newFiles.map((file) => URL.createObjectURL(file))

    setStagedNewPhotos((prev) => [...prev, ...newFiles])
    setStagedNewPhotoUrls((prev) => [...prev, ...newUrls])

    if (e.target) e.target.value = ''
  }

  const handlePhotoSelectReq = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const newUrls = newFiles.map((file) => URL.createObjectURL(file))

    setStagedNewPhotosReq((prev) => [...prev, ...newFiles])
    setStagedNewPhotoUrlsReq((prev) => [...prev, ...newUrls])

    if (e.target) e.target.value = ''
  }

  const handleRemoveStagedNew = (index: number) => {
    setStagedNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setStagedNewPhotoUrls((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index])
      updated.splice(index, 1)
      return updated
    })
  }

  const handleRemoveStagedNewReq = (index: number) => {
    setStagedNewPhotosReq((prev) => prev.filter((_, i) => i !== index))
    setStagedNewPhotoUrlsReq((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index])
      updated.splice(index, 1)
      return updated
    })
  }

  const handleStageDeleteExisting = (url: string) => {
    setStagedDeletedPhotos((prev) => [...prev, url])
  }

  const handleStageDeleteExistingReq = (url: string) => {
    setStagedDeletedPhotosReq((prev) => [...prev, url])
  }

  const handleSavePhotos = async () => {
    if (!photoManagerDoc) return

    setIsSavingPhotos(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || null

      const uploadedUrlsManutencao: string[] = []
      for (let i = 0; i < stagedNewPhotos.length; i++) {
        const file = stagedNewPhotos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `os_foto_${photoManagerDoc.numero_os}_${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(fileName)
        uploadedUrlsManutencao.push(publicUrlData.publicUrl)
      }

      const uploadedUrlsReq: string[] = []
      for (let i = 0; i < stagedNewPhotosReq.length; i++) {
        const file = stagedNewPhotosReq[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `os_req_${photoManagerDoc.numero_os}_${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(fileName)
        uploadedUrlsReq.push(publicUrlData.publicUrl)
      }

      const allDeletions = [...stagedDeletedPhotos, ...stagedDeletedPhotosReq]
      for (const url of allDeletions) {
        try {
          const pathParts = url.split('/public/documentos/')
          if (pathParts.length > 1) {
            const filePath = pathParts[1]
            await supabase.storage.from('documentos').remove([filePath])
          }
        } catch (e) {
          console.error('Failed to delete from storage', e)
        }
      }

      const existingFotosManutencao = photoManagerDoc.fotos_manutencao
      const keptFotosManutencao = existingFotosManutencao.filter(
        (url: string) => !stagedDeletedPhotos.includes(url),
      )
      const finalFotosManutencao = [...keptFotosManutencao, ...uploadedUrlsManutencao]

      const existingReq = photoManagerDoc.fotos_requisicao
      const keptReq = existingReq.filter((url: string) => !stagedDeletedPhotosReq.includes(url))
      const finalFotosReq = [...keptReq, ...uploadedUrlsReq]

      const { error: updateError } = await supabase
        .from('documentos')
        .update({
          fotos_manutencao: finalFotosManutencao,
          fotos_requisicao: finalFotosReq,
          atualizado_em: new Date().toISOString(),
        })
        .in('id', photoManagerDoc.ids)

      if (updateError) throw updateError

      if (photoManagerDoc.chamado_id && userId) {
        if (
          (stagedDeletedPhotos.length > 0 && uploadedUrlsManutencao.length === 0) ||
          (stagedDeletedPhotosReq.length > 0 && uploadedUrlsReq.length === 0)
        ) {
          await supabase.from('historico_chamado').insert({
            chamado_id: photoManagerDoc.chamado_id,
            acao: 'respondido',
            usuario_id: userId,
            detalhes: 'Arquivos/Evidências removidas do espelho de danos.',
          })
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Arquivos salvos com sucesso.',
      })

      setDocumentos((docs) =>
        docs.map((d) => {
          if (!photoManagerDoc.ids.includes(d.id)) return d
          return {
            ...d,
            fotos_manutencao: finalFotosManutencao,
            fotos_requisicao: finalFotosReq,
          }
        }),
      )

      handleClosePhotoManager()
    } catch (error: any) {
      console.error('Erro ao salvar arquivos:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar arquivos.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingPhotos(false)
    }
  }

  const handleRelease = async (status: string) => {
    if (!docToRelease) return
    try {
      setIsReleasing(true)

      for (const id of docToRelease.ids) {
        const { error } = await supabase.rpc('liberar_veiculo_manutencao' as any, {
          p_id: id,
          p_status: status,
        })
        if (error) throw error
      }

      toast({
        title: 'Sucesso',
        description: `Veículo marcado como: ${status}`,
      })

      setDocumentos((docs) => {
        if (status === 'Liberado com Pendência') {
          return docs.map((d) =>
            docToRelease.ids.includes(d.id) ? { ...d, status_liberacao: status } : d,
          )
        }
        return docs.filter((d) => !docToRelease.ids.includes(d.id))
      })
    } catch (error: any) {
      console.error('Erro ao ocultar documento:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao liberar o veículo.',
        variant: 'destructive',
      })
    } finally {
      setIsReleasing(false)
      setDocToRelease(null)
    }
  }

  const handleOpenModal = (doc: GroupedOs) => {
    setSelectedDoc(doc)
    setNumeroOS(doc.numero_os || '')
    setIsModalOpen(true)
    setViewDoc(null)
  }

  const handleCloseModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setSelectedDoc(null)
    setNumeroOS('')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const handleSaveOS = async (ignoreDuplicate = false) => {
    if (!numeroOS.trim()) {
      toast({
        title: 'Atenção',
        description: 'O número da OS é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedDoc) return

    setIsSaving(true)
    try {
      if (!ignoreDuplicate && selectedDoc.numero_carro) {
        const { data: duplicates } = await supabase
          .from('documentos')
          .select('id')
          .eq('numero_carro', selectedDoc.numero_carro)
          .eq('excluido_manutencao', false)
          .in('tipo_documento', ['Espelho de Danos', 'Vistoria', 'OS de Manutenção'])
          .not('id', 'in', `(${selectedDoc.ids.map((id) => `"${id}"`).join(',')})`)

        if (duplicates && duplicates.length > 0) {
          setDuplicateSubmitAction(() => () => handleSaveOS(true))
          setDuplicateAlertOpen(true)
          setIsSaving(false)
          return
        }
      }

      const primaryDoc = selectedDoc.mostRecentRecord

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
        body: {
          id: primaryDoc?.id,
          garagem: selectedDoc.garagem,
          linha: selectedDoc.linha,
          numero_carro: selectedDoc.numero_carro,
          data: formatDate(selectedDoc.data),
          horario: selectedDoc.horario,
          ocorrencia: selectedDoc.ocorrencia,
          descricao_danos: selectedDoc.descricao_danos,
          numero_os: numeroOS.trim(),
          nome_vistoriador: selectedDoc.nome_responsavel,
          registro_vistoriador: selectedDoc.registro_responsavel,
          nome_motorista: selectedDoc.nome_motorista,
          registro_motorista: selectedDoc.registro_motorista,
          fotos:
            selectedDoc.fotos_urls.length > 0
              ? selectedDoc.fotos_urls
              : selectedDoc.foto_url
                ? [selectedDoc.foto_url]
                : [],
        },
      })

      if (pdfError) throw pdfError
      if (!pdfData || !pdfData.success) throw new Error(pdfData?.error || 'Erro ao gerar PDF')

      const { url, nome_arquivo } = pdfData

      const { data: updatedDoc, error } = await supabase
        .from('documentos')
        .update({
          numero_os: numeroOS.trim(),
          arquivo_url: url,
          nome_arquivo: nome_arquivo || `Espelho_Danos_OS_${numeroOS.trim()}.pdf`,
          tipo_documento: 'Espelho de Danos',
        })
        .in('id', selectedDoc.ids)
        .select()
        .maybeSingle()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Número da OS atualizado e PDF gerado com sucesso.',
      })

      setDocumentos((docs) =>
        docs.map((d) =>
          selectedDoc.ids.includes(d.id)
            ? { ...d, numero_os: numeroOS.trim(), arquivo_url: url }
            : d,
        ),
      )

      handleCloseModal()
    } catch (error: any) {
      console.error('Erro ao salvar OS:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o número da OS.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Listagem de Ordens de Serviço - Avarias
              </h2>
              <p className="text-slate-500 mt-1">
                Acompanhamento público das Ordens de Serviço preenchidas na vistoria.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar OS, carro, vistoriador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[120px] font-semibold">OS</TableHead>
                      <TableHead className="w-[160px] font-semibold">Data e Hora</TableHead>
                      <TableHead className="w-[120px] font-semibold">Carro</TableHead>
                      <TableHead className="w-[200px] font-semibold">Vistoriador</TableHead>
                      <TableHead className="min-w-[300px] font-semibold">Descrição</TableHead>
                      <TableHead className="w-[160px] text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-9 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-24 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Wrench className="h-8 w-8 text-slate-300" />
                            <p>Nenhuma OS registrada no momento</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocs.map((doc) => (
                        <TableRow
                          key={doc.numero_os || doc.ids[0]}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-sm bg-white">
                              {doc.numero_os}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-medium">
                                {doc.data ? format(parseISO(doc.data), 'dd/MM/yyyy') : '-'}
                              </span>
                              <span className="text-sm text-slate-500">{doc.horario || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700">
                              {doc.numero_carro || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.nome_responsavel || '-'}</span>
                              {doc.registro_responsavel && (
                                <span className="text-xs text-slate-500">
                                  RE: {doc.registro_responsavel}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="whitespace-pre-wrap text-sm text-slate-600 break-words leading-relaxed py-2">
                              {doc.descricao_danos || doc.ocorrencia || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={() => setViewDoc(doc)}
                                title="Visualizar documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={(e) => handleDownload(doc.arquivo_url, e)}
                                disabled={!doc.arquivo_url}
                                title="Baixar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="relative inline-block">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleOpenPhotoManager(doc)}
                                  title="Gerenciar Fotos de Manutenção"
                                >
                                  <Camera className="h-4 w-4" />
                                </Button>
                                {doc.fotos_manutencao.length > 0 && (
                                  <span
                                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 border border-white"
                                    title={`${doc.fotos_manutencao.length} foto(s) anexada(s)`}
                                  >
                                    {doc.fotos_manutencao.length}
                                  </span>
                                )}
                              </div>
                              {doc.status_liberacao === 'Liberado com Pendência' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-8 w-8 text-amber-500 bg-amber-50 rounded-md cursor-help mr-1">
                                      <AlertCircle className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Este veículo foi liberado, mas possui pendências de manutenção
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50"
                                onClick={() => setDocToRelease(doc)}
                                title="Liberar Veículo"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />

        <input
          id="req-file-input"
          type="file"
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handlePhotoSelectReq}
        />

        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          ref={standaloneFileInputRef}
          style={{ display: 'none' }}
          onChange={handleStandalonePhotoSelect}
        />
      </main>

      <Dialog
        open={isStandaloneUploadOpen}
        onOpenChange={(open) => !open && !isUploadingStandalone && handleCloseStandalone()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Anexar Fotos Avulsas por OS</DialogTitle>
            <DialogDescription>
              Insira o número da Ordem de Serviço e anexe as fotos de manutenção. Elas serão
              vinculadas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="standalone-os">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="standalone-os"
                value={standaloneOS}
                onChange={(e) => setStandaloneOS(e.target.value)}
                placeholder="Ex: 12345"
                disabled={isUploadingStandalone}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>
                  Fotos <span className="text-red-500">*</span>
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => standaloneFileInputRef.current?.click()}
                  disabled={isUploadingStandalone}
                >
                  <Camera className="mr-2 h-4 w-4" /> Selecionar
                </Button>
              </div>

              {standalonePhotoUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {standalonePhotoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-md overflow-hidden bg-slate-100 border group"
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveStandalonePhoto(idx)}
                        disabled={isUploadingStandalone}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed mt-2">
                  <p className="text-sm">Nenhuma foto selecionada</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseStandalone}
              disabled={isUploadingStandalone}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitStandalone}
              disabled={
                isUploadingStandalone || !standaloneOS.trim() || standalonePhotos.length === 0
              }
              className="bg-[#1A522E] hover:bg-[#154224] text-white"
            >
              {isUploadingStandalone ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                'Enviar Fotos'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detalhes da OS</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#333333] font-bold mb-1">Número da OS</p>
                  <p className="text-[#333333]">{viewDoc.numero_os || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Garagem</p>
                  <p className="text-[#333333]">{viewDoc.garagem || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Linha</p>
                  <p className="text-[#333333]">{viewDoc.linha || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Carro</p>
                  <p className="text-[#333333]">{viewDoc.numero_carro || '-'}</p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Data / Horário</p>
                  <p className="text-[#333333]">
                    {formatDate(viewDoc.data)} {viewDoc.horario ? `às ${viewDoc.horario}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Vistoriador</p>
                  <p className="text-[#333333]">
                    {viewDoc.nome_responsavel || '-'}
                    {viewDoc.registro_responsavel ? ` (${viewDoc.registro_responsavel})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Motorista</p>
                  <p className="text-[#333333]">
                    {viewDoc.nome_motorista || '-'}
                    {viewDoc.registro_motorista ? ` (${viewDoc.registro_motorista})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[#333333] font-bold mb-1">Registros Agrupados</p>
                  <p className="text-[#333333]">{viewDoc.records.length}</p>
                </div>
              </div>

              <div>
                <p className="text-[#333333] font-bold mb-1 text-sm">Ocorrência</p>
                <div className="text-sm text-[#333333] whitespace-pre-wrap">
                  {viewDoc.ocorrencia || '-'}
                </div>
              </div>

              <div>
                <p className="text-[#333333] font-bold mb-1 text-sm">Descrição dos Danos</p>
                <div className="text-sm text-[#333333] whitespace-pre-wrap">
                  {viewDoc.descricao_danos || '-'}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1">
                    Fotos da Vistoria ({viewDoc.fotos_urls.length})
                  </p>
                  {viewDoc.fotos_urls.length === 0 ? (
                    <p className="text-sm text-[#333333] italic">Nenhuma foto anexada.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {viewDoc.fotos_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          <img
                            src={url}
                            alt={`Foto Vistoria ${idx + 1}`}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1">
                    Evidências de Manutenção ({viewDoc.fotos_manutencao.length})
                  </p>
                  {viewDoc.fotos_manutencao.length === 0 ? (
                    <p className="text-sm text-[#333333] italic">Nenhuma foto anexada.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {viewDoc.fotos_manutencao.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          {url.toLowerCase().endsWith('.pdf') ? (
                            <div className="flex items-center justify-center w-full h-full bg-slate-200">
                              <span className="text-xs font-bold text-slate-500">PDF</span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Evidência Manutenção ${idx + 1}`}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {viewDoc.fotos_requisicao.length > 0 && (
                  <div>
                    <p className="text-[#333333] font-bold mb-3 text-sm border-b pb-1 mt-4">
                      Requisições Anexadas ({viewDoc.fotos_requisicao.length})
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {viewDoc.fotos_requisicao.map((url, idx) => (
                        <a
                          key={`req-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-video bg-slate-100 rounded-md overflow-hidden border group"
                        >
                          {url.toLowerCase().endsWith('.pdf') ? (
                            <div className="flex items-center justify-center w-full h-full bg-slate-200">
                              <span className="text-xs font-bold text-slate-500">PDF</span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Requisição ${idx + 1}`}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setViewDoc(null)}
              className="bg-white border-[#333333] text-[#333333] hover:bg-slate-50"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Preencher Número da OS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="os">
                Número da OS <span className="text-red-500">*</span>
              </Label>
              <Input
                id="os"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                placeholder="Ex: 12345"
                type="number"
                disabled={isSaving}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveOS(false)
                  }
                }}
              />
            </div>
            {selectedDoc && (
              <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-md border mt-2 space-y-1">
                <p>
                  <strong>Garagem:</strong> {selectedDoc.garagem || '-'}
                </p>
                <p>
                  <strong>Linha:</strong> {selectedDoc.linha || '-'}
                </p>
                <p>
                  <strong>Carro:</strong> {selectedDoc.numero_carro || '-'}
                </p>
                <p>
                  <strong>Data:</strong> {formatDate(selectedDoc.data)}
                </p>
                <p className="line-clamp-2" title={selectedDoc.descricao_danos || ''}>
                  <strong>Danos:</strong> {truncateText(selectedDoc.descricao_danos, 80)}
                </p>
                {selectedDoc.records.length > 1 && (
                  <p>
                    <strong>Registros agrupados:</strong> {selectedDoc.records.length}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleSaveOS(false)}
              disabled={isSaving}
              className="bg-[#1A522E] hover:bg-[#154224] text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Concluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateAlertOpen} onOpenChange={setDuplicateAlertOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atenção</DialogTitle>
            <DialogDescription>
              Já existe um espelho de danos para esse carro, por favor verificar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateAlertOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setDuplicateAlertOpen(false)
                if (duplicateSubmitAction) duplicateSubmitAction()
                setDuplicateSubmitAction(null)
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Prosseguir mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!docToRelease}
        onOpenChange={(open) => !open && !isReleasing && setDocToRelease(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Liberar Veículo</DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              Esta ação irá remover a Ordem de Serviço da lista de manutenção. Selecione a condição
              de liberação:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleRelease('Liberado (Sem Pendências)')}
              disabled={isReleasing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-base"
            >
              {isReleasing ? 'Processando...' : 'Liberado (Sem Pendências)'}
            </Button>
            <Button
              onClick={() => handleRelease('Liberado com Pendência')}
              disabled={isReleasing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 text-base"
            >
              {isReleasing ? 'Processando...' : 'Liberado com Pendência'}
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocToRelease(null)}
              disabled={isReleasing}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoManagerOpen} onOpenChange={(open) => !open && handleClosePhotoManager()}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Fotos de Manutenção</DialogTitle>
            <DialogDescription>
              Adicione ou remova fotos de evidência de manutenção para esta OS. Clique em "Salvar"
              para confirmar as alterações.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-8 py-4 pr-1">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  OS: {photoManagerDoc?.numero_os || '-'}
                </p>
                <p className="text-xs text-slate-500">
                  Carro: {photoManagerDoc?.numero_carro || '-'} • Registros:{' '}
                  {photoManagerDoc?.records.length || 0}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-slate-800">Fotos do Carro</h3>
                  <p className="text-xs text-slate-500">
                    Fotos anexadas sincronizam com todos os registros da OS
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSavingPhotos}
                >
                  <Camera className="mr-2 h-4 w-4" /> Adicionar Fotos
                </Button>
              </div>

              {(() => {
                const existingFotos = photoManagerDoc?.fotos_manutencao || []
                const activeExistingFotos = existingFotos.filter(
                  (url: string) => !stagedDeletedPhotos.includes(url),
                )

                if (activeExistingFotos.length === 0 && stagedNewPhotoUrls.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
                      <Camera className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                      <p className="text-sm">Nenhuma foto de manutenção para exibir.</p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {activeExistingFotos.map((url: string, idx: number) => (
                      <div
                        key={`existing-${idx}`}
                        className="relative group aspect-square rounded-md overflow-hidden bg-slate-100 border"
                      >
                        {url.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center justify-center w-full h-full bg-slate-200">
                            <span className="text-xs font-bold text-slate-500">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Evidência Existente ${idx + 1}`}
                            className="object-cover w-full h-full"
                          />
                        )}
                        <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStageDeleteExisting(url)
                            }}
                            disabled={isSavingPhotos}
                            title="Remover foto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {stagedNewPhotoUrls.map((url: string, idx: number) => (
                      <div
                        key={`new-${idx}`}
                        className="relative group aspect-square rounded-md overflow-hidden bg-blue-50 border-2 border-blue-200 border-dashed"
                      >
                        <img
                          src={url}
                          alt={`Nova Evidência ${idx + 1}`}
                          className="object-cover w-full h-full opacity-90"
                        />
                        <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveStagedNew(idx)
                            }}
                            disabled={isSavingPhotos}
                            title="Descartar nova foto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                          Nova
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-slate-800">Anexar Requisição</h3>
                  <p className="text-xs text-slate-500">
                    Requisições internas (sincronizam com todos os registros da OS)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('req-file-input')?.click()}
                  disabled={isSavingPhotos}
                >
                  <Camera className="mr-2 h-4 w-4" /> Adicionar Requisição
                </Button>
              </div>

              {(() => {
                const existingReq = photoManagerDoc?.fotos_requisicao || []
                const activeExistingReq = existingReq.filter(
                  (url: string) => !stagedDeletedPhotosReq.includes(url),
                )

                if (activeExistingReq.length === 0 && stagedNewPhotoUrlsReq.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
                      <FileText className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                      <p className="text-sm">Nenhuma requisição anexada.</p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {activeExistingReq.map((url: string, idx: number) => (
                      <div
                        key={`req-existing-${idx}`}
                        className="relative group aspect-square rounded-md overflow-hidden bg-slate-100 border"
                      >
                        {url.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center justify-center w-full h-full bg-slate-200">
                            <span className="text-xs font-bold text-slate-500">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Requisição Existente ${idx + 1}`}
                            className="object-cover w-full h-full"
                          />
                        )}
                        <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStageDeleteExistingReq(url)
                            }}
                            disabled={isSavingPhotos}
                            title="Remover requisição"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {stagedNewPhotoUrlsReq.map((url: string, idx: number) => (
                      <div
                        key={`req-new-${idx}`}
                        className="relative group aspect-square rounded-md overflow-hidden bg-purple-50 border-2 border-purple-200 border-dashed"
                      >
                        <img
                          src={url}
                          alt={`Nova Requisição ${idx + 1}`}
                          className="object-cover w-full h-full opacity-90"
                        />
                        <div className="absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveStagedNewReq(idx)
                            }}
                            disabled={isSavingPhotos}
                            title="Descartar nova requisição"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                          Nova
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClosePhotoManager} disabled={isSavingPhotos}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePhotos}
              disabled={isSavingPhotos}
              className="bg-primary text-primary-foreground"
            >
              {isSavingPhotos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
