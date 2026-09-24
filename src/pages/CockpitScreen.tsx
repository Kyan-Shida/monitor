/**
 * @file CockpitScreen.tsx
 * @description 驾驶舱大屏：独立窗口形态（无后台外壳），两个驾驶舱共用统一的大屏全局导航栏并在其内切换
 * @interaction 由 App.tsx 在 page === "bigscreen" 时直接渲染（不经侧边栏 / 工作区外壳）；
 *              顶栏「驾驶舱大屏」按钮以新标签页打开该路由；切换通过 onSwitch 传入驾驶舱，不改变路由
 */
import { useState } from "react";
import { MonitorCockpit } from "./MonitorCockpit";
import { DispatchCockpit } from "./DispatchCockpit";
import type { CockpitId } from "../components/ScreenTopBar";

export function CockpitScreen() {
  const [which, SET] = useState<CockpitId>("overview");
  return (
    <div className="bigscreen">
      {which === "overview" ? (
        <MonitorCockpit onSwitch={SET} />
      ) : (
        <DispatchCockpit onSwitch={SET} />
      )}
    </div>
  );
}
