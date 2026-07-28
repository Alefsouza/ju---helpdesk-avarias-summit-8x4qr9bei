import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import logoBranco from '@/assets/logo_branco_transparente_nitido-80a6a.png'
import localBgImage from '@/assets/background-bus-a97ed.png'
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const formSchema = z
  .object({
    nome_completo: z.string().min(3, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

export default function Register() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isBgLoaded, setIsBgLoaded] = useState(false)
  const [bgUrl, setBgUrl] = useState<string>('')

  useEffect(() => {
    const supabaseBg = supabase.storage.from('assets').getPublicUrl('background-bus.png')
      .data.publicUrl

    const img = new Image()
    img.src = supabaseBg

    img.onload = () => {
      setBgUrl(supabaseBg)
      setIsBgLoaded(true)
    }

    img.onerror = () => {
      const fallbackImg = new Image()
      fallbackImg.src = localBgImage
      if (fallbackImg.complete) {
        setBgUrl(localBgImage)
        setIsBgLoaded(true)
      } else {
        fallbackImg.onload = () => {
          setBgUrl(localBgImage)
          setIsBgLoaded(true)
        }
      }
    }
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome_completo: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.nome_completo,
          },
        },
      })

      if (signUpError) {
        const isRateLimit =
          signUpError.status === 429 ||
          (signUpError as any).code === 'over_email_send_rate_limit' ||
          signUpError.message?.toLowerCase().includes('rate limit')

        if (isRateLimit) {
          const rateLimitMessage =
            'Limite de e-mails atingido. Por favor, aguarde alguns instantes antes de tentar novamente.'
          setError(rateLimitMessage)
          toast({
            variant: 'destructive',
            title: 'Limite excedido',
            description: rateLimitMessage,
          })
        } else {
          setError(signUpError.message || 'Erro ao realizar cadastro')
        }
      } else {
        setIsSuccess(true)
        toast({
          title: 'Cadastro realizado!',
          description: 'Verifique seu e-mail para confirmar a conta.',
          className: 'bg-green-600 text-white border-none',
        })
      }
    } catch (err: any) {
      console.error('Erro no cadastro:', err)

      const isRateLimit =
        err?.status === 429 ||
        err?.code === 'over_email_send_rate_limit' ||
        err?.message?.toLowerCase().includes('rate limit')

      if (isRateLimit) {
        const rateLimitMessage =
          'Limite de e-mails atingido. Por favor, aguarde alguns instantes antes de tentar novamente.'
        setError(rateLimitMessage)
        toast({
          variant: 'destructive',
          title: 'Limite excedido',
          description: rateLimitMessage,
        })
      } else {
        setError(
          'Ocorreu um erro inesperado ao realizar o cadastro. Por favor, tente novamente mais tarde.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const backgroundStyle = isBgLoaded ? { backgroundImage: `url('${bgUrl}')` } : undefined

  if (isSuccess) {
    return (
      <div
        className="fixed inset-0 w-full h-full bg-white bg-cover bg-center bg-no-repeat transition-all duration-700 overflow-y-auto"
        style={backgroundStyle}
      >
        <div
          className={cn(
            'fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-0 pointer-events-none transition-opacity duration-700',
            isBgLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div className="relative z-10 w-full max-w-md mx-auto min-h-screen flex items-center justify-center py-8 px-4">
          <Card
            className={cn(
              'border-white/10 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl overflow-hidden w-full relative text-center py-6 transition-colors duration-700',
              isBgLoaded ? 'bg-black/30' : 'bg-[#1a472d]',
            )}
          >
            <CardHeader>
              <div className="mx-auto bg-green-500/20 p-3 rounded-full w-fit mb-4 animate-slide-up border border-green-500/30">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Verifique seu e-mail
              </CardTitle>
              <CardDescription className="text-base mt-2 text-white/80">
                Enviamos um link de confirmação para o seu e-mail. Por favor, acesse-o para
                confirmar seu cadastro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl mt-4"
              >
                <Link to="/?confirmed=true">Ir para o Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 w-full h-full bg-white bg-cover bg-center bg-no-repeat transition-all duration-700 overflow-y-auto"
      style={backgroundStyle}
    >
      <div
        className={cn(
          'fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-0 pointer-events-none transition-opacity duration-700',
          isBgLoaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="relative z-10 w-full max-w-md mx-auto min-h-screen flex items-center justify-center py-8 px-4">
        <Card
          className={cn(
            'border-white/10 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl overflow-hidden w-full relative transition-colors duration-700',
            isBgLoaded ? 'bg-black/30' : 'bg-[#1a472d]',
          )}
        >
          <CardHeader className="space-y-4 pb-4 pt-8">
            <div className="flex justify-center">
              <img
                src={logoBranco}
                alt="Via Sudeste"
                className="w-[140px] h-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex justify-center flex-col items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase">
                Criar Conta
              </h1>
              <p className="text-sm text-white/70 mt-1">
                Preencha os dados abaixo para se cadastrar
              </p>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="py-2 animate-fade-in-down bg-red-500/20 border-red-500/50 text-white"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="nome_completo" className="text-white/90">
                  Nome Completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="nome_completo"
                  placeholder="Seu nome"
                  {...form.register('nome_completo')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.nome_completo
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.nome_completo && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.nome_completo.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                  E-mail <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...form.register('email')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.email
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">
                  Senha <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.password
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/90">
                  Confirmar Senha <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...form.register('confirmPassword')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.confirmPassword
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl mt-4"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
              <div className="flex flex-col space-y-4 pt-5 border-t border-white/10 mt-5">
                <div className="text-sm text-center text-white/90 drop-shadow-sm">
                  Já tem conta?{' '}
                  <Link
                    to="/"
                    className="font-semibold text-white hover:text-white/80 hover:underline transition-colors"
                  >
                    Faça login
                  </Link>
                </div>
                <Link
                  to="/"
                  className="text-sm text-white/70 hover:text-white flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
