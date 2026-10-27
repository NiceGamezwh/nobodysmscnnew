"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("sms_token")
    if (!token) {
      router.replace("/")
    } else {
      setMounted(true)
    }
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
