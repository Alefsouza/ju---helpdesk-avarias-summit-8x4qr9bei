import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Camera, X, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { useDraft } from '@/hooks/use-draft'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const formSchema = z.object({
  numero_os: z.string().min(1, 'Campo obrigatório'),
  garagem: z.string().min(1, 'Selecione uma garagem'),
  ocorrencia: z.string().min(1, 'Selecione sim ou não'),
  linha: z.string().min(1, 'Campo obrigatório'),
  numero_carro: z.string().min(1, 'Campo obrigatório'),
  descricao_danos: z.string().min(1, 'Campo obrigatório'),
  registro_vistoriador: z.string().min(1, 'Campo obrigatório'),
  nome_vistoriador: z.string().min(1, 'Campo obrigatório'),
  registro_motorista: z.string().min(1, 'Campo obrigatório'),
  nome_motorista: z.string().min(1, 'Campo obrigatório'),
  fotos_dano: z.array(z.string()).min(1, 'Mínimo 1 foto obrigatória').max(5, 'Máximo 5 fotos'),
})

type FormValues = z.infer<typeof formSchema>

const processImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        } else {
          resolve(e.target?.result as string)
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function FormularioEspelhoDanos() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false)
  const [duplicateSubmitAction, setDuplicateSubmitAction] = useState<(() => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile, user } = useAuth()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_os: '',
      garagem: '',
      ocorrencia: '',
      linha: '',
      numero_carro: '',
      descricao_danos: '',
      registro_vistoriador: '',
      nome_vistoriador: '',
      registro_motorista: '',
      nome_motorista: '',
      fotos_dano: [],
    },
  })

  const draftKey = `draft-espelho-${id || 'new'}`
  const { draftRestored, clearDraft, setDraftRestored } = useDraft(form, draftKey)

  useEffect(() => {
    if (profile?.garagem) {
      form.setValue('garagem', profile.garagem)
    }
  }, [profile, form])

  async function onSubmit(values: FormValues, ignoreDuplicate = false) {
    if (!id) return
    setLoading(true)
    try {
      if (!ignoreDuplicate && values.numero_carro) {
        const { data: duplicates } = await supabase
          .from('documentos')
          .select('id')
          .eq('numero_carro', values.numero_carro)
          .eq('excluido_manutencao', false)
          .in('tipo_documento', ['Espelho de Danos', 'Vistoria'])

        if (duplicates && duplicates.length > 0) {
          setDuplicateSubmitAction(() => () => onSubmit(values, true))
          setDuplicateAlertOpen(true)
          setLoading(false)
          return
        }
      }

      const now = new Date()
      const dataStr = format(now, 'yyyy-MM-dd')
      const horarioStr = format(now, 'HH:mm')
      const espelhoId = crypto.randomUUID()

      const { fotos_dano, ...formValuesToSave } = values

      const { error: espelhoError } = await supabase.from('formularios_espelho_danos').insert({
        id: espelhoId,
        chamado_id: id,
        data: dataStr,
        horario: horarioStr,
        ...formValuesToSave,
      } as any)

      if (espelhoError) throw new Error('Erro ao salvar os dados do formulário')

      const fotosUrls: string[] = []

      if (values.fotos_dano && values.fotos_dano.length > 0) {
        for (let i = 0; i < values.fotos_dano.length; i++) {
          const foto = values.fotos_dano[i]
          const base64Data = foto.split(',')[1]
          const contentType = foto.split(';')[0].split(':')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: contentType })
          const fotoFileName = `${espelhoId}-espelho-danos-foto-${i + 1}.jpg`

          const { error: fotoUploadError } = await supabase.storage
            .from('documentos')
            .upload(fotoFileName, blob, { contentType, upsert: true })

          if (fotoUploadError) throw new Error(`Erro ao salvar a foto ${i + 1}. Tente novamente`)

          const { data: publicFotoUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(fotoFileName)

          fotosUrls.push(publicFotoUrlData.publicUrl)
        }
      }

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('gerar-pdf', {
        body: {
          tipo_documento: 'espelho_danos',
          id: id,
          ...formValuesToSave,
          fotos: fotosUrls,
          espelho_id: espelhoId,
        },
      })

      if (pdfError || !pdfData?.success)
        throw new Error('Erro ao gerar documento PDF. Tente novamente.')

      const fileName = pdfData.nome_arquivo
      const fileUrl = `${pdfData.url}?t=${Date.now()}`

      const { error: rpcError } = await (supabase.rpc as any)('registrar_espelho_danos', {
        p_chamado_id: id,
        p_nome_arquivo: fileName,
        p_arquivo_url: fileUrl,
        p_tamanho_bytes: 0,
      })

      if (rpcError) throw new Error('Erro ao registrar documento interno. Tente novamente')

      const { error: docError } = await supabase.from('documentos').insert({
        tipo_documento: 'Espelho de Danos',
        nome_arquivo: fileName,
        arquivo_url: fileUrl,
        registro_responsavel: values.registro_vistoriador,
        nome_responsavel: values.nome_vistoriador,
        registro_motorista: values.registro_motorista,
        nome_motorista: values.nome_motorista,
        numero_os: values.numero_os,
        linha: values.linha,
        numero_carro: values.numero_carro,
        data: dataStr,
        horario: horarioStr,
        garagem: values.garagem,
        ocorrencia: values.ocorrencia,
        descricao_danos: values.descricao_danos,
        chamado_id: id,
        foto_url: fotosUrls.length > 0 ? fotosUrls[0] : null,
        fotos_urls: fotosUrls,
        formulario_id: espelhoId,
      } as any)

      if (docError) {
        console.error(docError)
        throw new Error('Erro ao registrar documento.')
      }

      clearDraft()
      toast({ title: 'Sucesso', description: 'Formulário enviado com sucesso' })
      navigate('/espelho-danos/sucesso', {
        state: { chamadoId: id, fileName, tipo: 'Espelho de Danos' },
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao enviar formulário. Tente novamente',
      })
    } finally {
      setLoading(false)
    }
  }

  const isVistoriadorWithoutGaragem = user && profile && !profile.garagem

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center">
      {draftRestored && (
        <div className="w-full max-w-2xl mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Rascunho Restaurado</h3>
              <p className="mt-1 text-sm">
                Encontramos dados preenchidos anteriormente. Por questões de segurança,{' '}
                <strong>fotos</strong> precisam ser adicionadas novamente.
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

      {isVistoriadorWithoutGaragem && (
        <div className="w-full max-w-2xl mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Atenção: Garagem não definida</h3>
          </div>
          <p className="mt-2 text-sm">
            Você não possui uma garagem vinculada ao seu perfil. É necessário que um administrador
            defina sua garagem antes que você possa preencher o formulário.
          </p>
        </div>
      )}

      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Espelho de Danos</CardTitle>
          <CardDescription>Preencha os dados da vistoria abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} className="space-y-4">
              <FormField
                control={form.control}
                name="numero_os"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de OS *</FormLabel>
                    <FormControl>
                      <Input placeholder="Informe o número de OS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!profile?.garagem && (
                <FormField
                  control={form.control}
                  name="garagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garagem *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma garagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cursino">Cursino</SelectItem>
                          <SelectItem value="Sapopemba">Sapopemba</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="ocorrencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocorrência *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-6"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Sim" />
                          </FormControl>
                          <FormLabel className="font-normal">Sim</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Não" />
                          </FormControl>
                          <FormLabel className="font-normal">Não</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="linha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linha *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o número da linha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numero_carro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Carro *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o número do carro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="descricao_danos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição dos Danos *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva os danos encontrados" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fotos_dano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fotos do Dano ({field.value.length} de 5 fotos) *</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const processedBase64 = await processImage(file)
                              const newFotos = [...field.value, processedBase64]
                              field.onChange(newFotos)
                            }
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {field.value.map((foto, index) => (
                            <div
                              key={index}
                              className="relative rounded-md overflow-hidden border bg-black/5 aspect-[4/3] flex items-center justify-center p-1"
                            >
                              <img
                                src={foto}
                                alt={`Preview ${index + 1}`}
                                className="max-w-full max-h-full object-contain rounded-sm"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 rounded-full shadow-sm"
                                onClick={() => {
                                  const newFotos = field.value.filter((_, i) => i !== index)
                                  field.onChange(newFotos)
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {field.value.length < 5 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-full min-h-[120px] aspect-[4/3] flex flex-col items-center justify-center border-dashed"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Camera className="w-6 h-6 mb-2 text-muted-foreground" />
                              <span className="text-xs">Adicionar Foto</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registro_vistoriador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Vistoriador *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o registro do vistoriador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome_vistoriador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Vistoriador *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o nome do vistoriador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registro_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Motorista *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o registro do motorista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Motorista *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o nome do motorista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !!isVistoriadorWithoutGaragem}
              >
                {loading ? 'Enviando...' : 'Enviar formulário'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

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
    </div>
  )
}
