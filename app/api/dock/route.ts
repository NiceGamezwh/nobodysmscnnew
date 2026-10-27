import { type NextRequest, NextResponse } from "next/server"
import { resolveVeetoBearer, triplePrice, veetoFetch } from "@/lib/veeto"

/**
 * 搜索公开对接码列表
 * GET /api/dock?sid=<十六进制sid>
 * 可选 token / x-veeto-token；account / x-sms-user → 链上查找
 */
type VeetoPublicCode = {
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
  pinned?: boolean
  createdAt?: string | null
}

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get("sid")?.trim() || ""
  if (!sid) {
    return NextResponse.json({ success: false, msg: "缺少项目 sid" }, { status: 400 })
  }

  const account =
    request.nextUrl.searchParams.get("account") ||
    request.headers.get("x-sms-user")

  const bearer = await resolveVeetoBearer({
    fromRequest:
      request.nextUrl.searchParams.get("token") || request.headers.get("x-veeto-token"),
    account,
  })
  if (!bearer) {
    return NextResponse.json(
      {
        success: false,
        msg: "缺少 Veeto Bearer：请登录后由链上映射提供，或配置 VEETO_BEARER / 传 token",
      },
      { status: 401 },
    )
  }

  try {
    const { ok, json } = await veetoFetch(
      `/projects/${encodeURIComponent(sid)}/public-codes`,
      bearer,
    )

    if (!ok) {
      const msg = json.message || json.msg || "加载对接码失败"
      const hint =
        json.code === 401 || json.message === "Unauthorized"
          ? "（Bearer 无效或已过期）"
          : ""
      return NextResponse.json({ success: false, msg: `${msg}${hint}` })
    }

    const list = Array.isArray(json.data) ? (json.data as VeetoPublicCode[]) : []
    const items = list.map((raw) => ({
      uid: raw.code || "",
      name: raw.projectName || "",
      price: triplePrice(String(raw.price || "")),
      available: raw.available == null ? "" : String(raw.available),
      isp: (raw.operators || []).filter(Boolean).join(" / "),
      province: (raw.provinces || []).filter(Boolean).join(" / "),
      segmentType: raw.segmentType || "",
      segments: (raw.prefixes || []).filter(Boolean).join(" "),
      contact: raw.contact || "",
      top: Boolean(raw.pinned),
      time: raw.createdAt || "",
    }))

    return NextResponse.json({ success: true, sid, items })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
