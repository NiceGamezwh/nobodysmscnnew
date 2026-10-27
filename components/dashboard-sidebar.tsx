"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Phone, LogOut, HelpCircle, Menu, X, Link2, ListChecks, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Image from "next/image"

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/dashboard/get-phone", label: "获取号码", icon: Phone },
  { href: "/dashboard/dock", label: "搜索对接", icon: Link2 },
  { href: "/dashboard/my-dock", label: "对接管理", icon: ListChecks },
  { href: "/dashboard/recharge", label: "充值中心", icon: Wallet },
  { href: "/dashboard/help", label: "帮助中心", icon: HelpCircle },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    sessionStorage.removeItem("sms_token")
    sessionStorage.removeItem("sms_user")
    toast.success("已退出登录")
    router.push("/")
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/images/logo.jpg"
            alt="Nobody SMS"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="font-bold text-primary">Nobody SMS</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          退出登录
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>
    </>
  )
}
