import { useState } from "react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { ObjectLink, EventTimeline, Pager } from "../components/Business";
import { Panel, Table, Badge, Btn, Note } from "../components/UI";
import { stageOf, deviceCode, fmtTime, queueFor, terminal } from "../data/selectors";
export function ObjectDetails({ page, id }: { page: string; id?: string }) {
  const { s } = useStore();
  const [replayKw, setReplayKw] = useState("");
  const [replayFilter, setReplayFilter] = useState("all");
  const [replayFrom, setReplayFrom] = useState("");
  const [replayTo, setReplayTo] = useState("");
  const [replayPage, setReplayPage] = useState(1);
  if (page === "point") {
    const p = s.points.find((p) => p.id === id);
    if (!p) return <Note>请选择具体巡检点。</Note>;
    return (
      <>
        <div className="object-summary object-bar">
          <div className="os-title">
            <strong>
              {p.id} · {p.name}
            </strong>
            <Badge>{p.state}</Badge>
          </div>
          <span className="os-meta">
            <span>
              <i>所属设备</i>
              <ObjectLink type="archive" id={deviceCode(p.device)}>
                {p.device}
              </ObjectLink>
            </span>
            <span>
              <i>检测项</i>
              {p.object} / {p.item}
            </span>
            <span>
              <i>点位版本</i>v{p.version}
            </span>
          </span>
          <div className="actions os-actions">
            <Btn onClick={() => go("annotation", p.mapId)}>进入业务标注</Btn>
          </div>
        </div>
        <div className="grid two">
          <Panel title="业务目标要求">
            <dl>
              <dt>地图 / 目标</dt>
              <dd>
                <ObjectLink type="maps" id={p.mapId} tab="detail">
                  {p.mapId}
                </ObjectLink>{" "}
                / {p.targetId}
              </dd>
              <dt>检测要求</dt>
              <dd>{p.requirement}</dd>
              <dt>自主验证</dt>
              <dd>{p.validated || "待验证"}</dd>
            </dl>
          </Panel>
          <Panel title="最近检测结果">
            <Table
              heads={["任务", "结果", "判定", "详情"]}
              rows={s.results
                .filter((r) => r.pointId === p.id)
                .map((r) => [
                  <ObjectLink type="replay" id={r.taskId} />,
                  r.final + r.unit,
                  <Badge>{r.abnormal ? "异常" : "正常"}</Badge>,
                  <ObjectLink type="review" id={r.id} />,
                ])}
            />
          </Panel>
        </div>
      </>
    );
  }
  const t =
    s.tasks.find((t) => t.id === id) ||
    s.tasks.find((t) => t.state === "执行中") ||
    s.tasks[0];
  // 执行回溯：独立主从视图——左侧已结束任务列表（支持搜索/状态/时间筛选/分页），右侧选中后的记录详情
  if (page === "replay") {
    const ended = s.tasks.filter((x) => terminal.includes(x.state));
    const states = Array.from(new Set(ended.map((x) => x.state)));
    const q = replayKw.trim().toLowerCase();
    // 以结束日期（YYYY-MM-DD）做区间比对，无结束时间的任务不参与时间过滤
    const inRange = (fin?: string) => {
      if (!fin) return true;
      const d = fin.slice(0, 10);
      if (replayFrom && d < replayFrom) return false;
      if (replayTo && d > replayTo) return false;
      return true;
    };
    const filtered = ended.filter(
      (x) =>
        (replayFilter === "all" || x.state === replayFilter) &&
        (!q || x.id.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)) &&
        inRange(x.finishedAt),
    );
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const setRange = (days: number | null) => {
      if (days === null) {
        setReplayFrom("");
        setReplayTo("");
      } else {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);
        setReplayTo(ymd(to));
        setReplayFrom(ymd(from));
      }
      setReplayPage(1);
    };
    const size = 6;
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    const curPage = Math.min(replayPage, pages);
    const pageItems = filtered.slice((curPage - 1) * size, curPage * size);

    const picked = s.tasks.find((x) => x.id === id);
    const cur = picked && terminal.includes(picked.state) ? picked : ended[0];
    return (
      <div className="replay-layout">
        <Panel title="任务回溯列表">
          <div className="replay-tools">
            <input
              className="filter-input"
              placeholder="搜索任务编号 / 名称"
              value={replayKw}
              onChange={(e) => {
                setReplayKw(e.target.value);
                setReplayPage(1);
              }}
            />
            <select
              className="filter-select"
              value={replayFilter}
              onChange={(e) => {
                setReplayFilter(e.target.value);
                setReplayPage(1);
              }}
            >
              <option value="all">全部状态</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="replay-time">
            <button type="button" className="chip" onClick={() => setRange(7)}>
              近7天
            </button>
            <button type="button" className="chip" onClick={() => setRange(30)}>
              近30天
            </button>
            <button type="button" className="chip" onClick={() => setRange(null)}>
              全部时间
            </button>
            <span className="rt-field">
              起
              <input
                type="date"
                className="filter-date"
                value={replayFrom}
                onChange={(e) => {
                  setReplayFrom(e.target.value);
                  setReplayPage(1);
                }}
              />
            </span>
            <span className="rt-field">
              止
              <input
                type="date"
                className="filter-date"
                value={replayTo}
                onChange={(e) => {
                  setReplayTo(e.target.value);
                  setReplayPage(1);
                }}
              />
            </span>
          </div>
          {!filtered.length && (
            <Note>没有符合搜索 / 状态 / 时间筛选条件的已结束任务。</Note>
          )}
          <div className="replay-list">
            {pageItems.map((x) => (
              <button
                key={x.id}
                type="button"
                className={"replay-item" + (cur?.id === x.id ? " selected" : "")}
                onClick={() => go("replay", x.id)}
              >
                <span className="ri-row">
                  <b>{x.id}</b>
                  <Badge>{x.state}</Badge>
                </span>
                <span className="ri-name">{x.name}</span>
                <span className="ri-time">结束 {fmtTime(x.finishedAt)}</span>
              </button>
            ))}
          </div>
          <Pager page={curPage} count={filtered.length} size={size} onChange={setReplayPage} />
        </Panel>
        <div className="replay-detail">
          {cur ? (
            <>
              <div className="replay-endinfo">
                <span><i>任务</i>{cur.id} · {cur.name}</span>
                <span><i>结束状态</i><Badge>{cur.state}</Badge></span>
                <span><i>结束时间</i>{fmtTime(cur.finishedAt)}</span>
              </div>
              <Panel title="执行事件与证据时间轴">
                <EventTimeline taskId={cur.id} />
              </Panel>
            </>
          ) : (
            <Note>请选择左侧已结束的任务，查看其执行回溯记录。</Note>
          )}
        </div>
      </div>
    );
  }
  /**
   * 主操作随任务状态变化，始终只给一个"此刻最该做"的入口
   * 待调度 → 去派单；已分配（已派给机器人、等同待执行）/ 下发中 / 待执行 / 执行中 / 暂停 → 执行监控；
   * 完成 / 部分完成 → 巡检结果；失败 / 取消 / 超期 → 执行回溯
   */
  const primary =
    t.state === "待调度"
      ? {
          label: "去派单",
          page: "dispatch",
          title: "前往调度工作台：为该任务选择机器人并下发",
        }
      : ["已分配", "下发中", "待执行", "执行中", "暂停"].includes(t.state)
        ? {
            label: "执行监控",
            page: "execution",
            title: "打开实时执行监控：查看当前阶段、采集进度与现场画面",
          }
        : ["完成", "部分完成"].includes(t.state)
          ? {
              label: "巡检结果",
              page: "results",
              title: "查看该任务产出的巡检结果与复核状态",
            }
          : {
              label: "执行回溯",
              page: "replay",
              title: "任务未正常完成：回看执行事件与证据时间轴",
            };
  /**
   * 派单历史详情：仅在任务已分配到机器人后出现
   * 待调度尚未分配故不展示；已分配起已有派单记录，且主按钮不再是"去派单"，不会重复跳同一页
   */
  /**
   * 是否已有派单记录：任务已分配到机器人（即非「待调度」）才算下发过
   * 用于「派单历史」块：已派单则展示分配/接收/队列情况，未派单则提示去派单
   */
  const dispatched = !!t.robotId && t.state !== "待调度";
  // 派单阶段随任务状态变化：未派单 / 已下发待接收 / 执行中 / 已完成 / 已终止
  const phase = (() => {
    switch (t.state) {
      case "待调度":
        return { label: "未派单", cls: "" };
      case "已分配":
      case "下发中":
        return { label: "已下发 · 待接收", cls: "amber" };
      case "待执行":
        return { label: "已接收 · 排队中", cls: "amber" };
      case "执行中":
      case "暂停":
        return { label: "执行中", cls: "green" };
      case "完成":
      case "部分完成":
        return { label: "已完成", cls: "green" };
      case "失败":
      case "取消":
      case "超期":
        return { label: "已终止", cls: "red" };
      default:
        return { label: t.state, cls: "" };
    }
  })();
  // 机器人在该机器人队列中的排队位置（仅 已分配/下发中/待执行 处于排队态）
  const queue = t.robotId ? queueFor(s, t.robotId) : [];
  const qpos = queue.findIndex((x) => x.id === t.id);
  const queued = ["已分配", "下发中", "待执行"].includes(t.state);
  const queueLabel = queued
    ? qpos >= 0
      ? `第 ${qpos + 1} / ${queue.length}（期望 ${t.expectedAt || "尽快"}）`
      : "排队中"
    : ["执行中", "暂停"].includes(t.state)
      ? "正在执行 · 当前任务"
      : "已出队";
  return (
    <>
      <div className="object-summary object-bar">
        <div className="os-title">
          <strong>
            {t.id} · {t.name}
          </strong>
          <Badge>{t.state}</Badge>
        </div>
        {/* 元信息带标签：裸编码（R01、m3 / p7）业务人员看不懂，需标注含义 */}
        <span className="os-meta">
          <span>
            <i>机器人</i>
            <ObjectLink type="robot" id={t.robotId} />
          </span>
          <span>
            <i>版本</i>m{t.mapVersion} / p{t.pointSet}
          </span>
          <span>
            <i>当前阶段</i>
            {stageOf(t)}
          </span>
        </span>
        <div className="actions os-actions">
          {/* 主操作：随任务状态切换（见上方 primary 映射） */}
          <Btn
            primary
            onClick={() => go(primary.page, t.id)}
            title={primary.title}
          >
            {primary.label}
          </Btn>
        </div>
      </div>
      <>
          <div className="grid two">
            <Panel title="任务摘要">
              <dl>
                <dt>来源</dt>
                <dd>{t.source}</dd>
                <dt>任务类型</dt>
                <dd>{t.taskType || "综合巡检任务"}</dd>
                <dt>原子动作</dt>
                <dd>{(t.atomicActions || []).join(" / ") || "按检测项执行"}</dd>
                <dt>计划版本</dt>
                <dd>
                  {t.planId || "临时任务"} / v{t.planVersion || "—"}
                </dd>
                <dt>调度编号</dt>
                <dd>{t.dispatchId || "尚未下发"}</dd>
                <dt>生成时间</dt>
                <dd>{fmtTime(t.created)}</dd>
                <dt>开始时间</dt>
                <dd>{fmtTime(t.startedAt)}</dd>
                <dt>结束时间</dt>
                <dd>{fmtTime(t.finishedAt)}</dd>
                <dt>优先级</dt>
                <dd>{t.priority}</dd>
                <dt>业务完成</dt>
                <dd>
                  {t.done.length} / {t.items.length} 有效检测项，失败{" "}
                  {t.skipped.length}
                </dd>
                <dt>关联告警</dt>
                <dd>
                  <ObjectLink type="alarm" id={t.alarmId} />
                </dd>
              </dl>
            </Panel>
            <Panel title="任务控制与版本约束">
              <Note>
                任务引用创建时的业务快照，地图或点位维护不会回写历史要求。机器人任务结束回报后，平台仍按有效检测项判定完整性。
              </Note>
              {terminal.includes(t.state) && (
                <Btn onClick={() => go("replay", t.id)}>执行回溯与接管记录</Btn>
              )}
            </Panel>
          </div>
          {/* 派单历史：就地展示该任务的选择内容与下发情况，随任务状态改变，不再跳转调度台 */}
          <Panel title="派单历史">
            {!dispatched ? (
              <Note>
                任务尚未派单，暂无派单记录。前往调度工作台为该任务选择机器人并下发后，将在此展示分配记录、接收回执与队列位置。
              </Note>
            ) : (
              <>
                <div className="dispatch-phase">
                  <span className={"badge " + phase.cls}>{phase.label}</span>
                  <span className="muted">派单编号 {t.dispatchId || "—"}</span>
                </div>
                <dl className="kv dispatch-history">
                  <dt>分配机器人</dt>
                  <dd>
                    <ObjectLink type="robot" id={t.robotId} />
                  </dd>
                  <dt>派单时间</dt>
                  <dd>{fmtTime(t.created)}</dd>
                  <dt>接收回执</dt>
                  <dd>
                    {t.startedAt
                      ? `${fmtTime(t.startedAt)} · 已接收`
                      : "待机器人接收回执"}
                  </dd>
                  <dt>当前队列位置</dt>
                  <dd>{queueLabel}</dd>
                  {t.finishedAt && (
                    <>
                      <dt>结束时间</dt>
                      <dd>{fmtTime(t.finishedAt)}</dd>
                    </>
                  )}
                  <dt>优先级</dt>
                  <dd>{t.priority}</dd>
                  <dt>派单来源</dt>
                  <dd>{t.source}</dd>
                </dl>
              </>
            )}
          </Panel>
        </>
      <Panel title="检测项快照与结果">
        <Table
          heads={["业务点位", "设备 / 对象", "检测项与要求", "版本", "结果"]}
          rows={t.items.map((p) => [
            <ObjectLink type="point" id={p.id}>
              {p.name}
            </ObjectLink>,
            <ObjectLink type="archive" id={deviceCode(p.device)}>
              {p.device} / {p.object}
            </ObjectLink>,
            <>
              {p.item}
              <small>{p.requirement}</small>
            </>,
            `m${p.mapVersion} / 点位 v${p.version}`,
            s.results
              .filter((r) => r.taskId === t.id && r.pointId === p.id)
              .map((r) => (
                <ObjectLink key={r.id} type="review" id={r.id}>
                  {r.final} {r.unit} · {r.status}
                </ObjectLink>
              )),
          ])}
        />
      </Panel>
    </>
  );
}
