// Mock Supabase Client implementation for demonstration purposes
// This simulates the Supabase Auth API without requiring actual credentials

type User = { email: string }
type Session = { user: User; access_token: string }

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

class MockSupabaseAuth {
  private getSessionData(): Session | null {
    try {
      const data = localStorage.getItem('supabase_mock_session')
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  private setSessionData(session: Session | null) {
    if (session) {
      localStorage.setItem('supabase_mock_session', JSON.stringify(session))
    } else {
      localStorage.removeItem('supabase_mock_session')
    }
    window.dispatchEvent(new Event('supabase_auth_change'))
  }

  async signUp({ email, password }: any) {
    await delay(1000) // Simulate network delay
    const users = JSON.parse(localStorage.getItem('supabase_mock_users') || '{}')

    // Simulate error if user already exists
    if (users[email]) {
      return { data: { user: null }, error: { message: 'E-mail já cadastrado' } }
    }

    users[email] = { password }
    localStorage.setItem('supabase_mock_users', JSON.stringify(users))
    return { data: { user: { email } }, error: null }
  }

  async signInWithPassword({ email, password }: any) {
    await delay(1000) // Simulate network delay
    const users = JSON.parse(localStorage.getItem('supabase_mock_users') || '{}')

    // Hardcoded fallback admin or checking local storage users
    const isValid =
      (users[email] && users[email].password === password) ||
      (email === 'admin@helpdesk.com' && password === '12345678')

    if (!isValid) {
      return { data: { session: null }, error: { message: 'E-mail ou senha incorretos' } }
    }

    const session = { user: { email }, access_token: 'mock-token-' + Date.now() }
    this.setSessionData(session)
    return { data: { session }, error: null }
  }

  async signOut() {
    await delay(500) // Simulate network delay
    this.setSessionData(null)
    return { error: null }
  }

  async getSession() {
    return { data: { session: this.getSessionData() }, error: null }
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const listener = () => {
      const session = this.getSessionData()
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
    }
    window.addEventListener('supabase_auth_change', listener)

    return {
      data: {
        subscription: {
          unsubscribe: () => window.removeEventListener('supabase_auth_change', listener),
        },
      },
    }
  }
}

export const supabase = {
  auth: new MockSupabaseAuth(),
}
