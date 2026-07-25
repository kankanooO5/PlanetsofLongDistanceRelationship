python3 <<'PY'
from pathlib import Path

docs = Path("docs")
docs.mkdir(exist_ok=True)

architecture = docs / "ARCHITECTURE.md"

architecture.write_text('''# Two Planets 当前架构说明

## 1. 当前版本定位

当前项目已经从“多功能混杂版”重构为“极简首页稳定版”。

当前核心能力：

- 暗号登录
- 角色选择
- 读取情侣基础设置
- 展示问候语
- 展示在一起天数
- 展示距离下次见面天数
- PWA service worker 在生产环境注册，开发环境自动注销

当前暂时移除或冻结的功能：

- 底部导航
- 多 Tab 页面
- 留言
- 状态
- 心愿
- 相册
- toast
- 安装提示卡片

---

## 2. 目录职责

```text
app/
  page.tsx
    页面入口，只负责渲染 AppRoot

  layout.tsx
    全局 HTML / metadata / PWA 壳层

  globals.css
    全局样式

  api/couple/route.ts
    极简情侣数据接口，目前只返回 settings

features/
  app/components/AppRoot.tsx
    应用根组件，负责登录分流：
    未进入时显示 WelcomeScreen
    已进入时显示 AppShell + HomeTab

  auth/components/WelcomeScreen.tsx
    暗号登录页和角色选择

  auth/hooks/useCoupleSession.ts
    登录状态、暗号、角色、本地存储、数据请求

  home/components/HomeTab.tsx
    首页组合组件

  home/components/HomeHeader.tsx
    首页顶部问候区域

  home/components/RelationshipHero.tsx
    在一起天数与见面倒计时卡片

  home/utils/dates.ts
    日期计算工具

  pwa/hooks/useServiceWorkerRegistration.ts
    service worker 注册逻辑

  shared/types.ts
    前端共享类型，目前只保留 Role / CoupleSettings / CoupleData

components/
  layout/AppShell.tsx
    应用外壳布局

lib/
  api/couple-client.ts
    前端请求 /api/couple 的客户端封装

  storage/couple-session.ts
    localStorage 读写封装

db/
  schema.ts
    数据库 schema，目前只保留 coupleSettings

worker/
  index.ts
    Cloudflare Worker 入口