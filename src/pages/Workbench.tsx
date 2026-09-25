/**
 * @file Workbench.tsx
 * @description 「我的工作台」默认首页：统一收口待复核结果、待确认告警、待调度任务、
 *              机器人关注项与即将超期任务，支持在当前页直接处理，处理成功后自动出列
 * @interaction 由 src/App.tsx 在 page === "workbench" 时渲染；
 *              处理动作经 data/store 的 act 传入 data/engine 状态机
 */
import { useState, type ReactNode } from "react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { Badge, Btn, Field, Modal, Note, Panel } from "../components/UI";
import { ObjectLink, Kpis } from "../components/Business";
import { minutesLeft, pointOf, terminal } from "../data/selectors";
import { DUE_SOON_MS, metricValue } from "../data/metrics";
import type { Result } from "../data/types";

// 即将超期阈值与低电量门槛统一由指标中心提供，避免工作台与报表出现两套口径

/**
 * 将时间字符串压缩为「MM-DD HH:mm」，用于待办列表紧凑展示
 * @param value 可被 Date.parse 解析的时间字符串
 * @returns 格式化结果；无法解析时原样返回，避免展示空白
 */
function shortTime(value: string) {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 待办条目：只展示信息，不携带操作按钮
 * @param children 待办主体内容
 */
function Todo({ children }: { children: ReactNode }) {
  return (
    <li className="todo-item">
      <div className="todo-main">{children}</div>
    </li>
  );
}

/**
 * 空待办占位，避免业主误以为页面未加载
 */
function TodoEmpty({ text }: { text: string }) {
  return <li className="todo-empty">{text}</li>;
}

export function Workbench() {
  const { s, act } = useStore();
  // 复核弹窗依赖的结果 ID；表单在打开弹窗时按当前结果初始化
  const [reviewing, REVIEWING] = useState<Result>();
  const [conclusion, CONC] = useState("确认");
  const [value, VAL] = useState("");
  const [finalState, FS] = useState<"正常" | "异常">("正常");
  const [reason, REASON] = useState("");

  const pendingResults = s.results.filter((r) => r.status === "待复核");
  const pendingAlarms = s.alarms.filter((a) => a.state === "待确认");
  const pendingTasks = s.tasks.filter((t) => t.state === "待调度");
  const running = s.tasks.filter((t) => t.state === "执行中");

  // 机器人关注项：离线、低电量、地图/点位版本落后三类合并，同一机器人只出现一次
  const robotAttention = s.robots
    .map((robot) => {
      const map = s.maps.find((m) => m.id === robot.mapId);
      const stale =
        !!map &&
        (robot.mapVersion !== map.version || robot.pointSet !== map.pointSet);
      const reasons = [
        robot.state === "离线" ? "通信离线" : "",
        robot.battery < robot.constraints.minBattery
          ? `电量 ${robot.battery}%（低于${robot.deviceType}门槛 ${robot.constraints.minBattery}%）`
          : "",
        stale
          ? `地图版本落后（实际 m${robot.mapVersion} / p${robot.pointSet}）`
          : "",
      ].filter(Boolean);
      return { robot, reasons };
    })
    .filter((x) => x.reasons.length);

  const dueSoon = s.tasks.filter(
    (t) =>
      t.deadline &&
      Date.parse(t.deadline) - Date.now() < DUE_SOON_MS &&
      !terminal.includes(t.state),
  );

  const allClear =
    !pendingResults.length &&
    !pendingAlarms.length &&
    !pendingTasks.length &&
    !robotAttention.length &&
    !dueSoon.length;



  return (
    <>
      {/* 顶部 KPI 一律取自指标中心：与驾驶舱、报表同口径 */}
      <Kpis
        items={[
          {
            label: "待复核结果",
            value: metricValue(s, "reviewBacklog"),
            action: () => jump("wb-results"),
          },
          {
            label: "待确认告警",
            value: metricValue(s, "unconfirmedAlarms"),
            action: () => jump("wb-alarms"),
          },
          {
            label: "待调度任务",
            value: metricValue(s, "pendingDispatch"),
            action: () => jump("wb-tasks"),
          },
          {
            label: "机器人待关注",
            value: metricValue(s, "robotAttention"),
            action: () => jump("wb-robots"),
          },
          {
            label: "即将超期",
            value: metricValue(s, "dueSoonTasks"),
            action: () => jump("wb-due"),
          },
          {
            label: "执行中任务",
            value: metricValue(s, "executing"),
            action: () => go("execution"),
          },
        ]}
      />

      {allClear && <Note>当前没有待处理事项，巡检业务已全部闭环。</Note>}

      <div className="workbench-board">
        <div id="wb-results">
          <Panel
            title="待复核巡检结果"
            extra={<Btn onClick={() => go("results")}>结果查询</Btn>}
          >
            <ul className="todo-list">
              {!pendingResults.length && <TodoEmpty text="没有待复核结果" />}
              {pendingResults.map((r) => {
                const p = pointOf(s, r);
                return (
                  <Todo key={r.id}>
                    <b>
                      {p?.device} · {p?.object} · {r.item}
                    </b>
                    <small className="todo-meta">
                      识别 {r.recognized} → 最终 {r.final} {r.unit} · 置信度{" "}
                      {Math.round(r.confidence * 100)}% · {shortTime(r.time)}
                    </small>
                    <small className="todo-meta">
                      来源任务 <ObjectLink type="task-detail" id={r.taskId} />
                      <Badge>{r.abnormal ? "异常" : "正常"}</Badge>
                      <Badge>{r.status}</Badge>
                    </small>
                  </Todo>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div id="wb-alarms">
          <Panel
            title="待确认告警"
            extra={<Btn onClick={() => go("alarms")}>告警事件</Btn>}
          >
            <ul className="todo-list">
              {!pendingAlarms.length && <TodoEmpty text="没有待确认告警" />}
              {pendingAlarms.map((a) => (
                <Todo key={a.id}>
                  <b>
                    {a.name}
                    <Badge>{a.level}</Badge>
                  </b>
                  <small className="todo-meta">
                    点位 <ObjectLink type="point" id={a.pointId} /> ·{" "}
                    {shortTime(a.time)}
                  </small>
                  <small className="todo-meta">
                    触发原因可查看原始结果与证据后再确认
                  </small>
                </Todo>
              ))}
            </ul>
          </Panel>
        </div>

        <div id="wb-tasks">
          <Panel
            title="待调度任务"
            extra={<Btn onClick={() => go("dispatch")}>调度工作台</Btn>}
          >
            <ul className="todo-list">
              {!pendingTasks.length && <TodoEmpty text="没有待调度任务" />}
              {pendingTasks.map((t) => (
                <Todo key={t.id}>
                  <b>
                    {t.name}
                    <Badge>{t.priority}</Badge>
                  </b>
                  <small className="todo-meta">
                    {t.id} · {t.source} ·{" "}
                    {s.maps.find((m) => m.id === t.mapId)?.name || t.mapId} ·{" "}
                    {t.items.length} 个点位 · 预计需 {minutesLeft(t)} 分钟
                  </small>
                  <small className="todo-meta">
                    {t.deadline
                      ? `要求 ${shortTime(t.deadline)} 前完成`
                      : "未设置完成时限"}
                  </small>
                </Todo>
              ))}
            </ul>
          </Panel>
        </div>

        <div id="wb-robots">
          <Panel
            title="机器人与地图待关注"
            extra={<Btn onClick={() => go("robots")}>机器人监测</Btn>}
          >
            <ul className="todo-list">
              {!robotAttention.length && (
                <TodoEmpty text="机器人运行正常，地图版本一致" />
              )}
              {robotAttention.map(({ robot, reasons }) => (
                <Todo key={robot.id}>
                  <b>
                    {robot.id} · {robot.name}
                    <Badge>{robot.state}</Badge>
                  </b>
                  <small className="todo-meta">{reasons.join(" · ")}</small>
                  <small className="todo-meta">
                    {robot.region} · 电量 {robot.battery}% · 能力{" "}
                    {robot.capabilities.join(" / ")}
                  </small>
                </Todo>
              ))}
            </ul>
          </Panel>
        </div>

        <div id="wb-due">
          <Panel
            title="即将超期任务"
            extra={<Btn onClick={() => go("tasks")}>任务列表</Btn>}
          >
            <ul className="todo-list">
              {!dueSoon.length && <TodoEmpty text="没有临近完成时限的任务" />}
              {dueSoon.map((t) => (
                <Todo key={t.id}>
                  <b>
                    {t.name}
                    <Badge>{t.state}</Badge>
                  </b>
                  <small className="todo-meta">
                    {t.id} · {t.priority} · {t.robotId || "未分配"} · 要求{" "}
                    {t.deadline ? shortTime(t.deadline) : "—"} 前完成
                  </small>
                </Todo>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {reviewing && (
        <Modal title={`复核结果 · ${reviewing.id}`} onClose={() => REVIEWING(undefined)}>
          <Field label="复核结论">
            <select value={conclusion} onChange={(e) => CONC(e.target.value)}>
              {["确认", "修正", "标记无效"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="最终值">
            <input
              value={value}
              disabled={conclusion !== "修正"}
              onChange={(e) => VAL(e.target.value)}
            />
          </Field>
          <Field label="最终业务状态">
            <select
              value={finalState}
              onChange={(e) => FS(e.target.value as "正常" | "异常")}
            >
              <option>正常</option>
              <option>异常</option>
            </select>
          </Field>
          <Field label="复核依据 / 无效原因（必填）">
            <textarea value={reason} onChange={(e) => REASON(e.target.value)} />
          </Field>
          <Note>
            原始采集值与识别值会保留，复核追加审计记录；若判断为异常，请到告警处置中安排复查。
          </Note>
          <Btn
            primary
            onClick={() =>
              act(
                {
                  type: "REVIEW",
                  id: reviewing.id,
                  value: conclusion === "修正" ? value : reviewing.final,
                  reason,
                  conclusion,
                  finalState,
                },
                () => REVIEWING(undefined),
              )
            }
          >
            提交复核
          </Btn>
        </Modal>
      )}
    </>
  );
}

/**
 * 将视口滚动到指定待办区块，便于从 KPI 直接定位
 * @param id 区块锚点 ID
 */
function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
