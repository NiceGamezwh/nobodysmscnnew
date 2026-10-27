"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Phone, TrendingUp, Activity, User } from "lucide-react"
import { getAccountInfo } from "@/lib/api"
import { toast } from "sonner"
import Link from "next/link"

export const PRICE_MULTIPLIER = 3

interface AccountData {
  money: string
  num: number
}

export default function DashboardPage() {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    const smsUser = (sessionStorage.getItem("sms_user") || "").trim()
    setCurrentUser(smsUser || null)

    const fetchAccount = async () => {
      const token = sessionStorage.getItem("sms_token")
      if (!token) return

      try {
        const res = await getAccountInfo(token)
        if (res.code === 0) {
          setAccount({ money: res.money, num: res.num })
        } else {
          toast.error("获取账户信息失败")
        }
      } catch {
        toast.error("网络错误")
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [])

  const displayMoney = account?.money ? (Number.parseFloat(account.money) * PRICE_MULTIPLIER).toFixed(2) : "0.00"

  const stats = [
    {
      title: "账户余额",
      value: loading ? "..." : `¥${displayMoney}`,
      icon: Wallet,
      description: "当前可用余额",
    },
    {
      title: "最大区号数",
      value: loading ? "..." : account?.num?.toString() || "0",
      icon: Phone,
      description: "同时可占用号码数",
    },
    {
      title: "今日使用",
      value: "-",
      icon: TrendingUp,
      description: "今日接码次数",
    },
    {
      title: "系统状态",
      value: "正常",
      icon: Activity,
      description: "API 服务正常运行",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">仪表盘</h1>
          <p className="text-muted-foreground">账户概览与统计数据</p>
        </div>
        <Card className="bg-card/50 border-border/50 sm:min-w-[220px]">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">当前账号</p>
              <p className="truncate font-medium text-primary">
                {currentUser || "未登录"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
            <CardDescription>接码操作流程</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
                1
              </span>
              <div>
                <p className="font-medium">获取号码</p>
                <p className="text-sm text-muted-foreground">选择项目并获取手机号码</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
                2
              </span>
              <div>
                <p className="font-medium">发送验证码</p>
                <p className="text-sm text-muted-foreground">在目标网站/APP使用该号码</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
                3
              </span>
              <div>
                <p className="font-medium">获取验证码</p>
                <p className="text-sm text-muted-foreground">点击获取验证码按钮获取短信</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>注意事项</CardTitle>
            <CardDescription>使用提示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              • 普通号码价格：<span className="text-primary font-medium">0.36元/条</span>
            </p>
            <p className="text-sm text-muted-foreground">• 如超过3分钟未收到验证码，建议拉黑该号码</p>
            <p className="text-sm text-muted-foreground">• 释放号码后下次还可能分配到，拉黑则不会再分配</p>
            <Link href="/dashboard/help" className="inline-block text-sm text-primary hover:underline mt-2">
              查看完整帮助文档 →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
