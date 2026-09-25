import { useState } from "react";
import { useStore } from "../data/store";
import { go, useViewState } from "../data/navigation";
import { Btn, Badge, Panel, Field, Table, Note, Modal } from "../components/UI";
export function Planning({ page, id }: { page: string; id?: string }) {
  const { s, act } = useStore();
  const initial = s.plans.find((p) => p.id === id);
  const [templateId, TI] = useState(initial?.templateId || s.templates[0].id),
    [templateEdit, TE] = useState<string>(),
    [name, N] = useState(initial?.name || ""),
    [selected, SE] = useState<string[]>(s.templates[0].points),
    [priority, PR] = useState("普通"),
    [cycle, CY] = useState(initial?.cycle || "每天"),
    [start, ST] = useState(initial?.start || "2026-09-22"),
    [end, EN] = useState(initial?.end || "2026-12-31"),
    [time, TM] = useState(initial?.time || "10:00"),
    [query, Q] = useViewState("planning." + page + ".query", ""),
    [quickOpen, setQuickOpen] = useState(false),
    [planOpen, setPlanOpen] = useState(false),
    [planEditingId, setPlanEditingId] = useState<string | undefined>();
  const [advance, AD] = useState(initial?.advance || 15),
    [timeout, TO] = useState(initial?.timeout || 60),
    [wait, WA] = useState(initial?.wait || 30);
  /** 重置计划表单为默认值（新建时调用） */
  const resetPlanForm = () => {
    N("");
    TI(s.templates[0].id);
    CY("每天");
    TM("10:00");
    ST("2026-09-22");
    EN("2026-12-31");
    AD(15);
    TO(60);
    WA(30);
  };
  /** 加载已有计划到表单（编辑时调用） */
  const loadPlanForm = (pid: string) => {
    const p = s.plans.find((x) => x.id === pid);
    if (!p) return;
    N(p.name);
    TI(p.templateId);
    CY(p.cycle);
    TM(p.time);
    ST(p.start);
    EN(p.end);
    AD(p.advance);
    TO(p.timeout);
    WA(p.wait);
  };
  const toggle = (id: string) =>
    SE(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  const picker = (
    <Panel title="巡检业务目标与检测要求">
      <Table
        heads={["选择", "业务点位", "检测项", "质量要求", "版本 / 状态"]}
        rows={s.points.map((p) => [
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => toggle(p.id)}
          />,
          p.name,
          p.item,
          p.requirement,
          <>
            <span>v{p.version} </span>
            <Badge>{p.state}</Badge>
          </>,
        ])}
      />
    </Panel>
  );
  if (page === "templates")
    return (
      <div className="grid template-layout">
        <Panel title="巡检模板">
          <Btn
            onClick={() => {
              TE(undefined);
              N("");
              SE([]);
            }}
          >
            ＋ 新建模板
          </Btn>
          {s.templates.map((t) => (
            <button
              className="record-button"
              key={t.id}
              onClick={() => {
                TE(t.id);
                N(t.name);
                SE(t.points);
                PR(t.priority);
              }}
            >
              <b>{t.name}</b>
              <small>
                {t.id} · v{t.version} · {t.points.length} 个目标
              </small>
            </button>
          ))}
        </Panel>
        <div>
          <Panel
            title="模板业务要求"
            extra={
              <Btn
                primary
                onClick={() =>
                  act({
                    type: "SAVE_TEMPLATE",
                    id: templateEdit,
                    name,
                    points: selected,
                    priority,
                  })
                }
              >
                保存模板
              </Btn>
            }
          >
            <div className="form-grid">
              <Field label="模板名称">
                <input
                  value={name}
                  onChange={(e) => N(e.target.value)}
                  placeholder="输入模板名称"
                />
              </Field>
              <Field label="优先级">
                <select value={priority} onChange={(e) => PR(e.target.value)}>
                  <option>普通</option>
                  <option>高</option>
                  <option>紧急</option>
                </select>
              </Field>
              <Field label="结束动作">
                <input readOnly value="返航" />
              </Field>
            </div>
            <Note>
              模板组合业务目标和检测要求；机器人自主选择观察位置并执行采集。
            </Note>
          </Panel>
          {picker}
          <Btn
            primary
            onClick={() => {
              resetPlanForm();
              setPlanEditingId(undefined);
              setPlanOpen(true);
            }}
          >
            创建巡检计划 →
          </Btn>
        </div>
      </div>
    );
  if (page === "plans")
    return (
      <>
        <Panel
          title="周期巡检计划"
          extra={
            <Btn
              primary
              onClick={() => {
                resetPlanForm();
                setPlanEditingId(undefined);
                setPlanOpen(true);
              }}
            >
              ＋ 新建计划
            </Btn>
          }
        >
          <Table
            heads={[
              "计划名称",
              "模板",
              "周期 / 时间（自动下发计划任务）",
              "有效期",
              "版本 / 状态",
              "操作",
            ]}
            rows={s.plans.map((p) => [
              p.name,
              s.templates.find((t) => t.id === p.templateId)?.name,
              `${p.cycle} ${p.time}`,
              `${p.start} 至 ${p.end}`,
              <>
                v{p.version} <Badge>{p.state}</Badge>
              </>,
              <div className="actions">
                <Btn
                  onClick={() => {
                    loadPlanForm(p.id);
                    setPlanEditingId(p.id);
                    setPlanOpen(true);
                  }}
                >
                  编辑
                </Btn>
                <Btn
                  primary
                  onClick={() => {
                    if (act({ type: "GENERATE", id: p.id })) go("tasks");
                  }}
                >
                  模拟到点下发计划任务
                </Btn>
              </div>,
            ])}
          />
        </Panel>
        {planOpen && (
          <PlanModal
            editingId={planEditingId}
            onClose={() => setPlanOpen(false)}
            onSave={() => setPlanOpen(false)}
            name={name}
            setName={N}
            templateId={templateId}
            setTemplateId={TI}
            cycle={cycle}
            setCycle={CY}
            time={time}
            setTime={TM}
            start={start}
            setStart={ST}
            end={end}
            setEnd={EN}
            advance={advance}
            setAdvance={AD}
            timeout={timeout}
            setTimeout={TO}
            wait={wait}
            setWait={WA}
            templates={s.templates}
            act={act}
          />
        )}
      </>
    );
  if (page === "plan-edit")
    return (
      <>
        <Panel
          title={
            initial ? "编辑计划 · 新版本仅影响未来任务" : "新建周期巡检计划"
          }
        >
          <div className="form-grid">
            <Field label="计划名称">
              <input value={name} onChange={(e) => N(e.target.value)} />
            </Field>
            <Field label="巡检模板">
              <select value={templateId} onChange={(e) => TI(e.target.value)}>
                {s.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · v{t.version}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="执行周期">
              <select value={cycle} onChange={(e) => CY(e.target.value)}>
                <option>每天</option>
                <option>每周</option>
                <option>每班</option>
              </select>
            </Field>
            <Field label="执行时间">
              <input
                type="time"
                value={time}
                onChange={(e) => TM(e.target.value)}
              />
            </Field>
            <Field label="有效期开始">
              <input
                type="date"
                value={start}
                onChange={(e) => ST(e.target.value)}
              />
            </Field>
            <Field label="有效期结束">
              <input
                type="date"
                value={end}
                onChange={(e) => EN(e.target.value)}
              />
            </Field>
            <Field label="提前生成 / 分钟">
              <input
                type="number"
                min={1}
                value={advance}
                onChange={(e) => AD(+e.target.value)}
              />
            </Field>
            <Field label="执行超时 / 分钟">
              <input
                type="number"
                min={1}
                value={timeout}
                onChange={(e) => TO(+e.target.value)}
              />
            </Field>
            <Field label="允许等待 / 分钟">
              <input
                type="number"
                min={1}
                value={wait}
                onChange={(e) => WA(+e.target.value)}
              />
            </Field>
          </div>
          <Note>
            临近执行时间生成任务。原型通过“模拟临近生成”触发同一时段任务，重复操作不会重复建任务。
          </Note>
          <Btn onClick={() => go("plans")}>取消</Btn>
          <Btn
            primary
            onClick={() => {
              if (
                act({
                  type: "SAVE_PLAN",
                  id: initial?.id,
                  name,
                  templateId,
                  cycle,
                  start,
                  end,
                  time,
                  advance,
                  timeout,
                  wait,
                })
              )
                go("plans");
            }}
          >
            保存计划版本
          </Btn>
        </Panel>
      </>
    );
  if (page === "quick")
    return (
      <>
        {picker}
        <Btn
          primary
          onClick={() => {
            if (
              act({
                type: "CREATE_TASK",
                name: name || "临时巡检",
                points: selected,
                priority,
              })
            )
              go("dispatch");
          }}
        >
          进入调度
        </Btn>
      </>
    );
  const t = s.tasks.find((t) => t.id === id);
  return (
    <>
      <Panel
        title="任务实例（基于计划自动生成 or 手动下发临时任务）"
        extra={
          <div className="actions">
            <input
              placeholder="搜索任务名称 / 编号"
              value={query}
              onChange={(e) => Q(e.target.value)}
            />
            <Btn primary onClick={() => setQuickOpen(true)}>
              ＋ 临时巡检任务
            </Btn>
          </div>
        }
      >
        <Table
          heads={["任务 / 来源", "状态", "机器人", "版本快照", "完成", "操作"]}
          rows={s.tasks
            .filter((t) => (t.name + t.id).includes(query))
            .map((t) => [
              <b>
                {t.name}
                <small>
                  {t.id} · {t.source}
                </small>
              </b>,
              <Badge>{t.state}</Badge>,
              t.robotId || "未分配",
              `m${t.mapVersion} / p${t.pointSet}`,
              `${t.done.length}/${t.items.length}`,
              <div className="actions">
                <Btn onClick={() => go("tasks", t.id)}>详情</Btn>
                <Btn
                  onClick={() =>
                    go(
                      ["执行中", "暂停", "待执行"].includes(t.state)
                        ? "execution"
                        : "dispatch",
                      t.id,
                    )
                  }
                >
                  进入工作台
                </Btn>
              </div>,
            ])}
        />
      </Panel>
      {t && (
        <Panel title={`${t.name} · 不可变任务快照`}>
          <Table
            heads={["点位", "目标身份", "检测要求", "点位 / 地图版本"]}
            rows={t.items.map((p) => [
              p.name,
              p.targetId,
              p.requirement,
              `v${p.version} / m${p.mapVersion}`,
            ])}
          />
          <p>
            计划版本：{t.planVersion || "—"} · 调度编号：
            {t.dispatchId || "未下发"} · 告警来源：{t.alarmId || "—"}
          </p>
          <Btn onClick={() => go("results", t.id)}>查看任务结果</Btn>
        </Panel>
      )}
      {quickOpen && (
        <Modal title="临时任务" onClose={() => setQuickOpen(false)}>
          <div className="form-grid">
            <Field label="任务名称">
              <input
                value={name}
                onChange={(e) => N(e.target.value)}
                placeholder="临时巡检任务"
              />
            </Field>
            <Field label="优先级">
              <select value={priority} onChange={(e) => PR(e.target.value)}>
                <option>普通</option>
                <option>高</option>
                <option>紧急</option>
              </select>
            </Field>
            <Field label="引用模板">
              <select
                value={templateId}
                onChange={(e) => {
                  TI(e.target.value);
                  SE(
                    s.templates.find((t) => t.id === e.target.value)?.points ||
                      [],
                  );
                }}
              >
                {s.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {picker}
          <div className="modal-actions">
            <Btn onClick={() => setQuickOpen(false)}>取消</Btn>
            <Btn
              primary
              onClick={() => {
                if (
                  act({
                    type: "CREATE_TASK",
                    name: name || "临时巡检",
                    points: selected,
                    priority,
                  })
                ) {
                  setQuickOpen(false);
                  go("dispatch");
                }
              }}
            >
              进入调度
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * 新建/编辑巡检计划弹窗
 * @description 复用 plan-edit 页面的 9 字段表单，避免页面跳转
 * @interaction Planning.tsx plans 页新建按钮、plans 页编辑按钮、templates 页创建按钮均打开此弹窗
 */
function PlanModal({
  editingId,
  onClose,
  onSave,
  name,
  setName,
  templateId,
  setTemplateId,
  cycle,
  setCycle,
  time,
  setTime,
  start,
  setStart,
  end,
  setEnd,
  advance,
  setAdvance,
  timeout,
  setTimeout,
  wait,
  setWait,
  templates,
  act,
}: {
  editingId?: string;
  onClose: () => void;
  onSave: () => void;
  name: string;
  setName: (v: string) => void;
  templateId: string;
  setTemplateId: (v: string) => void;
  cycle: string;
  setCycle: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  start: string;
  setStart: (v: string) => void;
  end: string;
  setEnd: (v: string) => void;
  advance: number;
  setAdvance: (v: number) => void;
  timeout: number;
  setTimeout: (v: number) => void;
  wait: number;
  setWait: (v: number) => void;
  templates: { id: string; name: string; version: number }[];
  act: (action: { type: string; [k: string]: any }) => boolean;
}) {
  return (
    <Modal
      title={editingId ? "编辑计划 · 新版本仅影响未来任务" : "新建周期巡检计划"}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="计划名称">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="巡检模板">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · v{t.version}
              </option>
            ))}
          </select>
        </Field>
        <Field label="执行周期">
          <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
            <option>每天</option>
            <option>每周</option>
            <option>每班</option>
          </select>
        </Field>
        <Field label="执行时间">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
        <Field label="有效期开始">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="有效期结束">
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <Field label="提前生成 / 分钟">
          <input
            type="number"
            min={1}
            value={advance}
            onChange={(e) => setAdvance(+e.target.value)}
          />
        </Field>
        <Field label="执行超时 / 分钟">
          <input
            type="number"
            min={1}
            value={timeout}
            onChange={(e) => setTimeout(+e.target.value)}
          />
        </Field>
        <Field label="允许等待 / 分钟">
          <input
            type="number"
            min={1}
            value={wait}
            onChange={(e) => setWait(+e.target.value)}
          />
        </Field>
      </div>
      <Note>
        临近执行时间生成任务。原型通过"模拟临近生成"触发同一时段任务，重复操作不会重复建任务。
      </Note>
      <div className="modal-actions">
        <Btn onClick={onClose}>取消</Btn>
        <Btn
          primary
          onClick={() => {
            if (
              act({
                type: "SAVE_PLAN",
                id: editingId,
                name,
                templateId,
                cycle,
                start,
                end,
                time,
                advance,
                timeout,
                wait,
              })
            )
              onSave();
          }}
        >
          保存计划版本
        </Btn>
      </div>
    </Modal>
  );
}
