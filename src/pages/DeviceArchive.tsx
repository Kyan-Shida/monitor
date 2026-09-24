import { useStore } from "../data/store";
import { go, useViewState } from "../data/navigation";
import { deviceCode, pointOf } from "../data/selectors";
import { Panel, Table, Badge, Note } from "../components/UI";
import { ObjectLink } from "../components/Business";
import { ResultTrend } from "../components/ResultTrend";
export function DeviceArchive({ id }: { id?: string; tab?: string }) {
  const { s } = useStore();
  const devices = [...new Set(s.points.map((p) => p.device))];
  const device = devices.find((x) => deviceCode(x) === id) || devices[0];
  const points = s.points.filter((p) => p.device === device),
    results = s.results.filter((r) => pointOf(s, r)?.device === device),
    alarms = s.alarms.filter((a) => points.some((p) => p.id === a.pointId)),
    tasks = s.tasks.filter((t) => t.items.some((p) => p.device === device));
  const [tab, T] = useViewState("archive." + device, "检测对象"),
    [pid, P] = useViewState("archive.point." + device, points[0]?.id || "");
  return (
    <>
      <div className="context-bar">
        <b>设备档案</b>
        <select
          aria-label="档案设备"
          value={deviceCode(device)}
          onChange={(e) => go("archive", e.target.value)}
        >
          {devices.map((x) => (
            <option key={x} value={deviceCode(x)}>
              {x}
            </option>
          ))}
        </select>
        <span>
          {points.length} 个检测对象 · {results.length} 条结果 · {alarms.length}{" "}
          个关联告警
        </span>
      </div>
      <div className="object-summary">
        <h2>{device}</h2>
        <p>
          所属区域：{s.maps.find((m) => m.id === points[0]?.mapId)?.region}
          　设备编码：{deviceCode(device)}
        </p>
        <small>按设备聚合对象、检测项、历史证据、告警与巡检任务。</small>
      </div>
      <div className="local-tabs">
        {["检测对象", "历史结果", "关联告警", "采集证据", "巡检任务"].map(
          (x) => (
            <button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => T(x)}
            >
              {x}
            </button>
          ),
        )}
      </div>
      {tab === "检测对象" ? (
        <>
          <Panel title="设备检测对象与最新结果">
            <Table
              heads={[
                "检测对象",
                "业务点位",
                "检测项",
                "最新值",
                "最新检测时间",
                "状态",
                "结果",
              ]}
              rows={points.map((p) => {
                const r = results.find((x) => x.pointId === p.id);
                return [
                  p.object,
                  <ObjectLink type="point" id={p.id}>
                    {p.name}
                  </ObjectLink>,
                  p.item,
                  r ? `${r.final} ${r.unit}` : "尚未检测",
                  r?.time || "—",
                  <Badge>{r?.status || p.state}</Badge>,
                  <ObjectLink type="review" id={r?.id}>
                    {r?.id || "无结果"}
                  </ObjectLink>,
                ];
              })}
            />
          </Panel>
          <Panel
            title="设备历史趋势"
            extra={
              <select value={pid} onChange={(e) => P(e.target.value)}>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.object} · {p.item}
                  </option>
                ))}
              </select>
            }
          >
            <ResultTrend results={results.filter((r) => r.pointId === pid)} />
          </Panel>
        </>
      ) : tab === "历史结果" || tab === "采集证据" ? (
        <Panel title={tab}>
          <Table
            heads={["时间", "检测项", "值 / 来源", "判断", "证据详情"]}
            rows={results.map((r) => [
              r.time,
              r.item,
              tab === "采集证据" ? r.source : `${r.final} ${r.unit}`,
              <Badge>{r.abnormal ? "异常" : "正常"}</Badge>,
              <ObjectLink type="review" id={r.id} />,
            ])}
          />
        </Panel>
      ) : tab === "关联告警" ? (
        <Panel title="设备告警">
          <Table
            heads={["告警", "状态", "来源任务", "处置"]}
            rows={alarms.map((a) => [
              a.name,
              <Badge>{a.state}</Badge>,
              <ObjectLink type="task-detail" id={a.taskId} />,
              <ObjectLink type="alarm" id={a.id} />,
            ])}
          />
        </Panel>
      ) : (
        <Panel title="设备巡检任务">
          <Table
            heads={["任务", "来源", "机器人", "状态", "回放"]}
            rows={tasks.map((t) => [
              <ObjectLink type="task-detail" id={t.id}>
                {t.name}
              </ObjectLink>,
              t.source,
              <ObjectLink type="robot" id={t.robotId} />,
              <Badge>{t.state}</Badge>,
              <ObjectLink type="replay" id={t.id}>
                过程回放
              </ObjectLink>,
            ])}
          />
        </Panel>
      )}
    </>
  );
}
