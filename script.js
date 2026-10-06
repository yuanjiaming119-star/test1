/* ============================================================
   圆子 · 像素风个人网站 —— 交互脚本
   全部原生 JS，无任何依赖
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     0. 小工具
     ---------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* 无痕模式等场景静默失败 */
      }
    },
  };

  /* ----------------------------------------------------------
     1. 8-bit 音效引擎（Web Audio 合成方波，不需要音频文件）
     ---------------------------------------------------------- */
  const Sound = {
    ctx: null,
    on: store.get("yuanzi_sound", "on") === "on",

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    },

    /** 播放一个方波音符 */
    play(freq, duration = 0.07, delay = 0, volume = 0.05) {
      if (!this.on || !this.ctx) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(volume, t0);
      // 迅速衰减，模拟老游戏机的"哔"声
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    hover() {
      this.play(880, 0.035, 0, 0.022);
    },
    click() {
      this.play(1046, 0.05, 0, 0.05);
      this.play(1568, 0.06, 0.05, 0.05);
    },
    start() {
      [523, 659, 784, 1046].forEach((f, i) => this.play(f, 0.1, i * 0.09, 0.055));
    },
    coin() {
      this.play(988, 0.08, 0, 0.055);
      this.play(1319, 0.22, 0.08, 0.055);
    },
    /** 门铃「叮咚」，用于引导气泡出现 */
    doorbell() {
      this.play(1568, 0.09, 0, 0.042); // 叮
      this.play(1046, 0.18, 0.09, 0.042); // 咚
    },
    secret() {
      [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) =>
        this.play(f, 0.12, i * 0.1, 0.055)
      );
    },
  };

  function bindHoverSound(el) {
    el.addEventListener("mouseenter", () => Sound.hover());
  }

  /* ----------------------------------------------------------
     2. 背景星星
     ---------------------------------------------------------- */
  function createStars() {
    const box = $("#stars");
    if (!box) return;
    const frag = document.createDocumentFragment();
    const count = window.innerWidth < 720 ? 40 : 80;

    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = Math.random() < 0.75 ? 2 : 4; // 像素只取 2 或 4
      s.className = "star";
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = (Math.random() * 3).toFixed(2) + "s";
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  /* ----------------------------------------------------------
     3. 像素头像：用字符画逐格绘制到 canvas
     ---------------------------------------------------------- */
  const SPRITE = [
    "................",
    ".....wwwwww.....",
    "...wwwwwwwwww...",
    "..wwhhwwwwwwww..",
    ".wwwwwwwwwwwwww.",
    ".wwwwwwwwwwwwww.",
    "wwwwewwwwwwewwww",
    "wwwwewwwwwwewwww",
    "wwwwppwwwwppwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwwmmwwwwwww",
    "wwwwwwwwwwwwwwww",
    ".wwwwwwwwwwwwww.",
    "..wwwwwwwwwwww..",
    "...wwwwwwwwww...",
    ".....wwwwww.....",
  ];

  const COLORS = {
    w: "#fff6e0", // 汤圆本体
    h: "#ffffff", // 高光
    e: "#2b1b3d", // 眼睛
    p: "#ff8fb3", // 腮红
    m: "#d1467a", // 嘴巴
  };

  // 眯眼（眨眼用）
  const SPRITE_BLINK = SPRITE.map((row, i) =>
    i === 6 || i === 7 ? "wwwwwwwwwwwwwwww" : row
  );
  // 开心（张嘴大笑）
  const SPRITE_HAPPY = SPRITE.map((row, i) =>
    i === 11 ? "wwwwwwwmmwwwwwww" : row
  );

  // 关闭图标（聊天窗口打开时显示），8x8 像素 X
  const SPRITE_CLOSE = [
    "x......x",
    ".x....x.",
    "..x..x..",
    "...xx...",
    "...xx...",
    "..x..x..",
    ".x....x.",
    "x......x",
  ];
  const COLORS_CLOSE = { x: "#fff6e0" };

  const canvas = $("#avatar");

  /**
   * 把字符画逐格画到任意 canvas 上下文
   * @param ctx    目标上下文
   * @param sprite 字符画数组（尺寸由数组长度决定）
   * @param scale  每格放大倍数
   * @param palette 颜色表，默认用汤圆的配色
   */
  function renderSprite(ctx, sprite, scale, palette) {
    const colors = palette || COLORS;
    const size = sprite.length;
    ctx.clearRect(0, 0, size * scale, size * scale);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = colors[sprite[y][x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  /** 把字符画导出成 data URL，方便当作 CSS 背景图用 */
  function spriteToDataURL(sprite, scale, palette) {
    const size = sprite.length;
    const off = document.createElement("canvas");
    off.width = size * scale;
    off.height = size * scale;

    /** @type {CanvasRenderingContext2D | null} */
    const ctx = off.getContext("2d");
    if (!ctx) return "";

    renderSprite(ctx, sprite, scale, palette);
    return off.toDataURL("image/png");
  }

  function drawSprite(sprite) {
    if (!canvas) return;
    /** @type {CanvasRenderingContext2D | null} */
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 224 / 16 = 14，正好整数倍，保证像素不糊
    renderSprite(ctx, sprite, canvas.width / sprite.length);
  }

  function initAvatar() {
    if (!canvas) return;
    drawSprite(SPRITE);

    // —— 眨眼 ——
    setInterval(() => {
      drawSprite(SPRITE_BLINK);
      setTimeout(() => drawSprite(SPRITE), 140);
    }, 4200);

    // —— 点击头像：换表情 + 随机吐槽 ——
    const bubble = $("#avatar-bubble");
    const lines = [
      "圆子本圆 🍡",
      "要不要一起做个 AI 功能？",
      "需求先想清楚再找我哦～",
      "又在改 Prompt 了…",
      "今天也是想吃外卖的一天",
      "不要点我啦，痒 😆",
    ];
    let clicks = 0;
    let bubbleTimer = null;

    const showBubble = (text) => {
      if (!bubble) return;
      bubble.textContent = text;
      bubble.classList.add("show");
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove("show"), 2000);
    };

    const pet = () => {
      clicks++;
      Sound.click();
      drawSprite(SPRITE_HAPPY);
      setTimeout(() => drawSprite(SPRITE), 700);
      showBubble(lines[Math.floor(Math.random() * lines.length)]);

      if (clicks === 10) {
        showBubble("成就解锁：撸圆子十连击 🏅");
        Sound.secret();
      }
    };

    canvas.addEventListener("click", pet);
    canvas.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pet();
      }
    });
    canvas.setAttribute("role", "button");
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("title", "点一下试试");
  }

  /* ----------------------------------------------------------
     4. 打字机效果
     ---------------------------------------------------------- */
  function typeText(el, text, speed, done, silent) {
    let i = 0;
    el.textContent = "";
    const timer = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      // 打字哒哒声（终端长文本静音，避免太吵）
      if (!silent && i % 3 === 0) Sound.play(1500, 0.02, 0, 0.014);
      if (i >= text.length) {
        clearInterval(timer);
        if (typeof done === "function") done();
      }
    }, speed);
  }

  /** 职业头衔循环打字 */
  function initJobTyping() {
    const el = $("#typed-job");
    if (!el) return;

    const titles = [
      "AI 产品经理",
      "需求翻译官",
      "Prompt 调参师",
      "用户的好朋友",
      "Demo 终结者",
    ];
    let index = 0;
    let charIndex = 0;
    let deleting = false;

    function loop() {
      const current = titles[index];

      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          return setTimeout(loop, 1600); // 打完停顿
        }
      } else {
        charIndex--;
        el.textContent = current.slice(0, charIndex);
        if (charIndex <= 0) {
          deleting = false;
          charIndex = 0;
          index = (index + 1) % titles.length;
        }
      }
      setTimeout(loop, deleting ? 45 : 105);
    }

    loop();
  }

  /** 终端逐行打字 */
  function initTerminal() {
    const body = $("#terminal-body");
    if (!body) return;

    const script = [
      { text: "$ whoami", cls: "cmd" },
      { text: "  > 圆子，一名 AI 产品经理。", cls: "" },
      { text: "$ cat about.txt", cls: "cmd" },
      { text: "  > 我喜欢在「技术能做什么」和「用户到底要什么」之间找交点。", cls: "" },
      { text: "  > 白天写 PRD、跑评测、和算法同学认真吵架；", cls: "" },
      { text: "  > 晚上追新模型、抄作业、做各种没用但好玩的小玩具。", cls: "" },
      { text: "$ echo $MOTTO", cls: "cmd" },
      { text: "  > 把 AI 从 PPT 里拽出来，放进用户手里。", cls: "" },
    ];

    body.textContent = "";
    let lineIndex = 0;

    function nextLine() {
      if (lineIndex >= script.length) return;

      const line = script[lineIndex];
      const div = document.createElement("div");
      div.textContent = "";
      div.style.color = line.cls === "cmd" ? "#ffe14d" : "#6be675";
      body.appendChild(div);

      typeText(
        div,
        line.text,
        28,
        () => {
          lineIndex++;
          setTimeout(nextLine, 220);
        },
        true // 静音
      );
    }

    // 进入视口后再开始，避免用户还没看到就打完了
    observeOnce(body, nextLine);
  }

  /* ----------------------------------------------------------
     5. 滚动登场 + 进度条填充
     ---------------------------------------------------------- */
  function fillBars(root, animate) {
    $$(root ? root + " .bar > i" : ".bar > i").forEach((bar, i) => {
      if (bar.dataset.done === "1") return;
      bar.dataset.done = "1";
      const value = bar.dataset.fill || "0";
      if (animate) {
        setTimeout(() => {
          bar.style.width = value + "%";
        }, i * 90);
      } else {
        bar.style.width = value + "%";
      }
    });
  }

  function observeOnce(el, callback) {
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            io.disconnect();
            callback();
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
  }

  function initReveal() {
    const sections = $$(".reveal");

    if (!("IntersectionObserver" in window)) {
      sections.forEach((s) => {
        s.classList.add("in");
        s.style.opacity = 1;
        s.style.transform = "none";
      });
      fillBars(null, false);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("in");
          io.unobserve(el);

          // 进入视口后顺便填充该区块的进度条
          fillBars("#" + el.id, true);
          Sound.play(660, 0.04, 0, 0.02);
        });
      },
      { threshold: 0.12 }
    );

    sections.forEach((s) => io.observe(s));
  }

  /* ----------------------------------------------------------
     6. 启动屏：投币进入
     ---------------------------------------------------------- */
  function initBoot() {
    const boot = $("#boot");
    const coin = $("#insert-coin");
    if (!boot || !coin) return;

    bindHoverSound(coin);

    // 只负责"关掉启动屏"这件事
    const dismiss = () => {
      if (boot.classList.contains("gone")) return;
      boot.classList.add("gone");
      document.body.classList.remove("locked");
      // 启动屏结束后再开始打字，动画节奏更自然
      setTimeout(initJobTyping, 320);
    };

    const enter = () => {
      Sound.init();
      if (Sound.ctx && Sound.ctx.state === "suspended") Sound.ctx.resume();
      Sound.coin();
      dismiss();
    };

    coin.addEventListener("click", enter, { once: true });

    // 也支持直接按回车/空格进入
    document.addEventListener("keydown", (e) => {
      if (
        !boot.classList.contains("gone") &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        coin.click();
      }
    });

    // 老玩家：自动快速启动，不用每次刷新都等一遍
    if (parseInt(store.get("yuanzi_visits", "0"), 10) > 0) {
      const tag = boot.querySelector(".boot-tag");
      const hint = boot.querySelector(".boot-hint");
      if (tag) tag.textContent = "▶ QUICK BOOT";
      if (hint) hint.textContent = "老玩家已跳过启动动画 ✔";
      setTimeout(dismiss, 900);
    }
  }

  /* ----------------------------------------------------------
     7. HUD：音效 / CRT 开关
     ---------------------------------------------------------- */
  function initHud() {
    const btnSound = $("#btn-sound");
    const btnCrt = $("#btn-crt");

    // —— 音效 ——
    if (btnSound) {
      const syncSoundUI = () => {
        btnSound.textContent = Sound.on ? "🔊" : "🔇";
        btnSound.classList.toggle("off", !Sound.on);
      };
      syncSoundUI();
      bindHoverSound(btnSound);

      btnSound.addEventListener("click", () => {
        Sound.on = !Sound.on;
        store.set("yuanzi_sound", Sound.on ? "on" : "off");
        syncSoundUI();
        if (Sound.on) {
          Sound.init();
          Sound.click();
          toast("音效已开启 🔊");
        } else {
          toast("音效已关闭 🔇");
        }
      });
    }

    // —— CRT 扫描线 ——
    const crtOff = store.get("yuanzi_crt", "on") === "off";
    document.body.classList.toggle("no-crt", crtOff);

    if (btnCrt) {
      btnCrt.classList.toggle("off", crtOff);
      bindHoverSound(btnCrt);

      btnCrt.addEventListener("click", () => {
        const isOff = document.body.classList.toggle("no-crt");
        store.set("yuanzi_crt", isOff ? "off" : "on");
        btnCrt.classList.toggle("off", isOff);
        Sound.click();
        toast(isOff ? "已关闭扫描线 📺" : "扫描线已开启 📺");
      });
    }
  }

  /* ----------------------------------------------------------
     8. 轻提示 toast
     ---------------------------------------------------------- */
  let toastTimer = null;
  function toast(message, duration = 2000) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  /* ----------------------------------------------------------
     9. 复制邮箱
     ---------------------------------------------------------- */
  function initCopyMail() {
    const btn = $("#copy-mail");
    if (!btn) return;

    bindHoverSound(btn);

    btn.addEventListener("click", async () => {
      const mail = btn.dataset.mail || "";
      Sound.click();

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(mail);
        } else {
          // file:// 协议下的兜底方案
          const input = document.createElement("textarea");
          input.value = mail;
          input.style.position = "fixed";
          input.style.opacity = "0";
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
        }
        toast("邮箱已复制：" + mail + " ✅");
      } catch (err) {
        toast("复制失败，手动记一下：" + mail);
      }
    });
  }

  /* ----------------------------------------------------------
     9.5 AI 小助手（Dify）
     · 把默认聊天气泡图标换成像素圆子
     · 给机器人按钮配上 8-bit 音效
     · 监听窗口开合，好切换图标 / 收起引导气泡
     Dify 的节点是异步注入的，所以要轮询等它出现
     ---------------------------------------------------------- */
  /** 引导气泡的显隐，由聊天窗口开关状态决定 */
  function syncChatHint(chatOpen) {
    const hint = $("#chat-hint");
    if (!hint || hint.hidden) return;
    if (chatOpen) hint.hidden = true;
  }

  function initChatbot() {
    let warnedFileProtocol = false;

    // 像素图标只生成一次，复用同一个 data URL
    const openIcon = spriteToDataURL(SPRITE, 8); // 汤圆笑脸 16x16 → 128px
    const closeIcon = spriteToDataURL(SPRITE_CLOSE, 16, COLORS_CLOSE); // X 8x8 → 128px
    if (openIcon) {
      document.documentElement.style.setProperty(
        "--chat-open-icon",
        'url("' + openIcon + '")'
      );
    }
    if (closeIcon) {
      document.documentElement.style.setProperty(
        "--chat-close-icon",
        'url("' + closeIcon + '")'
      );
    }

    /** 监听聊天窗口的 display，同步 body 状态类 */
    const watchWindow = (win) => {
      if (win.dataset.openWatched === "1") return;
      win.dataset.openWatched = "1";

      const sync = () => {
        const chatOpen = getComputedStyle(win).display !== "none";
        document.body.classList.toggle("chat-open", chatOpen);
        syncChatHint(chatOpen);
      };

      sync();
      // Dify 通过切 style 来开关窗口
      new MutationObserver(sync).observe(win, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    };

    const bind = () => {
      const btn = document.getElementById("dify-chatbot-bubble-button");
      if (!btn) return false;

      if (btn.dataset.soundBound !== "1") {
        btn.dataset.soundBound = "1";
        btn.addEventListener("mouseenter", () => Sound.hover());
        btn.addEventListener("click", () => {
          // 这是用户手势，正好可以顺便把音频上下文唤醒
          Sound.init();
          if (Sound.ctx && Sound.ctx.state === "suspended") Sound.ctx.resume();
          Sound.click();

          // 双击 HTML 直接用时，浏览器会因为 CSP 拦掉 udify.app 的 iframe，
          // 这里给个提示，免得以为是坏的
          if (location.protocol === "file:" && !warnedFileProtocol) {
            warnedFileProtocol = true;
            toast(
              "💡 本地直开时聊天会被浏览器拦截，用本地服务器打开才能聊（见 README）",
              6000
            );
          }
        });
      }

      const win = document.getElementById("dify-chatbot-bubble-window");
      if (win) watchWindow(win);

      return !!win;
    };

    if (bind()) return;

    let tries = 0;
    const timer = setInterval(() => {
      if (bind() || ++tries > 40) clearInterval(timer); // 最多等 10 秒
    }, 250);
  }

  /* ----------------------------------------------------------
     9.6 「点这里找我聊天」引导气泡
     ---------------------------------------------------------- */
  function initChatHint() {
    const hint = $("#chat-hint");
    if (!hint) return;
    // 关掉过一次就再也不打扰
    if (store.get("yuanzi_chat_hint", "") === "dismissed") return;

    const openBtn = $("#chat-hint-open");
    const closeBtn = $("#chat-hint-close");
    let hideTimer = null;

    const hide = () => {
      clearTimeout(hideTimer);
      hint.hidden = true;
    };
    const dismiss = () => {
      hide();
      store.set("yuanzi_chat_hint", "dismissed");
    };

    // 进站后延迟出现，别一上来就砸脸。
    // 首次访问时启动屏可能还没关掉，所以关掉之前要一直等
    let tries = 0;
    const tryShow = () => {
      // 已经在聊天了就不用提示
      if (document.body.classList.contains("chat-open")) return;

      if (document.body.classList.contains("locked")) {
        if (++tries > 60) return; // 最多等 1 分钟，别无限跑
        setTimeout(tryShow, 1000);
        return;
      }

      hint.hidden = false;
      Sound.doorbell(); // 门铃「叮咚」
      // 一直没人理就自己收起。
      // 这里刻意不监听 scroll：浏览器恢复滚动位置时会误触发，
      // 反而让提示永远看不到
      hideTimer = setTimeout(hide, 15000);
    };

    setTimeout(tryShow, 2600);

    if (closeBtn) {
      bindHoverSound(closeBtn);
      closeBtn.addEventListener("click", () => {
        Sound.click();
        dismiss();
      });
    }

    if (openBtn) {
      bindHoverSound(openBtn);
      openBtn.addEventListener("click", () => {
        Sound.click();
        dismiss();
        const btn = document.getElementById("dify-chatbot-bubble-button");
        if (btn) btn.click();
      });
    }
  }

  /* ----------------------------------------------------------
     9.7 聊天窗口的复古化（CRT 效果）
     Dify 的聊天界面在跨域 iframe 里，样式改不进去，
     而且嵌入脚本也没有任何主题配置项。
     所以只能从外面下手：
       ① 给 iframe 加 CSS filter 做复古调色
       ② 在 iframe 上方叠一层扫描线 / 暗角 / 四角括号
     覆盖层要 pointer-events: none，否则会把聊天界面挡死
     ---------------------------------------------------------- */
  function initChatCrt() {
    const overlay = document.createElement("div");
    overlay.className = "chat-crt";
    overlay.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    document.body.appendChild(overlay);

    /** @type {HTMLElement | null} */
    let win = null;

    // Dify 是 fixed 定位，滚动时位置不变，所以只需跟着尺寸/开关走
    const sync = () => {
      if (!win || !win.isConnected) return;

      if (getComputedStyle(win).display === "none") {
        overlay.hidden = true;
        return;
      }

      const r = win.getBoundingClientRect();
      overlay.hidden = false;
      overlay.style.left = r.left + "px";
      overlay.style.top = r.top + "px";
      overlay.style.width = r.width + "px";
      overlay.style.height = r.height + "px";
    };

    const attach = () => {
      win = document.getElementById("dify-chatbot-bubble-window");
      if (!win) return false;

      new MutationObserver(sync).observe(win, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
      // 窗口开合是带过渡动画的，尺寸逐帧在变，靠 ResizeObserver 跟住
      if (window.ResizeObserver) new ResizeObserver(sync).observe(win);
      window.addEventListener("resize", sync);

      sync();
      return true;
    };

    if (attach()) return;

    let tries = 0;
    const timer = setInterval(() => {
      if (attach() || ++tries > 40) clearInterval(timer); // 最多等 10 秒
    }, 250);
  }

  /* ----------------------------------------------------------
     10. 彩蛋：科乐美秘技 + 小圆子雨
     ---------------------------------------------------------- */
  function initSecret() {
    const KONAMI = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let progress = 0;

    document.addEventListener("keydown", (e) => {
      // 输入框里打字时不触发
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;

      if (progress === KONAMI.length) {
        progress = 0;
        unlockSecret();
      }
    });
  }

  function unlockSecret() {
    const panel = $("#secret");
    if (!panel || !panel.hidden) return;

    panel.hidden = false;
    Sound.secret();
    toast("🎁 隐藏关卡已解锁！", 3000);
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    dumplingRain();
  }

  /** 像素小圆子从天而降 */
  function dumplingRain() {
    const count = window.innerWidth < 720 ? 18 : 34;
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "dumpling";
      d.style.left = Math.random() * 100 + "vw";
      d.style.animationDuration = (2 + Math.random() * 2).toFixed(2) + "s";
      d.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
      d.style.width = d.style.height = (Math.random() < 0.5 ? 14 : 20) + "px";
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 5000);
    }
  }

  /* ----------------------------------------------------------
     11. 各种收尾
     ---------------------------------------------------------- */
  function initMisc() {
    // 页脚年份
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    // 卡带的确认音效
    $$(".cartridge").forEach((card) => {
      bindHoverSound(card);
      card.addEventListener("click", () => {
        Sound.click();
        toast("「" + card.querySelector("h3").textContent + "」详情待你补充 ✏️");
      });
    });

    // 所有按钮统一加音效
    $$(".pixel-btn").forEach((btn) => {
      if (btn.id !== "insert-coin" && btn.id !== "copy-mail") bindHoverSound(btn);
    });

    // 回访彩蛋
    const visits = parseInt(store.get("yuanzi_visits", "0"), 10) + 1;
    store.set("yuanzi_visits", String(visits));
    if (visits > 1) {
      setTimeout(() => {
        toast("欢迎回来，老玩家！第 " + visits + " 次到访 🕹️", 3000);
      }, 1400);
    }
  }

  /* ----------------------------------------------------------
     启动
     ---------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    createStars();
    initAvatar();
    initBoot();
    initHud();
    initTerminal();
    initReveal();
    initCopyMail();
    initChatbot();
    initChatHint();
    initChatCrt();
    initSecret();
    initMisc();

    // 首屏进度条立刻填充
    fillBars("#home", true);
  });
})();
