import { Link } from 'react-router-dom'
import { DollarSign, FileCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'

export function FinanceiroContabilMenu() {
  const { profile } = useAuth()

  if (profile?.tipo_usuario === 'financeiro') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link to="/dashboard/valores-aprovados-financeiro">
            <DollarSign className="h-4 w-4" />
            <span>Valores Aprovados</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (profile?.tipo_usuario === 'contabil') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link to="/dashboard/valores-aprovados-contabil">
            <FileCheck className="h-4 w-4" />
            <span>Valores Aprovados</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return null
}
