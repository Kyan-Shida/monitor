import { useState } from "react";
import type {
  Point,
  Candidate,
  Robot,
  Charger,
  RailSection,
} from "../data/types";
import { robotColors } from "../data/selectors";
export function MapCanvas({
  points = [],
  targets = [],
  robots = [],
  chargers = [],
  rails = [],
  selected,
  onSelect,
  onAdd,
  onRobot,
  pointStates = {},
  fit = "xMidYMid meet",
}: {
  points?: Point[];
  targets?: Candidate[];
  robots?: Robot[];
  /** 充电桩图层：四轮车 / 机器狗的返充依赖 */
  chargers?: Charger[];
  /** 轨道区段图层：挂轨的占用与防碰撞依赖 */
  rails?: RailSection[];
  selected?: string;
  onSelect?: (id: string) => void;
  onAdd?: (x: number, y: number) => void;
  onRobot?: (id: string) => void;
  pointStates?: Record<string, string>;
  /** SVG 视口适配方式：驾驶舱传 slice 填满容器，其余场景保持 meet 以完整显示地图 */
  fit?: string;
}) {
  const [zoom, Z] = useState(1);
  return (
    <div className="map-canvas">
      <div className="map-tools">
        <span>激光 + 视觉融合地图</span>
        <button onClick={() => Z(Math.min(1.6, zoom + 0.15))}>＋</button>
        <button onClick={() => Z(Math.max(0.7, zoom - 0.15))}>−</button>
        <button onClick={() => Z(1)}>复位</button>
      </div>
      <svg
        viewBox="0 0 900 520"
        preserveAspectRatio={fit}
        role="img"
        aria-label="一期罐区地图与业务目标"
        onDoubleClick={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          onAdd?.(
            ((e.clientX - b.left) / b.width) * 100,
            ((e.clientY - b.top) / b.height) * 100,
          );
        }}
      >
        <defs>
          <pattern
            id="grid"
            width="26"
            height="26"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M26 0H0V26"
              fill="none"
              stroke="#dce5ec"
              strokeWidth=".7"
            />
          </pattern>
        </defs>
        <rect width="900" height="520" fill="#edf2f6" />
        <rect width="900" height="520" fill="url(#grid)" />
        <g
          transform={`translate(${450 - 450 * zoom} ${260 - 260 * zoom}) scale(${zoom})`}
        >
          <path
            d="M65 415H835M80 240H805M450 55V465"
            stroke="#fff"
            strokeWidth="40"
          />
          <path
            d="M65 415H835M80 240H805M450 55V465"
            stroke="#c7d5df"
            strokeWidth="2"
            strokeDasharray="8 7"
          />
          {[
            [230, 137],
            [650, 137],
            [230, 330],
            [650, 330],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect
                x={x - 109}
                y={y - 74}
                width="218"
                height="147"
                rx="6"
                fill="#dfe8ee"
                stroke="#bdcbd6"
              />
              <circle
                cx={x}
                cy={y}
                r="59"
                fill="#f5f8fb"
                stroke="#9daebb"
                strokeWidth="3"
              />
              <circle cx={x} cy={y} r="49" fill="none" stroke="#c5d3de" />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fill="#718496"
                fontSize="15"
              >
                V00{i + 1} 储罐
              </text>
            </g>
          ))}
          <path
            d="M78 90H120V375H338V90H380M542 90H585V375H767V90H815"
            stroke="#b4c8d7"
            strokeWidth="9"
            fill="none"
          />
          {targets
            .filter((t) => t.state === "待确认")
            .map((t) => (
              <g
                key={t.id}
                className="map-point"
                onClick={() => onSelect?.(t.id)}
                transform={`translate(${t.x * 9} ${t.y * 5.2})`}
              >
                <rect
                  x="-10"
                  y="-10"
                  width="20"
                  height="20"
                  transform="rotate(45)"
                  fill="#d49631"
                  stroke="white"
                  strokeWidth="3"
                />
                <text x="16" y="-13" fill="#946816" fontSize="14">
                  候选{t.kind}
                </text>
              </g>
            ))}
          {points.map((p) => (
            <g
              key={p.id}
              className="map-point"
              onClick={() => onSelect?.(p.targetId)}
              transform={`translate(${p.x * 9} ${p.y * 5.2})`}
            >
              {selected === p.targetId && (
                <circle r="22" fill="#2d74dc22" stroke="#2d74dc" />
              )}
              <circle
                r="9"
                fill={
                  p.targetId === selected
                    ? "#2379ce"
                    : pointStates[p.id] === "异常"
                      ? "#c85d50"
                      : pointStates[p.id] === "失败"
                        ? "#8d5666"
                        : pointStates[p.id] === "已完成"
                          ? "#31957f"
                          : pointStates[p.id] === "待执行"
                            ? "#9daaba"
                            : p.state === "已启用"
                              ? "#2379ce"
                              : "#d49631"
                }
                stroke="white"
                strokeWidth="3"
              />
              <text x="15" y="-13" fontSize="14" fill="#24425e">
                {p.name}
              </text>
            </g>
          ))}
          {/* 轨道区段图层：占用 / 空闲 / 检修三态，占用时标注归属机器 */}
          {rails.map((x) => (
            <g key={x.id} transform={`translate(${x.x * 9} ${x.y * 5.2})`}>
              <path
                d={`M-${x.length / 2} 0H${x.length / 2}`}
                stroke={
                  x.state === "占用"
                    ? "#c58e32"
                    : x.state === "检修"
                      ? "#bf5b53"
                      : "#7f93a5"
                }
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.75"
              />
              <text x={x.length / 2 + 8} y="5" fontSize="13" fill="#5b6b7c">
                {x.name} · {x.state}
                {x.robotId ? ` · ${x.robotId}` : ""}
              </text>
            </g>
          ))}
          {/* 充电桩图层：空闲 / 占用 / 故障三态 */}
          {chargers.map((c) => (
            <g key={c.id} transform={`translate(${c.x * 9} ${c.y * 5.2})`}>
              <rect
                x="-11"
                y="-11"
                width="22"
                height="22"
                rx="4"
                fill={
                  c.state === "占用"
                    ? "#c58e32"
                    : c.state === "故障"
                      ? "#bf5b53"
                      : "#31957f"
                }
                stroke="white"
                strokeWidth="2.5"
              />
              <path
                d="M-3 -7L2 -1L-1 -1L3 6"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              <text x="15" y="5" fontSize="13" fill="#3f5a6b">
                {c.name}
                {c.robotId ? ` · ${c.robotId}` : ""}
              </text>
            </g>
          ))}
          {robots.map((r) => (
            <g
              key={r.id}
              className="map-point"
              onClick={() => onRobot?.(r.id)}
              transform={`translate(${r.x * 9} ${r.y * 5.2})`}
            >
              <circle r="26" fill="#24aa9b22" />
              {/* 三类机型使用不同图元，便于在驾驶舱一眼区分 */}
              {r.deviceType === "机器狗" ? (
                <>
                  <rect
                    x="-12"
                    y="-9"
                    width="24"
                    height="18"
                    rx="5"
                    fill={robotColors[r.state]}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <path d="M-6 -13L0 -20L6 -13" fill={robotColors[r.state]} />
                </>
              ) : r.deviceType === "四轮车" ? (
                <>
                  <rect
                    x="-13"
                    y="-9"
                    width="26"
                    height="18"
                    rx="9"
                    fill={robotColors[r.state]}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <circle cx="-6" cy="10" r="3.4" fill="#42566a" />
                  <circle cx="6" cy="10" r="3.4" fill="#42566a" />
                </>
              ) : (
                <>
                  <rect x="-6" y="-18" width="12" height="6" rx="2" fill="#68839a" />
                  <path d="M0 -12V-6" stroke="#68839a" strokeWidth="3" />
                  <rect
                    x="-13"
                    y="-6"
                    width="26"
                    height="14"
                    rx="3"
                    fill={robotColors[r.state]}
                    stroke="white"
                    strokeWidth="2"
                  />
                </>
              )}
              <text x="18" y="26" fontSize="14" fill="#116a70">
                {r.id} · {r.deviceType} · {r.state}
              </text>
            </g>
          ))}
        </g>
        <text x="844" y="45" fontSize="20" fill="#668">
          N ↑
        </text>
      </svg>
      <div className="map-legend">
        <span>
          <i className="dot blue" />
          业务点位
        </span>
        <span>
          <i className="dot amber" />
          待确认目标
        </span>
        <span>
          <i className="dot teal" />
          巡检机器
        </span>
        {rails.length > 0 && <span>轨道区段</span>}
        {chargers.length > 0 && <span>充电桩</span>}
        <span>坐标比例示意</span>
      </div>
    </div>
  );
}
