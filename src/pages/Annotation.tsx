import { useState } from "react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { Btn, Badge, Panel, Field, Note, Table } from "../components/UI";
import { MapCanvas } from "../components/MapCanvas";
import { Video } from "../components/Video";
export function Annotation({ id }: { id?: string }) {
  const { s, act } = useStore();
  const m = s.maps.find((m) => m.id === id) || s.maps[0];
  const first = s.points.find((p) => p.targetId === m.targets[0]?.id);
  const [target, T] = useState(m.targets[0]?.id || ""),
    [name, N] = useState(first?.name || ""),
    [device, D] = useState("V001 原料储罐"),
    [item, I] = useState("压力读数"),
    [req, Q] = useState(
      first?.requirement || "身份唯一，表盘清晰，完整采集检测数据",
    ),
    [rid, R] = useState("R02");
  const candidate = m.targets.find((t) => t.id === target),
    p = s.points.find((p) => p.targetId === target && p.mapId === m.id);
  const pts = s.points.filter((p) => p.mapId === m.id);
  function select(t: string) {
    T(t);
    const p = s.points.find((p) => p.targetId === t);
    N(p?.name || "");
    D(p?.device || "V001 原料储罐");
    I(
      p?.item ||
        (m.targets.find((x) => x.id === t)?.kind === "阀门"
          ? "阀门状态"
          : "压力读数"),
    );
    Q(p?.requirement || "目标身份唯一，采集结果清晰");
  }
  return (
    <>
      <div className="context-bar">
        <select
          value={m.id}
          onChange={(e) => {
            go("annotation", e.target.value);
            T("");
          }}
        >
          {s.maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <span>
          m{m.version} / 点位集合 p{m.pointSet}
        </span>
        <Badge>{m.state}</Badge>
        <Btn onClick={() => go("maps", m.id, "sync")}>同步与激活</Btn>
        <Btn primary onClick={() => go("maps", m.id, "detail")}>
          发布检查 →
        </Btn>
      </div>
      <div className="annotation-grid">
        <Panel
          title="候选目标与业务点位"
          extra={<span>{m.targets.length} 个</span>}
        >
          <div className="target-list">
            {m.targets
              .filter((t) => t.state !== "已剔除")
              .map((t) => (
                <button
                  className={target === t.id ? "selected" : ""}
                  key={t.id}
                  onClick={() => select(t.id)}
                >
                  <b>
                    {t.kind} · {t.id.slice(-6)}
                  </b>
                  <span>
                    {s.points.find((p) => p.id === t.pointId)?.name ||
                      "业务身份待确认"}
                  </span>
                  <Badge>{t.state}</Badge>
                </button>
              ))}
          </div>
          <Btn onClick={() => act({ type: "ADD_TARGET", mapId: m.id })}>
            ＋ 人工新增目标
          </Btn>
          <p className="muted">也可双击地图补充目标位置。</p>
        </Panel>
        <div>
          <Panel title="点位标注画布" extra={<Badge>目标位置辅助寻址</Badge>}>
            <MapCanvas
              points={pts}
              targets={m.targets}
              selected={target}
              onSelect={select}
              onAdd={(x, y) => act({ type: "ADD_TARGET", mapId: m.id, x, y })}
            />
          </Panel>
          <Video label={p?.name || "候选目标参考图像"} live={false} />
        </div>
        <Panel title="业务身份与检测要求">
          {candidate ? (
            <>
              <p>
                {candidate.kind} · {candidate.id}
              </p>
              {p && (
                <p>
                  <Badge>{p.state}</Badge> 点位 v{p.version}
                </p>
              )}
              <Field label="业务点位名称">
                <input
                  value={name}
                  placeholder={p?.name || "例如 V001 出口压力表"}
                  onChange={(e) => N(e.target.value)}
                />
              </Field>
              <Field label="所属设备">
                <select value={device} onChange={(e) => D(e.target.value)}>
                  <option>V001 原料储罐</option>
                  <option>V002 缓冲罐</option>
                </select>
              </Field>
              <Field label="对象 / 检测项">
                <select value={item} onChange={(e) => I(e.target.value)}>
                  <option>压力读数</option>
                  <option>阀门状态</option>
                  <option>表面温度</option>
                </select>
              </Field>
              <Field label="采集质量与业务要求">
                <textarea
                  rows={4}
                  value={req}
                  onChange={(e) => Q(e.target.value)}
                />
              </Field>
              <Btn
                primary
                onClick={() =>
                  act({
                    type: "ANNOTATE",
                    mapId: m.id,
                    targetId: target,
                    pointId: p?.id,
                    name: name || p?.name,
                    device,
                    object: item === "压力读数" ? "出口压力表" : item,
                    item,
                    unit:
                      item === "压力读数"
                        ? "MPa"
                        : item === "表面温度"
                          ? "℃"
                          : "",
                    requirement: req,
                  })
                }
              >
                保存业务标注
              </Btn>
              <Btn
                disabled={!!p}
                onClick={() =>
                  act({ type: "DISCARD_TARGET", mapId: m.id, targetId: target })
                }
              >
                剔除误识别
              </Btn>
              <hr />
              <Field label="自主验证机器人">
                <select value={rid} onChange={(e) => R(e.target.value)}>
                  {s.robots.map((r) => (
                    <option key={r.id}>{r.id}</option>
                  ))}
                </select>
              </Field>
              <Btn
                disabled={!p}
                onClick={() =>
                  act({ type: "VALIDATE", id: p?.id, robotId: rid })
                }
              >
                模拟自主试巡检验证
              </Btn>
              <p className="muted">
                {p?.validated ||
                  "当前版本必须先同步至验证机器人。验证通过后启用点位。"}
              </p>
            </>
          ) : (
            <Note>从左侧或地图选择候选目标。</Note>
          )}
        </Panel>
      </div>
      <Panel title="点位版本与验证记录">
        <Table
          heads={["业务点位", "设备 / 检测项", "版本", "状态", "验证证据"]}
          rows={pts.map((p) => [
            p.name,
            `${p.device} / ${p.item}`,
            `v${p.version}`,
            <Badge>{p.state}</Badge>,
            p.validated || "待验证",
          ])}
        />
      </Panel>
    </>
  );
}
