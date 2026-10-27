import { type NextRequest, NextResponse } from "next/server"
import {
  DOCK_BEARER_FAIL_MSG,
  isVeetoAuthFailure,
  resolveVeetoBearer,
  veetoFetch,
} from "@/lib/veeto"

/**
 * 搜索项目
 * GET /api/search-project?keyword=...
 * 可选：?token=<veeto bearer> 或 header x-veeto-token
 * 账号：?account= 或 header x-sms-user → 链上 getBearer
 * 用户对接：仅用链上/请求 Bearer，禁止回退 VEETO_BEARER
 */
type VeetoProject = { id?: string; sid?: string; name?: string }

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim()
  if (!keyword) {
    return NextResponse.json({ success: false, msg: "请输入搜索关键词" }, { status: 400 })
  }

  const account =
    request.nextUrl.searchParams.get("account") ||
    request.headers.get("x-sms-user")

  const bearer = await resolveVeetoBearer({
    fromRequest:
      request.nextUrl.searchParams.get("token") || request.headers.get("x-veeto-token"),
    account,
    allowEnvFallback: false,
  })
  if (!bearer) {
    return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG }, { status: 401 })
  }

  try {
    const { ok, status, json } = await veetoFetch(
      `/projects/search?keyword=${encodeURIComponent(keyword)}&size=50`,
      bearer,
    )

    if (!ok) {
      if (isVeetoAuthFailure(json, status)) {
        return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG })
      }
      const msg = json.message || json.msg || "搜索失败"
      return NextResponse.json({ success: false, msg })
    }

    const data = (json.data || {}) as { list?: VeetoProject[] }
    const list = Array.isArray(data.list) ? data.list : []
    const projects = list
      .map((p) => ({
        id: String(p.id || ""),
        name: String(p.name || ""),
        sid: String(p.sid || ""),
      }))
      .filter((p) => p.id && p.name)

    return NextResponse.json({ success: true, keyword, projects })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
