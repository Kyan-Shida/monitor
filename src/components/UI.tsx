import type { ReactNode, ButtonHTMLAttributes } from "react";
import { X, ChevronRight } from "lucide-react";
export const Btn = ({
  children,
  primary = false,
  danger = false,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  danger?: boolean;
}) => (
  <button
    className={"btn " + (primary ? "primary " : "") + (danger ? "danger" : "")}
    {...p}
  >
    {children}
  </button>
);
export const Badge = ({ children }: { children: ReactNode }) => (
  <span
    className={
      "badge " +
      (/失败|异常|歧义|离线|超限|待确认/.test(String(children))
        ? "red"
        : /已启用|已同步|完成|空闲|已恢复|已确认/.test(String(children))
          ? "green"
          : /待|暂停|草稿|接管|维护/.test(String(children))
            ? "amber"
            : "")
    }
  >
    {children}
  </span>
);
export const Panel = ({
  title,
  extra,
  children,
  className = "",
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={"panel " + className}>
    <div className="panel-head">
      <h3>{title}</h3>
      {extra}
    </div>
    <div className="panel-body">{children}</div>
  </section>
);
export const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
export const Note = ({ children }: { children: ReactNode }) => (
  <div className="note">{children}</div>
);
export const Empty = ({ children = "暂无记录" }: { children?: ReactNode }) => (
  <div className="empty">{children}</div>
);
export function Table({
  heads,
  rows,
}: {
  heads: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty />}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h3>{title}</h3>
          <button aria-label="关闭" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export const Steps = ({
  items,
  current,
}: {
  items: string[];
  current: number;
}) => (
  <div className="steps">
    {items.map((x, i) => (
      <div
        key={x}
        className={i === current ? "active" : i < current ? "done" : ""}
      >
        <span>{i < current ? "✓" : i + 1}</span>
        {x}
        {i < items.length - 1 && <ChevronRight size={14} />}
      </div>
    ))}
  </div>
);
export function Download({ name, data }: { name: string; data: unknown }) {
  return (
    <Btn
      onClick={() => {
        const u = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = u;
        a.download = name;
        a.click();
        URL.revokeObjectURL(u);
      }}
    >
      下载版本清单
    </Btn>
  );
}
