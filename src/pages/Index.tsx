import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const loginBgImage =
  'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/assets/6.jpeg'
const logoBranco =
  'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/assets/logo_branco_transparente_nitido-80a6a-BIUCr1YD.png'

const INSTITUTIONAL_GREEN = '#225f3d'
const INSTITUTIONAL_GREEN_LIGHT = '#4ca371'

const formSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
})

export default function Index() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBgLoaded, setIsBgLoaded] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.src = loginBgImage
    if (img.complete) {
      setIsBgLoaded(true)
    } else {
      img.onload = () => setIsBgLoaded(true)
      img.onerror = () => setIsBgLoaded(false)
    }
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setTimeout(() => {
        toast({
          title: 'E-mail confirmado!',
          description: 'Faça login para continuar.',
          className: 'bg-green-600 text-white border-none',
        })
      }, 100)
    }
  }, [searchParams, toast])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (signInError) {
      setIsLoading(false)
      setError(signInError.message || 'E-mail ou senha incorretos')
    } else {
      toast({
        title: 'Login realizado com sucesso',
        className: 'bg-green-600 text-white border-none',
      })

      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('tipo_usuario')
            .eq('id', data.user.id)
            .single()

          if (profile?.tipo_usuario === 'juridico') {
            navigate('/dashboard/meus-atendimentos', { replace: true })
          }
        } catch (err) {
          console.error('Erro ao buscar perfil para redirecionamento:', err)
        }
      }
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-[#1a472d] bg-cover bg-center bg-no-repeat transition-all duration-700 overflow-y-auto"
      style={isBgLoaded ? { backgroundImage: `url('${loginBgImage}')` } : undefined}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-0 pointer-events-none transition-opacity duration-700',
          isBgLoaded ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-6 animate-fade-in-up py-8">
        {/* Logo Container - separate block with glassmorphism */}
        <div
          className={cn(
            'w-full max-w-[320px] rounded-2xl border border-white/20 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl px-8 py-6 transition-colors duration-700',
            isBgLoaded ? 'bg-white/10' : 'bg-[#1a472d]',
          )}
        >
          <img
            src={logoBranco}
            alt="Via Sudeste"
            className="w-full h-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Login Card */}
        <Card
          className={cn(
            'border-white/20 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl overflow-hidden w-full relative transition-colors duration-700 rounded-2xl',
            isBgLoaded ? 'bg-white/10' : 'bg-[#1a472d]',
          )}
        >
          <CardContent className="pb-8 pt-8 px-6">
            <div className="flex flex-col items-center gap-2 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ABERTURA DE SINISTRO
              </h1>
              <p className="text-sm font-normal text-white/80 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Insira suas credenciais para acessar sua conta
              </p>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="py-2 animate-fade-in-down bg-red-500/20 border-red-500/50 text-white backdrop-blur-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90 text-sm font-medium">
                  E-mail&nbsp;<span className="text-red-400">*</span>
                </Label>
                <div className="relative group">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10"
                    style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...form.register('email')}
                    className={cn(
                      'pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg h-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#225f3d]/60 focus-visible:ring-offset-0 focus-visible:border-[#4ca371] hover:bg-white/15',
                      form.formState.errors.email
                        ? 'border-red-400 focus-visible:ring-red-400/60 focus-visible:border-red-400'
                        : '',
                    )}
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                  Senha <span className="text-red-400">*</span>
                </Label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10"
                    style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...form.register('password')}
                    className={cn(
                      'pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg h-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#225f3d]/60 focus-visible:ring-offset-0 focus-visible:border-[#4ca371] hover:bg-white/15',
                      form.formState.errors.password
                        ? 'border-red-400 focus-visible:ring-red-400/60 focus-visible:border-red-400'
                        : '',
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none"
                    style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl mt-4 rounded-lg border border-[#4ca371]/30"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center text-sm text-white/90 drop-shadow-sm pt-1">
                Não tem uma conta?{' '}
                <Link
                  to="/cadastro"
                  className="font-semibold text-white hover:text-[#c8e6c9] hover:underline transition-colors"
                >
                  Cadastre-se
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
