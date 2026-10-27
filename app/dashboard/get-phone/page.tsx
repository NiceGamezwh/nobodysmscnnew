"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Copy, Check, Search } from "lucide-react"
import {
  getPhone,
  specifyPhone,
  getMessage,
  releasePhone,
  addBlack,
  releaseAllPhones,
  searchProjects,
  ISP_OPTIONS,
  ASCRIPTION_OPTIONS,
  type PhoneResponse,
  type MessageResponse,
  type SearchProject,
} from "@/lib/api"
import { toast } from "sonner"

export default function GetPhonePage() {
  const [sid, setSid] = useState("")
  // 项目搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchProject[]>([])
  const [selectedProject, setSelectedProject] = useState<SearchProject | null>(null)
  const [isp, setIsp] = useState("")  // 默认不限运营商（省略 isp 参数）
  const [ascription, setAscription] = useState("")
  const [paragraph, setParagraph] = useState("")
  const [exclude, setExclude] = useState("")
  const [specifiedPhone, setSpecifiedPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [specifyLoading, setSpecifyLoading] = useState(false)
  const [phoneResult, setPhoneResult] = useState<PhoneResponse | null>(null)

  // 验证码相关状态
  const [codeResult, setCodeResult] = useState<MessageResponse | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const maxPollCount = 100
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 复制状态
  const [phoneCopied, setPhoneCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: "phone" | "code") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "phone") {
        setPhoneCopied(true)
        setTimeout(() => setPhoneCopied(false), 2000)
      } else {
        setCodeCopied(true)
        setTimeout(() => setCodeCopied(false), 2000)
      }
      toast.success(type === "phone" ? "号码已复制" : "验证码已复制")
    } catch {
      toast.error("复制失败")
    }
  }

  // 搜索项目
  const handleSearchProject = async () => {
    const keyword = searchKeyword.trim()
    if (!keyword) {
      toast.error("请输入项目名进行搜索")
      return
    }

    setSearchLoading(true)
    try {
      const res = await searchProjects(keyword)
      if (res.success && res.projects && res.projects.length > 0) {
        setSearchResults(res.projects)
        toast.success(`搜索到 ${res.projects.length} 个项目`)
      } else {
        setSearchResults([])
        toast.error(res.msg || "未搜索到相关项目")
      }
    } catch {
      setSearchResults([])
      toast.error("搜索失败，请稍后重试")
    } finally {
      setSearchLoading(false)
    }
  }

  // 选择项目 -> 将该项目ID作为当前项目ID
  const handleSelectProject = (id: string) => {
    const project = searchResults.find((p) => p.id === id)
    if (project) {
      setSelectedProject(project)
      setSid(project.id)
    }
  }

  // 获取号码
  const handleGetPhone = async () => {
    if (!sid) {
      toast.error("请输入项目ID")
      return
    }

    const token = sessionStorage.getItem("sms_token")
    if (!token) {
      toast.error("请先登录")
      return
    }

    setLoading(true)
    setCodeResult(null)
    stopAutoRefresh()

    try {
      const res = await getPhone(token, sid, {
        isp: isp && isp !== "all" ? isp : undefined,
        ascription: ascription && ascription !== "all" ? ascription : undefined,
        paragraph: paragraph || undefined,
        exclude: exclude || undefined,
      })
      if (res.code === "0") {
        setPhoneResult(res)
        toast.success("获取号码成功")
        // 自动开始轮询验证码
        startAutoRefresh()
      } else {
        toast.error(res.msg || "获取号码失败")
      }
    } catch {
      toast.error("网络错误")
    } finally {
      setLoading(false)
    }
  }

  // 指定号码
  const handleSpecifyPhone = async () => {
    if (!sid || !specifiedPhone) {
      toast.error("请输入项目ID和号码")
      return
    }

    const token = sessionStorage.getItem("sms_token")
    if (!token) {
      toast.error("请先登录")
      return
    }

    setSpecifyLoading(true)
    setCodeResult(null)
    stopAutoRefresh()

    try {
      const res = await specifyPhone(token, sid, specifiedPhone)
      if (res.code === "0") {
        setPhoneResult(res)
        toast.success("指定号码成功")
        startAutoRefresh()
      } else {
        toast.error(res.msg || "指定号码失败")
      }
    } catch {
      toast.error("网络错误")
    } finally {
      setSpecifyLoading(false)
    }
  }

  // 获取验证码
  const fetchMessage = async () => {
    if (!sid || !phoneResult?.phone) return false

    const token = sessionStorage.getItem("sms_token")
    if (!token) return false

    try {
      const res = await getMessage(token, sid, phoneResult.phone)
      setCodeResult(res)
      if (res.code === "0" && res.yzm) {
        toast.success("获取验证码成功")
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 开始自动轮询
  const startAutoRefresh = () => {
    setAutoRefresh(true)
    setPollCount(0)
  }

  // 停止自动轮询
  const stopAutoRefresh = () => {
    setAutoRefresh(false)
    setPollCount(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // 自动轮询逻辑
  useEffect(() => {
    if (autoRefresh && phoneResult?.phone && sid) {
      const doRefresh = async () => {
        const success = await fetchMessage()
        if (success) {
          stopAutoRefresh()
        } else {
          setPollCount((prev) => {
            if (prev >= maxPollCount - 1) {
              stopAutoRefresh()
              toast.error("轮询已达上限")
              return prev
            }
            return prev + 1
          })
        }
      }

      doRefresh()
      intervalRef.current = setInterval(doRefresh, 3000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, phoneResult?.phone, sid])

  const isApiSuccess = (code: unknown, msg?: string) => {
    const c = String(code ?? "")
    if (c === "0" || c === "200") return true
    // 部分接口成功时 code 非 0，但 msg 含成功字样
    if (msg && /成功|已释放|取消成功|释放成功/.test(msg)) return true
    return false
  }

  // 释放号码
  const handleReleasePhone = async () => {
    if (!sid || !phoneResult?.phone) return

    const token = sessionStorage.getItem("sms_token")
    if (!token) return

    const releasedPhone = phoneResult.phone
    try {
      const res = await releasePhone(token, sid, releasedPhone)
      if (isApiSuccess(res.code, res.msg)) {
        toast.success(res.msg && /成功|释放|取消/.test(res.msg) ? res.msg : "号码已释放")
        // 成功后清空前端展示的号码，避免仍显示为占用中
        setPhoneResult(null)
        setCodeResult(null)
        setPhoneCopied(false)
        if (specifiedPhone === releasedPhone) setSpecifiedPhone("")
        stopAutoRefresh()
      } else {
        toast.error(res.msg || "释放失败")
      }
    } catch {
      toast.error("网络错误")
    }
  }

  // 拉黑号码
  const handleBlacklistPhone = async () => {
    if (!sid || !phoneResult?.phone) return

    const token = sessionStorage.getItem("sms_token")
    if (!token) return

    const blackPhone = phoneResult.phone
    try {
      const res = await addBlack(token, sid, blackPhone)
      if (isApiSuccess(res.code, res.msg)) {
        toast.success(res.msg && /成功|拉黑/.test(res.msg) ? res.msg : "号码已拉黑")
        setPhoneResult(null)
        setCodeResult(null)
        setPhoneCopied(false)
        if (specifiedPhone === blackPhone) setSpecifiedPhone("")
        stopAutoRefresh()
      } else {
        toast.error(res.msg || "拉黑失败")
      }
    } catch {
      toast.error("网络错误")
    }
  }

  // 释放全部
  const handleReleaseAll = async () => {
    const token = sessionStorage.getItem("sms_token")
    if (!token) return

    if (!confirm("确定要释放全部号码吗？")) return

    try {
      const res = await releaseAllPhones(token)
      if (isApiSuccess(res.code, res.msg)) {
        toast.success(res.msg && /成功|释放|取消/.test(res.msg) ? res.msg : "已释放全部号码")
        setPhoneResult(null)
        setCodeResult(null)
        setPhoneCopied(false)
        stopAutoRefresh()
      } else {
        toast.error(res.msg || "释放失败")
      }
    } catch {
      toast.error("网络错误")
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-3 p-4">
      {/* 项目搜索：输入项目名 -> 搜索 -> 下拉选择 -> 自动填入项目ID */}
      <div className="space-y-2">
        <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
          <Input
            placeholder="请输入短信前缀"
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
                搜索
              </>
            )}
          </Button>
        </div>

        {/* 搜索结果下拉框 */}
        <Select
          value={selectedProject?.id ?? ""}
          onValueChange={handleSelectProject}
          disabled={searchResults.length === 0}
        >
          <SelectTrigger className="bg-card border-border h-12 text-primary">
            <SelectValue placeholder={searchResults.length > 0 ? "请选择项目" : "搜索后在此选择项目"} />
          </SelectTrigger>
          <SelectContent>
            {searchResults.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.id}---{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 当前选中的项目ID提示 */}
        {sid && (
          <div className="text-sm text-muted-foreground px-1">
            当前项目ID：<span className="text-primary font-medium">{sid}</span>
            {selectedProject && <span className="ml-1">（{selectedProject.name}）</span>}
          </div>
        )}
      </div>

      {/* 运营商和类型选择 */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={isp || "all"} onValueChange={(v) => setIsp(v === "all" ? "" : v)}>
          <SelectTrigger className="bg-card border-border h-12 text-primary">
            <SelectValue placeholder="不限运营商" />
          </SelectTrigger>
          <SelectContent>
            {ISP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ascription} onValueChange={setAscription}>
          <SelectTrigger className="bg-card border-border h-12 text-primary">
            <SelectValue placeholder="不限类型" />
          </SelectTrigger>
          <SelectContent>
            {ASCRIPTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 指定号段 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">
          指定号段
        </span>
        <Input
          placeholder="请输入指定号段"
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          className="border-0 bg-transparent h-12 flex-1"
        />
      </div>

      {/* 排除号段 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">
          排除号段
        </span>
        <Input
          placeholder="请输入排除号段"
          value={exclude}
          onChange={(e) => setExclude(e.target.value)}
          className="border-0 bg-transparent h-12 flex-1"
        />
      </div>

      {/* 指定号码 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">
          指定号码
        </span>
        <Input
          placeholder="请输入需要指定的号码"
          value={specifiedPhone}
          onChange={(e) => setSpecifiedPhone(e.target.value)}
          className="border-0 bg-transparent h-12 flex-1"
        />
        <Button
          onClick={handleSpecifyPhone}
          disabled={specifyLoading || !specifiedPhone}
          className="h-12 rounded-none bg-amber-500 hover:bg-amber-600 text-white px-6"
        >
          {specifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "指定"}
        </Button>
      </div>

      {/* 号码显示 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">号码</span>
        <div className="flex-1 px-4 py-3">
          {phoneResult ? (
            <span className="text-primary font-mono text-lg">{phoneResult.phone}</span>
          ) : (
            <span className="text-muted-foreground">等待获取...</span>
          )}
        </div>
        {phoneResult && (
          <>
            <Button
              onClick={() => copyToClipboard(phoneResult.phone, "phone")}
              className="h-12 rounded-none bg-emerald-500 hover:bg-emerald-600 text-white px-4"
              title="复制号码"
            >
              {phoneCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleReleasePhone}
              className="h-12 rounded-none bg-teal-500 hover:bg-teal-600 text-white px-6"
            >
              释放
            </Button>
          </>
        )}
      </div>

      {/* 三个操作按钮 */}
      <div className="grid grid-cols-3 gap-3">
        <Button onClick={handleGetPhone} disabled={loading} className="h-12 bg-blue-500 hover:bg-blue-600 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "取号"}
        </Button>
        <Button
          onClick={handleBlacklistPhone}
          disabled={!phoneResult}
          className="h-12 bg-red-400 hover:bg-red-500 text-white"
        >
          拉黑
        </Button>
        <Button
          onClick={handleReleaseAll}
          variant="secondary"
          className="h-12 bg-gray-400 hover:bg-gray-500 text-white"
        >
          释放全部
        </Button>
      </div>

      {/* 号码信息显示 */}
      {phoneResult && (
        <div className="bg-muted/30 rounded-lg px-4 py-2 text-sm flex items-center gap-3 flex-wrap">
          <span className="text-muted-foreground">最后来码时间:</span>
          <span>{new Date().toLocaleString("zh-CN")}</span>
          <span className="bg-card px-2 py-0.5 rounded border border-border">{phoneResult.sp}</span>
          <span className="bg-card px-2 py-0.5 rounded border border-border">{phoneResult.phone_gsd}</span>
        </div>
      )}

      {/* 识别码 */}
      <div className="bg-card rounded-lg border border-border flex items-center overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">识别码</span>
        <div className="flex-1 px-4 py-3">
          {codeResult?.code === "0" && codeResult?.yzm ? (
            <span className="text-primary font-mono text-xl font-bold">{codeResult.yzm}</span>
          ) : (
            <span className="text-muted-foreground">
              {autoRefresh ? "等待获取验证码" : phoneResult ? "点击取号后自动获取" : "等待获取验证码"}
            </span>
          )}
        </div>
        {codeResult?.code === "0" && codeResult?.yzm && (
          <Button
            onClick={() => copyToClipboard(codeResult.yzm!, "code")}
            className="h-12 rounded-none bg-emerald-500 hover:bg-emerald-600 text-white px-4"
            title="复制验证码"
          >
            {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* 短信内容 */}
      <div className="bg-card rounded-lg border border-border flex items-start overflow-hidden">
        <span className="px-4 py-3 text-muted-foreground bg-muted/30 border-r border-border min-w-[100px]">
          短信内容
        </span>
        <div className="flex-1 px-4 py-3 min-h-[48px]">
          {codeResult?.code === "0" && codeResult?.sms ? (
            <span className="text-foreground">{codeResult.sms}</span>
          ) : (
            <span className="text-muted-foreground">
              {autoRefresh
                ? `等待获取验证码...(${pollCount}/${maxPollCount})`
                : phoneResult
                  ? "等待获取验证码..."
                  : "等待获取验证码..."}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
