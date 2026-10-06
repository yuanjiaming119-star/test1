# 圆子的个人网站

纯 HTML / CSS / JavaScript，零依赖、零构建。

## 文件结构

```
个人网站/
├── index.html      ← 页面（复古像素风）🎮
├── style.css
├── script.js
├── publish.sh      ← 一键发布到公网（临时链接）
├── serve.sh        ← 本地预览
└── README.md
```

只有像素版这一个页面，已接入 **Dify AI 小助手**（右下角气泡按钮）。

---

## 🚀 发给朋友看（最快的方式）

```bash
cd "/Users/zoeyuen/Downloads/个人网站"
./publish.sh
```

脚本会自动做三件事：起本地服务 → 建立 Cloudflare 隧道 → 打印一个公网地址，形如：

```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

把这个地址发给朋友即可，手机也能正常打开。

**这个链接的特点：**

| | |
| --- | --- |
| ✅ 免费、**不用注册任何账号** | 首次运行会自动下载隧道工具（约 30MB） |
| ✅ HTTPS | Dify 聊天要求安全上下文，必须用它 |
| ⚠️ **临时** | 必须保持终端窗口开着；按 `Ctrl+C` 或关掉窗口，链接立即失效 |
| ⚠️ 每次地址都不同 | 重启会换一个新域名 |

想长期挂着，见下面「永久发布」。

---

## 🖥️ 只在本地调样式

```bash
./serve.sh          # 默认 8765
./serve.sh 9000     # 换端口
```

然后访问 <http://localhost:8765>。

> 本地预览时聊天功能是正常的（`http://` 满足 Dify 的 CSP 要求）。

---

## ⚠️ 为什么不能直接双击 HTML

用 `file://` 打开时，浏览器会因为 CSP 规则（`frame-ancestors *` 不匹配 `file:` 协议）
拦掉 `udify.app` 的聊天 iframe，**聊天窗口会是一片空白**。
这跟代码无关，是浏览器的安全限制，页面里已经做了友好提示。

**任何 `http://` / `https://` 环境都正常**，包括本地服务器和各种静态托管。

---

## 🌐 永久发布（GitHub Pages）

想要一个长期有效、随时能发的网址，推荐 GitHub Pages：

1. 在 <https://github.com/new> 建一个仓库，名字用**英文**，例如 `yuanzi-site`
2. 回到本目录执行：

```bash
cd "/Users/zoeyuen/Downloads/个人网站"
git init
git add .
git commit -m "我的个人网站"
git branch -M main
git remote add origin https://github.com/你的用户名/yuanzi-site.git
git push -u origin main
```

> 首次 push 会要求登录，用 GitHub 的 **Personal Access Token** 当密码
> （在 GitHub → Settings → Developer settings → Tokens 生成，勾选 `repo` 权限）。

3. 打开仓库的 **Settings → Pages**，Source 选 `Deploy from a branch`，
   Branch 选 `main` + `/ (root)`，保存。

等一两分钟后访问 `https://你的用户名.github.io/yuanzi-site/`。

> 目录名和仓库名都**不要用中文**，否则网址会变成一长串 `%E5%A4%8D...` 乱码。
> 本项目已经处理过这个问题：像素版原来叫 `复古版`，已改名为英文路径。

---

## ⚠️ 发布前请知悉：Dify 的 token 是公开的

`index.html` 里的这段配置会随网页一起发给所有访客：

```js
window.difyChatbotConfig = { token: "6UvLSiu68MEZzSpy", ... };
```

这是 Dify 嵌入式机器人的**正常设计**（token 本来就放在前端），但意味着：

- 任何人查看网页源代码都能拿到这个 token
- 任何人（不只你朋友）都能打开你的链接跟机器人聊天，**消耗你的额度**
- 如果被恶意刷量，可以去 Dify 后台**重置 token**，然后同步更新两个 `index.html`

**建议**：给它设置用量上限，或定期看一眼后台的调用量。

---

## 换成你自己的信息

搜这几个占位关键词就能找到全部要改的地方：

| 关键词 | 位置 |
| --- | --- |
| `圆子` / `YUANZI` | 页面标题、主角档案 |
| `yuanzi@example.com` | 邮箱 |
| `https://github.com` | GitHub 链接 |
| 项目关卡 / 成就解锁 | 项目与经历 |

改主题色：改 `style.css` 顶部 `:root` 里的变量。

---

## Dify 聊天机器人配置

配置位于每个 `index.html` 的 `</body>` 之前：

```html
<script>
  window.difyChatbotConfig = {
    token: "6UvLSiu68MEZzSpy",   // 换成你自己的 token
    baseUrl: "https://udify.app",
  };
</script>
<script src="https://udify.app/embed.min.js" id="6UvLSiu68MEZzSpy" defer></script>
```

注意两点：

1. 配置脚本必须写在 `embed.min.js` **之前**，否则读不到 token；
2. `script` 标签的 `id` 必须和 `token` 保持一致。

可选字段（`inputs` / `systemVariables` / `userVariables`）已留好注释，需要时取消注释填写。

### 小助手的三个定制

**① 图标换成了像素圆子**

图标是运行时用 canvas 画的：`script.js` 里的 `CHAT_SPRITE` 是一张 16×16 字符画，
逐格填色后 `toDataURL()` 导出成 data URL，再通过 CSS 变量
`--chat-open-icon` / `--chat-close-icon` 贴到 Dify 的图标上。
想换形象就改那张字符画，颜色表在 `CHAT_COLORS`。

> ⚠️ 一个踩过的坑：**不要用 `display: none` 把 Dify 的 `<svg>` 整个藏掉**。
> Dify 靠 `#openIcon` / `#closeIcon` 这两个 svg 的显隐来判断聊天窗口的开合状态，
> 藏掉之后按钮就只会开、不会关。
> 正确做法是保留 svg 元素，只藏里面的 `<path>`，再把像素图作为 svg 的背景。

**② 「要不要聊两句？」引导气泡**

进站约 2.6 秒后出现在按钮上方，小尖角指向按钮，左侧有呼吸的「在线」指示灯。
出现时会响一声 8-bit「叮咚」（仅像素版）。行为：

- 点文字 → 直接打开聊天
- 点 × → 永久不再出现（记在 `localStorage.yuanzi_chat_hint`）
- 15 秒无人理会 → 自动收起（下次访问还会出现）
- 聊天窗口已打开时自动让位

想调文案就搜 `chat-hint-open`，想改出现时机就搜 `setTimeout(tryShow` / `setTimeout(showHint`。

**③ 聊天界面的复古外框（仅像素版）**

> ⚠️ **先说限制**：聊天界面在 `udify.app` 的跨域 iframe 里，
> **样式改不进去**；而且我核对过 `embed.min.js` 的源码，
> 它只读取 `token` / `baseUrl` / `inputs` / `systemVariables` / `userVariables`，
> **没有任何主题配置项**。所以不能给聊天界面换字体或配色。

**聊天内容一律保持原样白底黑字，不做任何调色。**

> 曾经给 iframe 加过 `filter: grayscale(1) sepia(1) hue-rotate(215deg) …`
> 做紫调复古，视觉上确实对味，但聊天界面本身是白底黑字，
> 整体染色后小字发灰、明显看不清，所以**已移除**。
> 教训：**任何铺在正文上的效果都会牺牲可读性，装饰只能放在边缘。**
> 如果以后还想尝试，务必先确认小字对比度可接受。

现在的复古感全部放在**窗口边缘**，一个像素都不压文字：

- 4px 深色像素描边 + 直角 + 硬阴影（在 `#dify-chatbot-bubble-window` 上）
- 四角取景框括号（`.chat-crt` 的 `::before`，`opacity: 0.4`）

`.chat-crt` 这个覆盖层由 JS（根目录 `script.js` 的 `initChatCrt`）生成，
位置用 `ResizeObserver`（窗口开合带过渡动画，尺寸逐帧在变）
+ `MutationObserver`（display 切换）实时跟随。

> ⚠️ 覆盖层必须 `pointer-events: none`，否则会把聊天界面挡得点不动。
> 验证方法：`document.elementFromPoint()` 在窗口中心应返回 iframe 本身。

点击 HUD 的 **📺** 可以关掉扫描线效果（含这个四角括号），
再点一次恢复。实现是 `body.no-crt` 下的规则。

**④ 样式覆盖**

在各自的 `style.css` 末尾，用 `!important` 覆盖 Dify 的内联样式。
因为 Dify 的按钮/窗口是脚本异步注入的，只能这样覆盖。

---

## 🎮 像素版的彩蛋

- 键盘输入 `↑ ↑ ↓ ↓ ← → ← → B A` 解锁隐藏关卡 + 像素圆子雨
- 连点像素头像 10 次有个小成就
- 右上角可开关 8-bit 音效 🔊 和 CRT 扫描线 📺（选择会被记住）
