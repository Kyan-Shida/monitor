/**
 * @file MonitorCockpit.tsx
 * @description 管理驾驶舱：深色大屏形态（KPI 数字条 + 设备状态 + 任务情况 + 实时态势 + 告警趋势与排行），
 *              按角色切默认视图，支持时间范围切换、口径说明与下钻
 * @interaction 由 App.tsx 在 page === "overview" 时渲染；指标取自 data/metrics.ts，历史趋势取自 data/metricHistory.ts
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useStore } from "../data/store";
import { useRole } from "../components/Can";
import { Badge, Btn, Note, Table } from "../components/UI";
import { Donut, Ring } from "../components/Charts";
import { Sparkline } from "../components/Sparkline";
import { MapCanvas } from "../components/MapCanvas";
import { ScreenTopBar, type CockpitId } from "../components/ScreenTopBar";
import {
  METRIC_CONFIG,
  metricOk,
  metricValue,
  metricsFor,
  scopedState,
} from "../data/metrics";
import { deltaOf, pushSnapshot, readHistory } from "../data/metricHistory";
import type { MetricPoint } from "../data/metricHistory";
import { deviceProfile, deviceTypes } from "../data/deviceProfile";
import { terminal } from "../data/selectors";

/** 告警排行分段配色（沉稳工业深色板：降饱和青蓝/蓝/紫/琥珀） */
const RANK_COLORS = ["#3aa7c9", "#5b8fe0", "#8a74d6", "#d39a3c"];
/** 任务状态分布配色（与色板一致，状态语义靠色相、不靠高饱和发光） */
const TASK_COLORS = { 执行中: "#3aa7c9", 已完成: "#5b8fe0", 待调度: "#d39a3c", 已终止: "#d06a63" };

/** 本地日期（YYYY-MM-DD） */
const localDay = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** 兼容 "YYYY-MM-DD HH:mm" 的时间解析（部分浏览器要求 T 分隔） */
const parseTime = (t: string) => Date.parse(t.replace(" ", "T"));

export function MonitorCockpit({
  onSwitch,
}: {
  /** 独立大屏窗口内的驾驶舱切换；后台外壳下缺省按路由跳转 */
  onSwitch?: (id: CockpitId) => void;
}) {
  const { s, act } = useStore();
  const role = useRole();
  const [view, SETV] = useState<"综合总览" | "运营管理">(role.cockpitView);
  const [region, SETR] = useState("全部区域");
  const [range, SETRANGE] = useState<"今日" | "近7天" | "近30天" | "全部">("近7天");
  const [trendRange, SETTREND] = useState<"近7天" | "近30天">("近7天");
  const [openMetric, OPENM] = useState("");
  const [fs, FS] = useState(false);
  const [history, SETH] = useState(() => readHistory());
  const shellRef = useRef<HTMLDivElement>(null);

  // 角色切换后回到该角色的默认视图
  useEffect(() => SETV(role.cockpitView), [role.cockpitView]);
  useEffect(() => {
    const onFs = () => FS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const sc = scopedState(s, region);
  const list = metricsFor(role.id);
  const mv = (key: string) => metricValue(sc, key);
  const TODAY = localDay();
  const MONTH = TODAY.slice(0, 7);

  // 进入驾驶舱时采样一次指标，用于趋势折线与环比（按日采样，不插值补造）
  useEffect(() => {
    const values: Record<string, number> = {};
    list.forEach((m) => (values[m.key] = m.calc(sc)));
    SETH(pushSnapshot(values));
    // 仅在进入驾驶舱时采样一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) shellRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  // ── 时间范围过滤：按任务创建时间过滤 ──
  const rangeStart = useMemo(() => {
    if (range === "全部") return 0;
    if (range === "今日") return parseTime(TODAY + " 00:00");
    const days = range === "近7天" ? 7 : 30;
    return Date.now() - days * 86400000;
  }, [range, TODAY]);
  const tasksInRange = s.tasks.filter(
    (t) =>
      range === "全部" ||
      (Number.isFinite(parseTime(t.created)) && parseTime(t.created) >= rangeStart),
  );
  const taskDist = [
    { label: "执行中", value: tasksInRange.filter((t) => t.state === "执行中").length, color: TASK_COLORS.执行中 },
    { label: "已完成", value: tasksInRange.filter((t) => ["完成", "部分完成"].includes(t.state)).length, color: TASK_COLORS.已完成 },
    { label: "待调度", value: tasksInRange.filter((t) => ["待调度", "已分配", "下发中", "待执行"].includes(t.state)).length, color: TASK_COLORS.待调度 },
    { label: "已终止", value: tasksInRange.filter((t) => ["取消", "失败", "超期"].includes(t.state)).length, color: TASK_COLORS.已终止 },
  ];
  const taskTotal = tasksInRange.length;

  // ── 告警趋势：按日聚合真实告警时间 ──
  const trendDays = trendRange === "近7天" ? 7 : 30;
  const trendList: MetricPoint[] = useMemo(() => {
    const out: MetricPoint[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const key = localDay(new Date(Date.now() - i * 86400000));
      out.push({
        d: key.slice(5),
        v: s.alarms.filter((a) => a.time.slice(0, 10) === key).length,
      });
    }
    return out;
  }, [s.alarms, trendDays]);

  // ── 告警排行：按点位聚合 ──
  const rank = useMemo(() => {
    const map = new Map<string, number>();
    s.alarms.forEach((a) => map.set(a.pointId, (map.get(a.pointId) || 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pid, value], i) => ({
        pid,
        name: s.points.find((p) => p.id === pid)?.name || pid,
        value,
        color: RANK_COLORS[i % RANK_COLORS.length],
      }));
  }, [s.alarms, s.points]);
  const rankTotal = rank.reduce((a, x) => a + x.value, 0);

  // ── 今日告警 ──
  const todayAlarms = s.alarms.filter((a) => a.time.slice(0, 10) === TODAY);
  const todayOpen = todayAlarms.filter((a) => a.state !== "已关闭");
  const openAlarms = sc.alarms.filter((a) => a.state !== "已关闭");
  const monthTasks = s.tasks.filter((t) => t.created.slice(0, 7) === MONTH).length;
  const monthAlarms = s.alarms.filter((a) => a.time.slice(0, 7) === MONTH).length;

  // ── 运营过程区 ──
  const overdue = s.tasks.filter(
    (t) => t.deadline && Date.parse(t.deadline) < Date.now() && !terminal.includes(t.state),
  ).length;
  const deviceRows = deviceTypes.map((d) => {
    const rs = s.robots.filter((r) => r.deviceType === d);
    const inScope = region === "全部区域" ? rs : rs.filter((r) => r.region === region);
    return {
      d,
      total: inScope.length,
      bad: inScope.filter((r) => ["故障", "离线"].includes(r.state)).length,
      low: inScope.filter((r) => r.battery < r.constraints.minBattery).length,
      fallback: deviceProfile[d].focusItems.join(" / "),
    };
  });
  const lowConfidence = s.results.filter((r) => r.confidence < 0.85).length;
  const fbTotal = s.feedbacks.length;
  const fbClosed = s.feedbacks.filter((f) => f.consumed).length;
  const woOpen = s.workOrders.filter((w) => !["已验收", "已关闭"].includes(w.state));
  const escalated = s.workOrders.filter((w) => w.slaState === "已升级").length;

  /** KPI 数字条：7 项大屏核心数字（只读展示，不下钻） */
  const strip = [
    { key: "devices", label: "巡检机器（台）" },
    { key: "onlineCount", label: "在线机器（台）" },
    { key: "coverage", label: "点位覆盖率（%）" },
    { key: "taskRate", label: "任务完成率（%）" },
    { key: "alarmTotal", label: "告警总数（个）" },
    { key: "executing", label: "执行中任务（个）" },
    { key: "closeRate", label: "异常闭环率（%）" },
  ];

  return (
    <div className="cockpit-screen" ref={shellRef}>
      {/* 大屏全局导航栏：两个驾驶舱统一（品牌 + 两侧导航 Tab + 发光标题 + 时间与用户） */}
      <ScreenTopBar current="overview" onSwitch={onSwitch} />
      {/* 驾驶舱工具条：仅保留厂区筛选 + 全屏 */}
      <div className="cs-toolbar">
        <select aria-label="厂区" value={region} onChange={(e) => SETR(e.target.value)}>
          {["全部区域", ...new Set(s.robots.map((r) => r.region))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="cs-toolbar-right">
          <Btn onClick={toggleFullscreen}>
            {fs ? <Minimize size={15} /> : <Maximize size={15} />}
            {fs ? "退出大屏" : "展示全屏"}
          </Btn>
        </span>
      </div>

      {/* KPI 数字条：只读展示，不做下钻跳转 */}
      <div className="cs-kpi-strip">
        {strip.map((x) => (
          <div key={x.key} className="cs-kpi">
            <b>{mv(x.key)}</b>
            <span>{x.label}</span>
          </div>
        ))}
        <button className="cs-kpi cs-kpi-more" onClick={() => OPENM(openMetric ? "" : "all")}>
          <b>ⓘ</b>
          <span>口径说明</span>
        </button>
      </div>

      {/* 主体三栏 */}
      <div className="cs-body">
        {/* 左：设备状态 + 任务情况 */}
        <aside className="cs-left">
          {/* grow：撑满列高，与中/右两栏底边对齐 */}
          <section className="cs-card grow">
            <h3>
              设备状态
              <small>共 {sc.robots.length} 台</small>
            </h3>
            <div className="cs-nums">
              {[
                { n: mv("onlineCount"), label: "在线" },
                { n: sc.robots.filter((r) => r.state === "离线").length, label: "离线" },
                { n: sc.robots.filter((r) => r.state === "执行中").length, label: "巡检中" },
                { n: sc.robots.filter((r) => r.state === "空闲").length, label: "待机" },
              ].map((x) => (
                <div className="cs-num" key={x.label}>
                  <b>{x.n}</b>
                  <span>{x.label}</span>
                </div>
              ))}
            </div>
            <div className="cs-list readonly">
              {sc.robots.map((r) => (
                <button key={r.id}>
                  <i
                    className="cs-dot"
                    style={{ background: r.state === "离线" ? "#8794a3" : r.battery < r.constraints.minBattery ? "#d39a3c" : "#3aa7c9" }}
                  />
                  <div>
                    <b>
                      {r.name}
                      <em>{r.deviceType}</em>
                    </b>
                    <small>{r.state}</small>
                  </div>
                  <span className="cs-bar">
                    <i style={{ width: `${r.battery}%` }} />
                  </span>
                  <em className="cs-battery">{r.battery}%</em>
                </button>
              ))}
              {!sc.robots.length && <Note>当前厂区无设备。</Note>}
            </div>
          </section>

          <section className="cs-card">
            <h3>
              巡检任务情况
              <span className="cs-range">
                {(["今日", "近7天", "近30天", "全部"] as const).map((x) => (
                  <button key={x} className={range === x ? "active" : ""} onClick={() => SETRANGE(x)}>
                    {x}
                  </button>
                ))}
              </span>
            </h3>
            <b className="cs-big">{taskTotal}</b>
            <span className="cs-big-label">任务总数（{range}）</span>
            <div className="cs-rings">
              {taskDist.map((x) => (
                <Ring
                  key={x.label}
                  value={taskTotal ? Math.round((x.value / taskTotal) * 100) : 0}
                  label={x.label}
                  tone={x.color}
                />
              ))}
            </div>
            <div className="cs-nums cs-nums-4">
              {taskDist.map((x) => (
                <div className="cs-num" key={x.label}>
                  <b>{x.value}</b>
                  <span>{x.label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* 中：实时态势地图 + 告警排行 */}
        <main className="cs-center">
          <section className="cs-card cs-map-card grow">
            <h3>
              厂区实时态势
              <small>
                {region} · {sc.robots.length} 台设备在线 {mv("onlineCount")}
              </small>
            </h3>
            <div className="cs-map">
              <MapCanvas
                points={sc.points}
                robots={sc.robots}
                chargers={
                  region === "全部区域"
                    ? s.chargers
                    : s.chargers.filter((c) => c.region === region)
                }
                rails={s.railSections}
                fit="xMidYMid slice"
              />
            </div>
            <div className="cs-map-legend">
              {deviceTypes.map((d) => (
                <span key={d}>
                  <i /> {d}
                </span>
              ))}
              <span>
                <i /> 充电桩
              </span>
              <span>
                <i /> 轨道区段
              </span>
            </div>
          </section>

          <section className="cs-card">
            <h3>
              告警排行
              <small>按点位聚合 · 共 {rankTotal} 次</small>
            </h3>
            <div className="cs-rank-wrap">
              <ul className="cs-rank">
                {!rank.length && <li>暂无告警记录</li>}
                {rank.map((x, i) => (
                  <li key={x.pid}>
                    <span className="idx" style={{ background: x.color }}>
                      {i + 1}
                    </span>
                    <span className="name">{x.name}</span>
                    <span className="pct">
                      {x.value} 次 ·{" "}
                      {rankTotal ? Math.round((x.value / rankTotal) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
              <Donut data={rank.map((x) => ({ label: x.name, value: x.value, color: x.color }))} center={`${rankTotal}`} />
            </div>
          </section>
        </main>

        {/* 右：今日告警 + 告警趋势 */}
        <aside className="cs-right">
          <section className="cs-card grow">
            <h3>
              今日告警
              <small>{TODAY}</small>
            </h3>
            <div className="cs-nums cs-nums-2">
              <div className="cs-num">
                <b>{todayAlarms.length}</b>
                <span>今日发生</span>
              </div>
              <div className="cs-num">
                <b>{todayOpen.length}</b>
                <span>未处理</span>
              </div>
            </div>
            <div className="cs-alarms readonly">
              {!openAlarms.length && <span className="cs-empty">当前无未关闭告警</span>}
              {openAlarms.slice(0, 4).map((a) => (
                <button key={a.id}>
                  <b>{a.name}</b>
                  <small>
                    {a.time} · {a.pointId}
                  </small>
                  <em>{a.state}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="cs-card">
            <h3>
              告警趋势
              <span className="cs-range">
                {(["近7天", "近30天"] as const).map((x) => (
                  <button key={x} className={trendRange === x ? "active" : ""} onClick={() => SETTREND(x)}>
                    {x}
                  </button>
                ))}
              </span>
            </h3>
            <div className="cs-trend">
              <Sparkline list={trendList} ok />
            </div>
            <div className="cs-trend-axis">
              <span>{trendDays} 天前</span>
              <span>今日</span>
            </div>
            <small className="cs-hint">
              按告警真实时间聚合，无数据日期计 0，不做插值平滑。
            </small>
          </section>

          <section className="cs-card">
            <h3>核心指标（含环比）</h3>
            <div className="cs-metric-list">
              {["autoRate", "aiAccuracy", "falseRate", "mttr", "takeoverRate", "reviewBacklog"]
                .map((k) => list.find((m) => m.key === k))
                .filter(Boolean)
                .map((m) => {
                  const v = metricValue(sc, m!.key);
                  const delta = deltaOf(history[m!.key]);
                  return (
                    <button key={m!.key} onClick={() => OPENM(m!.key)}>
                      <span>{m!.name}</span>
                      <b>
                        {v} {m!.unit}
                      </b>
                      <em className={delta === undefined ? "" : m!.positive === delta >= 0 ? "up" : "down"}>
                        {delta === undefined ? "—" : `${delta}%`}
                      </em>
                      <Badge>{m!.target === undefined ? "观察" : metricOk(m!, v) ? "达标" : "未达标"}</Badge>
                    </button>
                  );
                })}
            </div>
          </section>
        </aside>
      </div>

      {/* 运营管理视图：过程区（仅非管理员默认进入） */}
      {view === "运营管理" && (
        <div className="cs-process">
          <section className="cs-card">
            <h3>任务与计划</h3>
            <Table
              heads={["指标", "数值"]}
              rows={[
                ["任务完成率", `${mv("taskRate")}%`],
                ["已超期任务", overdue],
                ["待调度任务", mv("pendingDispatch")],
                ["临时插单", s.tasks.filter((t) => t.source !== "计划生成").length],
                ["排班资质异常", s.shifts.filter((x) => !x.certOk).length],
              ]}
            />
          </section>
          <section className="cs-card">
            <h3>机器状态（按机型）</h3>
            <Table
              heads={["机型", "在册", "故障/离线", "低电量"]}
              rows={deviceRows.map((x) => [
                <>
                  {x.d}
                  <small>{x.fallback}</small>
                </>,
                x.total,
                x.bad,
                x.low,
              ])}
            />
          </section>
          <section className="cs-card">
            <h3>AI 质量</h3>
            <Table
              heads={["指标", "数值"]}
              rows={[
                ["复核积压", mv("reviewBacklog")],
                ["低置信度", lowConfidence],
                ["AI 准确率", `${mv("aiAccuracy")}%`],
                ["误报率", `${mv("falseRate")}%`],
                ["反馈闭环率", `${fbTotal ? Math.round((fbClosed / fbTotal) * 100) : 0}%`],
              ]}
            />
          </section>
          <section className="cs-card">
            <h3>异常闭环</h3>
            <Table
              heads={["环节", "数值"]}
              rows={[
                ["未确认告警", mv("unconfirmedAlarms")],
                ["工单未闭环", woOpen.length],
                ["SLA 超时升级", escalated],
                ["异常闭环率", `${mv("closeRate")}%`],
                ["MTTR", `${mv("mttr")} 分钟`],
              ]}
            />
          </section>
          <section className="cs-card">
            <h3>人员与排班</h3>
            <Table
              heads={["指标", "数值"]}
              rows={[
                ["人工接管率", `${mv("takeoverRate")}%`],
                ["接管申请", s.takeovers.length],
                ["现场保障量", mv("fieldDone")],
                ["现场待处理", mv("fieldPending")],
                ["排班执行率", `${mv("scheduleRate")}%`],
              ]}
            />
          </section>
        </div>
      )}

      {/* 口径说明：点击 KPI 或核心指标展开 */}
      {openMetric && (
        <section className="cs-card cs-metric-panel">
          <h3>
            指标口径说明（{role.name}可见 {list.length} 项）
            <Btn onClick={() => OPENM("")}>收起</Btn>
          </h3>
          <Table
            heads={["指标", "口径（公式）", "当前值", "目标", "可下钻维度"]}
            rows={list
              .filter((m) => openMetric === "all" || m.key === openMetric)
              .map((m) => {
                const v = metricValue(sc, m.key);
                return [
                  m.name,
                  m.formula,
                  `${v} ${m.unit}`,
                  m.target === undefined ? "—" : `${m.positive ? "≥" : "≤"} ${m.target}${m.unit}`,
                  m.dims.join(" / "),
                ];
              })}
          />
          <small className="cs-hint">
            大屏只做只读展示，明细请在业务中心查看；
            成本节省换算系数 {METRIC_CONFIG.costPerTask} 万元/任务（配置中心可改）。
          </small>
        </section>
      )}
    </div>
  );
}

