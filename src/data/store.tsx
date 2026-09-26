import { createContext, useContext, useState, type ReactNode } from "react";
import { seed } from "./seed";
import { transition, type Action } from "./engine";
import { roleOf } from "./roles";
import type { State } from "./types";
const KEY = "inspection-v14-prototype";
/** 当前数据模型版本，须与 types.ts 的 State.schema 一致 */
const SCHEMA = 5;
/**
 * 老缓存升级：schema 1 → 2 时补齐工单/验收/接管/反馈等新增集合，
 * 并按序回填机型、移动能力、约束、健康度、固件字段，避免页面读到 undefined；
 * schema 2 → 3 时补齐 Template.state（启用/停用），否则模板列表状态列会渲染出空徽标
 * @param raw 本地缓存解析出的状态对象
 * @returns 当前版本状态；无法识别时返回 null，由调用方回落到 seed()
 */
function migrate(raw: unknown): State | null {
  if (!raw || typeof raw !== "object") return null;
  const old = raw as Record<string, any>;
  if (old.schema === SCHEMA) return old as State;
  if (old.schema === 1 || old.schema === 2) {
    const base = seed();
    const merged = { ...base, ...old, schema: SCHEMA } as State;
    if (old.schema === 1) {
      const oldRobots = (old.robots as any[]) || [];
      merged.robots = oldRobots.length
        ? oldRobots.map((r, i) => ({
            ...base.robots[i % base.robots.length],
            ...r,
          }))
        : base.robots;
    }
    // Template 新增 state 字段：老缓存逐条回填默认值，保留用户已建模板
    merged.templates = (merged.templates || []).map((t: any) => ({
      ...t,
      state: t.state === "停用" ? "停用" : "启用",
    }));
    return merged;
  }
  return null;
}
function initial() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY) || "null")) || seed();
  } catch {
    return seed();
  }
}
const C = createContext<{
  s: State;
  act: (a: Action, onSuccess?: (s: State) => void) => boolean;
  reset: () => void;
  /** 切换演示角色（原型阶段代替真实登录），影响菜单 / 默认页 / 按钮 / 驾驶舱视图 */
  setRole: (id: string) => void;
  message: string;
}>({} as any);
export function Store({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(initial),
    [message, msg] = useState("");
  function act(a: Action, onSuccess?: (s: State) => void) {
    try {
      const n = transition(s, a);
      set(n);
      localStorage.setItem(KEY, JSON.stringify(n));
      msg("操作成功 · " + n.logs[0].object);
      setTimeout(() => msg(""), 4000);
      onSuccess?.(n);
      return true;
    } catch (e) {
      msg((e as Error).message);
      return false;
    }
  }
  /**
   * 切换演示角色：仅改 roleId，不触发业务状态机
   * @param rid 角色 ID，见 roles.ts
   */
  function setRole(rid: string) {
    const n = { ...s, roleId: rid };
    set(n);
    localStorage.setItem(KEY, JSON.stringify(n));
    msg(`已切换角色：${roleOf(rid).name}（${roleOf(rid).scope}）`);
    setTimeout(() => msg(""), 3000);
  }
  return (
    <C.Provider
      value={{
        s,
        act,
        message,
        setRole,
        reset: () => {
          const n = seed();
          set(n);
          localStorage.setItem(KEY, JSON.stringify(n));
          msg("演示数据已重置");
        },
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useStore = () => useContext(C);
