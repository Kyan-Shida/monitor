import { ObjectLink } from "../components/Business";
import { useState } from "react";
import { useStore } from "../data/store";
import { go, pages, useViewState } from "../data/navigation";
import {
  Btn,
  Badge,
  Panel,
  Table,
  Field,
  Note,
  Modal,
  Download,
} from "../components/UI";
import { Video } from "../components/Video";
import { RoleMatrix } from "../components/RoleMatrix";
export function Supporting({ page }: { page: string }) {
  const { s, act } = useStore();
  const [q, Q] = useViewState("supporting." + page + ".query", ""),
    [edit, E] = useState<string | undefined>(),
    [modal, M] = useState(false),
    [name, N] = useState(""),
    [detail, D] = useState(""),
    [bid, B] = useState("BIZ-20260922-001"),
    [selected, SEL] = useState("");
  // 角色权限矩阵：管理员 / 非管理员 × 权限五要素，替代原通用配置表
  if (page === "roles") return <RoleMatrix />;
  if (["audit", "interface-log", "dispatch-log", "replay"].includes(page)) {
    const logs = s.logs.filter(
      (l) =>
        page === "audit" ||
        page === "replay" ||
        (page === "interface-log" &&
          ["EXTERNAL", "SYNC", "SYNC_STEP", "DISPATCH", "RECEIPT"].includes(
            l.action,
          )) ||
        (page === "dispatch-log" &&
          [
            "ASSIGN",
            "DISPATCH",
            "PREEMPT",
            "WITHDRAW",
            "REORDER",
            "RECEIPT",
          ].includes(l.action)),
    );
    return (
      <Panel
        title={pages.find((p) => p.id === page)!.name}
        extra={
          <input
            placeholder="搜索对象 / 事件"
            value={q}
            onChange={(e) => Q(e.target.value)}
          />
        }
      >
        <Table
          heads={["时间", "事件", "业务对象", "详情 / 反馈"]}
          rows={logs
            .filter((l) => (l.object + l.action + l.detail).includes(q))
            .map((l) => [
              l.time,
              l.action,
              <button
                className="link"
                onClick={() =>
                  go(
                    s.tasks.some((t) => t.id === l.object) ? "tasks" : "maps",
                    l.object,
                  )
                }
              >
                {l.object}
              </button>,
              l.detail,
            ])}
        />
      </Panel>
    );
  }
  if (page === "points" || page === "objects")
    return (
      <Panel
        title={page === "points" ? "业务巡检点与版本" : "设备 → 对象 → 检测项"}
        extra={
          <Btn primary onClick={() => go("annotation")}>
            业务标注工作台
          </Btn>
        }
      >
        <Table
          heads={[
            "业务点位",
            "设备 / 对象",
            "检测项",
            "类型 / 单位",
            "必检",
            "状态 / 版本",
            "操作",
          ]}
          rows={s.points.map((p) => [
            <ObjectLink type="point" id={p.id}>
              {p.name}
            </ObjectLink>,
            <>
              <ObjectLink type="archive" id={p.device.split(" ")[0]}>
                {p.device}
              </ObjectLink>
              <small>{p.object}</small>
            </>,
            p.item,
            `${p.kind} / ${p.unit || "状态"}`,
            "是",
            <>
              <Badge>{p.state}</Badge> v{p.version}
            </>,
            <Btn onClick={() => go("annotation", p.mapId)}>编辑标注</Btn>,
          ])}
        />
      </Panel>
    );
  if (page === "integration")
    return (
      <>
        <div className="grid two">
          <Panel title="上层任务服务 · 演示调用方">
            <Field label="来源系统">
              <input readOnly value="企业巡检系统 DEMO" />
            </Field>
            <Field label="业务编号（幂等键）">
              <input value={bid} onChange={(e) => B(e.target.value)} />
            </Field>
            <Note>
              相同来源和业务编号返回同一任务，不重复生成。目标引用默认巡检模板。
            </Note>
            <Btn
              primary
              onClick={() => act({ type: "EXTERNAL", businessId: bid })}
            >
              模拟提交业务任务
            </Btn>
            <Btn onClick={() => go("dispatch")}>统一调度</Btn>
          </Panel>
          <Panel title="标准接口契约">
            <pre>
              {JSON.stringify(
                {
                  sourceSystem: "DEMO",
                  businessId: bid,
                  templateId: s.templates[0].id,
                  priority: "普通",
                  callback: "Mock 本地回调",
                },
                null,
                2,
              )}
            </pre>
            <p>提交 / 查询 / 取消任务 · 状态回传 · 结果回传</p>
            <Badge>Mock 接入 · 不连接真实系统</Badge>
          </Panel>
        </div>
        <Panel title="业务编号映射">
          <Table
            heads={["来源", "业务编号", "平台任务", "状态", "操作"]}
            rows={s.requests.map((x) => [
              "DEMO",
              x.businessId,
              x.taskId,
              s.tasks.find((t) => t.id === x.taskId)?.state,
              <Btn onClick={() => go("tasks", x.taskId)}>查询任务</Btn>,
            ])}
          />
        </Panel>
      </>
    );
  if (page === "media")
    return (
      <>
        <Panel
          title="建图原始资料与任务证据"
          extra={
            <input
              placeholder="搜索批次 / 文件 / 任务"
              value={q}
              onChange={(e) => Q(e.target.value)}
            />
          }
        >
          <Table
            heads={["资源", "类型", "业务关联", "状态", "操作"]}
            rows={[
              ...s.maps.flatMap((m) => [
                [
                  m.cloud,
                  "原始点云",
                  m.batch,
                  "已归档",
                  <Btn onClick={() => go("maps", m.id, "archive")}>
                    归档详情
                  </Btn>,
                ],
                [
                  m.video,
                  "建图视频",
                  m.batch,
                  "已归档",
                  <Btn onClick={() => SEL(m.video)}>预览示意</Btn>,
                ],
                [
                  m.file,
                  "地图",
                  m.id,
                  "版本归档",
                  <Download name={m.id + ".json"} data={m} />,
                ],
              ]),
              ...s.results.map((r) => [
                r.id + "-image",
                "巡检证据",
                r.taskId,
                "已留档",
                <Btn onClick={() => go("review", r.id)}>关联结果</Btn>,
              ]),
            ].filter((row) => String(row.slice(0, 3)).includes(q))}
          />
        </Panel>
        {selected && (
          <Modal title={selected + " · 示意预览"} onClose={() => SEL("")}>
            <Video live={false} />
          </Modal>
        )}
      </>
    );
  if (page === "analytics" || page === "archive") {
    const completed = s.tasks.filter((t) => t.state === "完成").length;
    const stats = [
      [
        "任务完整完成率",
        s.tasks.length ? Math.round((completed / s.tasks.length) * 100) : 0,
      ],
      [
        "有效结果占比",
        s.results.length
          ? Math.round(
              (s.results.filter((r) => r.status !== "待复核").length /
                s.results.length) *
                100,
            )
          : 0,
      ],
      [
        "异常结果占比",
        s.results.length
          ? Math.round(
              (s.results.filter((r) => r.abnormal).length / s.results.length) *
                100,
            )
          : 0,
      ],
    ];
    return (
      <>
        <div className="grid two">
          <Panel title="任务与巡检质量">
            {stats.map(([n, v]) => (
              <div className="bar-stat" key={n}>
                <span>{n}</span>
                <progress value={+v} max={100} />
                <b>{v}%</b>
              </div>
            ))}
            <p>
              当前演示数据：{s.tasks.length} 个任务 / {s.results.length} 个结果
              / {s.alarms.length} 条告警。
            </p>
          </Panel>
          <Panel title="压力读数历史趋势">
            <svg className="chart" viewBox="0 0 500 190">
              <path d="M40 20V155H480" fill="none" stroke="#b9c8d8" />
              <path d="M40 60H480" stroke="#d88673" strokeDasharray="4 5" />
              <text x="400" y="50" fill="#a65b4b" fontSize="12">
                上限 0.8 MPa
              </text>
              <polyline
                points={s.results
                  .filter(
                    (r) => r.unit === "MPa" && Number.isFinite(Number(r.final)),
                  )
                  .slice()
                  .reverse()
                  .map(
                    (r, i, a) =>
                      `${60 + (i * 370) / Math.max(1, a.length - 1)},${155 - Number(r.final) * 100}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="#236bc3"
                strokeWidth="3"
              />
              {s.results
                .filter(
                  (r) => r.unit === "MPa" && Number.isFinite(Number(r.final)),
                )
                .slice()
                .reverse()
                .map((r, i, a) => (
                  <circle
                    key={r.id}
                    cx={60 + (i * 370) / Math.max(1, a.length - 1)}
                    cy={155 - Number(r.final) * 100}
                    r="5"
                    fill="#236bc3"
                  />
                ))}
            </svg>
            <p className="muted">来自当前统一结果数据，按采集先后排列。</p>
          </Panel>
        </div>
        <Panel title="设备巡检档案">
          <Table
            heads={["设备 / 点位", "检测项", "结果", "时间", "详情"]}
            rows={s.results.map((r) => [
              s.points.find((p) => p.id === r.pointId)?.device,
              r.item,
              `${r.final} ${r.unit}`,
              r.time,
              <Btn onClick={() => go("review", r.id)}>追溯结果</Btn>,
            ])}
          />
        </Panel>
      </>
    );
  }
  const extras = s.extras.filter(
    (x) => x.category === page && (x.name + x.detail).includes(q),
  );
  return (
    <>
      <div className={page === "equipment" ? "grid template-layout" : ""}>
        {page === "equipment" && (
          <Panel title="设备资源层级">
            <div className="resource-tree">
              <b>石化企业</b>
              <p>　一期装置</p>
              <p>　　一期罐区</p>
              {s.extras
                .filter((x) => x.category === "equipment")
                .map((x) => (
                  <button key={x.id} onClick={() => Q(x.name)}>
                    　　 {x.name}
                  </button>
                ))}
              <Btn onClick={() => Q("")}>全部设备</Btn>
            </div>
          </Panel>
        )}
        <Panel
          title={pages.find((p) => p.id === page)?.name || page}
          extra={
            <div className="actions">
              <input
                placeholder="搜索名称"
                value={q}
                onChange={(e) => Q(e.target.value)}
              />
              <Btn
                primary
                onClick={() => {
                  E(undefined);
                  N("");
                  D("");
                  M(true);
                }}
              >
                ＋ 新增
              </Btn>
            </div>
          }
        >
          <Table
            heads={["编号", "名称", "配置 / 业务范围", "状态", "操作"]}
            rows={extras.map((x) => [
              x.id,
              page === "equipment" ? (
                <ObjectLink type="archive" id={x.name.split(" ")[0]}>
                  {x.name}
                </ObjectLink>
              ) : (
                x.name
              ),
              x.detail,
              <Badge>{x.status}</Badge>,
              <div className="actions">
                <Btn
                  onClick={() => {
                    E(x.id);
                    N(x.name);
                    D(x.detail);
                    M(true);
                  }}
                >
                  编辑
                </Btn>
                <Btn onClick={() => act({ type: "EXTRA_TOGGLE", id: x.id })}>
                  {x.status === "启用" ? "停用" : "启用"}
                </Btn>
                {page === "equipment" && (
                  <Btn onClick={() => go("objects")}>对象与检测项</Btn>
                )}
              </div>,
            ])}
          />
          {page === "roles" && (
            <Note>
              权限配置为原型演示数据。当前演示账号为巡检管理员，具备地图发布、任务调度、遥控、结果复核和告警关闭权限。
            </Note>
          )}
          {page === "services" && (
            <Note>
              本地模型识别物体类别，业务身份由人员确认。外部 AI
              负责检测分析；本期不含模型训练。
            </Note>
          )}
        </Panel>
      </div>
      {modal && (
        <Modal title={edit ? "编辑配置" : "新增配置"} onClose={() => M(false)}>
          <Field label="名称">
            <input value={name} onChange={(e) => N(e.target.value)} />
          </Field>
          <Field label="说明 / 业务范围">
            <textarea
              rows={4}
              value={detail}
              onChange={(e) => D(e.target.value)}
            />
          </Field>
          <Btn
            primary
            onClick={() => {
              if (
                act({
                  type: "EXTRA_SAVE",
                  id: edit,
                  category: page,
                  name,
                  detail,
                })
              )
                M(false);
            }}
          >
            保存
          </Btn>
        </Modal>
      )}
    </>
  );
}
