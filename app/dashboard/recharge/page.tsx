"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wallet, ExternalLink, Info, Ticket, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { redeemCardKey } from "@/lib/api"

const tiers = [
  {
    amount: 15,
    price: 13.5,
    discount: "9折",
    url: "https://ur.alipay.com/_6kbAsTsF3GrLhNPFijKys4",
    qr: "/images/15%E5%85%83.png",
  },
  {
    amount: 30,
    price: 26,
    discount: "86折",
    url: "https://ur.alipay.com/_dDZXe8sAyCdEGKERueExf",
    qr: "/images/30%E5%85%83.png",
  },
  {
    amount: 60,
    price: 50,
    discount: "83折",
    url: "https://ur.alipay.com/_GcrMbEX55wAnmb2DvCXoA",
    qr: "/images/60%E5%85%83.png",
    popular: true,
  },
]

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
            <p className="text-muted-foreground">卡密兑换或选择充值档位</p>
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
            卡密兑换一般即时到账；支付宝档位充值会在一个工作日内到账，加急请联系客服。
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">支付宝档位充值</h2>
      </div>

      {/* Tiers */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.amount}
            className={
              tier.popular
                ? "bg-card/50 border-2 border-primary relative"
                : "bg-card/50 border-border/50"
            }
          >
            {tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-xs text-primary-foreground font-medium">
                最受欢迎
              </span>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">充值 {tier.amount} 元</CardTitle>
              <CardDescription>到账 {tier.amount} 元</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-primary">¥{tier.price}</span>
                  <span className="text-sm text-muted-foreground line-through">¥{tier.amount}</span>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/15 text-xs text-primary font-medium">
                  {tier.discount}
                </span>
              </div>
              <a
                href={tier.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Wallet className="h-4 w-4" />
                立即充值
                <ExternalLink className="h-4 w-4" />
              </a>
              <div className="pt-2 border-t border-border/50">
                <div className="mx-auto w-40 h-40 rounded-lg overflow-hidden bg-white p-2">
                  <Image
                    src={tier.qr || "/placeholder.svg"}
                    alt={`充值 ${tier.amount} 元收款二维码`}
                    width={160}
                    height={160}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
