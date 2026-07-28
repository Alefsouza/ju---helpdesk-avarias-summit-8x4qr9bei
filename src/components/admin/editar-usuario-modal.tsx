import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { updateAdminUser } from '@/services/manage-users'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  nome_completo: z.string().min(1, 'Nome é obrigatório'),
  tipo_usuario: z.string().min(1, 'Tipo é obrigatório'),
  whatsapp: z.string().optional(),
  endereco: z.string().optional(),
  departamento: z.string().optional(),
  garagem: z.string().optional().nullable(),
  registro: z.string().optional(),
  ativo: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

export function EditarUsuarioModal({
  open,
  setOpen,
  user,
  onSuccess,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  user: any
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: '',
      tipo_usuario: 'basico',
      whatsapp: '',
      endereco: '',
      departamento: '',
      garagem: '',
      registro: '',
      ativo: true,
    },
  })

  useEffect(() => {
    if (user && open) {
      form.reset({
        nome_completo: user.nome_completo || '',
        tipo_usuario: user.tipo_usuario || 'basico',
        whatsapp: user.whatsapp || '',
        endereco: user.endereco || '',
        departamento: user.departamento || '',
        garagem: user.garagem || '',
        registro: user.registro || '',
        ativo: user.ativo !== false,
      })
    }
  }, [user, open, form])

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    setLoading(true)
    try {
      const payload = {
        ...values,
        garagem: values.garagem === 'nenhuma' ? null : values.garagem || null,
      }
      const { error } = await updateAdminUser(user.id, payload)
      if (error) throw error

      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso.' })
      setOpen(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar usuário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!loading) setOpen(val)
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Atualize os dados do usuário.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="registro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registro</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de registro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo_usuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Usuário *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="responsavel">Responsável</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="vistoriador">Vistoriador</SelectItem>
                      <SelectItem value="coc">COC</SelectItem>
                      <SelectItem value="sos">SOS</SelectItem>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="sinistro">Sinistro</SelectItem>
                      <SelectItem value="secretaria_tecnica">Secretária Técnica</SelectItem>
                      <SelectItem value="dp">Departamento Pessoal (DP)</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="contabil">Contabil</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: TI" {...field} />
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
                        <SelectValue placeholder="Selecione a garagem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      <SelectItem value="Cursino">Cursino</SelectItem>
                      <SelectItem value="Sapopemba">Sapopemba</SelectItem>
                    </SelectContent>
                  </Select>
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
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                  <div className="space-y-0.5">
                    <FormLabel>Usuário Ativo</FormLabel>
                    <div className="text-[0.8rem] text-muted-foreground">
                      Permite o acesso do usuário ao sistema
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
