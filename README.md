# 巡检业务平台原型（石化智能巡检 · 一期）

从 `http://123.56.9.124:5173` 抓取还原的石化智能巡检一期业务平台**原型**，用于业务演示与交互评审。

> **纯前端演示**：没有后端、不连接真实机器人、不发真实指令；所有数据只存在浏览器本机。
> 界面文案统一使用「演示环境 / 演示数据」，不出现 Mock 字样。

---

## 一、技术栈

| 项 | 内容 |
|----|------|
| 框架 | React 19 + TypeScript 5 |
| 构建 | Vite 5（`@vitejs/plugin-react`） |
| 路由 | 自研 hash 路由（`src/data/navigation.ts`：`paths` / `parents` / `routeMeta` / `go` / `parse`） |
| 状态 | 单一 Context Store（`src/data/store.tsx`）+ 纯函数状态机（`src/data/engine.ts`） |
| 数据 | 种子数据 `src/data/seed.ts`，持久化到 `localStorage`（容错：不可用时降级为内存态） |
| 样式 | 单一全局样式表 `src/styles.css`（无 CSS 框架） |
| 图标 | `lucide-react` |

---

## 二、快速开始

```bash
# 国内环境建议指定镜像
npm install --registry=https://registry.npmmirror.com

npm run dev          # 开发服务：http://localhost:5173
npm run build        # 生产构建（注意：含 tsc -b，见「已知问题」）
npm run preview      # 预览构建产物
```

---

## 三、构建与离线分发

```bash
npx vite build                   # 常规构建 → dist/
node scripts/export-static.mjs   # 导出「双击即用」的离线单文件 → 静态版/index.html
```

- `scripts/export-static.mjs` 会：① 以相对路径 `base` 构建；② 把 JS / CSS / 图标 / **图片（含吉祥物等 PNG、JPEG）全部内联**进 `index.html`；③ 自检无残留外链。
- 图片内联依赖 `assetsInlineLimit`（已提到 8 MB）：若留成独立文件，脚本内（JS 字符串）的引用既扫不到也拷不全，`file://` 下会 404 导致图片不显示；脚本另留有兜底，会把仍被脚本引用的资源拷进 `assets/`。
- 产出物 `静态版/index.html` 为**自包含单文件**，`file://` 下双击即可浏览（避开了浏览器对 `file://` 外链 ES module 的 CORS 拦截）。
- 分发时建议压缩整个 `静态版` 文件夹后发送（`html` 附件常被 IM / 邮箱拦截）。

---

## 四、目录结构

```
巡检业务平台原型/
├── index.html               # 开发入口（Vite 根 HTML）
├── favicon.svg
├── vite.config.ts           # 开发 / 常规构建配置
├── scripts/
│   └── export-static.mjs    # 离线单文件导出脚本
├── src/
│   ├── App.tsx              # 应用外壳：侧边栏 / 面包屑 / 返回 / 路由分发 / 权限守卫
│   ├── main.tsx             # 入口：<Store><App/></Store>
│   ├── styles.css           # 全局样式（唯一 CSS 文件）
│   ├── components/          # UI 基础件 + 通用业务件（见 PAGE_MAP.md）
│   ├── pages/               # 各业务页面（见 PAGE_MAP.md）
│   └── data/                # 导航 / 状态 / 状态机 / 种子数据 / 指标口径 / 角色权限
└── 文档：平台操作手册.md · PAGE_MAP.md · 巡检业务平台原型交互评审-01.md · 页面优化清单-01.md
```

---

## 五、关键设计约定（改代码前必读）

1. **导航与路由只有一个来源**：`src/data/navigation.ts` 的 `groups`（侧边栏菜单）/ `paths`（hash 路由）/ `parents`（返回链）/ `routeMeta`（面包屑）。新增一级中心必须同步 `App.tsx` 的 `icons`（顺序对齐 `groups`），详见 `PAGE_MAP.md`「踩坑清单」。
2. **内置页（隐藏详情页）**：`point` / `task-detail` / `result-detail` / `alarm-detail` / `replay-detail` 不进侧边栏，靠业务页里的链接进入。
   - 链接写法：`<ObjectLink to="result-detail" id="RES001" from={{ page: "archive" }} />`
   - `?from=page/id` 让**面包屑 / 返回按钮 / 侧边栏高亮**按入口动态归属（同一内置页可由不同业务页进入）。
3. **状态变更必须走状态机**：`act({ type, ... })` → `engine.ts` 的 `transition()`；未知动作会抛错，错误由全局 toast 提示。
4. **指标口径唯一**：所有指标取自 `src/data/metrics.ts`，页面内不得自行计算（KPI / 驾驶舱 / 报表同口径）。
5. **演示数据集中在 `seed.ts`**：业务代码里不得写「外部服务不可用时返回模拟响应」这类降级；服务不可用必须报错并提示。
6. **对象引用统一用 `ObjectLink`**：默认纯展示；需要下钻时传 `to`（可选 `from`）。

---

## 六、文档索引

| 文档 | 用途 |
|------|------|
| `平台操作手册.md` | **交付给客户的操作手册**：平台怎么用、每个业务模块的操作、端到端业务流程、权限与状态规则、交付说明 |
| `PAGE_MAP.md` | 页面 ID ↔ 路由 ↔ 组件文件 ↔ 数据来源速查；改导航/页面先查它 |
| `巡检业务平台原型交互评审-01.md` | 首轮交互评审（2026-09-23）＋ 落地回访核对 |
| `页面优化清单-01.md` | 逐页 UI/UX 优化清单（含优先级与排期建议），后续开发用 |

---

## 七、已知问题

- `tsc --noEmit` 存在 **3 处历史遗留报错**（`seed.ts` 的 `schema: 5` 与 `types.ts` 的 `State.schema: 3` 不一致、`store.tsx` 的类型断言、`Scheduling.tsx` 的分支比较），因此 `npm run build`（含 `tsc -b`）会失败；`npm run dev` 与 `npx vite build` 均正常。
- `src/pages/OperationsLegacy.tsx` 仅 `calendar` 分支在用，其余分支为历史死代码。
- 离线（`file://`）打开时，部分浏览器禁用本地存储：已做容错，页面可用但刷新后回到初始演示数据。
