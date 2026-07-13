import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!supabase) {
          // Create a mock user for local usage when Supabase is not available
          const mockUser = {
            id: 'local-user',
            email: 'local@user.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            aud: 'authenticated',
            role: 'authenticated'
          } as any;
          
          setUser(mockUser);
          setSession({ user: mockUser } as any);
          return;
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
          }
        )

        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Fallback to mock user on error
        const mockUser = {
          id: 'local-user',
          email: 'local@user.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: 'authenticated',
          role: 'authenticated'
        } as any;
        
        setUser(mockUser);
        setSession({ user: mockUser } as any);
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return
    
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}