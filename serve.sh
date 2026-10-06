#!/usr/bin/env bash
#
# 只在本地预览，方便自己调样式。
#
#   ./serve.sh          # 默认 8765
#   ./serve.sh 9000     # 指定端口
#
# 注意：本地预览时聊天功能是正常的（http:// 协议满足 Dify 的 CSP 要求），
# 但直接双击 HTML 用 file:// 打开时聊天会被浏览器拦截。
#
set -euo pipefail

PORT="${1:-8765}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$DIR"

echo "本地预览： http://localhost:$PORT"
echo "按 Ctrl+C 停止"
echo

exec python3 -m http.server "$PORT" --bind 127.0.0.1
