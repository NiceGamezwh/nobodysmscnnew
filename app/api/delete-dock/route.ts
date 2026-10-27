import { type NextRequest, NextResponse } from "next/server"
import { resolveVeetoBearer, veetoFetch } from "@/lib/veeto"

/**
 * 删除已加入对接码
 * POST { token|cookie|bearer?, account?, uid|code|codes }
 */
export async function POST(request: NextRequest) {
  let body: {
    cookie?: string
    token?: string
    bearer?: string
    account?: string
    uid?: string
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
    body.uid || "",
    body.code || "",
  ]
    .map((c) => c.trim())
    .filter(Boolean)

  if (codes.length === 0) {
    return NextResponse.json({ success: false, msg: "缺少要删除的对接码" }, { status: 400 })
  }

  try {
    const { ok, json } = await veetoFetch("/bindings/batch", bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", codes }),
    })

    if (!ok) {
      return NextResponse.json({
        success: false,
        msg: json.message || json.msg || "删除失败，请检查 Bearer 是否有效",
      })
    }

    return NextResponse.json({
      success: true,
      uid: codes[0],
      msg: json.message || "删除成功",
      data: json.data,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
