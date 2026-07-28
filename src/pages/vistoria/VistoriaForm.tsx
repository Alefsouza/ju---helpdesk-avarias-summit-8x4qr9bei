import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, X, Loader2, ImagePlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useDraft } from '@/hooks/use-draft'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import logoBranco from '@/assets/logo_branco_transparente_nitido-80a6a.png'

const formSchema = z.object({
  linha: z.string().min(1, 'Campo obrigatório'),
  numero_carro: z.string().min(1, 'Campo obrigatório'),
  descricao_danos: z.string().min(1, 'Campo obrigatório'),
  registro_motorista: z.string().min(1, 'Campo obrigatório'),
  nome_motorista: z.string().min(1, 'Campo obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

export default function VistoriaForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chamadoId = searchParams.get('id')

  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile } = useAuth()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      linha: '',
      numero_carro: '',
      descricao_danos: '',
      registro_motorista: '',
      nome_motorista: '',
    },
  })

  const draftKey = `draft-vistoria-${chamadoId || 'new'}`
  const { draftRestored, clearDraft, setDraftRestored } = useDraft(form, draftKey)

  const [isSearchingMotorista, setIsSearchingMotorista] = useState(false)
  const [motoristaEncontrado, setMotoristaEncontrado] = useState<boolean | null>(null)

  const registroMotorista = form.watch('registro_motorista')

  useEffect(() => {
    const syncRegistros = async () => {
      try {
        const { error } = await supabase.functions.invoke('sync-external-registros')
        if (error) {
          console.error('Erro na sincronização de registros (Timeout ou falha na API):', error)
          // Falhas silenciosas para não travar o fluxo do usuário (fallback para digitação manual)
        }
      } catch (e) {
        console.error('Erro na chamada da Edge Function sync-external-registros:', e)
      }
    }
    syncRegistros()
  }, [])

  useEffect(() => {
    if (!registroMotorista) {
      setMotoristaEncontrado(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      const searchReg = String(registroMotorista).trim()
      if (!searchReg) return

      setIsSearchingMotorista(true)
      setMotoristaEncontrado(null)

      try {
        const searchRegNormalized = searchReg.replace(/^0+(?!$)/, '')

        const { data, error } = await supabase
          .from('registros')
          .select('registro, nome')
          .ilike('registro', `${searchRegNormalized}%`)
          .limit(20)

        if (error) throw error

        if (data && data.length > 0) {
          const found = data.find((r) => r.registro.replace(/^0+(?!$)/, '') === searchRegNormalized)

          if (found && found.nome) {
            const current = form.getValues('nome_motorista')
            if (current !== found.nome) {
              form.setValue('nome_motorista', found.nome, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            setMotoristaEncontrado(true)
          } else {
            setMotoristaEncontrado(false)
          }
        } else {
          setMotoristaEncontrado(false)
        }
      } catch (err) {
        console.error('Erro ao buscar motorista:', err)
        setMotoristaEncontrado(false)
      } finally {
        setIsSearchingMotorista(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [registroMotorista, form])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)

    if (photos.length + newFiles.length > 5) {
      toast.error('Você pode adicionar no máximo 5 fotos.')
      return
    }

    setPhotos((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: FormValues) => {
    if (photos.length === 0) {
      toast.error('Adicione ao menos uma foto do dano.')
      return
    }

    if (!profile?.registro || !profile?.nome_completo) {
      toast.error('Seu perfil está incompleto (falta Nome ou Registro).')
      return
    }

    setIsSubmitting(true)

    try {
      const uploadedUrls: string[] = []

      // Upload photos sequentially to ensure stability
      for (const file of photos) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('vistorias')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('vistorias').getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      const now = new Date()
      const currentDate =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0')
      const currentTime =
        String(now.getHours()).padStart(2, '0') +
        ':' +
        String(now.getMinutes()).padStart(2, '0') +
        ':' +
        String(now.getSeconds()).padStart(2, '0')

      // Bypass TypeScript checking for newly added columns in migration
      const docData = {
        tipo_documento: 'Vistoria',
        nome_arquivo: `Vistoria - ${currentDate} - ${currentTime}`,
        arquivo_url: '', // Initially empty, will be filled with PDF url when OS is linked
        fotos_urls: uploadedUrls,
        chamado_id: chamadoId || null,
        registro_responsavel: profile.registro,
        nome_responsavel: profile.nome_completo,
        registro_motorista: values.registro_motorista,
        nome_motorista: values.nome_motorista,
      } as any

      docData.garagem = profile?.garagem || ''
      docData.data = currentDate
      docData.horario = currentTime
      docData.linha = values.linha
      docData.numero_carro = values.numero_carro
      docData.descricao_danos = values.descricao_danos

      const { error: dbError } = await supabase.from('documentos').insert(docData)

      if (dbError) throw dbError

      clearDraft()
      toast.success('Vistoria registrada com sucesso!')
      form.reset()
      setPhotos([])
    } catch (error: any) {
      console.error('Erro ao enviar vistoria:', error)
      toast.error(error.message || 'Erro ao registrar vistoria. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex justify-center mb-6 bg-[#225f3d] p-4 rounded-xl shadow-sm">
        <img src={logoBranco} alt="Via Sudeste" className="h-16 w-auto object-contain" />
      </div>

      {draftRestored && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 flex items-start justify-between">
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

      {!profile?.garagem ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Atenção: Garagem não definida</h3>
          </div>
          <p className="mt-2 text-sm">
            Você não possui uma garagem vinculada ao seu perfil. É necessário que um administrador
            defina sua garagem antes que você possa preencher o formulário de vistoria.
          </p>
        </div>
      ) : null}

      {!profile?.registro || !profile?.nome_completo ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Atenção: Perfil Incompleto</h3>
          </div>
          <p className="mt-2 text-sm">
            Seu perfil não possui Nome ou Registro (Matrícula) definidos. Você não poderá enviar
            vistorias até que um administrador atualize seu perfil.
          </p>
        </div>
      ) : null}

      <Card className="border-t-4 border-t-[#225f3d] shadow-md">
        <CardHeader className="text-center pb-8 border-b">
          <CardTitle className="text-3xl font-bold text-slate-800">
            Formulário de Vistoria
          </CardTitle>
          <CardDescription>
            Preencha os detalhes da vistoria e anexe as fotos correspondentes (máx. 5).
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="linha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linha</FormLabel>
                      <FormControl>
                        <Input placeholder="Número ou nome da linha" {...field} />
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
                      <FormLabel>Número do Carro</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 8123" {...field} />
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
                    <FormLabel>Descrição dos Danos</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva detalhadamente as avarias encontradas..."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="registro_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Motorista</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Matrícula / Registro" {...field} />
                          {isSearchingMotorista && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!isSearchingMotorista && motoristaEncontrado === true && (
                            <div
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                              title="Motorista localizado"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {motoristaEncontrado === true && (
                        <p className="text-[0.8rem] text-green-600 font-medium">
                          Motorista localizado na base de dados.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Motorista</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <FormLabel className="flex items-center gap-2 text-base">
                    <Camera className="w-5 h-5" />
                    Fotos do Dano <span className="text-red-500">*</span>
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    Insira até 5 fotos claras das avarias. (Mínimo 1 foto obrigatória)
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {photos.map((file, index) => (
                    <div
                      key={index}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm group"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:text-[#225f3d] hover:border-[#225f3d] hover:bg-[#225f3d]/5 transition-colors"
                    >
                      <ImagePlus className="w-8 h-8 mb-1" />
                      <span className="text-xs font-medium">Adicionar</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-6 rounded-b-xl border-t flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/vistoria/pendentes')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#225f3d] hover:bg-[#1a472d] text-white px-8"
                disabled={
                  isSubmitting || !profile?.garagem || !profile?.registro || !profile?.nome_completo
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Registrar Vistoria'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
