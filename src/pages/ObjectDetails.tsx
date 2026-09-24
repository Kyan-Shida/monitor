import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { ObjectLink, EventTimeline } from "../components/Business";
import { Panel, Table, Badge, Btn, Note } from "../components/UI";
import { stageOf, deviceCode } from "../data/selectors";
export function ObjectDetails({ page, id }: { page: string; id?: string }) {
  const { s } = useStore();
  if (page === "point") {
    const p = s.points.find((p) => p.id === id);
    if (!p) return <Note>请选择具体巡检点。</Note>;
    return (
      <>
        <div className="object-summary">
          <strong>
            {p.id} · {p.name}
          </strong>
          <Badge>{p.state}</Badge>
          <ObjectLink type="archive" id={deviceCode(p.device)}>
            {p.device}
          </ObjectLink>
          <span>
            {p.object} / {p.item}
          </span>
          <span>点位 v{p.version}</span>
          <Btn onClick={() => go("annotation", p.mapId)}>进入业务标注</Btn>
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
  return (
    <>
      <div className="object-summary">
        <strong>
          {t.id} · {t.name}
        </strong>
        <Badge>{t.state}</Badge>
        <ObjectLink type="robot" id={t.robotId} />
        <span>
          m{t.mapVersion} / p{t.pointSet}
        </span>
        <span>{stageOf(t)}</span>
        <Btn primary onClick={() => go("execution", t.id)}>
          执行监控
        </Btn>
        <Btn onClick={() => go("dispatch", t.id)}>调度上下文</Btn>
        <Btn onClick={() => go("results", t.id)}>任务结果</Btn>
      </div>
      {page === "replay" ? (
        <Panel title="执行事件与证据时间轴">
          <EventTimeline taskId={t.id} />
        </Panel>
      ) : (
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
              <Btn onClick={() => go("replay", t.id)}>执行回溯与接管记录</Btn>
            </Panel>
          </div>
        </>
      )}
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
