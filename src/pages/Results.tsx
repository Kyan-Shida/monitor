import { useState } from "react";
import { useStore } from "../data/store";
import { go, useViewState } from "../data/navigation";
import { pointOf, deviceCode } from "../data/selectors";
import { Btn, Badge, Panel, Table, Field, Note, Steps } from "../components/UI";
import { ObjectLink, Pager } from "../components/Business";
import { Video } from "../components/Video";
import { ResultTrend } from "../components/ResultTrend";
export function Results({ page, id }: { page: string; id?: string }) {
  const { s, act } = useStore();
  const [q, Q] = useViewState("results.q", ""),
    [status, S] = useViewState("results.status", "全部"),
    [judgment, J] = useViewState("results.judgment", "全部"),
    [date, D] = useViewState("results.date", ""),
    [pn, PN] = useViewState("results.page", 1);
  const [value, V] = useState(""),
    [reason, R] = useState(""),
    [conclusion, C] = useState("确认"),
    [finalState, FS] = useState(""),
    [evidence, E] = useState("照片");
  const r = s.results.find((x) => x.id === id) || s.results[0];
  /**
   * 提交复核：结论写入结果，并作为审计记录追加到该结果
   * @returns 无当前结果或未填写依据时不提交
   */
  function submitReview() {
    if (!r || !reason) return;
    act({
      type: "REVIEW",
      id: r.id,
      value: conclusion === "修正" ? value : r.final,
      reason,
      conclusion,
      finalState: finalState || (r.abnormal ? "异常" : "正常"),
    });
  }

  if (page === "results") {
    const filtered = s.results.filter((r) => {
      const p = pointOf(s, r),
        t = s.tasks.find((t) => t.id === r.taskId);
      return (
        (!id || r.taskId === id) &&
        [r.id, r.taskId, r.pointId, r.item, p?.device, p?.object, t?.robotId]
          .join(" ")
          .includes(q) &&
        (status === "全部" || r.status === status) &&
        (judgment === "全部" || (r.abnormal ? "异常" : "正常") === judgment) &&
        (!date ||
          r.time.includes(date) ||
          r.time.includes(date.replaceAll("-", "/")))
      );
    });
    return (
      <Panel title="巡检结果 · 业务检测记录">
        <div className="filter-bar">
          <Field label="设备 / 对象 / 检测项 / 任务 / 机器人">
            <input
              value={q}
              onChange={(e) => {
                Q(e.target.value);
                PN(1);
              }}
              placeholder="输入编号或业务名称"
            />
          </Field>
          <Field label="结果状态">
            <select
              value={status}
              onChange={(e) => {
                S(e.target.value);
                PN(1);
              }}
            >
              {["全部", "待复核", "已确认", "已识别", "无效"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="业务判断">
            <select
              value={judgment}
              onChange={(e) => {
                J(e.target.value);
                PN(1);
              }}
            >
              {["全部", "正常", "异常"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="采集日期">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                D(e.target.value);
                PN(1);
              }}
            />
          </Field>
          <Btn
            onClick={() => {
              Q("");
              S("全部");
              J("全部");
              D("");
              PN(1);
            }}
          >
            重置筛选
          </Btn>
        </div>
        <Table
          heads={[
            "结果 / 时间",
            "设备 / 对象",
            "业务点位 / 检测项",
            "任务 / 机器人",
            "识别 → 最终值",
            "判断 / 状态",
            "操作",
          ]}
          rows={filtered.slice((pn - 1) * 8, pn * 8).map((r) => {
            const p = pointOf(s, r),
              t = s.tasks.find((t) => t.id === r.taskId);
            return [
              <>
                {r.id}
                <small>{r.time}</small>
              </>,
              <>
                <ObjectLink type="archive" id={p && deviceCode(p.device)}>
                  {p?.device}
                </ObjectLink>
                <small>{p?.object}</small>
              </>,
              <>
                <ObjectLink type="point" id={r.pointId}>
                  {p?.name}
                </ObjectLink>
                <small>{r.item}</small>
              </>,
              <>
                <ObjectLink type="task-detail" id={r.taskId} />
                <small>
                  <ObjectLink type="robot" id={t?.robotId} />
                </small>
              </>,
              `${r.recognized} → ${r.final} ${r.unit}`,
              <>
                <Badge>{r.abnormal ? "异常" : "正常"}</Badge>
                <Badge>{r.status}</Badge>
              </>,
              <Btn onClick={() => go("review", r.id)}>证据 / 复核</Btn>,
            ];
          })}
        />
        <Pager page={pn} count={filtered.length} size={8} onChange={PN} />
      </Panel>
    );
  }
  if (!r) return <Note>尚无巡检结果</Note>;
  const p = pointOf(s, r),
    t = s.tasks.find((t) => t.id === r.taskId);
  return (
    <>
      <div className="context-bar">
        <ObjectLink type="archive" id={p && deviceCode(p.device)}>
          {p?.device}
        </ObjectLink>
        <ObjectLink type="point" id={r.pointId}>
          {p?.name}
        </ObjectLink>
        <ObjectLink type="task-detail" id={r.taskId} />
        <ObjectLink type="robot" id={t?.robotId} />
        <Badge>{r.status}</Badge>
        <Btn onClick={() => go("replay", r.taskId)}>任务过程回放 →</Btn>
      </div>
      <div className="result-workbench">
        <Panel title="原始采集证据">
          <div className="segmented">
            {["照片", "红外", "视频", "音频", "传感器"].map((x) => (
              <button
                key={x}
                className={evidence === x ? "active" : ""}
                onClick={() => E(x)}
              >
                {x}
              </button>
            ))}
          </div>
          {evidence === "照片" || evidence === "视频" ? (
            <Video label={p?.name} live={false} />
          ) : (
            <Note>
              {evidence === "传感器"
                ? `原始采集值：${r.raw} ${r.unit}`
                : evidence === "红外"
                  ? p?.kind === "红外"
                    ? `热像测温结果 ${r.raw} ${r.unit}（Mock 数据）`
                    : "本条结果未关联红外证据。"
                  : "本条结果未关联音频文件。"}
            </Note>
          )}
          <p>
            {r.time} · {r.source}
          </p>
          <small>证据为 Mock 示意；原始采集值独立留存。</small>
        </Panel>
        <Panel title="结果链路 · 原始 → 识别 → 最终">
          <dl>
            <dt>原始采集</dt>
            <dd>
              {r.raw} {r.unit}
            </dd>
            <dt>机器人本地识别</dt>
            <dd>
              {p?.kind}目标 · {p?.targetId}（Mock）
            </dd>
            <dt>外部 AI 识别值</dt>
            <dd>
              {r.recognized} {r.unit} · 置信度 {Math.round(r.confidence * 100)}%
            </dd>
            <dt>平台规则判断依据</dt>
            <dd>{p?.requirement}</dd>
            <dt>最终值</dt>
            <dd className="big-number">
              {r.final} {r.unit}
            </dd>
            <dt>业务判断</dt>
            <dd>
              <Badge>{r.abnormal ? "异常" : "正常"}</Badge>
            </dd>
            <dt>复核状态</dt>
            <dd>
              <Badge>{r.status}</Badge>
            </dd>
          </dl>
          <ResultTrend
            results={s.results.filter(
              (x) => x.pointId === r.pointId && x.item === r.item,
            )}
          />
        </Panel>
        <Panel title="人工复核">
          <Note>
            复核结论将追加到该结果的审计记录中，原始值与识别值一并保留以便追溯。
          </Note>
          <Field label="复核结论">
            <select value={conclusion} onChange={(e) => C(e.target.value)}>
              {["确认", "修正", "标记无效"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="最终值">
            <input
              value={value}
              disabled={conclusion !== "修正"}
              placeholder={r.final}
              onChange={(e) => V(e.target.value)}
            />
          </Field>
          <Field label="最终业务状态">
            <select
              value={finalState || (r.abnormal ? "异常" : "正常")}
              onChange={(e) => FS(e.target.value)}
            >
              <option>正常</option>
              <option>异常</option>
            </select>
          </Field>
          <Field label="复核依据 / 无效原因（必填）">
            <textarea value={reason} onChange={(e) => R(e.target.value)} />
          </Field>
          <Note>
            保留原始值与识别值，复核追加审计记录。标记无效会重新计算任务有效检测项。
          </Note>
          <div className="actions">
            <Btn primary disabled={!reason} onClick={submitReview}>
              提交复核
            </Btn>
          </div>
        </Panel>
      </div>
      <div className="grid two">
        <Panel title="复核历史">
          <Table
            heads={["时间", "结论", "最终值 / 状态", "依据"]}
            rows={r.reviews.map((x) => [
              x.time,
              x.conclusion || "确认",
              `${x.value} / ${x.finalState || "—"}`,
              x.reason,
            ])}
          />
        </Panel>
        <Panel title="关联告警">
          <Table
            heads={["告警", "状态", "处置"]}
            rows={s.alarms
              .filter((a) => a.resultId === r.id)
              .map((a) => [
                a.name,
                <Badge>{a.state}</Badge>,
                <ObjectLink type="alarm" id={a.id}>
                  处置与复查 →
                </ObjectLink>,
              ])}
          />
        </Panel>
      </div>
    </>
  );
}
export function Alarms({ page, id }: { page: string; id?: string }) {
  const { s, act } = useStore();
  const [note, N] = useState(""),
    [filter, F] = useViewState("alarms.filter", "全部");
  if (page === "alarms")
    return (
      <Panel
        title="告警事件"
        extra={
          <select value={filter} onChange={(e) => F(e.target.value)}>
            {["全部", "待确认", "处理中", "待复查", "已恢复", "已关闭"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        }
      >
        <Table
          heads={[
            "告警名称",
            "等级",
            "业务点位",
            "任务",
            "开始时间",
            "状态",
            "操作",
          ]}
          rows={s.alarms
            .filter((a) => filter === "全部" || a.state === filter)
            .map((a) => [
              a.name,
              <Badge>{a.level}</Badge>,
              <ObjectLink type="point" id={a.pointId} />,
              <ObjectLink type="task-detail" id={a.taskId} />,
              a.time,
              <Badge>{a.state}</Badge>,
              <Btn onClick={() => go("alarm", a.id)}>处置 / 复查</Btn>,
            ])}
        />
      </Panel>
    );
  const a = s.alarms.find((a) => a.id === id) || s.alarms[0];
  if (!a) return <Note>尚无告警。</Note>;
  const r = s.results.find((r) => r.id === a.resultId);
  return (
    <>
      <div className="context-bar">
        <b>{a.name}</b>
        <Badge>{a.level}</Badge>
        <Badge>{a.state}</Badge>
        <span>
          {a.id} · {a.time}
        </span>
      </div>
      <Steps
        items={["异常触发", "确认处置", "复查任务", "恢复确认", "关闭"]}
        current={["待确认", "处理中", "待复查", "已恢复", "已关闭"].indexOf(
          a.state,
        )}
      />
      <div className="grid two">
        <Panel title="触发证据与业务上下文">
          <Video
            live={false}
            label={s.points.find((p) => p.id === a.pointId)?.name}
          />
          <p>
            设备{" "}
            <ObjectLink
              type="archive"
              id={
                s.points.find((p) => p.id === a.pointId)?.device.split(" ")[0]
              }
            >
              {s.points.find((p) => p.id === a.pointId)?.device}
            </ObjectLink>{" "}
            · 点位 <ObjectLink type="point" id={a.pointId} />
          </p>
          <p>
            执行机器人{" "}
            <ObjectLink
              type="robot"
              id={s.tasks.find((t) => t.id === a.taskId)?.robotId}
            />
          </p>
          <p>
            触发结果：{r?.raw} {r?.unit} · {r?.source}
          </p>
          <div className="actions">
            <Btn onClick={() => go("review", a.resultId)}>原始结果</Btn>
            <Btn onClick={() => go("tasks", a.taskId)}>来源任务</Btn>
          </div>
        </Panel>
        <Panel title="告警处置工作台">
          <Btn
            primary
            disabled={a.state !== "待确认"}
            onClick={() => act({ type: "ALARM_ACK", id: a.id })}
          >
            确认告警
          </Btn>
          <Field label="处置说明 / 关闭依据">
            <textarea
              value={note}
              onChange={(e) => N(e.target.value)}
              placeholder="例如：已检查压力调节，申请机器人复查确认"
            />
          </Field>
          <div className="actions">
            <Btn
              onClick={() =>
                act({ type: "ALARM_NOTE", id: a.id, reason: note })
              }
            >
              保存处置记录
            </Btn>
            <Btn
              primary
              disabled={!["处理中", "已恢复"].includes(a.state)}
              onClick={() =>
                act({ type: "RECHECK", id: a.id }, (n) =>
                  go(
                    "dispatch",
                    n.alarms.find((x) => x.id === a.id)?.reviewTask,
                  ),
                )
              }
            >
              创建复查任务
            </Btn>
            <Btn
              disabled={a.state !== "已恢复"}
              onClick={() =>
                act({ type: "ALARM_CLOSE", id: a.id, reason: note })
              }
            >
              关闭告警
            </Btn>
          </div>
          {a.reviewTask && (
            <Note>
              复查任务 {a.reviewTask} ·{" "}
              {s.tasks.find((t) => t.id === a.reviewTask)?.state}
              <div className="actions">
                <Btn onClick={() => go("dispatch", a.reviewTask)}>进入调度</Btn>
                <Btn onClick={() => go("execution", a.reviewTask)}>
                  执行监控
                </Btn>
                <Btn onClick={() => go("results", a.reviewTask)}>复查结果</Btn>
              </div>
            </Note>
          )}
          <h4>处置轨迹</h4>
          {a.notes.map((x, i) => (
            <p className="event" key={i}>
              {x}
            </p>
          ))}
        </Panel>
      </div>
    </>
  );
}
