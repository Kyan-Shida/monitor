import { useState } from "react";
/**
 * @file navigation.ts
 * @description 菜单结构与路由：一级业务中心 → 页面（按业务域归并，不按厂商能力域切分）
 * @interaction App.tsx 渲染侧边栏与页面；useViewState 供各列表页做视图状态持久化
 */
/**
 * 菜单结构：一级业务中心 → 页面
 * 每项格式「页面ID:名称:优先级:二级分组」，优先级与二级分组可省略
 * 一级中心按业主业务场景归并为 6 个（工作台 / 巡检执行 / 结果与异常 / 资源与地图 / 分析与报表 / 系统设置）
 * P1 页面为未实现占位，保留路由不删，但默认从菜单隐藏（见 hiddenIds）
 */
export const groups = [
  ["工作台", "workbench:速览"],
  [
    "巡检执行",
    "standards:巡检标准::标准与模板",
    "templates:巡检模板::标准与模板",
    "plans:计划列表::任务与计划",
    "plan-edit:计划编辑::任务与计划",
    "tasks:任务列表::任务与计划",
    "quick:目标与要求::任务与计划",
    "calendar:任务日历::任务与计划",
    "dispatch:调度工作台::调度",
    "queue:机器人任务队列::调度",
    "dispatch-log:调度记录::调度",
    "execution:实时执行监控::执行",
    "replay:执行回溯::执行",
    "control:远程操控台::远程操控",

  ],
  [
    "结果与异常",
    "results:巡检结果查询::结果",
    "review:结果详情 / 复核::结果",
    "archive:设备巡检档案::结果",
    "alarms:告警事件::告警与工单",
    "alarm:告警详情 / 复查::告警与工单",
    "rules:告警规则::告警与工单",
  ],
  [
    "资源与地图",
    "equipment:设备资源树::点位与对象",
    "points:巡检点列表::点位与对象",
    "annotation:点位标注与验证工作台::点位与对象",
    "routes:路线管理::路线与轨道",

    "maps:地图管理::地图",
  ],
  [
    "机器人管理",
    "robots:机器台账::机器人资产",
    "robot:机器人运行监测::机器人资产",
    "health:能力与健康::机器人能力",
    "robot-map:地图与版本::机器人能力",
    "manual:人工操作与遥控::机器人能力",
    "device:机型专项::机器人能力",
  ],
  ["分析与报表", "metrics:指标中心", "analytics:基础分析"],
  [
    "系统设置",
    "services:能力 / 服务管理::配置中心",
    "roles:角色 / 权限::组织权限",
    "users:组织 / 用户::组织权限",
    "audit:审计日志::组织权限",
    "integration:上层任务服务 / 接口配置::系统与集成",
    "interface-log:接口日志::系统与集成",
    "settings:字典 / 参数::系统与集成",
    "media:资源库::系统与集成",
  ],
];
/** 未实现 / 暂不暴露的页面：保留路由与代码，仅从侧边栏隐藏，避免业主点进空页面 */
const hiddenIds = [
  "calendar",
  "dispatch-log",
  "rules",
  "routes",
  "standards",
  "services",
  "analytics",
  "media",
  "users",
  "quick",
  "objects",
];
const roots = [
  "workbench",
  "execution",
  "result",
  "resource",
  "robot",
  "analytics",
  "system",
];
const paths: Record<string, string> = {
  workbench: "workbench",
  overview: "monitor/overview",
  screen: "screen",
  calendar: "monitor/calendar",
  robots: "robots/monitor",
  robot: "robots/detail",
  control: "robots/control",
  maps: "robots/maps",
  health: "robots/health",
  "robot-map": "robots/map",
  manual: "robots/manual",
  device: "robots/device",
  equipment: "resources/equipment",
  objects: "resources/objects",
  points: "resources/points",
  annotation: "resources/annotation",
  routes: "resources/routes",
  standards: "resources/standards",
  templates: "resources/templates",
  plans: "planning/plans",
  "plan-edit": "planning/plan-edit",
  tasks: "planning/tasks",
  quick: "planning/quick",
  dispatch: "dispatch/workbench",
  queue: "dispatch/queue",
  "dispatch-log": "dispatch/records",
  execution: "execution/live",
  replay: "execution/replay",
  results: "results/query",
  review: "results/review",
  archive: "results/equipment",
  services: "ai/services",
  rules: "alarms/rules",
  alarms: "alarms/events",
  alarm: "alarms/detail",
  metrics: "analytics/metrics",
  analytics: "analytics/overview",
  media: "media/library",
  integration: "integration/services",
  "interface-log": "integration/logs",
  users: "system/users",
  roles: "system/roles",
  settings: "system/settings",
  audit: "system/audit",
  point: "resources/points/detail",
  "task-detail": "planning/tasks/detail",
  /** 独立大屏窗口：由顶栏「驾驶舱大屏」以新标签页打开，不进入侧边栏与中心 Tab */
  bigscreen: "screen/bigscreen",
};
const parents: Record<string, string> = {
  robot: "robots",
  control: "robots",
  annotation: "points",
  "plan-edit": "plans",
  review: "results",
  alarm: "alarms",
  point: "points",
  "task-detail": "tasks",
};
/**
 * 取页面的上级页面 ID
 * @param id 页面 ID
 * @returns 上级页面 ID；无上级时返回 undefined
 */
export const parentOf = (id: string): string | undefined => parents[id];
export const pages = groups.flatMap((g, i) =>
  g.slice(1).map((x) => {
    const [id, name, priority, sub] = x.split(":");
    return {
      id,
      name,
      priority: priority || "P0",
      group: g[0],
      root: roots[i],
      path: paths[id],
      parent: parents[id],
      /** 二级导航内的分组标签，用于在同级标签之间插入分隔符 */
      sub: sub || "",
      /** 未实现页面：仅隐藏菜单入口，路由仍可用 */
      hidden: hiddenIds.includes(id),
    };
  }),
);
/** 侧边栏可见页面：过滤掉未实现占位页 */
export const visiblePages = pages.filter((p) => !p.hidden);
export const routeMeta = [
  ...pages,
  {
    ...pages.find((x) => x.id === "points")!,
    id: "point",
    name: "巡检点详情",
    path: paths.point,
    parent: "points",
  },
  {
    ...pages.find((x) => x.id === "tasks")!,
    id: "task-detail",
    name: "任务详情",
    path: paths["task-detail"],
    parent: "tasks",
  },
  {
    // 驾驶舱大屏：仅由顶栏入口以新标签页打开，故不写入 groups（不出现在侧边栏与中心 Tab）
    ...pages.find((x) => x.id === "workbench")!,
    id: "bigscreen",
    name: "驾驶舱大屏",
    path: paths.bigscreen,
    parent: undefined,
    sub: "",
    hidden: true,
  },
];
export interface Route {
  page: string;
  id?: string;
  tab?: string;
}
export function parse(hash = location.hash): Route {
  const [raw, q] = hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(q);
  const match = Object.entries(paths)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, p]) => raw === p || raw.startsWith(p + "/"));
  // 默认落地「我的工作台」：业主打开即见待办，而非技术性总览页
  let page = match?.[0] || raw || "workbench";
  let id = match
    ? decodeURIComponent(raw.slice(match[1].length + 1)) || undefined
    : params.get("id") || undefined;
  if (page === "tasks" && id) page = "task-detail";
  return { page, id, tab: params.get("tab") || undefined };
}
export function href(page: string, id?: string, tab?: string) {
  if (page === "tasks" && id) page = "task-detail";
  return (
    "#/" +
    (paths[page] || page) +
    (id ? "/" + encodeURIComponent(id) : "") +
    (tab ? "?tab=" + encodeURIComponent(tab) : "")
  );
}

interface Trail {
  hash: string;
  label: string;
  parent?: Trail;
  scroll: number;
}
const routeTrail = new Map<string, Trail | undefined>();
export function currentTrail() {
  return routeTrail.get(location.hash);
}
export function labelForHash(hash: string) {
  const r = parse(hash),
    m = routeMeta.find((x) => x.id === r.page);
  return (m?.name || r.page) + (r.id ? " · " + r.id : "");
}
export function go(page: string, id?: string, tab?: string) {
  const next = href(page, id, tab);
  if (next === location.hash) return;
  const current = parse();
  if (current.page === page && current.id === id && current.tab !== tab) {
    routeTrail.set(next, currentTrail());
  } else {
    routeTrail.set(next, {
      hash: location.hash || href("overview"),
      label: labelForHash(location.hash),
      parent: currentTrail(),
      scroll: document.querySelector("main")?.scrollTop || 0,
    });
  }
  location.hash = next;
}
export function back() {
  const source = currentTrail();
  if (source) {
    routeTrail.set(source.hash, source.parent);
    location.hash = source.hash;
    setTimeout(
      () => document.querySelector("main")?.scrollTo(0, source.scroll),
      50,
    );
  } else {
    const r = parse();
    go(routeMeta.find((x) => x.id === r.page)?.parent || "overview");
  }
}
export function goCenter(page: string) {
  routeTrail.set(href(page), undefined);
  location.hash = href(page);
}
export function useViewState<T>(
  key: string,
  fallback: T,
): [T, (value: T | ((old: T) => T)) => void] {
  const [v, set] = useState<T>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("view:" + key) || "null") ?? fallback
      );
    } catch {
      return fallback;
    }
  });
  return [
    v,
    (value) =>
      set((old) => {
        const next =
          typeof value === "function" ? (value as (x: T) => T)(old) : value;
        sessionStorage.setItem("view:" + key, JSON.stringify(next));
        return next;
      }),
  ];
}
