import { type NextRequest, NextResponse } from "next/server"
import { resolveVeetoBearer, triplePrice, veetoFetch } from "@/lib/veeto"

/**
 * 我的对接列表
 * POST { token|cookie|bearer?, account?, page?, keyword? }
 */
type VeetoBinding = {
  code?: string
  projectId?: string
  projectName?: string
  price?: string
  available?: number
  operators?: string[]
  provinces?: string[]
  prefixes?: string[]
  segmentType?: string
  contact?: string
  lastUsedAt?: string | null
  status?: string
}

export async function POST(request: NextRequest) {
  let body: {
    cookie?: string
    token?: string
    bearer?: string
    account?: string
    page?: number
    keyword?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, msg: "请求格式错误" }, { status: 400 })
  }

  const page = body.page && body.page > 0 ? body.page : 1
  const keyword = (body.keyword || "").trim().toLowerCase()
  const account = body.account || request.headers.get("x-sms-user")

  const bearer = await resolveVeetoBearer({
    fromRequest: body.token || body.bearer || body.cookie || request.headers.get("x-veeto-token"),
    account,
  })

  if (!bearer) {
    return NextResponse.json(
      {
        success: false,
        msg: "缺少 Veeto Bearer：请登录后由链上映射提供，或粘贴 Bearer / 配置 VEETO_BEARER",
      },
      { status: 400 },
    )
  }

  try {
    const { ok, json } = await veetoFetch(`/bindings?page=${page}&size=50`, bearer)
    if (!ok) {
      return NextResponse.json({
        success: false,
        msg: json.message || json.msg || "获取已对接列表失败，请检查 Bearer 是否有效",
      })
    }

    const data = (json.data || {}) as { list?: VeetoBinding[] }
    let list = Array.isArray(data.list) ? data.list : []
    if (keyword) {
      list = list.filter((item) => {
        const hay = `${item.code || ""} ${item.projectName || ""} ${item.projectId || ""}`.toLowerCase()
        return hay.includes(keyword)
      })
    }

    const items = list.map((raw) => ({
      uid: raw.code || "",
      name: raw.projectName || "",
      price: triplePrice(String(raw.price || "")),
      status: raw.status === "joined" ? "已对接" : raw.status || "",
      available: raw.available == null ? "" : String(raw.available),
      isp: (raw.operators || []).filter(Boolean).join(" / "),
      province: (raw.provinces || []).filter(Boolean).join(" / "),
      segmentType: raw.segmentType || "",
      segments: (raw.prefixes || []).filter(Boolean).join(" "),
      contact: raw.contact || "",
      time: raw.lastUsedAt || "",
    }))

    return NextResponse.json({ success: true, page, keyword: body.keyword || "", items })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
