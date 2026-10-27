import { type NextRequest, NextResponse } from "next/server"
import {
  DOCK_BEARER_FAIL_MSG,
  isVeetoAuthFailure,
  resolveVeetoBearer,
  triplePrice,
  veetoFetch,
} from "@/lib/veeto"

/**
 * 搜索公开对接码列表
 * GET /api/dock?sid=<十六进制sid>
 * 可选 token / x-veeto-token；account / x-sms-user → 链上查找
 * 用户对接：仅用链上/请求 Bearer，禁止回退 VEETO_BEARER
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
    allowEnvFallback: false,
  })
  if (!bearer) {
    return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG }, { status: 401 })
  }

  try {
    const { ok, status, json } = await veetoFetch(
      `/projects/${encodeURIComponent(sid)}/public-codes`,
      bearer,
    )

    if (!ok) {
      if (isVeetoAuthFailure(json, status)) {
        return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG })
      }
      const msg = json.message || json.msg || "加载对接码失败"
      return NextResponse.json({ success: false, msg })
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
