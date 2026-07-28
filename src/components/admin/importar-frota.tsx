import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FileUp, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function ImportarFrota() {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Por favor, selecione um arquivo no formato Excel (.xlsx).')
      return
    }

    setIsUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
        reader.readAsDataURL(file)
      })

      const { data, error } = await supabase.functions.invoke('importar-frota-xlsx', {
        body: { fileBase64: base64 },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success(`Upload concluído! ${data.count} veículos processados.`)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao processar arquivo. Verifique o formato.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle>Importar Frota</CardTitle>
        <CardDescription>
          Faça o upload de uma planilha Excel (XLSX) contendo os dados da frota de veículos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">Instruções para o arquivo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                O arquivo deve ser no formato <strong>.xlsx</strong> (Excel).
              </li>
              <li>A primeira planilha (aba) do arquivo será processada.</li>
              <li>A primeira linha deve conter os cabeçalhos das colunas.</li>
              <li>
                Colunas obrigatórias: <strong>Prefixo</strong> (ou Carro) e <strong>Garagem</strong>
                .
              </li>
              <li>
                Coluna opcional: <strong>Placa</strong>.
              </li>
              <li>Veículos já existentes serão atualizados automaticamente com os novos dados.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center w-full">
          <label
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition-colors relative ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 mb-3 text-blue-600 animate-spin" />
                  <p className="mb-2 text-sm text-slate-500 font-medium">Processando arquivo...</p>
                </>
              ) : (
                <>
                  <FileUp className="w-10 h-10 mb-3 text-slate-400 group-hover:text-blue-500" />
                  <p className="mb-2 text-sm text-slate-600">
                    <span className="font-semibold text-blue-600">Clique para fazer upload</span> ou
                    arraste a planilha Excel
                  </p>
                  <p className="text-xs text-slate-500">Tamanho máximo: 10MB (Formato: .xlsx)</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
