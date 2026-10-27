#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
豪猪 / Veeto：账号密码 + 点选验证码 → 打印 Bearer。

用法（Windows / macOS / Linux，需 Python 3.8+，标准库即可）:
  python veeto-login.py
  # 提示里一次输入: 账号---密码
  python veeto-login.py 账号---密码
  python veeto-login.py 账号---密码 --write-env .env.local

说明:
  - 登录接口会过点选验证码（按提示顺序点 4 个图标），无法纯静默出 Token。
  - Bearer 是服务端会话 UUID（不是 JWT），会过期；对接接口返回 401 / 未授权时重新跑本脚本即可。
  - 拿到的值填到 .env.local 的 VEETO_BEARER=，或前端 sessionStorage 的 veeto_bearer。
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
import ssl
import urllib.error
import urllib.request

API = "https://api.veeto.cn/v1"
ORIGIN = "https://h5.haozhuma.com"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36"
)


_SSL_CTX = None


def _ssl_context() -> ssl.SSLContext:
    """本地代理 / 杀软常注入自签证书，默认校验证书会失败。"""
    global _SSL_CTX
    if _SSL_CTX is None:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        _SSL_CTX = ctx
    return _SSL_CTX


def api_post(path: str, body: dict) -> dict:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API + path,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": ORIGIN,
            "Referer": ORIGIN + "/",
            "User-Agent": UA,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"code": e.code, "message": raw or e.reason, "data": {}}


def fetch_captcha(retries: int = 5) -> tuple[str, bytes, bytes | None]:
    """返回 captchaId, 主图 PNG, 顺序提示图 PNG（可能为空）。"""
    last = None
    for _ in range(retries):
        j = api_post("/captcha", {})
        last = j
        if j.get("code") == 0 and isinstance(j.get("data"), dict):
            cid = j["data"].get("captchaId")
            img_b64 = j["data"].get("image") or ""
            order_b64 = j["data"].get("order") or ""
            if cid and img_b64:
                order_png = base64.b64decode(order_b64) if order_b64 else None
                return str(cid), base64.b64decode(img_b64), order_png
        wait = 2.2
        if isinstance(j.get("data"), dict) and j["data"].get("retryAfter"):
            wait = float(j["data"]["retryAfter"]) + 0.3
        time.sleep(wait)
    raise RuntimeError(f"获取验证码失败: {last}")


def pick_clicks_tk(png_bytes: bytes, order_png: bytes | None = None) -> list[dict]:
    """弹窗：上方顺序提示图 + 主图，按顺序点 4 次。坐标相对主图像素。"""
    try:
        import tkinter as tk
    except ImportError as e:
        raise RuntimeError("需要 tkinter（Windows 官方 Python 一般自带）") from e

    try:
        from PIL import Image, ImageTk  # type: ignore
    except ImportError:
        Image = ImageTk = None  # type: ignore

    root = tk.Tk()
    root.title("Veeto 登录验证码 — 按上方顺序依次点击")
    root.resizable(False, False)

    clicks: list[dict] = []
    status = tk.StringVar(value="请按上方顺序，在下图依次点击 4 个图标（第 1/4）")

    # 顺序提示条（接口 data.order）
    if order_png:
        tk.Label(root, text="点击顺序（从左到右）：", font=("Segoe UI", 10)).pack(anchor="w", padx=8, pady=(8, 0))
        if Image is not None:
            oim = Image.open(io.BytesIO(order_png))
            o_scale = 3
            oshow = oim.resize((oim.width * o_scale, oim.height * o_scale), Image.Resampling.NEAREST)
            ophoto = ImageTk.PhotoImage(oshow)
            olbl = tk.Label(root, image=ophoto)
            olbl.image = ophoto
            olbl.pack(padx=8, pady=4)
        else:
            ophoto = tk.PhotoImage(data=base64.b64encode(order_png))
            # PhotoImage 可能不支持放大倍数很大，尽量 zoom
            try:
                ophoto = ophoto.zoom(2, 2)
            except tk.TclError:
                pass
            olbl = tk.Label(root, image=ophoto)
            olbl.image = ophoto
            olbl.pack(padx=8, pady=4)

    if Image is not None:
        im = Image.open(io.BytesIO(png_bytes))
        nat_w, nat_h = im.size
        scale = 2 if max(nat_w, nat_h) < 400 else 1
        show = im.resize((nat_w * scale, nat_h * scale), Image.Resampling.NEAREST)
        photo = ImageTk.PhotoImage(show)
        canvas = tk.Canvas(root, width=show.width, height=show.height, highlightthickness=0)
        canvas.create_image(0, 0, anchor="nw", image=photo)
        canvas.image = photo
        map_xy = lambda x, y: {"x": int(round(x / scale)), "y": int(round(y / scale))}
    else:
        photo = tk.PhotoImage(data=base64.b64encode(png_bytes))
        nat_w, nat_h = photo.width(), photo.height()
        canvas = tk.Canvas(root, width=nat_w, height=nat_h, highlightthickness=0)
        canvas.create_image(0, 0, anchor="nw", image=photo)
        canvas.image = photo
        map_xy = lambda x, y: {"x": int(x), "y": int(y)}

    marks: list[int] = []

    def on_click(event):
        if len(clicks) >= 4:
            return
        pt = map_xy(event.x, event.y)
        clicks.append(pt)
        r = 8
        marks.append(
            canvas.create_oval(
                event.x - r, event.y - r, event.x + r, event.y + r,
                outline="#22c55e", width=2,
            )
        )
        canvas.create_text(
            event.x, event.y, text=str(len(clicks)),
            fill="#16a34a", font=("Segoe UI", 10, "bold"),
        )
        if len(clicks) < 4:
            status.set(f"已点 {len(clicks)}/4，继续按顺序点")
        else:
            status.set("已点满 4 个，提交中…")
            root.after(120, root.quit)

    def on_reset():
        clicks.clear()
        for m in marks:
            canvas.delete(m)
        marks.clear()
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=canvas.image)
        status.set("已重置，请按提示顺序重新点 4 次（第 1/4）")

    def on_cancel():
        clicks.clear()
        root.quit()

    canvas.bind("<Button-1>", on_click)
    canvas.pack(padx=8, pady=8)
    tk.Label(root, textvariable=status, font=("Segoe UI", 11)).pack(pady=(0, 4))
    bar = tk.Frame(root)
    bar.pack(pady=(0, 8))
    tk.Button(bar, text="重选", command=on_reset, width=10).pack(side="left", padx=4)
    tk.Button(bar, text="取消", command=on_cancel, width=10).pack(side="left", padx=4)

    root.attributes("-topmost", True)
    root.update()
    root.attributes("-topmost", False)
    root.mainloop()
    try:
        root.destroy()
    except tk.TclError:
        pass

    if len(clicks) != 4:
        raise SystemExit("已取消或未点满 4 次")
    return clicks


def extract_bearer(payload: dict) -> str | None:
    data = payload.get("data")
    if isinstance(data, str) and data.strip():
        return data.strip()
    if isinstance(data, dict):
        for key in (
            "token", "accessToken", "access_token", "bearer", "Bearer",
            "authorization", "Authorization",
        ):
            v = data.get(key)
            if isinstance(v, str) and v.strip():
                t = v.strip()
                if t.lower().startswith("bearer "):
                    t = t[7:].strip()
                return t
        for nest in ("user", "session", "auth"):
            sub = data.get(nest)
            if isinstance(sub, dict):
                for key in ("token", "accessToken", "access_token", "bearer"):
                    v = sub.get(key)
                    if isinstance(v, str) and v.strip():
                        return v.strip()
    return None


def write_env(path: str, bearer: str) -> None:
    path = os.path.abspath(path)
    lines: list[str] = []
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith("VEETO_BEARER="):
            out.append(f"VEETO_BEARER={bearer}")
            found = True
        else:
            out.append(line)
    if not found:
        if out and out[-1].strip():
            out.append("")
        out.append(f"VEETO_BEARER={bearer}")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    print(f"已写入 {path}")


def login_once(username: str, password: str) -> dict:
    captcha_id, png, order_png = fetch_captcha()
    print(f"验证码 id: {captcha_id}（上方顺序条从左到右，在下图点对应图标）")
    clicks = pick_clicks_tk(png, order_png)
    print("点击坐标:", clicks)
    return api_post(
        "/auth/login",
        {
            "username": username,
            "password": password,
            "captchaId": captcha_id,
            "clicks": clicks,
        },
    )


def parse_account_pair(text: str) -> tuple[str, str] | tuple[None, None]:
    """一次粘贴: 账号---密码（三个短横线分隔）。"""
    s = (text or "").strip()
    if "---" not in s:
        return None, None
    user, _, pwd = s.partition("---")
    user, pwd = user.strip(), pwd.strip()
    if user and pwd:
        return user, pwd
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Veeto 账号密码 → Bearer。一次输入格式: 账号---密码"
    )
    parser.add_argument(
        "account",
        nargs="?",
        help="账号---密码（三个短横线），也可运行后按提示粘贴",
    )
    parser.add_argument(
        "--write-env",
        metavar="PATH",
        help="成功后写入 VEETO_BEARER= 到该文件（如 .env.local）",
    )
    parser.add_argument(
        "--max-tries",
        type=int,
        default=5,
        help="验证码点错时最多重试次数（默认 5）",
    )
    args = parser.parse_args()

    username = ""
    password = ""

    if args.account:
        u2, p2 = parse_account_pair(args.account)
        if not u2 or not p2:
            print("账号格式应为: 账号---密码", file=sys.stderr)
            return 2
        username, password = u2, p2
    else:
        raw = input("账号---密码: ").strip()
        u2, p2 = parse_account_pair(raw)
        if not u2 or not p2:
            print("格式不对，请按 账号---密码 一次粘贴（中间三个短横线）", file=sys.stderr)
            return 2
        username, password = u2, p2

    last = None
    for attempt in range(1, args.max_tries + 1):
        print(f"\n—— 第 {attempt}/{args.max_tries} 次 ——")
        try:
            last = login_once(username, password)
        except SystemExit as e:
            print(e)
            return 1
        except Exception as e:
            print(f"请求失败: {e}", file=sys.stderr)
            return 1

        code = last.get("code")
        msg = last.get("message") or last.get("msg") or ""
        print("接口返回:", json.dumps(last, ensure_ascii=False)[:500])

        if code == 0:
            bearer = extract_bearer(last)
            if not bearer:
                print("登录成功但未识别到 token 字段，请把上面 JSON 发给我改脚本。")
                return 3
            print("\n======== Bearer ========")
            print(bearer)
            print("========================")
            print(
                "\n过期说明: 会过期（服务端会话，不是带 exp 的 JWT）。"
                "对接接口若 401 / 未授权，重新跑本脚本换新 Bearer 即可。"
            )
            if args.write_env:
                write_env(args.write_env, bearer)
            return 0

        if code in (100900, 100901) or "验证码" in str(msg):
            print(f"验证码未通过: {msg}，再试一次…")
            time.sleep(0.5)
            continue

        print(f"登录失败 [{code}]: {msg}")
        return 1

    print("多次验证码失败，请稍后重试。最后一次:", last)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
