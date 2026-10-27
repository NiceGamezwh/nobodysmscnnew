"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthState {
  token: string | null
  user: string | null
}

interface AuthContextType extends AuthState {
  login: (token: string, user: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("sms_token")
    const user = sessionStorage.getItem("sms_user")
    if (token && user) {
      setAuth({ token, user })
    }
    setMounted(true)
  }, [])

  const login = (token: string, user: string) => {
    sessionStorage.setItem("sms_token", token)
    sessionStorage.setItem("sms_user", user)
    setAuth({ token, user })
  }

  const logout = () => {
    sessionStorage.removeItem("sms_token")
    sessionStorage.removeItem("sms_user")
    setAuth({ token: null, user: null })
  }

  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
