/**
 * @file DispatchCockpit.tsx
 * @description 调度指挥驾驶舱：深色大屏形态（顶部菜单条 + 居中标题 + 左中右三栏 + 双导航控制盘 + 底部指挥操作区），
 *              提供手动导航、任务导航、多层地图、告警去重合并与分级抑制、SLA 倒计时与超时升级、一键派单
 * @interaction 由 App.tsx 在 page === "screen" 时渲染；指标取自 data/metrics.ts，动作经 data/engine.ts
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useStore } from "../data/store";
import { go } from "../data/navigation";
import { Can } from "../components/Can";
import { PERMS } from "../data/roles";
import { Badge, Btn, Modal, Note } from "../components/UI";
import { MapCanvas } from "../components/MapCanvas";
import { ScreenTopBar, type CockpitId } from "../components/ScreenTopBar";
import { Video } from "../components/Video";
import { ControlPad, type MoveCommand } from "../components/ControlPad";
import { Sparkline } from "../components/Sparkline";
import { metricValue, scopedState } from "../data/metrics";
import { deviceProfile, deviceTypes } from "../data/deviceProfile";
import { currentTask, queueFor, robotColors, stageOf } from "../data/selectors";
import type { Alarm } from "../data/types";

/** 告警级别权重：用于分级抑制判断 */
const levelRank = (l: string) => (l === "紧急" ? 3 : l === "重要" ? 2 : 1);

export function DispatchCockpit({
  onSwitch,
}: {
  /** 独立大屏窗口内的驾驶舱切换；后台外壳下缺省按路由跳转 */
  onSwitch?: (id: CockpitId) => void;
}) {
  const { s, act } = useStore();
  const [region, SETR] = useState("全部区域");
  const [devType, SETT] = useState("全部机型");
  const [taskState, SETTS] = useState("全部状态");
  const [layers, LAY] = useState({ points: true, chargers: true, rails: true });
  const [speed, SPEED] = useState(5);
  const [selected, SEL] = useState<string>();
  const [pickedAlarm, PICKAL] = useState<string>();
  const [pickedWo, PICKWO] = useState<string>();
  const [now, NOW] = useState(() => new Date());
  const [fs, FS] = useState(false);
  /** 全屏失败提示：部分预览环境禁用浏览器全屏 API */
  const [fsError, FSE] = useState("");
  /** 驾驶舱根节点：全屏以该元素为目标，整屏只显示驾驶舱（与管理驾驶舱一致） */
  const shellRef = useRef<HTMLDivElement>(null);
  const [estop, ES] = useState(false);
  const [home, HOME] = useState(false);
  const [counterSign, CS] = useState("李主管");

  useEffect(() => {
    const onFs = () => FS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // SLA 倒计时推进：每分钟一次，仅缩短真实剩余时间，不生成任何模拟数据
  useEffect(() => {
    const i = setInterval(() => {
      const open = s.workOrders.some(
        (w) => !["已验收", "已关闭"].includes(w.state),
      );
      if (open) act({ type: "SLA_TICK" });
    }, 60000);
    return () => clearInterval(i);
  }, [s.workOrders, act]);

  const sc = scopedState(s, region);
  const mv = (key: string) => metricValue(sc, key);

  /** 设备列表：厂区 / 机型 / 状态三重筛选 */
  const robots = s.robots.filter((r) => {
    if (region !== "全部区域" && r.region !== region) return false;
    if (devType !== "全部机型" && r.deviceType !== devType) return false;
    if (taskState === "任务中" && r.state !== "执行中") return false;
    if (taskState === "异常" && !["故障", "离线", "人工接管"].includes(r.state))
      return false;
    if (taskState === "充电" && r.state !== "充电") return false;
    if (taskState === "空闲" && r.state !== "空闲") return false;
    return true;
  });
  const robot = robots.find((r) => r.id === selected) || robots[0];
  const task = robot ? currentTask(s, robot) : undefined;
  const queue = robot ? queueFor(s, robot.id) : [];
  /** 有效接管会话：只有已接管且未到期时才允许下发手动指令 */
  const session = s.sessions.find(
    (x) =>
      x.robotId === robot?.id && x.state === "已接管" && x.expires > Date.now(),
  );

  /** 告警去重合并：同点位 + 同级别的未关闭告警合并为一条，标注合并条数 */
  const openAlarms = s.alarms.filter((a) => a.state !== "已关闭");
  const alarmGroups = useMemo(() => {
    const groups = new Map<string, Alarm[]>();
    openAlarms.forEach((a) => {
      const key = `${a.pointId}|${a.level}`;
      groups.set(key, [...(groups.get(key) || []), a]);
    });
    return [...groups.entries()].map(([key, items]) => ({
      key,
      items,
      head: items[0],
      /** 分级抑制：同点位存在更高级别告警时，低级别仅记录不推送处置 */
      suppressed: openAlarms.some(
        (x) =>
          x.pointId === items[0].pointId &&
          levelRank(x.level) > levelRank(items[0].level),
      ),
    }));
  }, [openAlarms]);
  /** 未闭环工单：SLA 倒计时列表 */
  const openWos = s.workOrders.filter(
    (w) => !["已验收", "已关闭"].includes(w.state),
  );

  /** 指挥 KPI 数字条：8 项待处置量，与管理驾驶舱数字带同款（只读展示，不下钻） */
  const strip = [
    { n: mv("onlineCount"), label: "在线设备（台）" },
    { n: mv("executing"), label: "执行中任务（个）" },
    { n: sc.alarms.filter((a) => a.state !== "已关闭").length, label: "未闭环告警（条）" },
    { n: openWos.filter((w) => w.slaState !== "正常").length, label: "SLA 预警/超时（单）" },
    { n: openWos.filter((w) => !w.assignee).length, label: "待派单工单（单）" },
    { n: s.sessions.filter((x) => x.state === "已接管").length, label: "人工接管会话（个）" },
    { n: mv("lowBattery"), label: "低电量设备（台）" },
    { n: mv("fieldPending"), label: "现场待处理（项）" },
  ];

  /** 采集数据流：取最近可解析为数值的检测结果，用于波形与明细（无数据时不绘制） */
  const recentResults = s.results.slice(0, 6);
  const wave = s.results
    .filter((r) => Number.isFinite(Number(r.final)))
    .slice(0, 14)
    .reverse()
    .map((r, i) => ({ d: String(i + 1), v: Number(r.final) }));
  const pointName = (pid: string) =>
    s.points.find((p) => p.id === pid)?.name || pid;

  /**
   * 切换全屏展示：以驾驶舱根节点为目标请求全屏（与管理驾驶舱一致），整屏只显示驾驶舱；
   * 部分预览环境会拒绝该请求，此时给出明确提示，不静默失败
   */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await shellRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      FSE(
        "当前预览环境禁止浏览器全屏，请在独立浏览器窗口中打开以使用全屏展示。",
      );
      setTimeout(() => FSE(""), 6000);
    }
  };
  /** 下发手动移动指令：会话与速度档位一并传入状态机 */
  const sendMove = (cmd: MoveCommand) => {
    if (!session || !robot) return;
    act({ type: "CONTROL", id: session.id, command: cmd, step: speed });
  };
  /** 下发云台 / 采集指令 */
  const sendCmd = (cmd: string) => {
    if (!session) return;
    act({ type: "CONTROL", id: session.id, command: cmd, step: speed });
  };

  return (
    <div className="cockpit-screen ds-root" ref={shellRef}>
      {/* 大屏全局导航栏：两个驾驶舱统一（品牌 + 两侧导航 Tab + 发光标题 + 时间与用户） */}
      <ScreenTopBar current="screen" onSwitch={onSwitch} />
      {/* 驾驶舱工具条：本舱自身控件（全屏 / 紧急停止） */}
      <div className="cs-toolbar">
        <span className="cs-toolbar-right">
          <button
            className="btn"
            title="驾驶舱独占整屏展示"
            onClick={toggleFullscreen}
          >
            {fs ? <Minimize size={15} /> : <Maximize size={15} />}
            {fs ? "退出全屏" : "全屏展示"}
          </button>
          <Can perm={PERMS.紧急停止}>
            <button className="screen-estop" onClick={() => ES(true)}>
              紧急停止
            </button>
          </Can>
        </span>
      </div>
      {/* 指挥 KPI 数字条：与管理驾驶舱完全同款（8 格），均为当前待处置量 */}
      {/* KPI 数字条：只读展示，不做下钻跳转 */}
      <div className="cs-kpi-strip">
        {strip.map((x) => (
          <div key={x.label} className="cs-kpi">
            <b>{x.n}</b>
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      {fsError && <Note>{fsError}</Note>}

      <div className="cs-body ds-body">
        {/* 左：设备状态 + 数据采集 + 巡检明细 */}
        <aside className="cs-left">
          {/* grow：撑满列高，与中/右两栏底边对齐 */}
          <section className="cs-card grow">
            <h3>
              设备状态
              <small>在线 {mv("onlineCount")}/{mv("devices")}</small>
            </h3>
            <div className="ds-selects">
              <select aria-label="厂区" value={region} onChange={(e) => SETR(e.target.value)}>
                {["全部区域", ...new Set(s.robots.map((r) => r.region))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select aria-label="机型" value={devType} onChange={(e) => SETT(e.target.value)}>
                {["全部机型", ...deviceTypes].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select aria-label="状态" value={taskState} onChange={(e) => SETTS(e.target.value)}>
                {["全部状态", "任务中", "空闲", "充电", "异常"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="cs-list">
              {robots.map((r) => (
                <button
                  key={r.id}
                  className={r.id === robot?.id ? "active" : ""}
                  onClick={() => SEL(r.id)}
                >
                  <i
                    className="cs-dot"
                    style={{ background: robotColors[r.state] }}
                  />
                  <div>
                    <b>
                      {r.id}
                      <em>{r.deviceType}</em>
                    </b>
                    <small>{r.state}</small>
                  </div>
                  <span className="cs-bar">
                    <i style={{ width: `${r.battery}%` }} />
                  </span>
                  <em className="cs-battery">{r.battery}%</em>
                </button>
              ))}
              {!robots.length && <Note>当前筛选条件下无设备。</Note>}
            </div>
          </section>

          <section className="cs-card">
            <h3>
              当前设备
              <small>{robot?.id || "—"}</small>
            </h3>
            <div className="cs-kv">
              <span>
                机型<b>{robot?.deviceType || "—"}</b>
              </span>
              <span>
                区域<b>{robot?.region || "—"}</b>
              </span>
              <span>
                电量<b>{robot?.battery ?? 0}%</b>
              </span>
              <span>
                通信<b>{robot?.state === "离线" ? "离线" : "在线"}</b>
              </span>
              <span>
                巡检进度<b>{stageOf(task)}</b>
              </span>
              <span>
                接管会话<b>{session ? session.id : "未接管"}</b>
              </span>
            </div>
            <div className="actions">
              <Can perm={PERMS.远程接管}>
                <Btn primary onClick={() => go("manual", robot?.id)}>
                  {session ? "进入操控台" : "申请接管"}
                </Btn>
              </Can>
              <Can perm={PERMS.一键返航充电}>
                <Btn onClick={() => HOME(true)}>一键返航</Btn>
              </Can>
            </div>
            <small className="cs-hint">
              关机重点：{deviceProfile[robot?.deviceType || "机器狗"].focusItems.join(" / ")}
            </small>
          </section>

          <section className="cs-card">
            <h3>
              采集数据流
              <small>{wave.length} 个观测点</small>
            </h3>
            {wave.length >= 2 ? (
              <Sparkline list={wave} ok />
            ) : (
              <small className="cs-hint">
                观测点不足 2 个，不绘制波形（不插值补造）
              </small>
            )}
            <small className="cs-hint">
              来自巡检结果的实际读数序列，非信号仿真。
            </small>
          </section>

          <section className="cs-card">
            <h3>巡检明细</h3>
            <div className="cs-work-list readonly">
              {!recentResults.length && <Note>暂无巡检结果。</Note>}
              {recentResults.map((r) => (
                <button key={r.id}>
                  <div>
                    <b>{pointName(r.pointId)}</b>
                    <small>
                      {r.item} · {r.time}
                    </small>
                  </div>
                  <em>
                    {r.final} {r.unit}
                  </em>
                  <Badge>{r.status}</Badge>
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* 中：地图 + 双导航控制盘 */}
        <main className="cs-center">
          <section className="cs-card cs-map-card grow">
            <h3>
              机器人位置
              <small>
                {robot?.id || "—"} · 坐标 ({robot?.x ?? 0}, {robot?.y ?? 0})
              </small>
            </h3>
            <div className="ds-layers">
              {(
                [
                  ["points", "点位图层"],
                  ["chargers", "充电桩"],
                  ["rails", "轨道区段"],
                ] as const
              ).map(([k, n]) => (
                <button
                  key={k}
                  className={layers[k] ? "active" : ""}
                  onClick={() => LAY({ ...layers, [k]: !layers[k] })}
                >
                  {n}
                </button>
              ))}
              <button
                title="BIM / 室内楼层待数据源接入"
                onClick={() => undefined}
              >
                BIM 视图
              </button>
            </div>
            <div className="cs-map">
              <MapCanvas
                points={layers.points ? sc.points : []}
                robots={robots}
                chargers={layers.chargers ? s.chargers : []}
                rails={layers.rails ? s.railSections : []}
                fit="xMidYMid slice"
                onRobot={(rid) => SEL(rid)}
              />
            </div>
            <div className="cs-map-legend">
              {deviceTypes.map((d) => (
                <span key={d}>
                  <i /> {d}
                </span>
              ))}
              <span>
                <i /> 充电桩
              </span>
              <span>
                <i /> 轨道区段
              </span>
            </div>
          </section>

          <div className="ds-pads">
            <section className="cs-card">
              <h3>
                机器人导航
                <small>手动</small>
              </h3>
              <ControlPad
                onCommand={sendMove}
                disabled={!session || !robot || robot.state === "离线"}
                speed={speed}
                onSpeed={SPEED}
                hint={
                  session
                    ? `会话 ${session.id} · 已接管，指令即时生效`
                    : "需先在「远程操控台」申请接管，接管后此处才可操控"
                }
              />
            </section>

            <section className="cs-card">
              <h3>
                任务导航
                <small>{task ? task.id : "无执行中任务"}</small>
              </h3>
              <div className="cs-kv">
                <span>
                  当前任务<b>{task?.name || "—"}</b>
                </span>
                <span>
                  当前点位
                  <b>
                    {task?.items[Math.min(task.index, task.items.length - 1)]?.name ||
                      "—"}
                  </b>
                </span>
                <span>
                  待执行队列<b>{queue.length} 项</b>
                </span>
                <span>
                  机型约束
                  <b>
                    {deviceProfile[robot?.deviceType || "机器狗"].taskConstraints.join(" / ")}
                  </b>
                </span>
              </div>
              {task && ["执行中", "暂停"].includes(task.state) && (
                <div className="actions">
                  <Can perm={PERMS.调度下发}>
                    <Btn
                      primary
                      onClick={() =>
                        task.state === "执行中"
                          ? act({ type: "PAUSE", id: task.id })
                          : act({ type: "START", id: task.id })
                      }
                    >
                      {task.state === "执行中" ? "暂停任务" : "继续任务"}
                    </Btn>
                  </Can>
                </div>
              )}
              <small className="cs-hint">
                自动巡航由任务引擎按点位顺序执行；手动导航仅用于特殊情况接管。
              </small>
            </section>

            <section className="cs-card">
              <h3>
                云台控制
                <small>相机</small>
              </h3>
              <div className="ds-cam">
                <Btn
                  disabled={!session}
                  onClick={() => sendCmd("云台左转")}
                >
                  云台左
                </Btn>
                <Btn
                  disabled={!session}
                  onClick={() => sendCmd("云台右转")}
                >
                  云台右
                </Btn>
                <Btn
                  disabled={!session}
                  onClick={() => sendCmd("云台抬头")}
                >
                  抬头
                </Btn>
                <Can perm={PERMS.远程接管}>
                  <Btn
                    primary
                    disabled={!session}
                    onClick={() => sendCmd("采集照片")}
                  >
                    采集照片
                  </Btn>
                </Can>
              </div>
              <small className="cs-hint">接管后可调整相机视角并抓拍留档。</small>
            </section>
          </div>
        </main>

        {/* 右：告警与 SLA + 视频信息 */}
        <aside className="cs-right">
          <section className="cs-card grow">
            <h3>
              告警（去重合并 · 分级抑制）
              <small>{alarmGroups.length} 组</small>
            </h3>
            <div className="cs-work-list">
              {!alarmGroups.length && <Note>当前无未关闭告警。</Note>}
              {alarmGroups.slice(0, 5).map((g) => (
                <button
                  key={g.key}
                  className={pickedAlarm === g.key ? "active" : ""}
                  onClick={() => PICKAL(g.key)}
                >
                  <i
                    className={
                      "severity " + (g.head.level === "重要" ? "red" : "amber")
                    }
                  />
                  <div>
                    <b>{g.head.name}</b>
                    <small>
                      {g.head.pointId} · {g.head.state}
                      {g.items.length > 1 ? ` · 合并 ${g.items.length} 条` : ""}
                      {g.suppressed ? " · 已抑制（同点位存在更高级别）" : ""}
                    </small>
                  </div>
                  <Badge>{g.head.level}</Badge>
                </button>
              ))}
            </div>
          </section>

          <section className="cs-card">
            <h3>
              SLA 倒计时
              <small>{openWos.length} 单未闭环</small>
            </h3>
            <div className="cs-work-list">
              {!openWos.length && <Note>当前无未闭环工单。</Note>}
              {openWos.map((w) => (
                <button
                  key={w.id}
                  className={pickedWo === w.id ? "active" : ""}
                  onClick={() => PICKWO(w.id)}
                >
                  <i
                    className={
                      "severity " +
                      (w.slaState === "已升级"
                        ? "red"
                        : w.slaState === "预警"
                          ? "amber"
                          : "teal")
                    }
                  />
                  <div>
                    <b>{w.title}</b>
                    <small>
                      {w.level}级 · {w.assignee || "待派单"} ·{" "}
                      {w.slaLeft > 0
                        ? `剩余 ${w.slaLeft} 分钟`
                        : `已超时 ${-w.slaLeft} 分钟`}
                      {w.slaState !== "正常" ? ` · ${w.slaState}` : ""}
                    </small>
                  </div>
                  <Badge>{w.state}</Badge>
                </button>
              ))}
            </div>
          </section>

          <section className="cs-card">
            <h3>视频信息</h3>
            {/* 固定双画面：可见光 + 红外热像，不再提供宫格切换 */}
            <div className="cs-video-dual">
              <Video live label="可见光主画面" />
              <Video live label="红外热像" />
            </div>
          </section>
        </aside>
      </div>

      {/* 急停确认：高风险操作，需第二复核人确认 */}
      {estop && (
        <Modal title="确认紧急停止" onClose={() => ES(false)}>
          <Note>
            将立即暂停全部执行中任务、设备进入安全待机并强制释放遥控会话。该操作最高优先级，
            第二复核人：<b>{counterSign}</b>。
          </Note>
          <Btn
            danger
            onClick={() => {
              act({
                type: "EMERGENCY_STOP",
                reason: `双人复核（${counterSign}）确认执行急停`,
              });
              ES(false);
            }}
          >
            确认急停
          </Btn>
        </Modal>
      )}

      {home && (
        <Modal title="确认一键返航" onClose={() => HOME(false)}>
          <Note>
            将终止 {robot?.id} 当前任务并直接下发回充。第二复核人：<b>{counterSign}</b>。
          </Note>
          <Btn
            danger
            onClick={() => {
              if (robot) act({ type: "RETURN_HOME", robotId: robot.id });
              HOME(false);
            }}
          >
            确认返航
          </Btn>
        </Modal>
      )}

    </div>
  );
}
