import { useAuth } from '@/hooks/use-auth'
import { ValesAprovacaoAlex } from '@/components/admin/vales-aprovacao-alex'
import { AlertCircle } from 'lucide-react'

export default function ValesAprovacaoAlexPage() {
  const { user, profile } = useAuth()

  const isAlex = user?.email === 'alex.fontes@viasudeste.com'
  const isAdmin = profile?.tipo_usuario === 'admin'

  if (!isAlex && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-1">Esta página é exclusiva para o Alex.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vales para Aprovação</h1>
        <p className="text-muted-foreground">
          Aprove ou desapprove chamados antes de enviá-los para a diretoria.
        </p>
      </div>
      <ValesAprovacaoAlex />
    </div>
  )
}
