"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExternalLink, Info, Ticket, Loader2, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { redeemCardKey } from "@/lib/api"

const RECHARGE_STORE_URL = "https://nobodysms.online/recharge"

export default function RechargePage() {
  const [cardKey, setCardKey] = useState("")
  const [redeeming, setRedeeming] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [resultOk, setResultOk] = useState<boolean | null>(null)
  const [resultCode, setResultCode] = useState<number | null>(null)

  const handleRedeem = async () => {
    const key = cardKey.trim()
    if (!key) {
      toast.error("请输入兑换码/卡密")
      return
    }
    let hasSession = false
    try {
      hasSession = !!(sessionStorage.getItem("sms_user") || "").trim() || !!(sessionStorage.getItem("sms_token") || "").trim()
    } catch {
      hasSession = false
    }
    if (!hasSession) {
      toast.error("请先登录短信账号后再兑换")
      return
    }

    setRedeeming(true)
    setResultMsg(null)
    setResultOk(null)
    setResultCode(null)
    try {
      const res = await redeemCardKey(key)
      const ok = !!res.success || res.code === 0
      setResultCode(typeof res.code === "number" ? res.code : null)
      setResultOk(ok)
      if (ok) {
        const msg = "充值成功"
        setResultMsg(msg)
        toast.success(msg)
        setCardKey("")
      } else {
        const msg = res.msg || res.message || "兑换失败"
        setResultMsg(msg)
        toast.error(msg)
      }
    } catch {
      const msg = "兑换失败，请稍后重试"
      setResultMsg(msg)
      setResultOk(false)
      toast.error(msg)
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with banner */}
      <div className="relative rounded-xl overflow-hidden h-32 md:h-40">
        <Image src="/images/banner.gif" alt="Nobody SMS" fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50 flex items-center">
          <div className="px-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">充值中心</h1>
            <p className="text-muted-foreground">卡密兑换或前往商城购买充值卡密</p>
          </div>
        </div>
      </div>

      {/* 卡密充值 */}
      <Card id="cardkey" className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-primary" />
            卡密充值
          </CardTitle>
          <CardDescription>
            请输入：购买的充值卡密
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="请输入兑换码/卡密"
              value={cardKey}
              onChange={(e) => setCardKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  handleRedeem()
                }
              }}
              className="bg-background border-border text-primary h-11 flex-1 font-mono"
              disabled={redeeming}
            />
            <Button
              onClick={handleRedeem}
              disabled={redeeming}
              className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ticket className="h-4 w-4 mr-1" />}
              兑换
            </Button>
          </div>
          {resultMsg && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                resultOk
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {typeof resultCode === "number" ? (
                <span className="font-mono text-xs opacity-80 mr-2">[{resultCode}]</span>
              ) : null}
              {resultMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-primary">充值说明</p>
          <p className="text-sm text-muted-foreground">
            卡密兑换一般即时到账；没有卡密可先在商城购买，付款后即时获得充值卡密，再回到本页兑换。
          </p>
        </div>
      </div>

      {/* 购买充值卡密（原支付宝档位已弃用） */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-primary" />
            购买充值卡密
          </CardTitle>
          <CardDescription>
            原支付宝档位充值已停用，请前往商城在线购买 15 / 30 / 60 元充值卡密
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={RECHARGE_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            前往充值商城
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground break-all">{RECHARGE_STORE_URL}</p>
        </CardContent>
      </Card>
    </div>
  )
}
