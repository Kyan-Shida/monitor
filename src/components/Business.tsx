import type { ReactNode } from "react";
import { useStore } from "../data/store";
import { Btn, Empty } from "./UI";
import { logNames, taskEvents } from "../data/selectors";
export function ObjectLink({
  type,
  id,
  children,
  tab,
}: {
  type: string;
  id?: string;
  children?: ReactNode;
  tab?: string;
}) {
  // 纯展示：保留 ID/名称信息但不做下钻跳转，避免为下钻而切碎使用流程
  const text =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : id || type;
  return (
    <span className="object-link" title={text}>
      {children || id || "—"}
    </span>
  );
}
export function Kpis({
  items,
}: {
  items: { label: string; value: ReactNode; action?: () => void }[];
}) {
  return (
    <div className="workbench-kpis">
      {items.map((x) => (
        <button key={x.label} onClick={x.action} disabled={!x.action}>
          <span>{x.label}</span>
          <b>{x.value}</b>
        </button>
      ))}
    </div>
  );
}
export function EventTimeline({
  taskId,
  robotId,
}: {
  taskId?: string;
  robotId?: string;
}) {
  const { s } = useStore();
  let events = taskEvents(s, taskId);
  if (robotId)
    events = events.filter(
      (l) =>
        l.object === robotId ||
        s.tasks.some((t) => t.robotId === robotId && t.id === l.object) ||
        s.sessions.some(
          (x) =>
            x.robotId === robotId &&
            (x.id === l.object || l.detail.includes(x.id)),
        ),
    );
  return (
    <div className="event-timeline">
      {!events.length && <Empty>尚无执行事件</Empty>}
      {events.map((l) => (
        <div key={l.id}>
          <time>{l.time}</time>
          <i />
          <section>
            <b>{logNames[l.action] || l.action}</b>
            <p>{l.detail}</p>
            <small>{l.object}</small>
          </section>
        </div>
      ))}
    </div>
  );
}
export function Pager({
  page,
  count,
  size = 6,
  onChange,
}: {
  page: number;
  count: number;
  size?: number;
  onChange: (n: number) => void;
}) {
  const max = Math.max(1, Math.ceil(count / size));
  return (
    <div className="pager">
      <span>
        共 {count} 条 · 第 {Math.min(page, max)} / {max} 页
      </span>
      <Btn disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </Btn>
      <Btn disabled={page >= max} onClick={() => onChange(page + 1)}>
        下一页
      </Btn>
    </div>
  );
}
