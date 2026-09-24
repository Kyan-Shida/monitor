/**
 * @file Metrics.tsx
 * @description 指标中心：统一口径的指标清单，展示当前值 / 目标值 / 口径说明 / 下钻入口
 * @interaction 被 App.tsx 按路由 metrics 渲染；数据来自 data/metrics.ts，不允许在本页自行计算
 */
import { useState } from "react";
import { metricsFor, metricValue, metricOk, METRIC_CONFIG } from "../data/metrics";
import { useStore } from "../data/store";
import { Can, useRole } from "../components/Can";
import { PERMS } from "../data/roles";
import { Badge, Btn, Note, Panel, Table } from "../components/UI";
import { go } from "../data/navigation";

/** 指标下钻目标页：无对应页面时不显示下钻入口 */
const drillTarget: Record<string, string> = {
  devices: "robots",
  onlineRate: "robots",
  coverage: "points",
  autoRate: "tasks",
  aiAccuracy: "review",
  falseRate: "alarms",
  closeRate: "alarms",
  mttr: "alarms",
  takeoverRate: "control",
  taskRate: "tasks",
  reviewBacklog: "review",
  scheduleRate: "plans",
  alarmTotal: "alarms",
  alarmValid: "alarms",
};

export function Metrics() {
  const { s } = useStore();
  const role = useRole();
  const [openKey, setOpenKey] = useState("");
  const list = metricsFor(role.id);

  return (
    <>
      <Note>
        指标中心是全平台唯一口径来源：管理驾驶舱、调度指挥驾驶舱、工作台与自助报表均消费本页定义，
        口径变更须在配置中心发布并留痕。当前演示角色为 <b>{role.name}</b>（数据范围：{role.scope}），
        仅展示该角色可见指标。
      </Note>

      <div className="kpi-grid">
        {list.map((m) => {
          const v = metricValue(s, m.key);
          const ok = metricOk(m, v);
          return (
            <button
              key={m.key}
              className={"kpi-card" + (openKey === m.key ? " active" : "")}
              onClick={() => setOpenKey(openKey === m.key ? "" : m.key)}
            >
              <span className="kpi-name">{m.name}</span>
              <b className="kpi-value">
                {v}
                <small>{m.unit}</small>
              </b>
              <span className="kpi-foot">
                {m.target === undefined ? (
                  <em>无目标值</em>
                ) : (
                  <>
                    目标 {m.positive ? "≥" : "≤"} {m.target}
                    {m.unit}
                    <Badge>{ok ? "达标" : "未达标"}</Badge>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {openKey && (
        <Panel title="口径说明">
          {(() => {
            const m = list.find((x) => x.key === openKey);
            if (!m) return <Note>该指标当前角色不可见。</Note>;
            return (
              <>
                <Table
                  heads={["指标", "口径（公式）", "单位", "目标", "可下钻维度", "可见角色"]}
                  rows={[
                    [
                      m.name,
                      m.formula,
                      m.unit,
                      m.target === undefined
                        ? "—"
                        : `${m.positive ? "≥" : "≤"} ${m.target}${m.unit}`,
                      m.dims.join(" / "),
                      m.roles === "*" ? "全部角色" : m.roles.join(" / "),
                    ],
                  ]}
                />
                <div className="actions">
                  {drillTarget[m.key] && (
                    <Btn primary onClick={() => go(drillTarget[m.key])}>
                      下钻查看明细
                    </Btn>
                  )}
                  <Btn onClick={() => setOpenKey("")}>收起</Btn>
                </div>
              </>
            );
          })()}
        </Panel>
      )}

      <Panel title="指标清单与下钻">
        <Table
          heads={["指标", "当前值", "目标值", "状态", "可下钻维度", "操作"]}
          rows={list.map((m) => {
            const v = metricValue(s, m.key);
            return [
              m.name,
              `${v} ${m.unit}`,
              m.target === undefined
                ? "—"
                : `${m.positive ? "≥" : "≤"} ${m.target}${m.unit}`,
              m.target === undefined ? (
                <Badge>观察项</Badge>
              ) : (
                <Badge>{metricOk(m, v) ? "达标" : "未达标"}</Badge>
              ),
              m.dims.join(" / "),
              drillTarget[m.key] ? (
                <Btn onClick={() => go(drillTarget[m.key])}>下钻</Btn>
              ) : (
                "—"
              ),
            ];
          })}
        />
      </Panel>

      {/* 口径管理属管理动作：非管理员不显示该面板 */}
      <Can perm={PERMS.口径管理}>
        <Panel title="口径配置">
          <Table
            heads={["配置项", "当前值", "说明"]}
            rows={[
              [
                "成本节省换算系数",
                `${METRIC_CONFIG.costPerTask} 万元 / 任务`,
                "口径可配，配置中心发布后驾驶舱自动跟随",
              ],
              [
                "人力节省换算系数",
                `${METRIC_CONFIG.laborPerTask} 人·班 / 任务`,
                "口径可配，配置中心发布后驾驶舱自动跟随",
              ],
            ]}
          />
        </Panel>
      </Can>
    </>
  );
}
