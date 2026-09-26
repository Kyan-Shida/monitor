# 原型页面 ↔ 代码文件映射速查

> 改动任何页面前先查表找文件，按 **页面 ID → 路由 URL → 组件文件** 三步走。
> 全局样式走 `styles.css`，数据走 `src/data/`，文档清单见文末「文档索引」。

---

## 核心入口（改导航/路由必看）

| 想改什么 | 去哪改 |
|---------|--------|
| 侧边栏菜单结构（一级中心 + 二级叶子） | `src/data/navigation.ts` → `groups` 数组 |
| 路由 hash 映射（`#/xxx` → page ID） | `src/data/navigation.ts` → `paths` 对象 |
| 页面父子关系（面包屑链 / 返回目标） | `src/data/navigation.ts` → `parents` 对象 |
| **详情页的动态来源**（面包屑/返回按入口归属） | 链接带回 `?from=page/id`；`ObjectLink` 传 `from`，见 `navigation.ts` 的 `Route.from` / `href` / `go` / `back` 与 `App.tsx` 的 `fromMeta` |
| 侧边栏隐藏/显示某个页面 | `src/data/navigation.ts` → `hiddenIds` 数组 |
| 一级中心图标（顺序对齐 `groups`） | `src/App.tsx` → `icons` 数组 |
| 二级叶子页面图标（按 page ID） | `src/App.tsx` → `pageIcons` 对象 |
| 全局搜索关键词 → 页面 | `src/App.tsx` → `keywordPages` 对象 |
| 角色能看到哪些中心 / 页面 / 权限点 | `src/data/roles.ts` → 各角色 `centers` / `pages` / `perms` + `PERMS` |
| page → 组件路由分发 | `src/App.tsx` 的 `body = ...` if/else 链 |
| 种子数据（机器人/任务/结果/告警/地图…） | `src/data/seed.ts` → `seed()`，由 `src/data/store.tsx` 注入 Context |
| 状态机（所有 `act` 动作的效果） | `src/data/engine.ts` → `transition()`（未知动作会抛错） |
| 指标口径（全站唯一来源） | `src/data/metrics.ts` |
| 通用 UI 组件（Btn/Modal/Note/Panel/Table/Badge/Steps…） | `src/components/UI.tsx` |
| 通用业务组件（ObjectLink/Kpis/EventTimeline/Pager） | `src/components/Business.tsx` |
| 面包屑 / 返回 / 侧边栏 / 路由分发 | `src/App.tsx` 内部渲染 |
| 驾驶舱顶栏（时间 / 切换 Tab） | `src/components/ScreenTopBar.tsx` |
| 离线单文件导出（双击即用） | `scripts/export-static.mjs` → 产出 `静态版/index.html` |
| 全局样式 | `src/styles.css` |

---

## 页面 ID → 路由 → 组件文件

### 🔧 工作台（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `workbench` | `#/workbench` | `src/pages/Workbench.tsx` | 角色默认落地页（6 个待办 KPI，点击弹出该类明细弹窗；页面只读展示，复核等写操作跳转对应页面） |

### 🛠️ 巡检执行（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `standards` | `#/resources/standards` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 巡检标准（占位） |
| `templates` | `#/resources/templates` | `src/pages/Planning.tsx`（`page="templates"`） | 巡检模板 |
| `plans` | `#/planning/plans` | `src/pages/Planning.tsx`（`page="plans"`） | 计划列表 |
| `plan-edit` | `#/planning/plan-edit` | `src/pages/Planning.tsx`（`page="plan-edit"`） | 计划编辑，父页面 `plans` |
| `tasks` | `#/planning/tasks` | `src/pages/Planning.tsx`（`page="tasks"`） | 任务列表 |
| `quick` | `#/planning/quick` | `src/pages/Planning.tsx`（`page="quick"`） | 目标与要求，侧边栏已隐藏 |
| `calendar` | `#/monitor/calendar` | `src/pages/OperationsLegacy.tsx`（经 `Operations.tsx` 转调） | 任务日历，侧边栏已隐藏（该文件仅此分支在用） |
| `dispatch` | `#/dispatch/workbench` | `src/pages/Scheduling.tsx`（`page="dispatch"`） | 调度工作台（选任务/选机器人 → 一次派单，含「加入队列/立即执行」切换） |
| `queue` | `#/dispatch/queue` | `src/pages/Scheduling.tsx`（`page="queue"`） | 机器人任务队列（排程时间轴 + 队列管理） |
| `dispatch-log` | `#/dispatch/records` | `src/pages/Supporting.tsx` 日志兜底，侧边栏已隐藏 | 调度记录 |
| `execution` | `#/execution/live` | `src/pages/ExecutionWorkbench.tsx`（`Execution.tsx` 再导出） | 实时执行监控 |
| `replay` | `#/execution/replay` | `src/pages/ObjectDetails.tsx`（`page="replay"`） | 执行回溯（主从列表） |

> 说明：原独立页「远程操控台」(`control`) 已合并进「人工操作与遥控」(`manual`)，其路由与页面已删除；各处「接管 / 遥控台」入口统一跳 `manual`。

### 📊 结果与异常（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `results` | `#/results/query` | `src/pages/Results.tsx`（`page="results"`） | 巡检结果查询（按任务分组可折叠 / 任务·机器·时间筛选） |
| `review` | `#/results/review/:id` | `src/pages/Results.tsx`（`page="review"`） | 结果详情 / 复核（含人工复核表单），父页面 `results` |
| `archive` | `#/results/equipment` | `src/pages/DeviceArchive.tsx` | 设备巡检档案，内部 5 个 tab |
| `alarms` | `#/alarms/events` | `src/pages/Results.tsx`（`Alarms` 导出，`page="alarms"`） | 告警事件 |
| `alarm` | `#/alarms/detail/:id` | `src/pages/Results.tsx`（`Alarms` 导出，`page="alarm"`） | 告警详情 / 复查（含处置工作台），父页面 `alarms` |
| `rules` | `#/alarms/rules` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 告警规则（占位） |

> 三个只读**内置页**见下文「隐藏的详情/下钻页」：`result-detail` / `alarm-detail` / `replay-detail`。

### 🗺️ 资源与地图（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `equipment` | `#/resources/equipment` | `src/pages/Supporting.tsx`（`page="equipment"`） | 设备资源树（区域→设备，只读台账 + 对象下钻；数据源为点位所属设备） |
| `points` | `#/resources/points` | `src/pages/Supporting.tsx`（`page="points"`） | 巡检点列表（关键词 + 设备/地图/状态筛选 + 分页） |
| `annotation` | `#/resources/annotation` | `src/pages/Annotation.tsx` | 点位标注与验证工作台 |
| `routes` | `#/resources/routes` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 路线管理（占位，**「轨道」无承载页**） |
| `maps` | `#/robots/maps` | `src/pages/Maps.tsx` | 地图管理，内部 5 个 tab（list/detail/archive/sync/changes） |

> 已删除：`objects`（设备 → 对象 → 检测项）独立页——能力已并入设备资源页的「对象与检测项」弹窗。

### 🤖 机器人管理（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `robots` | `#/robots/monitor` | `src/pages/Operations.tsx`（`page="robots"`） | 机器台账（列表） |
| `robot` | `#/robots/detail/:id` | `src/pages/Operations.tsx`（`page="robot"`） | 机器人运行监测，内部 3 个 tab（monitor/tasks/records） |
| `health` | `#/robots/health` | `src/pages/Operations.tsx`（`page="health"`） | 能力与健康，顶部带机器人选择器 |
| `robot-map` | `#/robots/map` | `src/pages/Operations.tsx`（`page="robot-map"`） | 地图与版本，顶部带机器人选择器 |
| `manual` | `#/robots/manual` | `src/pages/Operations.tsx`（`page="manual"`） | **人工接管与遥控**（机器人选择器 + 内嵌 `ControlConsole`；已与远程操控台合并） |
| `device` | `#/robots/device` | `src/pages/Operations.tsx`（`page="device"`） | 机型专项，顶部带机器人选择器 |

> `health` / `robot-map` / `manual` / `device` 共享同一机器人选择状态（`useViewState("robot-detail.selected")`），且**路由 `id` 优先于该状态**，便于从驾驶舱/执行台定向跳入。

### 📈 分析与报表（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `metrics` | `#/analytics/metrics` | `src/pages/Metrics.tsx` | 指标中心（口径唯一来源） |
| `analytics` | `#/analytics/overview` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 基础分析（占位） |

### ⚙️ 系统设置（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `services` | `#/ai/services` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 能力 / 服务管理（占位） |
| `roles` | `#/system/roles` | `src/pages/Supporting.tsx` → `src/components/RoleMatrix.tsx` | 角色 / 权限矩阵 |
| `users` | `#/system/users` | `src/pages/Supporting.tsx` 兜底，侧边栏已隐藏 | 组织 / 用户（占位） |
| `audit` | `#/system/audit` | `src/pages/Supporting.tsx` 日志分支 | 审计日志 |
| `integration` | `#/integration/services` | `src/pages/Supporting.tsx`（`page="integration"`） | 上层任务服务 / 接口配置 |
| `interface-log` | `#/integration/logs` | `src/pages/Supporting.tsx` 日志分支 | 接口日志 |
| `settings` | `#/system/settings` | `src/pages/Supporting.tsx` 兜底 | 字典 / 参数 |
| `media` | `#/media/library` | `src/pages/Supporting.tsx`（`page="media"`） | 资源库，侧边栏已隐藏 |

### 🖥️ 驾驶舱大屏（独立入口，不出现在侧边栏）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `bigscreen` | `#/screen/bigscreen` | `src/pages/CockpitScreen.tsx` | 大屏外壳（顶栏 Tab 切 综合总览 / 调度指挥），由顶栏按钮新标签页打开 |
| `overview` | `#/monitor/overview` | `src/pages/MonitorCockpit.tsx` | 管理驾驶舱 |
| `screen` | `#/screen` | `src/pages/DispatchCockpit.tsx` | 调度指挥驾驶舱 |

### 🔗 隐藏的详情 / 下钻页（无侧边栏入口）

| 页面 ID | 路由 URL | 组件文件 | 进入方式 / 备注 |
|---------|---------|---------|----------------|
| `point` | `#/resources/points/detail/:id` | `src/pages/ObjectDetails.tsx`（`page="point"`） | 巡检点详情；父页面 `points` |
| `task-detail` | `#/planning/tasks/detail/:id` | `src/pages/ObjectDetails.tsx`（`page="task-detail"`） | 任务详情；父页面 `tasks` |
| `result-detail` | `#/results/equipment/detail/:id` | `src/pages/Results.tsx`（`page="result-detail"`） | 结果只读详情；设备档案的结果编号进入；父页面 `archive` |
| `alarm-detail` | `#/results/equipment/alarm/:id` | `src/pages/Results.tsx`（`Alarms` 的 `page="alarm-detail"`） | 告警只读详情；设备档案的关联告警进入；父页面 `archive` |
| `replay-detail` | `#/results/equipment/replay/:id` | `src/pages/ObjectDetails.tsx`（`page="replay-detail"`） | 执行回溯（只读）；设备档案「过程回放」、机器人「历史任务」进入；父页面 `archive` |

**进入写法（带来源页）**：

```tsx
<ObjectLink to="result-detail" id="RES001" from={{ page: "archive" }}>RES001</ObjectLink>
<ObjectLink to="replay-detail" id="T020" from={{ page: "robot", id: "R01" }}>过程回放</ObjectLink>
```

- `from` 会被写成 URL 的 `?from=robot/R01`；`App.tsx` 据此决定**面包屑分组 / 父级链 / 返回目标 / 侧边栏高亮**。
- 不带 `from` 时回落到 `routeMeta` 里静态声明的父页面。

---

## 组件文件清单

### 页面层（`src/pages/`）

| 文件 | 内部渲染分支（`page` 参数） | 主要内容 |
|------|--------------------------|---------|
| `Workbench.tsx` | — | 角色工作台（KPI 条 + 5 块待办面板） |
| `MonitorCockpit.tsx` | — | 管理驾驶舱（综合总览 + 运营管理） |
| `DispatchCockpit.tsx` | — | 调度指挥驾驶舱（地图 + 控制带 + 告警/SLA） |
| `CockpitScreen.tsx` | — | 大屏外壳（顶栏 Tab 切两个驾驶舱） |
| `Metrics.tsx` | — | 指标中心（指标卡 + 口径 + 下钻弹窗） |
| `Operations.tsx` | `robots` / `robot` / `health` / `robot-map` / `manual` / `device` / `calendar`(转调 Legacy) | 机器台账 + 运行监测 + 能力/地图/人工操作/机型 |
| `OperationsLegacy.tsx` | `calendar`（其余分支为历史死代码） | 旧版运维页；现仅任务日历在用 |
| `Maps.tsx` | — | 地图管理（内部 tab：list / detail / archive / sync / changes） |
| `Annotation.tsx` | — | 点位标注与验证工作台 |
| `Planning.tsx` | `plans` / `plan-edit` / `tasks` / `quick` / `templates` | 计划 + 任务 + 模板 |
| `Scheduling.tsx` | `dispatch` / `queue` | 调度工作台（派单）/ 机器人任务队列 |
| `ExecutionWorkbench.tsx` | — | 实时执行监控（`Execution.tsx` 再导出为 `Execution`） |
| `Execution.tsx` | — | 再导出 `Execution`；并导出 `ControlConsole`（人工接管与遥控控制台主体，内嵌于 `manual`） |
| `Results.tsx` | `results` / `review` / `result-detail` | 巡检结果查询 + 复核 + 结果详情；同时导出 `Alarms`（`alarms` / `alarm` / `alarm-detail`） |
| `DeviceArchive.tsx` | — | 设备巡检档案（内部 5 tab，含任务/时间筛选） |
| `ObjectDetails.tsx` | `point` / `task-detail` / `replay-detail` / `replay` | 下钻详情复用页 |
| `Supporting.tsx` | `equipment` / `points` / `integration` / `media` / `analytics`(+`archive` 死分支) / 日志类(`audit`/`interface-log`/`dispatch-log`) / 通用兜底(`standards`/`routes`/`services`/`users`/`settings`)，`roles` 转 `RoleMatrix` | 设备资源 + 巡检点 + 集成/资源库/日志/配置兜底 |

### 组件层（`src/components/`）

| 文件 | 导出 / 内容 |
|------|------------|
| `UI.tsx` | `Btn` / `Badge` / `Panel` / `Field` / `Note` / `Empty` / `Table` / `Modal` / `Steps` / `Download` |
| `Business.tsx` | `ObjectLink`（支持 `to` / `from` 下钻） / `Kpis` / `EventTimeline` / `Pager` |
| `MapCanvas.tsx` | SVG 伪地图（点位/候选/机器人/充电桩/轨道，支持缩放与点选） |
| `Video.tsx` | 视频 / 证据占位画面 |
| `ResultTrend.tsx` | 单点位历史值趋势折线 |
| `ControlPad.tsx` | 遥控盘（方向宫格 + 速度档位） |
| `Can.tsx` | 权限包裹组件 + `useRole()` |
| `ScreenTopBar.tsx` | 驾驶舱顶栏（品牌 / Tab / 时间） |
| `RoleMatrix.tsx` | 角色权限矩阵 |

### 数据层（`src/data/`）

| 文件 | 内容 |
|------|------|
| `navigation.ts` | `groups` / `paths` / `parents` / `hiddenIds` / `routeMeta` / `parse` / `href` / `go` / `back` / `menuIdOf` / `useViewState`（含 `Route.from` 机制与存储容错） |
| `store.tsx` | `Store` Provider 与 `useStore()`；状态持久化（失败降级为内存态） |
| `seed.ts` | 全部演示种子数据（点位/地图/机器人/模板/计划/任务/结果/告警/日志/工单…）及构造助手 |
| `engine.ts` | 状态机 `transition(state, action)`：调度/执行/复核/告警/地图/工单等全部动作 |
| `metrics.ts` | 指标定义与口径（`metricValue` / `metricsFor` / `metricOk`） |
| `selectors.ts` | 派生计算（`pointOf` / `stageOf` / `queueFor` / `schedule` / `checks` / `fmtTime` / `terminal` …） |
| `roles.ts` | 角色定义、`canSee` / `canDo` / `PERMS` 权限点 |
| `types.ts` | 全量数据模型类型 + `stages` / `taskTypeActions` 常量 |
| `deviceProfile.ts` | 机型差异配置与 `hasMobility` 能力判定 |

### 样式

| 文件 | 内容 |
|------|------|
| `styles.css` | 全局唯一样式表（侧边栏、顶栏、center-tabs、panel、table、btn、modal、驾驶舱、`panel-filters-wrap` 等） |

---

## 常见改动 → 去哪里

| 你想改什么 | 直接改 |
|-----------|--------|
| 侧边栏加/减/重命名某个菜单项 | `navigation.ts` → `groups` 数组 |
| 侧边栏隐藏一个已实现页面 | `navigation.ts` → `hiddenIds` 加 ID |
| 新增一级中心 | ① `navigation.ts` groups 插新组 ② `App.tsx` icons 插图标 ③ `roles.ts` 各角色 centers 加组名 ④ `App.tsx` pageIcons 加叶子图标 ⑤ `App.tsx` 路由分发加分支 |
| 新增一个内置详情页 | ① `navigation.ts` 加 `paths` + `parents` + `routeMeta` ② `App.tsx` 路由分发 ③ 入口处用 `ObjectLink to=... from=...` |
| 页面要显示真实数据 | `src/data/seed.ts` 加数据 → 页面 `const { s } = useStore()` |
| 改机器人 / 任务 / 结果 / 告警的演示数据 | `src/data/seed.ts` 对应数组（`robots` / `tasks` / `results` / `alarms`） |
| 改某张表的列头 / 行 | 对应页面里的 `<Table heads={[...]} rows={[...]} />` |
| 改按钮 / panel / tab 样式 | `styles.css` 的 `.btn` / `.panel` / `.object-tabs` / `.center-tabs` |
| 改面包屑与返回 | `App.tsx` 的面包屑块（`breadcrumbGroup` / `fromMeta` / `chain`）+ `.breadcrumb` 样式 |
| 改角色可见范围 | `roles.ts` → 角色的 `pages` / `centers` |
| 改路由 hash 格式 | `navigation.ts` → `paths` |
| 改父子关系 | `navigation.ts` → `parents` 与 `routeMeta` 的 `parent` |
| 导出离线单文件 | `node scripts/export-static.mjs` |

---

## 目录速览

```
巡检业务平台原型/
├── index.html                   ← Vite 根 HTML
├── favicon.svg
├── vite.config.ts               ← 开发/常规构建
├── scripts/export-static.mjs    ← 离线单文件导出（→ 静态版/index.html）
├── src/
│   ├── App.tsx                  ← 侧边栏 + 面包屑/返回 + 路由分发 + 权限守卫
│   ├── main.tsx                 ← 入口 <Store><App/></Store>
│   ├── styles.css               ← 全局样式（唯一 CSS）
│   ├── components/
│   │   ├── UI.tsx               ← 基础组件
│   │   ├── Business.tsx         ← ObjectLink / Kpis / EventTimeline / Pager
│   │   ├── MapCanvas.tsx        ← SVG 地图
│   │   ├── Video.tsx            ← 视频/证据占位
│   │   ├── ResultTrend.tsx      ← 趋势折线
│   │   ├── ControlPad.tsx       ← 遥控盘
│   │   ├── Can.tsx              ← 权限组件
│   │   ├── ScreenTopBar.tsx     ← 驾驶舱顶栏
│   │   └── RoleMatrix.tsx       ← 权限矩阵
│   ├── pages/
│   │   ├── Workbench.tsx        ← 工作台
│   │   ├── MonitorCockpit.tsx   ← 管理驾驶舱
│   │   ├── DispatchCockpit.tsx  ← 调度指挥驾驶舱
│   │   ├── CockpitScreen.tsx    ← 大屏外壳
│   │   ├── Metrics.tsx          ← 指标中心
│   │   ├── Operations.tsx       ← 机器台账/详情/能力/地图/人工操作/机型
│   │   ├── OperationsLegacy.tsx ← 仅任务日历在用（其余死代码）
│   │   ├── Maps.tsx             ← 地图管理
│   │   ├── Annotation.tsx       ← 点位标注
│   │   ├── Planning.tsx         ← 计划/任务/模板
│   │   ├── Scheduling.tsx       ← 调度工作台/任务队列
│   │   ├── ExecutionWorkbench.tsx ← 实时执行监控
│   │   ├── Execution.tsx        ← 再导出 Execution + ControlConsole
│   │   ├── Results.tsx          ← 结果查询/复核/结果详情 + Alarms
│   │   ├── DeviceArchive.tsx    ← 设备巡检档案
│   │   ├── ObjectDetails.tsx    ← 点位/任务/执行回溯 下钻详情
│   │   └── Supporting.tsx       ← 设备资源/巡检点/集成/日志/配置兜底
│   └── data/
│       ├── navigation.ts / store.tsx / seed.ts / engine.ts
│       ├── metrics.ts / selectors.ts / roles.ts / types.ts
│       └── deviceProfile.ts
└── 文档：平台操作手册.md / README.md / PAGE_MAP.md / 巡检业务平台原型交互评审-01.md / 页面优化清单-01.md
```

---

## 踩坑清单（改导航必看）

**新增一级中心必须同时改 5 处**，少一处就炸：

1. ✅ `navigation.ts` → `groups` 数组加新组
2. ✅ `App.tsx` → `icons` 数组加图标（**顺序必须跟 `groups` 对齐**，否则 `<Icon/>` 为 `undefined` 会导致 React 崩溃）
3. ✅ `roles.ts` → 所有角色的 `centers` 数组加组名
4. ✅ `App.tsx` → `pageIcons` 加二级叶子图标
5. ✅ `App.tsx` → 路由分发加分支

**其它注意**：

- 隐藏页面只改一处：`navigation.ts` → `hiddenIds` 加 ID。**不要删路由**——详情页 / 直接 URL 访问还能用。
- 新增「内置详情页」时，`parents` 与 `routeMeta.parent` **两处都要写**（前者管侧边栏高亮与权限继承，后者管面包屑与返回）；同时 `App.tsx` 要加路由分发。
- 需要「同一内置页从不同业务页进入且面包屑不同」时，入口必须带 `from`；不带 `from` 时会回落到静态父页。
- 删除一个页面时，务必全局搜 `go("xxx"`、`to="xxx"`、`pageIcons.xxx`、`roles.ts`、`metrics.ts` 的下钻映射（`drillTarget`）、`App.tsx` 的 `keywordPages` 一起清理。
- `file://` 离线分发前先跑 `node scripts/export-static.mjs`；直接发 `dist/index.html` 会因外链 ES module 的 CORS 限制白屏。

---

## 文档索引

| 文档 | 用途 |
|------|------|
| `平台操作手册.md` | 交付客户的操作手册：模块操作、端到端业务流程、权限与状态规则、交付与离线分发 |
| `README.md` | 项目说明、技术栈、启动与离线导出、关键约定、已知问题 |
| `PAGE_MAP.md`（本文） | 页面 ↔ 文件 ↔ 路由 ↔ 数据来源速查 |
| `巡检业务平台原型交互评审-01.md` | 首轮交互评审（2026-09-23）＋ 落地回访核对 |
| `页面优化清单-01.md` | 逐页 UI/UX 优化清单（含优先级与排期建议） |
