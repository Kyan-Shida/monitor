import { useState } from "react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import {
  stages,
  taskTypeActions,
  atomicActionCapability,
  type TaskType,
  type AtomicAction,
} from "../data/types";
import { stageOf, terminal, minutesLeft, timeAt } from "../data/selectors";
import {
  Btn,
  Badge,
  Panel,
  Note,
  Steps,
  Table,
  Modal,
  Field,
} from "../components/UI";
import { ObjectLink, Kpis, EventTimeline } from "../components/Business";
import { MapCanvas } from "../components/MapCanvas";
import { Video } from "../components/Video";
const actionOptions: {
  id: AtomicAction;
  description: string;
}[] = [
  { id: "拍照", description: "采集一张可见光照片" },
  { id: "录像片段", description: "采集一段现场视频" },
  { id: "采集红外热像", description: "生成红外热像与温度数据" },
  { id: "采集气体", description: "读取气体传感器采样值" },
  { id: "录制声音", description: "录制设备声音片段" },
];
export function Execution({ id }: { id?: string }) {
  const { s, act } = useStore();
  const t =
    s.tasks.find((t) => t.id === id) ||
    s.tasks.find((t) => t.state === "执行中") ||
    s.tasks[0];
  const r = s.robots.find((r) => r.id === t.robotId),
    p = t.items[t.index];
  const [abnormal, A] = useState(false),
    [quickOpen, setQuickOpen] = useState(false),
    [quickName, setQuickName] = useState("临时现场核验"),
    [quickPriority, setQuickPriority] = useState("高"),
    [quickType, setQuickType] = useState<TaskType>("光学任务"),
    [quickActions, setQuickActions] = useState<AtomicAction[]>(["拍照"]),
    [quickRobot, setQuickRobot] = useState(r?.id || s.robots[0]?.id || ""),
    [quickPoints, setQuickPoints] = useState<string[]>(p ? [p.id] : []),
    [submittedTask, setSubmittedTask] = useState("");
  const quickRobotData = s.robots.find((x) => x.id === quickRobot);
  const results = s.results.filter((x) => x.taskId === t.id);
  const valid = results.filter(
    (x) => !["无效", "失败", "待复核"].includes(x.status),
  );
  return (
    <>
      <div className="execution-summary">
        <div className="execution-summary-primary">
          <select
            aria-label="监控任务"
            value={t.id}
            onChange={(e) => go("execution", e.target.value)}
          >
            {s.tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.name}
              </option>
            ))}
          </select>
          <Badge>{t.state}</Badge>
          <ObjectLink type="robot" id={r?.id}>
            {r?.name || "未分配机器人"}
          </ObjectLink>
          <ObjectLink type="task-detail" id={t.id}>
            任务详情
          </ObjectLink>
        </div>
        <div className="execution-summary-meta">
          <span>
            <small>执行窗口</small>
            {t.startedAt
              ? new Date(t.startedAt).toLocaleTimeString()
              : t.created}
            <i>→</i> {timeAt(minutesLeft(t))}
          </span>
          <span>
            <small>版本</small>m{t.mapVersion} / p{t.pointSet}
          </span>
          <span>
            <small>任务类型</small>
            {t.taskType || "综合巡检任务"}
          </span>
          <span>
            <small>原子动作</small>
            {(t.atomicActions || []).join(" / ") || "按检测项执行"}
          </span>
        </div>
        <Btn onClick={() => go("results", t.id)}>巡检结果 →</Btn>
      </div>
      <Kpis
        items={[
          {
            label: "任务完成度 · 有效检测项",
            value: `${t.done.length} / ${t.items.length}`,
          },
          { label: "当前自主阶段", value: stageOf(t) },
          { label: "失败 / 跳过", value: t.skipped.length },
          {
            label: "待复核结果",
            value: results.filter((x) => x.status === "待复核").length,
          },
          {
            label: "异常结果",
            value: results.filter((x) => x.abnormal).length,
          },
        ]}
      />
      <Steps
        items={stages}
        current={terminal.includes(t.state) ? stages.length : t.stage}
      />
      <div className="execution-workbench">
        <Panel title="巡检地图 · 当前业务点位">
          <MapCanvas
            points={t.items}
            robots={r ? [r] : []}
            selected={p?.targetId}
            pointStates={Object.fromEntries(
              t.items.map((p) => [
                p.id,
                t.skipped.includes(p.id)
                  ? "失败"
                  : results.some((x) => x.pointId === p.id && x.abnormal)
                    ? "异常"
                    : t.done.includes(p.id)
                      ? "已完成"
                      : "待执行",
              ]),
            )}
            onSelect={(id) =>
              go("point", t.items.find((p) => p.targetId === id)?.id)
            }
            onRobot={(id) => go("robot", id)}
          />
          <div className="map-legend">
            ● 待执行　● 蓝色当前目标　● 绿色完成　● 红色异常 / 失败
          </div>
          <p>
            当前目标{" "}
            <ObjectLink type="point" id={p?.id}>
              {p?.name}
            </ObjectLink>
          </p>
          <p>
            设备{" "}
            <ObjectLink type="archive" id={p?.device.split(" ")[0]}>
              {p?.device}
            </ObjectLink>
          </p>
        </Panel>
        <Panel title="现场视频 · 机器人自主观测">
          <Video label={p?.name} />
          <div className="execution-facts">
            <span>
              目标识别 <b>{t.stage >= 2 ? "已锁定" : "搜索中"}</b>
            </span>
            <span>
              自主调整 <b>{t.stage >= 3 ? "按现场视角调整" : "待目标锁定"}</b>
            </span>
            <span>
              采集要求 <b>{p?.requirement || "完成当前检测项"}</b>
            </span>
          </div>
          <Note>
            机器人自主寻找目标、调整观测位置并完成采集；此处展示阶段回报和业务结果。
          </Note>
        </Panel>
        <Panel title="检测项完成情况">
          <div className="checklist">
            {t.items.map((x) => {
              const rs = results.find((z) => z.pointId === x.id);
              return (
                <div key={x.id} className={p?.id === x.id ? "selected" : ""}>
                  <div className="split">
                    <ObjectLink type="point" id={x.id}>
                      {x.name}
                    </ObjectLink>
                    <Badge>
                      {t.done.includes(x.id)
                        ? "完成"
                        : t.skipped.includes(x.id)
                          ? "失败 / 跳过"
                          : p?.id === x.id
                            ? t.failure || "执行中"
                            : "待执行"}
                    </Badge>
                  </div>
                  <p>
                    {x.object} / {x.item}
                  </p>
                  {rs && (
                    <ObjectLink type="review" id={rs.id}>
                      {rs.final} {rs.unit} · {rs.status} →
                    </ObjectLink>
                  )}
                </div>
              );
            })}
          </div>
          <p>
            有效结果 {valid.length} 条 · 已满足 {t.done.length} 个检测项
          </p>
        </Panel>
      </div>
      <div className="context-bar">
        <b>任务控制</b>
        <Btn
          primary
          onClick={() => {
            const inferredType: TaskType =
              p?.kind === "红外"
                ? "红外任务"
                : p?.kind === "气体"
                  ? "气体采集任务"
                  : "光学任务";
            setQuickRobot(r?.id || s.robots[0]?.id || "");
            setQuickPoints(p ? [p.id] : []);
            setQuickName(`${p?.device || t.name} 临时核验`);
            setQuickType(inferredType);
            setQuickActions(taskTypeActions[inferredType]);
            setQuickOpen(true);
          }}
        >
          ＋ 下发临时任务
        </Btn>
        <Btn
          disabled={t.state !== "执行中"}
          onClick={() => act({ type: "PAUSE", id: t.id })}
        >
          暂停任务
        </Btn>
        <Btn
          disabled={t.state !== "暂停"}
          onClick={() => act({ type: "START", id: t.id })}
        >
          恢复任务
        </Btn>
        <Btn disabled={!r} onClick={() => go("control", r?.id)}>
          人工接管 →
        </Btn>
        <Btn
          danger
          disabled={!["执行中", "暂停"].includes(t.state)}
          onClick={() => act({ type: "STOP", id: t.id })}
        >
          终止任务
        </Btn>
        {t.failure && (
          <>
            <Badge>{t.failure}</Badge>
            <Btn onClick={() => act({ type: "RETRY", id: t.id })}>重试目标</Btn>
            <Btn onClick={() => act({ type: "SKIP", id: t.id })}>
              跳过检测项
            </Btn>
          </>
        )}
      </div>
      {submittedTask && (
        <Note>
          临时任务 <ObjectLink type="task-detail" id={submittedTask} />
          已由目标机器人接收并进入待执行队列。当前任务保持执行，不改变断点。
          <div className="actions">
            <Btn onClick={() => go("dispatch", submittedTask)}>
              查看调度详情
            </Btn>
            <Btn
              onClick={() =>
                go(
                  "queue",
                  s.tasks.find((x) => x.id === submittedTask)?.robotId,
                )
              }
            >
              查看机器人队列
            </Btn>
          </div>
        </Note>
      )}
      <details className="simulation" open>
        <summary>演示事件注入 · 模拟机器人回报</summary>
        <div className="actions">
          <label>
            <input
              type="checkbox"
              checked={abnormal}
              onChange={(e) => A(e.target.checked)}
            />{" "}
            生成异常结果
          </label>
          <Btn
            primary
            disabled={t.state !== "执行中" || !!t.failure}
            onClick={() => act({ type: "TICK", id: t.id, abnormal })}
          >
            模拟下一自主阶段回报
          </Btn>
          {[
            "目标未找到",
            "目标存在歧义",
            "不可达",
            "采集质量不足",
            "传感器异常",
            "AI分析失败",
          ].map((reason) => (
            <Btn
              key={reason}
              disabled={t.state !== "执行中"}
              onClick={() => act({ type: "FAIL", id: t.id, reason })}
            >
              {reason}
            </Btn>
          ))}
          <Btn
            disabled={t.state !== "执行中"}
            onClick={() => act({ type: "TASK_FINISHED", id: t.id })}
          >
            模拟 TASK_FINISHED
          </Btn>
        </div>
        <small>
          结束回报后按有效检测项判定完成、部分完成或失败，未形成结果的检测项不会自动计为成功。
        </small>
      </details>
      <div className="grid two">
        <Panel title="实时结果">
          <Table
            heads={["检测项", "最终值", "结果状态", "详情"]}
            rows={results.map((x) => [
              x.item,
              `${x.final} ${x.unit}`,
              <Badge>{x.abnormal ? "异常" : x.status}</Badge>,
              <ObjectLink type="review" id={x.id}>
                结果证据 →
              </ObjectLink>,
            ])}
          />
        </Panel>
        <Panel title="任务事件时间轴">
          <EventTimeline taskId={t.id} />
        </Panel>
      </div>
      {quickOpen && (
        <Modal title="下发新的临时任务" onClose={() => setQuickOpen(false)}>
          <div className="form-grid">
            <Field label="任务名称">
              <input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            </Field>
            <Field label="优先级">
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value)}
              >
                <option>普通</option>
                <option>高</option>
                <option>紧急</option>
              </select>
            </Field>
            <Field label="临时任务类型">
              <select
                value={quickType}
                onChange={(e) => {
                  const type = e.target.value as TaskType;
                  setQuickType(type);
                  setQuickActions(taskTypeActions[type]);
                }}
              >
                {(Object.keys(taskTypeActions) as TaskType[]).map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="目标机器人">
              <select
                value={quickRobot}
                onChange={(e) => {
                  setQuickRobot(e.target.value);
                  const target = s.robots.find((x) => x.id === e.target.value);
                  setQuickPoints(
                    s.points
                      .filter(
                        (x) =>
                          x.mapId === target?.mapId && x.state === "已启用",
                      )
                      .slice(0, 1)
                      .map((x) => x.id),
                  );
                  setQuickActions((old) =>
                    old.filter((action) =>
                      target?.capabilities.includes(
                        atomicActionCapability[action],
                      ),
                    ),
                  );
                }}
              >
                {s.robots.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} · {x.name} · {x.state}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Note>
            临时任务只下发业务点位与检测要求。机器人自主寻址、寻找目标并采集；不会配置导航点或云台动作。
          </Note>
          <div className="atomic-action-section">
            <div className="split">
              <h4>原子动作清单</h4>
              <small>
                目标机器人能力：{quickRobotData?.capabilities.join(" / ")}
              </small>
            </div>
            <div className="atomic-action-grid">
              {actionOptions.map((action) => {
                const capability = atomicActionCapability[action.id];
                const supported =
                  !!quickRobotData?.capabilities.includes(capability);
                return (
                  <label
                    key={action.id}
                    className={
                      "atomic-action " +
                      (quickActions.includes(action.id) ? "selected" : "")
                    }
                  >
                    <input
                      type="checkbox"
                      disabled={!supported}
                      checked={quickActions.includes(action.id)}
                      onChange={() =>
                        setQuickActions((old) =>
                          old.includes(action.id)
                            ? old.filter((x) => x !== action.id)
                            : [...old, action.id],
                        )
                      }
                    />
                    <span>
                      <b>{action.id}</b>
                      <small>{action.description}</small>
                      <em>
                        {supported
                          ? `需要 ${capability}`
                          : `缺少 ${capability}`}
                      </em>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <Table
            heads={["选择", "业务点位", "检测项", "要求", "状态"]}
            rows={s.points
              .filter(
                (x) =>
                  x.mapId ===
                  s.robots.find((robot) => robot.id === quickRobot)?.mapId,
              )
              .map((x) => [
                <input
                  aria-label={`选择 ${x.name}`}
                  type="checkbox"
                  disabled={x.state !== "已启用"}
                  checked={quickPoints.includes(x.id)}
                  onChange={() =>
                    setQuickPoints((old) =>
                      old.includes(x.id)
                        ? old.filter((id) => id !== x.id)
                        : [...old, x.id],
                    )
                  }
                />,
                x.name,
                x.item,
                x.requirement,
                <Badge>{x.state}</Badge>,
              ])}
          />
          <div className="quick-dispatch-impact">
            <b>下发影响</b>
            <span>
              当前任务 {t.id} 保持 {t.state}；新任务进入 {quickRobot}
              的待执行队列。任务类型为 {quickType}，执行动作：
              {quickActions.join("、") || "尚未选择"}。
            </span>
          </div>
          <div className="modal-actions">
            <Btn onClick={() => setQuickOpen(false)}>取消</Btn>
            <Btn
              primary
              disabled={
                !quickName.trim() ||
                !quickPoints.length ||
                !quickRobot ||
                !quickActions.length
              }
              onClick={() =>
                act(
                  {
                    type: "QUICK_DISPATCH",
                    name: quickName,
                    points: quickPoints,
                    priority: quickPriority,
                    taskType: quickType,
                    atomicActions: quickActions,
                    robotId: quickRobot,
                  },
                  (next) => {
                    setSubmittedTask(next.logs[0].object);
                    setQuickOpen(false);
                  },
                )
              }
            >
              创建并下发
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
