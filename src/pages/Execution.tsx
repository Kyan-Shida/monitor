import { useState } from "react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { stages } from "../data/types";
import { Btn, Badge, Panel, Table, Note, Steps, Field } from "../components/UI";
import { MapCanvas } from "../components/MapCanvas";
import { Video } from "../components/Video";
import { Can, useRole } from "../components/Can";
import { PERMS } from "../data/roles";
export { Execution } from "./ExecutionWorkbench";
/**
 * 人工接管与遥控控制台主体
 * @description 内嵌于「人工操作与遥控」页；机器人身份由该页页头的选择器确定，故此处不再重复选择器
 * @param robotId 当前机器人 ID
 */
export function ControlConsole({ robotId }: { robotId: string }) {
  const { s, act } = useStore();
  const role = useRole();
  const r = s.robots.find((x) => x.id === robotId) || s.robots[0];
  const x = s.sessions.find(
    (y) => y.robotId === r.id && !["已释放", "已超时"].includes(y.state),
  );
  const t = s.tasks.find((y) => y.id === r.current);
  const [checked, C] = useState(false);
  return (
    <>
      <div className="context-bar">
        <Badge>{r.state}</Badge>
        <span>
          电量 {r.battery}% · m{r.mapVersion} / p{r.pointSet}
        </span>
        {x ? (
          <Badge>会话进行中</Badge>
        ) : (
          <Can perm={PERMS.接管申请}>
            <Btn
              primary
              onClick={() => act({ type: "TAKEOVER", robotId: r.id })}
            >
              申请接管
            </Btn>
          </Can>
        )}
      </div>
      <Steps
        items={["申请接管", "暂停确认", "人工遥控", "释放并恢复"]}
        current={
          x ? (x.state === "待暂停确认" ? 1 : x.state === "已接管" ? 2 : 3) : 0
        }
      />
      <div className="grid execution-layout">
        <Panel title="机器人位置与业务目标">
          <MapCanvas
            points={s.points.filter((p) => p.mapId === r.mapId)}
            robots={[r]}
          />
        </Panel>
        <Panel title="现场实时视频">
          <Video pan={x?.pan} />
          <p>
            云台水平 {x?.pan || 0}° / 俯仰 {x?.tilt || 0}° · 仅人工遥控
          </p>
        </Panel>
        <Panel title="控制会话">
          <p>持有人：{x ? role.person : "无"}</p>
          <p>
            <Badge>{x?.state || "未接管"}</Badge>
          </p>
          <small>{x?.id}</small>
          {x?.state === "待暂停确认" && (
            <Btn primary onClick={() => act({ type: "CONTROL_ACK", id: x.id })}>
              确认机器人已暂停
            </Btn>
          )}
          {x?.state === "已接管" && (
            <>
              <p>有效至 {new Date(x.expires).toLocaleTimeString()}</p>
              <div className="remote-pad">
                {["前进", "停止", "后退", "左移", "右移"].map((cmd) => (
                  <Btn
                    key={cmd}
                    onClick={() =>
                      act({ type: "CONTROL", id: x.id, command: cmd })
                    }
                  >
                    {cmd}
                  </Btn>
                ))}
              </div>
              <h4>云台与采集</h4>
              <div className="actions">
                {["云台左转", "云台右转", "云台抬头", "采集照片"].map((cmd) => (
                  <Btn
                    key={cmd}
                    onClick={() =>
                      act({ type: "CONTROL", id: x.id, command: cmd })
                    }
                  >
                    {cmd}
                  </Btn>
                ))}
              </div>
              <hr />
              <Btn
                primary
                onClick={() => act({ type: "CONTROL_EXIT", id: x.id })}
              >
                退出人工接管
              </Btn>
            </>
          )}
          {x?.state === "退出核对中" && (
            <>
              <Note>
                当前任务 {t?.name || "无"}；已完成 {t?.done.length || 0} 项 /
                剩余 {(t?.items.length || 0) - (t?.done.length || 0)}{" "}
                项。实际版本 m{r.mapVersion}/p{r.pointSet}。
              </Note>
              <Field label="恢复核对">
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => C(e.target.checked)}
                  />{" "}
                  已确认版本、任务断点、结果一致
                </label>
              </Field>
              <Btn
                primary
                onClick={() =>
                  act({ type: "CONTROL_RELEASE", id: x.id, checked })
                }
              >
                释放控制权
              </Btn>
            </>
          )}
          {!x && t?.state === "暂停" && (
            <Btn
              primary
              onClick={() => {
                if (act({ type: "START", id: t.id })) go("execution", t.id);
              }}
            >
              明确恢复任务
            </Btn>
          )}
        </Panel>
      </div>
      <Panel title="遥控操作回执与审计">
        <Table
          heads={["时间", "事件", "会话 / 对象", "反馈"]}
          rows={s.logs
            .filter(
              (l) => l.action.startsWith("CONTROL") || l.action === "TAKEOVER",
            )
            .slice(0, 15)
            .map((l) => [l.time, l.action, l.object, l.detail])}
        />
      </Panel>

    </>
  );
}
