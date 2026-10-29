import { type NextRequest, NextResponse } from "next/server"
import {
  DOCK_BEARER_FAIL_MSG,
  isVeetoAuthFailure,
  resolveVeetoBearer,
  veetoFetch,
} from "@/lib/veeto"

/**
 * 号码检测（H5 / Veeto：新号/旧号）
 * POST { phone, sid, token|bearer|cookie?, account? }
 * 也可 header x-sms-user / x-veeto-token
 *
 * 上游: POST https://api.veeto.cn/v1/phones/{phone}/check
 * Body: { sid: number }
 * 鉴权：当前登录 api账号 链上 Bearer（禁止回退 VEETO_BEARER）
 */
function sanitizeCheckMsg(msg: unknown): string {
  const s = typeof msg === "string" ? msg.trim() : ""
  if (!s) return s
  if (/余额不足|不足.*余额|余额.*不足|money\s*not\s*enough|insufficient/i.test(s)) {
    return "余额不足"
  }
  return s
}

export async function POST(request: NextRequest) {
  let body: {
    phone?: string
    sid?: string | number
    cookie?: string
    token?: string
    bearer?: string
    account?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, msg: "请求格式错误" }, { status: 400 })
  }

  const phone = String(body.phone || "").trim()
  if (!phone) {
    return NextResponse.json({ success: false, msg: "缺少手机号" }, { status: 400 })
  }

  const sidRaw = body.sid
  const sidNum =
    typeof sidRaw === "number"
      ? sidRaw
      : Number.parseInt(String(sidRaw ?? "").trim(), 10)
  if (!Number.isFinite(sidNum) || sidNum <= 0) {
    return NextResponse.json({ success: false, msg: "缺少或无效的项目 sid" }, { status: 400 })
  }

  const account = body.account || request.headers.get("x-sms-user")
  const bearer = await resolveVeetoBearer({
    fromRequest: body.token || body.bearer || body.cookie || request.headers.get("x-veeto-token"),
    account,
    allowEnvFallback: false,
  })
  if (!bearer) {
    return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG }, { status: 401 })
  }

  try {
    const { ok, status, json } = await veetoFetch(
      `/phones/${encodeURIComponent(phone)}/check`,
      bearer,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sidNum }),
      },
    )

    if (!ok) {
      if (isVeetoAuthFailure(json, status)) {
        return NextResponse.json({ success: false, msg: DOCK_BEARER_FAIL_MSG })
      }
      const msg = sanitizeCheckMsg(json.message || json.msg) || "检测失败"
      return NextResponse.json({ success: false, msg, code: json.code })
    }

    const data = (json.data || {}) as { state?: string }
    const state = typeof data.state === "string" ? data.state : ""
    return NextResponse.json({
      success: true,
      msg: sanitizeCheckMsg(json.message || json.msg) || "ok",
      state,
      data: { state },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
