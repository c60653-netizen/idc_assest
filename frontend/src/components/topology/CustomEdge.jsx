import React, { memo, useMemo } from 'react';
import { EdgeLabelRenderer, getBezierPath } from 'reactflow';

// 线缆类型样式定义
const CABLE_STYLES = {
  ethernet: {
    color: '#1890ff',
    width: 2,
    glow: 'rgba(24, 144, 255, 0.5)'
  },
  fiber: {
    color: '#13c2c2',
    width: 2,
    glow: 'rgba(19, 194, 194, 0.5)',
    doubleLine: true // 光纤双线效果
  },
  copper: {
    color: '#fa8c16',
    width: 3,
    glow: 'rgba(250, 140, 22, 0.5)'
  }
};

// 状态覆盖样式
const STATUS_OVERRIDES = {
  fault: {
    color: '#ff4d4f',
    width: 3,
    dash: '6,3',
    glow: 'rgba(255, 77, 79, 0.6)'
  },
  disconnected: {
    color: '#5c5c5c',
    width: 2,
    dash: '4,4',
    glow: 'none'
  }
};

/**
 * 根据 Handle 方向计算端口标签偏移量
 * @param {string} position - Handle 方向(left/right/top/bottom)
 * @returns {Object} { x, y } 偏移量
 */
function getPortLabelOffset(position) {
  switch (position) {
    case 'right': return { x: 28, y: -10 };
    case 'left': return { x: -28, y: -10 };
    case 'top': return { x: 0, y: -16 };
    case 'bottom': return { x: 0, y: 16 };
    default: return { x: 0, y: 0 };
  }
}

/**
 * 根据 Handle 方向计算箭头偏移量(距离端点的距离)
 * @param {string} position - Handle 方向
 * @returns {Object} { x, y } 偏移量
 */
function getArrowOffset(position) {
  switch (position) {
    case 'right': return { x: 14, y: 0 };
    case 'left': return { x: -14, y: 0 };
    case 'top': return { x: 0, y: -14 };
    case 'bottom': return { x: 0, y: 14 };
    default: return { x: 0, y: 0 };
  }
}

/**
 * 根据 Handle 方向计算箭头旋转角度(指向路径方向)
 * 源端箭头:从源设备指向目标(沿路径方向)
 * 目标端箭头:指向目标设备(沿路径方向)
 * @param {string} position - Handle 方向
 * @param {boolean} isSource - 是否是源端
 * @returns {number} 旋转角度(度)
 */
function getArrowRotation(position, isSource) {
  // 箭头默认指向右(➤),需要旋转到对应方向
  // 源端:箭头从源设备出发,指向路径方向
  // 目标端:箭头指向目标设备,即指向路径终点方向
  switch (position) {
    case 'right': return 0;        // ➤
    case 'bottom': return 90;      // ↓
    case 'left': return 180;       // ⬅
    case 'top': return 270;        // ↑
    default: return 0;
  }
}

/**
 * 自定义拓扑边组件
 * 设计要点:
 * 1. 双端方向箭头:源端和目标端各一个箭头,明确显示数据流向(source → target)
 * 2. 流向动画:实线线缆使用 stroke-dasharray 动画显示数据流动方向
 * 3. 智能端口标签:根据 Handle 方向(top/bottom/left/right)智能定位标签
 * 4. 线缆类型区分:网线(蓝)/光纤(青双线)/铜缆(橙粗线)
 * 5. 状态可视化:故障(红虚线+⚠)/断开(灰虚线无动画)
 * @param {Object} props - 边属性
 * @returns {React.ReactElement} 自定义边
 */
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  // 计算贝塞尔曲线路径
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35
  });

  // 计算最终样式
  const baseStyle = data ? (CABLE_STYLES[data.cableType] || CABLE_STYLES.ethernet) : CABLE_STYLES.ethernet;
  const statusOverride = data ? (STATUS_OVERRIDES[data.status] || {}) : {};
  const finalColor = statusOverride.color || baseStyle.color;
  const finalWidth = selected
    ? (statusOverride.width || baseStyle.width) + 1
    : (statusOverride.width || baseStyle.width);
  const finalDash = statusOverride.dash;
  const finalGlow = statusOverride.glow || baseStyle.glow;
  const isFault = data?.status === 'fault';
  const isDisconnected = data?.status === 'disconnected';
  const isFiber = data?.cableType === 'fiber' && !isFault && !isDisconnected;

  // 端口标签内容
  const sourcePortLabel = data?.sourcePort || '';
  const targetPortLabel = data?.targetPort || '';
  const cableLabel = data?.cableLabel || data?.cableId || '';

  // 计算源端和目标端的箭头位置与旋转
  const sourceArrowOffset = getArrowOffset(sourcePosition);
  const targetArrowOffset = getArrowOffset(targetPosition);
  const sourceArrowPos = { x: sourceX + sourceArrowOffset.x, y: sourceY + sourceArrowOffset.y };
  const targetArrowPos = { x: targetX - targetArrowOffset.x, y: targetY - targetArrowOffset.y };

  // 源端箭头:指向路径方向(从源出发);目标端箭头:指向目标设备
  const sourceArrowRotation = getArrowRotation(sourcePosition, true);
  const targetArrowRotation = getArrowRotation(targetPosition, false);

  // 端口标签位置
  const sourceLabelOffset = getPortLabelOffset(sourcePosition);
  const targetLabelOffset = getPortLabelOffset(targetPosition);
  const sourceLabelPos = { x: sourceX + sourceLabelOffset.x, y: sourceY + sourceLabelOffset.y };
  const targetLabelPos = { x: targetX + targetLabelOffset.x, y: targetY + targetLabelOffset.y };

  // 中点标签位置(线缆信息)
  const midX = labelX;
  const midY = labelY - 14;

  // 流向动画的 stroke-dasharray 配置
  // 故障/断开使用状态定义的 dash,正常线缆无 dash 但有流动动画
  const flowDashArray = finalDash || '6 4';
  const shouldAnimate = !isDisconnected;

  // SVG 箭头标记 ID(唯一,避免冲突)
  const arrowMarkerId = useMemo(() => `arrow-${id}`, [id]);

  // 箭头颜色(选中时高亮)
  const arrowColor = selected ? '#1890ff' : finalColor;

  if (!data) {
    return (
      <>
        <path
          id={id}
          d={edgePath}
          stroke="rgba(0, 0, 0, 0.25)"
          strokeWidth={1.5}
          fill="none"
        />
        <path
          d={edgePath}
          stroke="transparent"
          strokeWidth={20}
          fill="none"
          style={{ pointerEvents: 'stroke' }}
        />
      </>
    );
  }

  return (
    <>
      {/* SVG 定义:箭头标记 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <marker
            id={arrowMarkerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={arrowColor} />
          </marker>
        </defs>
      </svg>

      {/* 选中状态的发光描边(底层) */}
      {selected && (
        <path
          d={edgePath}
          stroke="#1890ff"
          strokeWidth={finalWidth + 4}
          strokeOpacity={0.2}
          fill="none"
          style={{ pointerEvents: 'none', filter: 'blur(2px)' }}
        />
      )}

      {/* 光纤双线效果底层(更粗的半透明线) */}
      {isFiber && (
        <path
          d={edgePath}
          stroke={finalColor}
          strokeWidth={finalWidth + 3}
          strokeOpacity={0.25}
          fill="none"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 主路径 */}
      <path
        id={id}
        d={edgePath}
        stroke={finalColor}
        strokeWidth={finalWidth}
        strokeDasharray={shouldAnimate ? flowDashArray : (finalDash || undefined)}
        fill="none"
        style={{
          filter: finalGlow !== 'none' ? `drop-shadow(0 0 3px ${finalGlow})` : 'none',
          transition: 'stroke-width 0.2s ease'
        }}
        className={shouldAnimate ? 'topo-edge-flowing' : ''}
      />

      {/* 透明加粗热区(扩大点击范围,提升点击灵敏度) */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        style={{ pointerEvents: 'stroke' }}
      />

      <EdgeLabelRenderer>
        {/* 源端方向箭头(指向数据流向) */}
        {!isDisconnected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceArrowPos.x}px, ${sourceArrowPos.y}px) rotate(${sourceArrowRotation}deg)`,
              pointerEvents: 'none',
              zIndex: 9,
              width: 0,
              height: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}>
              <path
                d="M 2 2 L 12 7 L 2 12 z"
                fill={arrowColor}
                style={{ filter: `drop-shadow(0 0 2px ${finalGlow})` }}
              />
            </svg>
          </div>
        )}

        {/* 目标端方向箭头(指向目标设备) */}
        {!isDisconnected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetArrowPos.x}px, ${targetArrowPos.y}px) rotate(${targetArrowRotation}deg)`,
              pointerEvents: 'none',
              zIndex: 9,
              width: 0,
              height: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}>
              <path
                d="M 2 2 L 12 7 L 2 12 z"
                fill={arrowColor}
                style={{ filter: `drop-shadow(0 0 2px ${finalGlow})` }}
              />
            </svg>
          </div>
        )}

        {/* 源端口标签 */}
        {sourcePortLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceLabelPos.x}px, ${sourceLabelPos.y}px)`,
              background: '#fff',
              border: `1px solid ${finalColor}66`,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 9,
              color: finalColor,
              fontFamily: 'monospace',
              fontWeight: 600,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              zIndex: 10
            }}
            className="topo-port-label"
          >
            {sourcePortLabel}
          </div>
        )}

        {/* 目标端口标签 */}
        {targetPortLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetLabelPos.x}px, ${targetLabelPos.y}px)`,
              background: '#fff',
              border: `1px solid ${finalColor}66`,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 9,
              color: finalColor,
              fontFamily: 'monospace',
              fontWeight: 600,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              zIndex: 10
            }}
            className="topo-port-label"
          >
            {targetPortLabel}
          </div>
        )}

        {/* 中点线缆标签(仅选中或故障时显示,避免拥挤) */}
        {(selected || isFault) && cableLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
              background: isFault ? '#fff2f0' : '#f0f5ff',
              border: `1px solid ${isFault ? '#ff4d4f' : '#1890ff'}66`,
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 10,
              color: isFault ? '#ff4d4f' : '#1890ff',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 11,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}
          >
            {isFault && <span style={{ marginRight: 4 }}>⚠</span>}
            {cableLabel}
            {data.cableLength && <span style={{ marginLeft: 6, opacity: 0.65 }}>{data.cableLength}m</span>}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(CustomEdge);
