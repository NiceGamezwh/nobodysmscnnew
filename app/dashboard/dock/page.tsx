"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Copy, Check, Link2, Plug } from "lucide-react"
import { searchProjects, dockProject, joinDock, type SearchProject, type DockItem } from "@/lib/api"
import { toast } from "sonner"

const STATE_KEY = "dock_search_state"

function getSmsUser(): string {
  if (typeof window === "undefined") return ""
  try {
    return (sessionStorage.getItem("sms_user") || "").trim()
  } catch {
    return ""
  }
}

export default function DockPage() {
  // 搜索项目
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchProject[]>([])
  const [selectedProject, setSelectedProject] = useState<SearchProject | null>(null)

  // 对接结果
  const [dockLoading, setDockLoading] = useState(false)
  const [dockItems, setDockItems] = useState<DockItem[] | null>(null)

  // 复制 / 对接状态
  const [copiedUid, setCopiedUid] = useState<string | null>(null)
  const [joiningUid, setJoiningUid] = useState<string | null>(null)
  const [smsUser, setSmsUser] = useState("")

  // 从本地会话恢复上次的搜索状态，关闭标签页时自动清空
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STATE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        setSearchKeyword(s.searchKeyword ?? "")
        setSearchResults(s.searchResults ?? [])
        setSelectedProject(s.selectedProject ?? null)
        setDockItems(s.dockItems ?? null)
      }
    } catch {
      // 忽略解析错误
    }
    setSmsUser(getSmsUser())
    setRestored(true)
  }, [])

  // 状态变化时保存到本地会话
  useEffect(() => {
    if (!restored) return
    try {
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({ searchKeyword, searchResults, selectedProject, dockItems }),
      )
    } catch {
      // 忽略存储错误
    }
  }, [restored, searchKeyword, searchResults, selectedProject, dockItems])

  // 搜索项目（输入前缀）
  const handleSearchProject = async () => {
    const keyword = searchKeyword.trim()
    if (!keyword) {
      toast.error("请输入搜索前缀，例如抖音")
      return
    }

    setSearchLoading(true)
    setSelectedProject(null)
    setDockItems(null)
    try {
      const res = await searchProjects(keyword)
      if (res.success && res.projects && res.projects.length > 0) {
        setSearchResults(res.projects)
        toast.success(`找到了 ${res.projects.length} 个项目`)
      } else {
        setSearchResults([])
        toast.error(res.msg || "未找到相关项目")
      }
    } catch {
      setSearchResults([])
      toast.error("搜索失败，请稍后再试")
    } finally {
      setSearchLoading(false)
    }
  }

  // 选择项目
  const handleSelectProject = (id: string) => {
    const project = searchResults.find((p) => p.id === id)
    if (project) {
      setSelectedProject(project)
      setDockItems(null)
    }
  }

  // 确认加载：根据 sid 拉取对接码列表
  const handleDock = async () => {
    if (!selectedProject) {
      toast.error("请先选择项目")
      return
    }
    if (!selectedProject.sid) {
      toast.error("该项目缺少对接标识，无法加载")
      return
    }

    setDockLoading(true)
    setDockItems(null)
    try {
      const res = await dockProject(selectedProject.sid)
      if (res.success && res.items) {
        setSmsUser(getSmsUser())
        setDockItems(res.items)
        if (res.items.length === 0) {
          toast.error("该项目暂无可对接的对接码")
        } else {
          toast.success(`加载到 ${res.items.length} 个对接码`)
        }
      } else {
        setDockItems([])
        toast.error(res.msg || "加载对接码失败")
      }
    } catch {
      setDockItems([])
      toast.error("加载失败，请稍后再试")
    } finally {
      setDockLoading(false)
    }
  }

  // 一键对接：用登录 sms_user 从链上解析 Bearer，无需粘贴 cookie
  const handleJoin = async (uid: string) => {
    const account = getSmsUser()
    setSmsUser(account)
    if (!account) {
      toast.error("请先登录 API 账号后再对接")
      return
    }

    setJoiningUid(uid)
    try {
      const res = await joinDock("", uid)
      if (res.success) {
        toast.success(res.msg || "对接成功")
      } else {
        toast.error(res.msg || "对接失败，请联系客服")
      }
    } catch {
      toast.error("对接失败，请联系客服")
    } finally {
      setJoiningUid(null)
    }
  }

  // 复制对接码（次要操作）
  const copyUid = async (uid: string) => {
    try {
      await navigator.clipboard.writeText(uid)
      setCopiedUid(uid)
      setTimeout(() => setCopiedUid(null), 2000)
      toast.success("对接码已复制")
    } catch {
      toast.error("复制失败")
    }
  }

  const loggedIn = !!(smsUser || getSmsUser())

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">搜索对接</h1>
        <p className="text-muted-foreground text-sm">
          搜索项目前缀 → 选择项目 → 点击确认加载 → 点击对接
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <Input
          placeholder="请输入搜索前缀"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              handleSearchProject()
            }
          }}
          className="border-0 bg-transparent text-primary text-lg h-12 placeholder:text-muted-foreground"
        />
        <Button
          onClick={handleSearchProject}
          disabled={searchLoading}
          className="h-12 rounded-none bg-blue-500 hover:bg-blue-600 text-white px-6"
        >
          {searchLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-1" />
              搜索项目
            </>
          )}
        </Button>
      </div>

      {/* 选择项目 + 确认加载 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={selectedProject?.id ?? ""}
          onValueChange={handleSelectProject}
          disabled={searchResults.length === 0}
        >
          <SelectTrigger className="bg-card border-border h-12 text-primary flex-1">
            <SelectValue placeholder={searchResults.length > 0 ? "请选择项目" : "搜索后可在此选择项目"} />
          </SelectTrigger>
          <SelectContent>
            {searchResults.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.id}---{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleDock}
          disabled={dockLoading || !selectedProject}
          className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white px-8"
        >
          {dockLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-1" />
              确认加载
            </>
          )}
        </Button>
      </div>

      {selectedProject && (
        <div className="text-sm text-muted-foreground px-1">
          当前项目：<span className="text-primary font-medium">{selectedProject.name}</span>
          <span className="ml-2">ID：{selectedProject.id}</span>
        </div>
      )}

      {!loggedIn && dockItems !== null && dockItems.length > 0 && (
        <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          未登录 API 账号，无法一键对接。请先登录后再点「对接」。
        </div>
      )}

      {/* 对接码列表 */}
      {dockItems !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">对接码列表</h2>
            <span className="text-sm text-muted-foreground">共 {dockItems.length} 条</span>
          </div>

          {dockItems.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
              暂无可对接的对接码
            </div>
          ) : (
            <div className="space-y-3">
              {dockItems.map((item) => {
                const isJoining = joiningUid === item.uid
                return (
                  <div
                    key={item.uid}
                    className="bg-card rounded-lg border border-border p-4 space-y-3"
                  >
                    {/* 标题行：对接码 + 对接 + 次要复制 */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {item.top && (
                          <span className="text-xs bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded font-medium">
                            置顶
                          </span>
                        )}
                        <span className="font-mono text-primary font-medium break-all">{item.uid}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleJoin(item.uid)}
                          disabled={!loggedIn || !!joiningUid}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                          title={!loggedIn ? "请先登录 API 账号" : undefined}
                        >
                          {isJoining ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plug className="h-4 w-4" />
                          )}
                          <span className="ml-1">{isJoining ? "对接中…" : "对接"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUid(item.uid)}
                          className="border-border"
                          title="复制对接码"
                        >
                          {copiedUid === item.uid ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 关键信息 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                        价格 ¥{item.price}
                      </span>
                      <span className="text-sm bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded">
                        余量 {item.available || "-"}
                      </span>
                      {item.segmentType && (
                        <span className="text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {item.segmentType}
                        </span>
                      )}
                    </div>

                    {/* 详细信息 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <InfoRow label="运营商" value={item.isp} />
                      <InfoRow label="省份" value={item.province} />
                      <InfoRow label="号段" value={item.segments} />
                      <InfoRow label="联系方式" value={item.contact} />
                      <InfoRow label="更新时间" value={item.time} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
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