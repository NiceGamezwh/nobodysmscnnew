"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User, Loader2, ArrowLeft } from "lucide-react"
import { login as apiLogin } from "@/lib/api"
import { toast } from "sonner"
import Image from "next/image"

export default function LoginPage() {
  const [user, setUser] = useState("")
  const [pass, setPass] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !pass) {
      toast.error("请输入API账号和密码")
      return
    }

    setLoading(true)
    try {
      const res = await apiLogin(user, pass)
      if (res.code === 0) {
        sessionStorage.setItem("sms_token", res.token)
        sessionStorage.setItem("sms_user", user)
        toast.success("登录成功")
        router.push("/dashboard")
      } else {
        toast.error(res.msg || "登录失败")
      }
    } catch {
      toast.error("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full h-32 md:h-48 relative overflow-hidden">
        <Image
          src="/images/banner.gif"
          alt="Nobody SMS"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <Image
                src="/images/logo.jpg"
                alt="Nobody SMS"
                width={80}
                height={80}
                className="rounded-lg border-4 border-primary shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Nobody SMS</h1>
            <p className="text-muted-foreground">专业的短信验证码接收平台</p>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">登录账号</CardTitle>
              <CardDescription>使用您的账号和密码登录</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">账号</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user"
                      type="text"
                      placeholder="输入账号"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      className="pl-10 bg-input border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="pass"
                      type="password"
                      placeholder="输入密码"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="pl-10 bg-input border-border"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登 录"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            请直接使用购买的卡密账户登陆
          </p>

          <p className="text-center text-xs">
            <a
              href="https://nobodysms.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              立即购买
            </a>
          </p>

          <div className="text-center">
            <a
              href="https://nobodysms.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回官网
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
