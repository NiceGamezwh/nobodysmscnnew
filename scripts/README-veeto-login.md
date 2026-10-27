# veeto-login.py

账号---密码 一次输入 → 弹出点选验证码 → 打印 Bearer。

## 用法

```bat
cd /d E:\zwhnb\nobodysmscn-main
py -3 scripts\veeto-login.py
py -3 scripts\veeto-login.py 账号---密码
py -3 scripts\veeto-login.py 账号---密码 --write-env .env.local
```

提示符是 `账号---密码:`，中间三个短横线。点选错了会自动换新验证码重试（默认最多 5 次）。需要更大图：`py -3 -m pip install pillow`。

## Bearer 会过期吗？

会。官方没写清是「固定几天」还是「闲置才掉」。抓包里会话 cookie 的 Max-Age 约 10 天。对接一旦 401，重新跑本脚本换新 Token 即可。
