import React from 'react';
import { Tooltip } from 'antd';

// 设备类型对应的主色(用于顶部色带、边框高亮)
const TYPE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  firewall: '#eb595a',
  default: '#8c8c8c'
};

// 状态对应的小圆点颜色
const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#8c8c8c',
  fault: '#ff4d4f',
  warning: '#faad14'
};

/**
 * 玻璃拟态节点容器
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {number} props.width - 节点宽度(默认 200)
 * @param {number} props.height - 节点高度(默认 100)
 * @param {string} props.type - 设备类型(用于取色)
 * @param {React.ReactNode} props.children - 节点正文内容
 * @param {boolean} props.showPortBar - 是否显示端口使用率条
 * @returns {React.ReactElement} 玻璃拟态节点外壳
 */
function GlassNodeShell({
  data,
  width = 200,
  height = 100,
  type = 'default',
  children,
  showPortBar = false
}) {
  if (!data) {
    return (
      <div
        style={{
          width,
          height,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)'
        }}
      >
        无数据
      </div>
    );
  }

  const nodeColor = TYPE_COLORS[type] || TYPE_COLORS.default;
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.offline;
  const isCenter = data.isCenter;
  const isSelected = data.selected;

  const portCount = data.portCount || { total: 0, used: 0 };
  const portPercent = portCount.total > 0 ? Math.min(100, (portCount.used / portCount.total) * 100) : 0;

  // 选中/中心节点的发光强度
  const glowStrength = isSelected ? 0.55 : isCenter ? 0.4 : 0.18;
  const borderWidth = isSelected || isCenter ? 1.5 : 1;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `${borderWidth}px solid ${
          isSelected || isCenter ? nodeColor : 'rgba(255,255,255,0.12)'
        }`,
        borderRadius: 14,
        overflow: 'hidden',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.3),
                    0 0 24px ${nodeColor}${Math.round(glowStrength * 255).toString(16).padStart(2, '0')},
                    inset 0 1px 0 rgba(255,255,255,0.1)`
      }}
    >
      {/* 顶部色带:设备类型识别 */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${nodeColor}, ${nodeColor}88)`,
          boxShadow: `0 0 8px ${nodeColor}`
        }}
      />

      {/* 正文区 */}
      <div style={{ flex: 1, position: 'relative', height: height - 3 }}>{children}</div>

      {/* 底部信息条 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        <Tooltip title={data.name || ''} placement="bottomLeft">
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              letterSpacing: 0.2
            }}
          >
            {data.name || '未命名'}
          </div>
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {showPortBar && portCount.total > 0 && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
              {portCount.used}/{portCount.total}
            </span>
          )}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusColor}`
            }}
          />
          {isCenter && (
            <span
              style={{
                fontSize: 9,
                color: '#faad14',
                fontWeight: 700,
                textShadow: '0 0 4px rgba(250,173,20,0.6)'
              }}
            >
              ★
            </span>
          )}
        </div>
      </div>

      {/* 端口使用率进度条(可选,贴在底部信息条上方) */}
      {showPortBar && portCount.total > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 10,
            right: 10,
            height: 2,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${portPercent}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${nodeColor}, ${nodeColor}cc)`,
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default GlassNodeShell;
export { TYPE_COLORS, STATUS_COLORS };
