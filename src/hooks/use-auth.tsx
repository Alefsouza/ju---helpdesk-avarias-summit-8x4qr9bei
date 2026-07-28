import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  email: string
  nome_completo: string
  tipo_usuario:
    | 'basico'
    | 'responsavel'
    | 'admin'
    | 'vistoriador'
    | 'coc'
    | 'sos'
    | 'juridico'
    | 'sinistro'
    | 'secretaria_tecnica'
    | 'dp'
    | 'financeiro'
    | 'contabil'
  departamento?: string | null
  foto_url?: string | null
  garagem?: string | null
}

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  ensureValidSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const isRecoveringRef = useRef(false)
  const explicitSignOutRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('perfil_usuario')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          if (mounted) setLoading(false)
          return
        }

        if (mounted) {
          setProfile(data as UserProfile)
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro ao buscar perfil', error)
        if (mounted) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN') {
        setLoading(true)
      }

      if (
        event === 'SIGNED_OUT' &&
        !session &&
        !isRecoveringRef.current &&
        !explicitSignOutRef.current
      ) {
        isRecoveringRef.current = true
        supabase.auth
          .refreshSession()
          .then(({ data: { session: recoveredSession }, error }) => {
            isRecoveringRef.current = false
            if (mounted && recoveredSession && !error) {
              setSession(recoveredSession)
              setUser(recoveredSession.user)
              fetchProfile(recoveredSession.user.id)
            } else if (mounted) {
              setSession(null)
              setUser(null)
              setProfile(null)
              setLoading(false)
            }
          })
          .catch(() => {
            isRecoveringRef.current = false
            if (mounted) {
              setSession(null)
              setUser(null)
              setProfile(null)
              setLoading(false)
            }
          })
        return
      }

      if (event === 'SIGNED_OUT') {
        explicitSignOutRef.current = false
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase.from('perfil_usuario').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as UserProfile)
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil', error)
    }
  }

  const ensureValidSession = async (): Promise<boolean> => {
    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()
      if (error || !currentSession) return false

      const expiresAt = currentSession.expires_at ?? 0
      const now = Math.floor(Date.now() / 1000)

      if (expiresAt - now < 60) {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession()
        if (refreshError || !refreshedSession) return false
        setSession(refreshedSession)
        setUser(refreshedSession.user)
      }

      return true
    } catch {
      return false
    }
  }

  const signOut = async () => {
    explicitSignOutRef.current = true
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signOut, refreshProfile, ensureValidSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
