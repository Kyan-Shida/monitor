/**
 * @file Charts.tsx
 * @description 驾驶舱图表：甜甜圈（多值占比）与环形进度（单值百分比），纯 SVG 实现，无第三方依赖
 * @interaction 被 pages/MonitorCockpit.tsx 消费
 */

/** 图表数据项 */
export interface Slice {
  label: string;
  value: number;
  color: string;
}

/**
 * 甜甜圈图：按数值占比分段绘制，中心可显示总数
 * @param data 分段数据
 * @param size 画布边长（px）
 * @param thickness 圆环粗细（px）
 * @param center 中心文字；不传则不显示
 */
export function Donut({
  data,
  size = 136,
  thickness = 20,
  center,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  center?: string;
}) {
  const total = data.reduce((a, x) => a + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="占比环形图"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(127,180,215,.26)"
        strokeWidth={thickness}
      />
      {total > 0 &&
        data.map((x) => {
          const len = (x.value / total) * c;
          const node = (
            <circle
              key={x.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={x.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return node;
        })}
      {center && (
        <text
          x={size / 2}
          y={size / 2 + 6}
          textAnchor="middle"
          fontSize="18"
          fill="#dff2ff"
        >
          {center}
        </text>
      )}
    </svg>
  );
}

/**
 * 环形进度：单值百分比 + 中心百分比文字
 * @param value 百分比（0-100）
 * @param label 环下标签
 * @param size 画布边长（px）
 * @param thickness 圆环粗细（px）
 * @param tone 进度色
 */
export function Ring({
  value,
  label,
  size = 58,
  thickness = 6,
  tone = "#35d0e0",
}: {
  value: number;
  label: string;
  size?: number;
  thickness?: number;
  tone?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const on = (v / 100) * c;
  return (
    <div className="ring">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label} ${v}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(127,180,215,.3)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${on} ${c - on}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize="12"
          fill="#dff2ff"
        >
          {v}%
        </text>
      </svg>
      <small>{label}</small>
    </div>
  );
}
