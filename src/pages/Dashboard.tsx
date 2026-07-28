import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && profile) {
      if (profile.tipo_usuario === 'admin') {
        navigate('/dashboard/admin', { replace: true })
      } else if (profile.tipo_usuario === 'responsavel') {
        navigate('/dashboard/chamados-abertos', { replace: true })
      } else if (profile.tipo_usuario === 'sinistro') {
        navigate('/dashboard/chamados-abertos', { replace: true })
      } else if (profile.departamento === 'DP' || profile.tipo_usuario === 'dp') {
        navigate('/vales-aprovados', { replace: true })
      } else {
        navigate('/dashboard/meus-chamados', { replace: true })
      }
    }
  }, [profile, loading, navigate])

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
