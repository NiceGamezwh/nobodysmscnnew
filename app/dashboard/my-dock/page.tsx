"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, RefreshCw, Trash2, Search } from "lucide-react"
import { getMyDocks, deleteDock, type MyDockItem } from "@/lib/api"
import { toast } from "sonner"

function getSmsUser(): string {
  if (typeof window === "undefined") return ""
  try {
    return (sessionStorage.getItem("sms_user") || "").trim()
  } catch {
    return ""
  }
}

export default function MyDockPage() {
  const [smsUser, setSmsUser] = useState("")
  const [keyword, setKeyword] = useState("")
  const [listLoading, setListLoading] = useState(false)
  const [items, setItems] = useState<MyDockItem[] | null>(null)

  const [pendingDelete, setPendingDelete] = useState<MyDockItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadList = useCallback(async (kw?: string) => {
    const account = getSmsUser()
    if (!account) {
      toast.error("请先登录短信账号")
      return
    }

    setListLoading(true)
    try {
      // 空 token：服务端按 sms_user 走链上 Bearer（不回退配置 Bearer）
      const res = await getMyDocks("", {
        keyword: (kw ?? keyword).trim(),
        page: 1,
      })
      if (res.success && res.items) {
        setItems(res.items)
        if (res.items.length === 0) {
          toast.error("暂无已加入的对接码")
        } else {
          toast.success(`共 ${res.items.length} 条已对接`)
        }
      } else {
        setItems([])
        toast.error(res.msg || "对接失败，请联系客服")
      }
    } catch {
      setItems([])
      toast.error("获取列表失败，请稍后重试")
    } finally {
      setListLoading(false)
    }
  }, [keyword])

  useEffect(() => {
    const account = getSmsUser()
    setSmsUser(account)
    if (account) {
      void loadList("")
    }
    // 仅挂载时自动拉取一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    const account = getSmsUser()
    if (!account) {
      toast.error("请先登录短信账号")
      setPendingDelete(null)
      return
    }

    setDeleting(true)
    try {
      const res = await deleteDock("", pendingDelete.uid)
      if (res.success) {
        toast.success(res.msg || "删除成功")
        setItems((prev) => (prev ? prev.filter((i) => i.uid !== pendingDelete.uid) : prev))
      } else {
        toast.error(res.msg || "删除失败")
      }
    } catch {
      toast.error("删除失败，请稍后重试")
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">对接管理</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          登录短信账号后可查看已对接项目并删除对接（Bearer 由链上按 api账号 自动查找）。
        </p>
        {!smsUser && (
          <p className="text-amber-600 text-sm mt-2">当前未登录短信账号，请先登录后再查询。</p>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden flex-1">
            <Input
              placeholder="按项目名筛选（可留空查全部）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  void loadList()
                }
              }}
              className="border-0 bg-transparent text-primary h-11 placeholder:text-muted-foreground"
            />
            <Button
              onClick={() => void loadList()}
              disabled={listLoading}
              className="h-11 rounded-none bg-blue-500 hover:bg-blue-600 text-white px-5"
            >
              {listLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1" />
                  查询
                </>
              )}
            </Button>
          </div>
          <Button variant="outline" onClick={() => void loadList()} disabled={listLoading} className="h-11">
            <RefreshCw className={`h-4 w-4 mr-1 ${listLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {items !== null && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">已对接列表</h2>
              <span className="text-sm text-muted-foreground">共 {items.length} 条</span>
            </div>

            {items.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                暂无已加入的对接码
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.uid} className="bg-card rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-foreground font-medium">{item.name || "未知项目"}</span>
                        {item.status && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              item.status.includes("暂停")
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-emerald-500/15 text-emerald-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingDelete(item)}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>

                    <div className="font-mono text-primary text-sm break-all">{item.uid}</div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                        价格 ¥{item.price}
                      </span>
                      <span className="text-sm bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded">
                        可用 {item.available || "-"}
                      </span>
                      {item.segmentType && (
                        <span className="text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {item.segmentType}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <InfoRow label="运营商" value={item.isp} />
                      <InfoRow label="省份" value={item.province} />
                      <InfoRow label="号段" value={item.segments} />
                      <InfoRow label="联系方式" value={item.contact} />
                      <InfoRow label="更新时间" value={item.time} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除对接码</AlertDialogTitle>
            <AlertDialogDescription className="break-all">
              将从你的账号中删除对接码 {pendingDelete?.uid}
              {pendingDelete?.name ? `（${pendingDelete.name}）` : ""}，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className="text-foreground break-all">{value || "-"}</span>
    </div>
  )
}