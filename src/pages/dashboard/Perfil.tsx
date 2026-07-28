import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, User, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const formSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  whatsapp: z.string().optional(),
  endereco: z.string().optional(),
  garagem: z.string().optional(),
  registro: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const passwordSchema = z
  .object({
    senha_atual: z.string().min(1, 'Senha atual é obrigatória'),
    nova_senha: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número')
      .regex(/[^a-zA-Z0-9]/, 'Deve conter pelo menos um caractere especial'),
    confirmar_senha: z.string(),
  })
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'],
  })

type PasswordValues = z.infer<typeof passwordSchema>

export default function Perfil() {
  const { user, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: '',
      whatsapp: '',
      endereco: '',
      garagem: '',
      registro: '',
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      senha_atual: '',
      nova_senha: '',
      confirmar_senha: '',
    },
  })

  useEffect(() => {
    if (!isPasswordModalOpen) {
      passwordForm.reset()
    }
  }, [isPasswordModalOpen, passwordForm])

  const onPasswordSubmit = async (values: PasswordValues) => {
    if (!email) return

    setChangingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: values.senha_atual,
      })

      if (signInError) {
        passwordForm.setError('senha_atual', { message: 'Senha atual incorreta' })
        setChangingPassword(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: values.nova_senha,
      })

      if (updateError) throw updateError

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso. Faça login novamente.',
      })

      setIsPasswordModalOpen(false)
      await signOut()
      navigate('/cadastro')
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao alterar a senha. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('perfil_usuario')
          .select('nome_completo, whatsapp, endereco, email, foto_url, garagem, registro')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setEmail(data.email)
          setFotoUrl(data.foto_url || null)
          form.reset({
            nome_completo: data.nome_completo || '',
            whatsapp: data.whatsapp || '',
            endereco: data.endereco || '',
            garagem: data.garagem || '',
            registro: data.registro || '',
          })
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do perfil.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id, form, toast])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Arquivo inválido. Máximo 5 MB. Tipos: JPG, PNG, GIF',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'Arquivo inválido. Máximo 5 MB. Tipos: JPG, PNG, GIF',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `${user?.id}/foto-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('perfil_fotos')
        .upload(filename, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('perfil_fotos').getPublicUrl(filename)

      const { error: updateError } = await supabase
        .from('perfil_usuario')
        .update({ foto_url: publicUrl })
        .eq('id', user!.id)

      if (updateError) throw updateError

      setFotoUrl(publicUrl)
      if (refreshProfile) await refreshProfile()

      toast({
        title: 'Sucesso',
        description: 'Foto atualizada com sucesso',
      })
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao enviar foto. Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveFoto = async () => {
    setUploading(true)
    try {
      if (fotoUrl) {
        const urlParts = fotoUrl.split('/perfil_fotos/')
        if (urlParts.length > 1) {
          const path = urlParts[1]
          await supabase.storage.from('perfil_fotos').remove([path])
        }
      }

      const { error } = await supabase
        .from('perfil_usuario')
        .update({ foto_url: null })
        .eq('id', user!.id)

      if (error) throw error

      setFotoUrl(null)
      if (refreshProfile) await refreshProfile()

      toast({
        title: 'Sucesso',
        description: 'Foto removida com sucesso',
      })
    } catch (error) {
      console.error('Erro ao remover foto:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao remover foto. Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!user?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('perfil_usuario')
        .update({
          nome_completo: values.nome_completo,
          whatsapp: values.whatsapp || null,
          endereco: values.endereco || null,
          garagem: values.garagem || null,
          registro: values.registro || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      })
      navigate('/dashboard')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar o perfil. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e de contato.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>Adicione ou altere sua foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
          <div className="relative">
            <div className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center">
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs">Enviando...</span>
                </div>
              ) : fotoUrl ? (
                <img src={fotoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <User className="h-12 w-12" />
                  <span className="text-sm font-medium">Nenhuma foto</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center pt-2 sm:pt-6 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg, image/png, image/gif"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Alterar foto
            </Button>

            {fotoUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemoveFoto}
                disabled={uploading}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover foto
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2 text-center sm:text-left">
              Tipos permitidos: JPG, PNG, GIF.
              <br />
              Tamanho máximo: 5 MB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seus dados para manter seu cadastro em dia.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>E-mail</FormLabel>
                <Input value={email} disabled readOnly className="bg-muted text-muted-foreground" />
                <p className="text-[0.8rem] text-muted-foreground">
                  Seu endereço de e-mail não pode ser alterado por aqui.
                </p>
              </div>

              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registro</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu número de registro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu endereço completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="garagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garagem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua garagem" />
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
            </CardContent>
            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t p-6">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate('/dashboard')}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Gerencie a segurança da sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para sua conta. Você será desconectado após a alteração.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={passwordForm.control}
                  name="senha_atual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Atual *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Sua senha atual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="nova_senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmar_senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repita a nova senha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={changingPassword}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
