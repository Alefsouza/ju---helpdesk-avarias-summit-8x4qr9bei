import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

export function useDocumentAction() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleDocumentAction = async (
    id: string,
    url: string,
    nomeArquivo: string,
    action: 'view' | 'download',
  ) => {
    try {
      setLoadingAction(`${id}-${action}`)
      let finalUrl = url

      // Tenta gerar Signed URL se for arquivo do Supabase Storage
      if (finalUrl.includes('/storage/v1/object/public/')) {
        const parts = finalUrl.split('/public/')
        if (parts.length === 2) {
          const pathParts = parts[1].split('/')
          const bucketName = pathParts[0]
          const filePathWithQuery = pathParts.slice(1).join('/')
          const filePath = filePathWithQuery.split('?')[0]

          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600)

          if (!error && data?.signedUrl) {
            finalUrl = data.signedUrl
          }
        }
      }

      if (action === 'view') {
        toast.info('Abrindo documento...')
      } else {
        toast.info('Download iniciado...')
      }

      const cacheBuster = `cb=${Date.now()}`
      finalUrl = finalUrl.includes('?')
        ? `${finalUrl}&${cacheBuster}`
        : `${finalUrl}?${cacheBuster}`

      let blob: Blob | null = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(finalUrl)
          if (!response.ok) throw new Error('Falha no fetch')
          blob = await response.blob()
          break
        } catch (err) {
          attempts++
          if (attempts >= maxAttempts) throw err
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (!blob) {
        toast.error('Erro ao processar arquivo')
        return
      }

      const blobUrl = URL.createObjectURL(blob)

      if (action === 'view') {
        window.open(blobUrl, '_blank')
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } else {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = nomeArquivo || 'documento'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      }
    } catch (error) {
      console.error('Erro ao acessar o documento:', error)
      toast.error('Erro ao baixar arquivo. Tente novamente')
    } finally {
      setLoadingAction(null)
    }
  }

  return {
    handleDocumentAction,
    loadingAction,
  }
}
