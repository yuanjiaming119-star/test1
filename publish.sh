#!/usr/bin/env bash
#
# 一键把网站发布到公网，得到一个可以直接发给朋友的 https 链接。
#
#   ./publish.sh          # 用默认端口 8765
#   ./publish.sh 9000     # 指定端口
#
# 说明：
#   - 这是「临时链接」，不需要注册任何账号
#   - 链接地址形如 https://xxx-xxx.trycloudflare.com
#   - 必须保持这个窗口开着；关掉（或按 Ctrl+C）链接立即失效
#   - 想长期挂着，请用 GitHub Pages，见 README.md
#
set -euo pipefail

PORT="${1:-8765}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CF="$DIR/.tools/cloudflared"

# ---------- 隧道工具缺失时自动下载 ----------
if [ ! -x "$CF" ]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64)  PLATFORM="darwin-arm64" ;;
    x86_64) PLATFORM="darwin-amd64" ;;
    *)      echo "❌ 不支持的系统架构：$ARCH" >&2; exit 1 ;;
  esac

  echo "⬇️  正在下载隧道工具（仅首次需要）..."
  mkdir -p "$DIR/.tools"
  curl -fsSL -o "$DIR/.tools/cloudflared.tgz" \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-${PLATFORM}.tgz"
  tar -xzf "$DIR/.tools/cloudflared.tgz" -C "$DIR/.tools"
  rm -f "$DIR/.tools/cloudflared.tgz"
  chmod +x "$CF"
fi

# ---------- 端口被占用时自动往后找一个 ----------
port_free() {
  ! nc -z 127.0.0.1 "$1" >/dev/null 2>&1
}
while ! port_free "$PORT"; do
  echo "⚠️  端口 $PORT 已被占用，换 $(($PORT + 1))"
  PORT=$(($PORT + 1))
done

cd "$DIR"

# ---------- 起本地静态服务器 ----------
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

# 等服务器起来
for _ in $(seq 1 20); do
  if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

echo
echo "✅ 本地服务已启动： http://localhost:$PORT"
echo "📡 正在建立公网隧道，稍等几秒..."
echo

# ---------- 开隧道（前台运行，Ctrl+C 结束） ----------
# 这里不能用 exec：exec 会把当前 shell 替换掉，
# 上面注册的 trap 就失效了，退出时后台的静态服务器会变成僵尸进程
"$CF" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate
