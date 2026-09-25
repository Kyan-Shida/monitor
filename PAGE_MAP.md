# 原型页面 ↔ 代码文件映射速查

> 改动任何页面前先查表找文件，按 **页面 ID → 路由 URL → 组件文件** 三步走。
> 全局样式走 `styles.css`，业务/种子数据走 `src/data/` 下的对应文件。

---

## 核心入口（改导航/路由必看）

| 想改什么 | 去哪改 |
|---------|--------|
| 侧边栏菜单结构（一级中心 + 二级叶子） | `src/data/navigation.ts` → `groups` 数组 |
| 路由 hash 映射（`#/xxx` → page ID） | `src/data/navigation.ts` → `paths` 对象 |
| 页面父子关系（面包屑链） | `src/data/navigation.ts` → `parents` 对象 |
| 侧边栏隐藏/显示某个页面 | `src/data/navigation.ts` → `hiddenIds` 数组 |
| 一级中心图标（顺序对齐 groups） | `src/App.tsx` → `icons` 数组 |
| 二级叶子页面图标（按 page ID） | `src/App.tsx` → `pageIcons` 对象 |
| 角色能看到哪些中心 | `src/data/roles.ts` → 各角色 `centers` 数组 |
| 角色能看到哪些页面 | `src/data/roles.ts` → 各角色 `pages` |
| 角色权限点（操作按钮） | `src/data/roles.ts` → 各角色 `perms` + `PERMS` 定义 |
| page → 组件路由分发 | `src/App.tsx` 第 182–214 行 if/else 链 |
| 种子数据（机器人/告警/计划…） | `src/data/store.ts`（`useStore` 的初始 state） |
| 全局通用 UI 组件（Btn/Modal/Note/Panel/Table/Badge…） | `src/components/UI.tsx` |
| 面包屑/页面外壳 | `src/App.tsx` 内部渲染 |
| 驾驶舱顶栏（时间/全屏/两个 Tab） | `src/components/ScreenTopBar.tsx` |
| 业务页面统一外壳（顶栏面包屑、返回按钮等） | `src/components/Business.tsx` |
| 全局样式 | `src/styles.css` |

---

## 页面 ID → 路由 → 组件文件

### 🔧 工作台（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `workbench` | `#/workbench` | `src/pages/Workbench.tsx` | 角色默认落地页 |

### 🛠️ 巡检执行（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `plans` | `#/planning/plans` | `src/pages/Planning.tsx`（`page="plans"` 分支） | 计划列表 |
| `plan-edit` | `#/planning/plan-edit` | `src/pages/Planning.tsx`（`page="plan-edit"` 分支） | 计划编辑，父页面 `plans` |
| `tasks` | `#/planning/tasks` | `src/pages/Planning.tsx`（`page="tasks"` 分支） | 任务列表 |
| `quick` | `#/planning/quick` | `src/pages/Planning.tsx`（`page="quick"` 分支） | 目标与要求（侧边栏已隐藏） |
| `calendar` | `#/monitor/calendar` | `src/pages/Operations.tsx`（`Legacy` 回退） | 任务日历（侧边栏已隐藏） |
| `dispatch` | `#/dispatch/workbench` | `src/pages/Scheduling.tsx`（`page="dispatch"` 分支） | 调度工作台 |
| `queue` | `#/dispatch/queue` | `src/pages/Scheduling.tsx`（`page="queue"` 分支） | 机器人任务队列 |
| `dispatch-log` | `#/dispatch/records` | 同上，侧边栏已隐藏 | 调度记录 |
| `execution` | `#/execution/live` | `src/pages/Execution.tsx` | 实时执行监控 |
| `replay` | `#/execution/replay` | `src/pages/ObjectDetails.tsx`（`page="replay"`） | 执行回溯 |
| `control` | `#/robots/control` | `src/pages/Execution.tsx`（`Control` 导出） | 远程操控台 |

### 📊 结果与异常（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `results` | `#/results/query` | `src/pages/Results.tsx`（`page="results"`） | 巡检结果查询 |
| `review` | `#/results/review` | `src/pages/Results.tsx`（`page="review"`） | 结果详情/复核，父页面 `results` |
| `archive` | `#/results/equipment` | `src/pages/DeviceArchive.tsx` | 设备巡检档案，内部带 tab 切换 |
| `alarms` | `#/alarms/events` | `src/pages/Alarms.tsx`（`page="alarms"`） | 告警事件 |
| `alarm` | `#/alarms/detail` | `src/pages/Alarms.tsx`（`page="alarm"`） | 告警详情，父页面 `alarms` |
| `rules` | `#/alarms/rules` | `src/components/Business.tsx` 兜底（Supporting） | 告警规则（侧边栏已隐藏） |

### 🗺️ 资源与地图（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `equipment` | `#/resources/equipment` | `src/components/Business.tsx` 兜底（Supporting） | 设备资源树 |
| `points` | `#/resources/points` | `src/components/Business.tsx` 兜底（Supporting） | 巡检点列表 |
| `annotation` | `#/resources/annotation` | `src/pages/Annotation.tsx` | 点位标注工作台 |
| `routes` | `#/resources/routes` | Supporting 兜底，侧边栏已隐藏 | 路线管理 |
| `standards` | `#/resources/standards` | Supporting 兜底，侧边栏已隐藏 | 巡检标准 |
| `templates` | `#/resources/templates` | `src/pages/Planning.tsx`（`page="templates"`） | 巡检模板 |
| `maps` | `#/robots/maps` | `src/pages/Maps.tsx` | 地图管理，内部 4 个 tab（archive/sync/changes/detail） |

### 🤖 机器人管理（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `robots` | `#/robots/monitor` | `src/pages/Operations.tsx`（`page="robots"` 分支） | 机器台账（列表） |
| `robot` | `#/robots/detail/:id` | `src/pages/Operations.tsx`（`page="robot"` 分支） | 机器人运行监测（详情），内部 3 个 tab（monitor/tasks/records） |
| `health` | `#/robots/health` | `src/pages/Operations.tsx`（`page="health"` 分支） | 能力与健康，顶部带机器人选择器 |
| `robot-map` | `#/robots/map` | `src/pages/Operations.tsx`（`page="robot-map"` 分支） | 地图与版本，顶部带机器人选择器 |
| `manual` | `#/robots/manual` | `src/pages/Operations.tsx`（`page="manual"` 分支） | 人工操作与遥控，顶部带机器人选择器 |
| `device` | `#/robots/device` | `src/pages/Operations.tsx`（`page="device"` 分支） | 机型专项，顶部带机器人选择器 |

### 📈 分析与报表（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `metrics` | `#/analytics/metrics` | `src/pages/Metrics.tsx` | 指标中心 |
| `analytics` | `#/analytics/overview` | Supporting 兜底，侧边栏已隐藏 | 基础分析 |

### ⚙️ 系统设置（一级中心）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `services` | `#/ai/services` | Supporting 兜底，侧边栏已隐藏 | 能力/服务管理 |
| `roles` | `#/system/roles` | Supporting 兜底 | 角色/权限 |
| `users` | `#/system/users` | Supporting 兜底，侧边栏已隐藏 | 组织/用户 |
| `audit` | `#/system/audit` | Supporting 兜底 | 审计日志 |
| `integration` | `#/integration/services` | Supporting 兜底 | 上层任务服务/接口配置 |
| `interface-log` | `#/integration/logs` | Supporting 兜底 | 接口日志 |
| `settings` | `#/system/settings` | Supporting 兜底 | 字典/参数 |
| `media` | `#/media/library` | Supporting 兜底，侧边栏已隐藏 | 资源库 |

### 🖥️ 驾驶舱大屏（独立入口，不出现在侧边栏）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `bigscreen` | `#/screen/bigscreen` | `src/pages/CockpitScreen.tsx` | 智能机器巡检数据驾驶舱（综合总览 + 调度指挥） |
| `overview` | `#/monitor/overview` | `src/pages/MonitorCockpit.tsx` | 管理驾驶舱（嵌入模式） |
| `screen` | `#/screen` | `src/pages/DispatchCockpit.tsx` | 调度驾驶舱（嵌入模式） |

### 🔗 隐藏的详情/下钻页（无侧边栏入口，只能通过面包屑或点链接进入）

| 页面 ID | 路由 URL | 组件文件 | 备注 |
|---------|---------|---------|------|
| `point` | `#/resources/points/detail/:id` | `src/pages/ObjectDetails.tsx` | 巡检点详情 |
| `task-detail` | `#/planning/tasks/detail/:id` | `src/pages/ObjectDetails.tsx` | 任务详情 |

---

## 组件文件清单

### 页面层（src/pages/）

| 文件 | 内部渲染分支（page 参数） | 主要内容 |
|------|--------------------------|---------|
| `Workbench.tsx` | — | 角色工作台（待办卡片 + 快捷入口） |
| `MonitorCockpit.tsx` | — | 管理驾驶舱（综合总览 + 运营管理） |
| `DispatchCockpit.tsx` | — | 调度驾驶舱（地图 + 三卡控制带 + 双路视频） |
| `CockpitScreen.tsx` | — | 大屏驾驶舱（顶栏 Tab 切 Monitor/Dispatch） |
| `Metrics.tsx` | — | 指标中心（指标卡 + 趋势图 + 下钻弹窗） |
| `Operations.tsx` | `robots` / `robot` / `health` / `robot-map` / `manual` / `device` | 机器台账 + 运行监测 + 能力/地图/手动/机型 4 个独立页 |
| `Maps.tsx` | — | 地图管理（内部 tab: archive/sync/changes/detail） |
| `Annotation.tsx` | — | 点位标注工作台 |
| `Planning.tsx` | `plans` / `plan-edit` / `tasks` / `quick` / `templates` | 计划 + 任务 + 模板统一页面 |
| `Scheduling.tsx` | `dispatch` / `queue` | 调度工作台（选任务/选机器人 → 下发） |
| `Execution.tsx` | — | 实时执行监控 |
| `Execution.tsx` → `Control` 导出 | — | 远程操控台（云台/速度/暂停） |
| `Results.tsx` | `results` / `review` | 巡检结果查询 + 复核 |
| `Alarms.tsx` | `alarms` / `alarm` | 告警事件列表 + 详情 |
| `DeviceArchive.tsx` | — | 设备巡检档案（内部 tab 切换） |
| `ObjectDetails.tsx` | `point` / `task-detail` / `replay` | 下钻详情复用页 |

### 组件层（src/components/）

| 文件 | 导出/内容 |
|------|----------|
| `UI.tsx` | `Btn` / `Modal` / `Note` / `Panel` / `Table` / `Badge` / `Download` / `Pager` / `ObjectLink` |
| `Business.tsx` | 业务页面统一外壳（面包屑、tab bar、渲染分发 Supporting） |
| `ScreenTopBar.tsx` | 驾驶舱顶栏（品牌/时间/全屏） |
| `RoleMatrix.tsx` | 角色权限矩阵配置（原型演示用） |

### 数据层（src/data/）

| 文件 | 内容 |
|------|------|
| `navigation.ts` | 菜单 groups、路由 paths、parents、hiddenIds、go()、parse()、href()、useViewState() |
| `store.ts` | `useStore()` — 全局种子数据：robots / tasks / alarms / plans / maps / pts / syncs 等 |
| `roles.ts` | 角色定义（admin/user）、`canSee()`、`canDo()`、PERMS 权限点清单 |

### 样式

| 文件 | 内容 |
|------|------|
| `styles.css` | 全局样式（侧边栏、顶栏、center-tabs、panel、table、buttons、modal、tabs、驾驶舱、object-tabs…） |

---

## 常见改动 → 去哪里

| 你想改什么 | 直接改 |
|-----------|--------|
| 侧边栏加/减/重命名某个菜单项 | `navigation.ts` → `groups` 数组 |
| 侧边栏隐藏一个已实现页面 | `navigation.ts` → `hiddenIds` 加 ID |
| 侧边栏新增一个一级中心 | ① `navigation.ts` groups 插新组 ② `App.tsx` icons 插图标 ③ `roles.ts` 各角色 centers 加组名 ④ `App.tsx` pageIcons 加二级叶子图标 ⑤ `App.tsx` 路由分发加新分支 |
| 新页面要显示真实数据 | `src/data/store.ts` 加种子数据 → 页面里 `const s = useStore()` 取 |
| 改机器人列表的字段/数量 | `src/data/store.ts` → `robots` 数组 |
| 改告警事件的字段/数量 | `src/data/store.ts` → `alarms` 数组 |
| 改计划/任务的种子数据 | `src/data/store.ts` → `plans` / `tasks` |
| 改某张表的列头/行 | 对应页面组件里的 `<Table heads={[...]} rows={[...]} />` |
| 加/改按钮样式 | `styles.css` 里的 `.btn` / `.btn.primary` / 自定义类 |
| 加/改 panel 样式 | `styles.css` 里的 `.panel` / `.panel-head` / `.panel-body` |
| 改 tab 切换样式 | `styles.css` 里的 `.object-tabs` / `.center-tabs` / `.tab-back` |
| 改面包屑 | `App.tsx` 面包屑渲染块 + `styles.css` 里 `.breadcrumb / .bc-sep / .bc-id` |
| 改角色权限默认可见页面 | `roles.ts` → 角色的 `pages` 和 `centers` |
| 改一级中心图标 | `App.tsx` → `icons` 数组（**顺序必须与 groups 对齐**） |
| 改某个二级叶子图标 | `App.tsx` → `pageIcons[pageId]` |
| 改路由 hash 格式 | `navigation.ts` → `paths` 对象 |
| 改父子关系（面包屑链） | `navigation.ts` → `parents` 对象 |
| 改侧边栏整体视觉 | `styles.css` → `.sidebar` / `.nav-group` / `.nav-leaf` / `.center-nav` |
| 改驾驶舱大屏布局 | `CockpitScreen.tsx` + `styles.css` 里 `.cs-*` / `.ds-*` 系列 |
| 改某个页面的内部 tab | 对应页面的 `.object-tabs` 或手写 tab 按钮 |

---

## 目录速览

```
src/
├── App.tsx                      ← 主路由分发 + 侧边栏 + 面包屑
├── main.tsx                     ← 入口
├── styles.css                   ← 全局样式（唯一的 CSS 文件）
├── components/
│   ├── UI.tsx                   ← Btn/Modal/Panel/Table/Badge 等基础组件
│   ├── Business.tsx             ← Supporting 兜底页面（设备资源树/巡检点/角色管理等）
│   ├── ScreenTopBar.tsx         ← 驾驶舱顶栏（时间/全屏）
│   └── RoleMatrix.tsx           ← 权限矩阵演示
├── pages/
│   ├── Workbench.tsx            ← 角色工作台
│   ├── MonitorCockpit.tsx       ← 管理驾驶舱
│   ├── DispatchCockpit.tsx      ← 调度驾驶舱
│   ├── CockpitScreen.tsx        ← 大屏驾驶舱（顶栏 Tab）
│   ├── Operations.tsx           ← 机器台账 + 详情 + health/map/manual/device
│   ├── Maps.tsx                 ← 地图管理
│   ├── Annotation.tsx           ← 点位标注
│   ├── Planning.tsx             ← 计划/任务/模板
│   ├── Scheduling.tsx           ← 调度工作台/任务队列
│   ├── Execution.tsx            ← 实时执行 + 远程操控
│   ├── Results.tsx              ← 巡检结果查询/复核
│   ├── Alarms.tsx               ← 告警事件/详情
│   ├── DeviceArchive.tsx        ← 设备巡检档案
│   ├── ObjectDetails.tsx        ← 巡检点/任务/回放 下钻详情
│   └── Metrics.tsx              ← 指标中心
└── data/
    ├── navigation.ts            ← 菜单/路由/parents/hiddenIds/go()
    ├── store.ts                 ← 全局种子数据（robots/alarms/plans/tasks/...）
    └── roles.ts                 ← 角色定义/centers/pages/perms/canSee()
```

---

## 踩坑清单（改导航必看）

新增一级中心**必须同时改 4 处**，少一处就炸：

1. ✅ `navigation.ts` → `groups` 数组加新组
2. ✅ `App.tsx` → `icons` 数组加图标（**顺序必须跟 groups 对齐**，否则 `<Icon/>` 是 undefined 会导致 React 崩溃）
3. ✅ `roles.ts` → 所有角色的 `centers` 数组加组名
4. ✅ `App.tsx` → `pageIcons` 加二级叶子页面图标

隐藏页面只改一处：`navigation.ts` → `hiddenIds` 加 ID。**不要删路由**——详情页/直接 URL 访问还能用。
