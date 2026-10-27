import { type NextRequest, NextResponse } from "next/server"
import {
  DOCK_BEARER_FAIL_MSG,
  isVeetoAuthFailure,
  resolveVeetoBearer,
  veetoFetch,
} from "@/lib/veeto"

/**
 * 加入对接码
 * POST { token|cookie|bearer?, account?, djm|code|codes }
 * 也可 header x-sms-user / x-veeto-token
 * 用户对接：仅用链上/请求 Bearer，禁止回退 VEETO_BEARER
 */
export async function POST(request: NextRequest) {
  let body: {
    cookie?: string
    token?: string
    bearer?: string
    account?: string
    djm?: string
    code?: string
    codes?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, msg: "请求格式错误" }, { status: 400 })
  }

  const account = body.account || request.headers.get("x-sms-user")
  const bearer = await resolveVeetoBearer({
    fromRequest: body.token || body.bearer || body.cookie || request.headers.get("x-veeto-token"),
    account,
    allowEnvFallback: false,
  })
  if (!bearer) {
    return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG }, { status: 400 })
  }

  const codes = [
    ...(Array.isArray(body.codes) ? body.codes : []),
    body.djm || "",
    body.code || "",
  ]
    .map((c) => c.trim())
    .filter(Boolean)

  if (codes.length === 0) {
    return NextResponse.json({ success: false, msg: "请输入要加入的对接码" }, { status: 400 })
  }

  try {
    const { ok, status, json } = await veetoFetch("/bindings", bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes }),
    })

    if (!ok) {
      if (isVeetoAuthFailure(json, status)) {
        return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG })
      }
      return NextResponse.json({
        success: false,
        msg: json.message || json.msg || DOCK_BEARER_FAIL_MSG,
      })
    }

    const data = (json.data || {}) as {
      results?: Array<{ code?: string; ok?: boolean; message?: string }>
    }
    const results = Array.isArray(data.results) ? data.results : []
    const failed = results.filter((r) => r.ok === false)
    if (failed.length > 0 && failed.length === results.length) {
      return NextResponse.json({
        success: false,
        msg: failed.map((r) => r.message || r.code).join("；") || DOCK_BEARER_FAIL_MSG,
        results,
      })
    }

    return NextResponse.json({
      success: true,
      djm: codes[0],
      msg: json.message || "对接成功",
      results,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
