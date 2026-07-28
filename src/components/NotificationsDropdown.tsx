import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Database } from '@/lib/supabase/types'

export type Notificacao = Database['public']['Tables']['notificacoes']['Row']

export function NotificationsDropdown({ className }: { className?: string }) {
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState<Notificacao[]>([])

  const isRestrictedUser =
    user?.email === 'leandro.ferraz@viasudeste.com' ||
    user?.email === 'sonia.mattoso@viasudeste.com'
  const isAlexFontes = user?.email === 'alex.fontes@viasudeste.com'
  const isAdmin = profile?.tipo_usuario === 'admin'
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    audioRef.current = new Audio(
      'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    )
  }, [])

  const fetchNotifications = async () => {
    if (!user?.id) return
    let query = supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(30)

    if (isAlexFontes) {
      query = query.or(
        'titulo.ilike.%autoriz%,mensagem.ilike.%autoriz%,link.ilike.%/autorizar-parcelas%,titulo.ilike.%parcela%,mensagem.ilike.%parcela%,titulo.ilike.%transferido%,mensagem.ilike.%transferido%',
      )
    } else if (isRestrictedUser) {
      query = query.or('titulo.ilike.%Vale%,mensagem.ilike.%Vale%')
    } else if (isAdmin) {
      query = query.not('titulo', 'ilike', '%chamado%')
    }

    const { data } = await query

    if (data) {
      setNotifications(data as Notificacao[])
      setUnreadCount(data.filter((n) => !n.lida).length)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()

    const channel = supabase
      .channel('notificacoes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notificacao

          if (isAlexFontes) {
            const lTitle = newNotif.titulo.toLowerCase()
            const lMsg = newNotif.mensagem.toLowerCase()
            const lLink = (newNotif.link || '').toLowerCase()
            const isRelevant =
              lTitle.includes('autoriz') ||
              lMsg.includes('autoriz') ||
              lTitle.includes('parcela') ||
              lMsg.includes('parcela') ||
              lLink.includes('/autorizar-parcelas') ||
              lTitle.includes('transferido') ||
              lMsg.includes('transferido')
            if (!isRelevant) return
          } else if (isRestrictedUser) {
            const isVale =
              newNotif.titulo.toLowerCase().includes('vale') ||
              newNotif.mensagem.toLowerCase().includes('vale')
            if (!isVale) return
          } else if (isAdmin) {
            const lTitle = newNotif.titulo.toLowerCase()
            const lLink = (newNotif.link || '').toLowerCase()
            const isChamado = lLink.includes('/chamados/') || lTitle.includes('chamado')
            if (isChamado) return
          }

          setNotifications((prev) => [newNotif, ...prev])
          setUnreadCount((prev) => prev + 1)

          if (audioRef.current) {
            audioRef.current.play().catch((e) => console.error('Audio play failed:', e))
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notificacao
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.lida).length)
  }, [notifications])

  const markAsRead = async (id: string, link: string | null) => {
    const notif = notifications.find((n) => n.id === id)
    if (notif && !notif.lida) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    }
    setIsOpen(false)
    if (link) {
      navigate(link)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', user.id)
      .eq('lida', false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative hover:bg-black/10', className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
          <h4 className="font-semibold text-sm text-slate-800">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 px-2 text-xs text-primary hover:bg-primary/10"
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 p-4 text-center text-sm text-slate-500">
              <Bell className="h-8 w-8 text-slate-200 mb-2" />
              Nenhuma notificação no momento.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex flex-col gap-1 border-b p-4 transition-colors hover:bg-slate-50 cursor-pointer',
                    !notif.lida && 'bg-primary/5',
                  )}
                  onClick={() => markAsRead(notif.id, notif.link)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        !notif.lida ? 'text-primary' : 'text-slate-700',
                      )}
                    >
                      {notif.titulo}
                    </span>
                    {!notif.lida && (
                      <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-xs text-slate-600 line-clamp-2">{notif.mensagem}</span>
                  <div className="mt-2 flex items-center text-[10px] text-slate-400 font-medium">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatDistanceToNow(new Date(notif.criado_em), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
