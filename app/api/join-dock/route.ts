import { type NextRequest, NextResponse } from "next/server"
import { resolveVeetoBearer, veetoFetch } from "@/lib/veeto"

/**
 * 加入对接码
 * POST { token|cookie|bearer?, account?, djm|code|codes }
 * 也可 header x-sms-user / x-veeto-token
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
    const { ok, json } = await veetoFetch("/bindings", bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes }),
    })

    if (!ok) {
      return NextResponse.json({
        success: false,
        msg: json.message || json.msg || "加入失败，请检查 Bearer 或对接码",
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
        msg: failed.map((r) => r.message || r.code).join("；") || "加入失败",
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
