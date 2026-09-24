import { useState } from "react";
import { useStore } from "../data/store";
import { constraints } from "../data/engine";
import { go, useViewState } from "../data/navigation";
import { Btn, Badge, Panel, Table, Note, Modal, Field } from "../components/UI";
import { ObjectLink, Kpis } from "../components/Business";
import { ScheduleTimeline } from "../components/ScheduleTimeline";
import {
  queueFor,
  currentTask,
  minutesLeft,
  robotAvailability,
  checks,
  schedule,
  timeAt,
  queueStates,
} from "../data/selectors";
import type { Task } from "../data/types";
export function Scheduling({ page, id }: { page: string; id?: string }) {
  const { s, act } = useStore();
  const [selected, SEL] = useViewState(
    page + ".task." + (id || "all"),
    id && s.tasks.some((t) => t.id === id)
      ? id
      : (page === "queue"
          ? s.tasks.find(
              (t) =>
                t.robotId === (id || "R01") && queueStates.includes(t.state),
            )?.id
          : undefined) ||
          s.tasks.find((t) => t.state === "待调度")?.id ||
          s.tasks[0].id,
  );
  const [rid, R] = useViewState(
    page + ".robot." + (id || "all"),
    id && s.robots.some((r) => r.id === id) ? id : "R01",
  );
  const [hours, H] = useViewState(page + ".hours", 4);
  const [q, Q] = useViewState(page + ".query", "");
  const [modal, M] = useState(""),
    [summary, SU] = useState<Task>(),
    [reassign, RA] = useState("R02");
  const t = s.tasks.find((t) => t.id === selected) || s.tasks[0],
    r = s.robots.find((r) => r.id === rid) || s.robots[0];
  const cur = currentTask(s, r);
  const check = checks(s, t, r);
  const window = schedule(s, r).find((w) => w.id === t.id);
  const start = window?.start ?? (schedule(s, r).at(-1)?.end || 0);
  const pending = s.tasks.filter(
    (t) => t.state === "待调度" || t.state === "已分配",
  );
  const ts = queueFor(s, r.id);
  const ix = ts.findIndex((x) => x.id === t.id);
  function action(type: string) {
    act({ type, id: t.id, robotId: r.id });
  }
  const canAssign = ["待调度", "已分配"].includes(t.state);
  const exactId = id && s.tasks.some((x) => x.id === id) ? id : undefined;
  // An explicit task drill-down selects that task on first mount; persisted selection remains on return.
  const headline = (
    <Kpis
      items={[
        {
          label: "待调度",
          value: s.tasks.filter((t) => t.state === "待调度").length,
        },
        {
          label: "高 / 紧急",
          value: s.tasks.filter(
            (t) => t.state === "待调度" && t.priority !== "普通",
          ).length,
        },
        {
          label: "空闲机器人",
          value: s.robots.filter((r) => r.state === "空闲").length,
        },
        {
          label: "执行中",
          value: s.robots.filter((r) => r.state === "执行中").length,
        },
        {
          label: "已排队",
          value: s.tasks.filter((t) => queueStates.includes(t.state)).length,
        },
        {
          label: "版本待同步",
          value: s.robots.filter((r) => {
            const m = s.maps.find((m) => m.id === r.mapId);
            return (
              m && (m.version !== r.mapVersion || m.pointSet !== r.pointSet)
            );
          }).length,
        },
        {
          label: "即将超期",
          value: s.tasks.filter(
            (t) =>
              t.deadline &&
              Date.parse(t.deadline) - Date.now() < 900000 &&
              t.state === "待调度",
          ).length,
        },
      ]}
    />
  );
  const controls = (
    <div className="decision-actions">
      <Btn
        primary
        disabled={
          !canAssign ||
          constraints(s, t, r).filter((x) => x !== "地图/点位版本待同步")
            .length > 0
        }
        onClick={() => action("ASSIGN")}
      >
        加入队列
      </Btn>
      <Btn
        primary
        disabled={t.state !== "已分配" || constraints(s, t, r, true).length > 0}
        onClick={() => action("DISPATCH")}
      >
        立即下发
      </Btn>
      {t.state === "下发中" && (
        <Btn onClick={() => action("RECEIPT")}>模拟接收回执</Btn>
      )}
      {["待执行", "暂停"].includes(t.state) && (
        <Btn
          primary
          onClick={() => {
            if (act({ type: "START", id: t.id })) go("execution", t.id);
          }}
        >
          开始 / 恢复任务
        </Btn>
      )}
      <Btn
        disabled={!queueStates.includes(t.state)}
        onClick={() => M("reassign")}
      >
        改派
      </Btn>
      <Btn disabled={t.state !== "已分配"} onClick={() => action("REORDER")}>
        置于队首
      </Btn>
      <Btn
        danger
        disabled={
          t.priority === "普通" || !cur || cur.id === t.id || !canAssign
        }
        onClick={() => M("preempt")}
      >
        任务抢占
      </Btn>
    </div>
  );
  const detail = (
    <>
      <div className="decision-selected">
        <span>选中任务</span>
        <ObjectLink type="task-detail" id={t.id}>
          {t.name}
        </ObjectLink>
        <small>{t.id}</small>
        <span>候选机器人</span>
        <ObjectLink type="robot" id={r.id}>
          {r.id} · {r.name}
        </ObjectLink>
      </div>
      <div className="constraint-list">
        {check.map((x) => (
          <div key={x.name}>
            <i className={x.pass ? "pass" : "blocked"}>{x.pass ? "✓" : "!"}</i>
            <div>
              <b>{x.name}</b>
              <small>{x.detail}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="schedule-estimate">
        <span>
          预计开始 <b>{timeAt(start)}</b>
        </span>
        <span>
          预计结束 <b>{timeAt(start + t.duration)}</b>
        </span>
        <small>依据当前进度和队列估算，实际下发前复核</small>
      </div>
      {controls}
    </>
  );
  return (
    <>
      {headline}
      {page === "dispatch" ? (
        <>
          <div className="dispatch-workbench workbench-surface">
            <section className="task-pool">
              <div className="split">
                <h3>
                  待调度任务池 <small>{pending.length} 个任务</small>
                </h3>
                <Btn onClick={() => go("tasks")}>＋ 临时任务</Btn>
              </div>
              <input
                aria-label="调度任务搜索"
                placeholder="搜索任务 / 来源"
                value={q}
                onChange={(e) => Q(e.target.value)}
              />
              <div className="pool-scroll">
                {pending
                  .filter((t) => (t.name + t.id + t.source).includes(q))
                  .map((t) => (
                    <article
                      className={
                        "pool-task " + (selected === t.id ? "selected" : "")
                      }
                      key={t.id}
                      onClick={() => SEL(t.id)}
                    >
                      <div className="split">
                        <ObjectLink type="task-detail" id={t.id}>
                          {t.id}
                        </ObjectLink>
                        <Badge>{t.priority}</Badge>
                      </div>
                      <h4>{t.name}</h4>
                      <div className="task-facts">
                        <span>{t.source}</span>
                        <span>{t.taskType || "综合巡检任务"}</span>
                        <span>
                          {s.maps.find((m) => m.id === t.mapId)?.region}
                        </span>
                        <span>期望：{t.expectedAt || "尽快 / 调度窗口内"}</span>
                        <span>
                          {t.items.length}点 / {t.items.length}检测项
                        </span>
                        <span>
                          m{t.mapVersion} / p{t.pointSet}
                        </span>
                        <span>预计 {t.duration} 分钟</span>
                      </div>
                      <p className="muted">
                        原子动作：
                        {(t.atomicActions || []).join(" / ") || "按检测项执行"}
                        ；需要{" "}
                        {[...new Set(t.items.map((p) => p.kind))].join(" / ")}
                      </p>
                      <Badge>{t.state}</Badge>
                    </article>
                  ))}
              </div>
            </section>
            <section className="resource-pool">
              <h3>
                机器人资源池 <small>面向未来可用时间</small>
              </h3>
              {s.robots.map((r) => {
                const c = currentTask(s, r),
                  reasons = constraints(s, t, r);
                const category = reasons.length
                  ? reasons.join("；")
                  : c
                    ? "可以排队 · 当前任务完成后"
                    : "推荐 · 可以立即执行";
                return (
                  <article
                    className={
                      "resource-row " + (rid === r.id ? "selected" : "")
                    }
                    key={r.id}
                    onClick={() => R(r.id)}
                  >
                    <div className="split">
                      <ObjectLink type="robot" id={r.id}>
                        {r.id} · {r.name}
                      </ObjectLink>
                      <Badge>{r.state}</Badge>
                    </div>
                    <p>
                      {r.region} · 电量 {r.battery}% · m{r.mapVersion}/p
                      {r.pointSet}
                    </p>
                    <div className="tags">
                      {r.capabilities.map((x) => (
                        <Badge key={x}>{x}</Badge>
                      ))}
                    </div>
                    <div className="resource-current">
                      <span>
                        当前{" "}
                        <ObjectLink type="execution" id={c?.id}>
                          {c?.name || "无"}
                        </ObjectLink>
                      </span>
                      <progress
                        max={c?.items.length || 1}
                        value={c?.done.length || 0}
                      />
                      <small>
                        {c
                          ? `${c.done.length}/${c.items.length} 有效检测项 · 约 ${timeAt(minutesLeft(c))} 结束`
                          : "当前空闲"}
                      </small>
                    </div>
                    <div className="split">
                      <ObjectLink type="queue" id={r.id}>
                        {queueFor(s, r.id).length} 个待执行
                      </ObjectLink>
                      <span className="muted">
                        可用 {robotAvailability(s, r)}
                      </span>
                    </div>
                    <div
                      className={
                        "eligibility " +
                        (reasons.length ? "warning" : "success")
                      }
                    >
                      {category}
                    </div>
                  </article>
                );
              })}
            </section>
            <section className="decision-panel">
              <h3>调度决策</h3>
              {detail}
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="filter-bar">
            <b>机器人未来排程管理</b>
            <select
              aria-label="队列机器人"
              value={rid}
              onChange={(e) => {
                R(e.target.value);
                const task = s.tasks.find(
                  (t) =>
                    t.robotId === e.target.value &&
                    queueStates.includes(t.state),
                );
                if (task) SEL(task.id);
              }}
            >
              {s.robots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.name}
                </option>
              ))}
            </select>
            <span>可拖动未下发任务调整顺序；已接收任务需撤回确认</span>
            <Btn onClick={() => go("tasks")}>插入高优任务</Btn>
          </div>
        </>
      )}
      <Panel
        title={
          page === "queue" ? "机器人行 · 当前任务与未来队列" : "未来任务时间轴"
        }
        extra={
          <div className="segmented">
            {[4, 8].map((n) => (
              <button
                key={n}
                className={hours === n ? "active" : ""}
                onClick={() => H(n)}
              >
                未来 {n} 小时
              </button>
            ))}
          </div>
        }
      >
        <ScheduleTimeline
          hours={hours}
          selected={selected}
          onSelect={(task) => {
            SEL(task.id);
            if (task.robotId) R(task.robotId);
            SU(task);
          }}
          draggable={page === "queue"}
        />
      </Panel>
      {page === "queue" && (
        <div className="queue-detail-grid">
          <Panel
            title={`${r.id} · 队列顺序与预计窗口`}
            extra={
              <ObjectLink type="robot" id={r.id}>
                机器人监测 →
              </ObjectLink>
            }
          >
            <div className="queue-drag-list">
              {schedule(s, r).map((w, i) => (
                <div
                  className={
                    "queue-line " + (w.id === selected ? "selected" : "")
                  }
                  key={w.id}
                  draggable={w.task?.state === "已分配"}
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", w.id)
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (w.task)
                      act({
                        type: "REORDER",
                        id: e.dataTransfer.getData("text/plain"),
                        beforeId: w.id,
                      });
                  }}
                  onClick={() => {
                    if (w.task) SEL(w.id);
                  }}
                >
                  <span className="drag-handle">⠿</span>
                  <b>{i + 1}</b>
                  <div>
                    <ObjectLink type="task-detail" id={w.task?.id}>
                      {w.label}
                    </ObjectLink>
                    <small>
                      {timeAt(w.start)}—{timeAt(w.end)} · {w.end - w.start}分钟
                    </small>
                  </div>
                  <Badge>{w.task?.priority || "维护"}</Badge>
                  <Badge>{w.task?.state || "计划窗口"}</Badge>
                  {w.task && <Btn onClick={() => SEL(w.id)}>选中</Btn>}
                </div>
              ))}
            </div>
            {!schedule(s, r).length && (
              <Note>机器人未来队列为空，可从调度工作台分配任务。</Note>
            )}
          </Panel>
          <Panel title="顺序影响与排程决策">
            <div className="impact-grid">
              <div>
                前置任务<b>{ix > 0 ? ts[ix - 1].id : cur?.id || "无"}</b>
              </div>
              <div>
                后续任务<b>{ix >= 0 ? ts[ix + 1]?.id || "无" : "待加入队列"}</b>
              </div>
              <div>
                队首插入影响<b>后续预计延后 {t.duration} 分钟</b>
              </div>
            </div>
            {detail}
          </Panel>
        </div>
      )}
      {page === "dispatch" && (
        <Panel title="任务分配与接收记录">
          <Table
            heads={["任务", "机器人", "状态", "实际执行门槛", "操作"]}
            rows={s.tasks
              .filter(
                (t) => queueStates.includes(t.state) || t.state === "暂停",
              )
              .map((t) => [
                <ObjectLink type="task-detail" id={t.id}>
                  {t.name}
                </ObjectLink>,
                <ObjectLink type="robot" id={t.robotId} />,
                <Badge>{t.state}</Badge>,
                t.robotId
                  ? constraints(
                      s,
                      t,
                      s.robots.find((r) => r.id === t.robotId)!,
                      true,
                    ).join("；") || "满足执行门槛"
                  : "未分配",
                <div className="actions">
                  <Btn
                    onClick={() => {
                      SEL(t.id);
                      R(t.robotId || "R01");
                    }}
                  >
                    调度决策
                  </Btn>
                  <Btn onClick={() => go("queue", t.robotId)}>机器人队列</Btn>
                </div>,
              ])}
          />
        </Panel>
      )}
      {summary && (
        <Modal title="时间轴任务摘要" onClose={() => SU(undefined)}>
          <h3>{summary.name}</h3>
          <p>
            {summary.id} · {summary.state} · {summary.priority}
          </p>
          <p>
            {summary.items.length} 检测项 · m{summary.mapVersion}/p
            {summary.pointSet} · 预计{summary.duration}分钟
          </p>
          <div className="actions">
            <Btn primary onClick={() => go("task-detail", summary.id)}>
              任务详情
            </Btn>
            <Btn onClick={() => go("execution", summary.id)}>执行监控</Btn>
            <Btn onClick={() => SU(undefined)}>在工作台调整</Btn>
          </div>
        </Modal>
      )}
      {modal && (
        <Modal
          title={modal === "preempt" ? "确认抢占影响" : "撤回确认与改派"}
          onClose={() => M("")}
        >
          {modal === "preempt" ? (
            <>
              <Note>
                原任务 {cur?.name} 将暂停。已完成 {cur?.done.length}/
                {cur?.items.length} 项保留，新任务预计占用 {t.duration}{" "}
                分钟。完成后需明确恢复原任务。
              </Note>
              <Btn
                danger
                onClick={() => {
                  if (act({ type: "PREEMPT", id: t.id, robotId: r.id })) M("");
                }}
              >
                模拟暂停确认并抢占
              </Btn>
            </>
          ) : (
            <>
              <Note>
                已接收或下发中的任务，先模拟查询确认未执行、撤回成功，再允许改派。
              </Note>
              <Field label="改派至">
                <select value={reassign} onChange={(e) => RA(e.target.value)}>
                  {s.robots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} · {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Btn
                primary
                onClick={() => {
                  if (
                    act({
                      type: "REASSIGN",
                      id: t.id,
                      robotId: reassign,
                      confirmed: true,
                    })
                  ) {
                    R(reassign);
                    M("");
                  }
                }}
              >
                确认撤回并改派
              </Btn>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
