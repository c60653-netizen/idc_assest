import React from 'react';
import { Tooltip } from 'antd';
import { getDeviceIcon } from './DeviceIcon';

/**
 * 节点外壳 - 支持紧凑/详细双模式
 * 设计参考:Zabbix 状态色环 + NetBox 角色图标 + SolarWinds 卡片指标
 *
 * 紧凑模式(compact):96x96,图标 + 名称 + IP + 状态色环
 * 详细模式(detail):180x140,色带 + 图标 + 型号 + IP + 迷你指标 + 告警角标
 */

// 设备类型主色(对齐 3D 规范第四节配色表)
export const TYPE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  firewall: '#eb595a',
  default: '#8c8c8c'
};

// 状态色
export const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#bfbfbf',
  fault: '#ff4d4f',
  warning: '#faad14',
  maintenance: '#fa8c16'
};

// 设备类型中文标签
const TYPE_LABELS = {
  switch: '交换机',
  router: '路由器',
  server: '服务器',
  storage: '存储',
  firewall: '防火墙',
  default: '设备'
};

// 紧凑模式尺寸
const COMPACT_SIZE = { width: 96, height: 96 };

// 详细模式尺寸(紧凑,容纳色带+主体+指标条)
const DETAIL_SIZE = { width: 180, height: 140 };

/**
 * 获取节点尺寸
 * @param {string} mode - 显示模式
 * @returns {{width:number, height:number}} 尺寸
 */
export function getNodeSize(mode = 'compact') {
  return mode === 'detail' ? DETAIL_SIZE : COMPACT_SIZE;
}

/**
 * 渲染状态色环(紧凑模式)
 * @param {string} status - 设备状态
 * @param {string} nodeColor - 设备主色
 * @param {boolean} selected - 是否选中
 * @returns {React.ReactElement} 色环
 */
function StatusRing({ status, nodeColor, selected }) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.offline;
  return (
    <div
      style={{
        position: 'absolute',
        inset: -3,
        borderRadius: 14,
        border: `2px solid ${statusColor}`,
        boxShadow: selected
          ? `0 0 0 3px ${nodeColor}33, 0 0 12px ${nodeColor}66`
          : `0 0 6px ${statusColor}55`,
        pointerEvents: 'none',
        transition: 'all 0.2s ease'
      }}
    />
  );
}

/**
 * 告警数字角标
 * @param {number} count - 告警数
 * @returns {React.ReactElement|null} 角标
 */
function AlertBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: -6,
        right: -6,
        background: '#ff4d4f',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(255,77,79,0.4)',
        border: '2px solid #fff',
        zIndex: 12
      }}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}

/**
 * 迷你指标条(详细模式)
 * @param {Object} props - 组件属性
 * @param {string} props.label - 指标名
 * @param {number} props.value - 数值(0-100)
 * @param {string} props.displayValue - 显示文本
 * @param {string} props.color - 主题色
 * @returns {React.ReactElement} 指标条
 */
function MetricBar({ label, value, displayValue, color }) {
  const percent = Math.min(100, Math.max(0, value));
  const isWarn = percent >= 70;
  const isDanger = percent >= 85;
  const barColor = isDanger ? '#ff4d4f' : isWarn ? '#faad14' : color;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ color: 'rgba(0,0,0,0.5)', fontSize: 9, width: 22 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 3,
          background: '#f0f0f0',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            borderRadius: 2,
            transition: 'width 0.4s ease'
          }}
        />
      </div>
      <span
        style={{
          color: 'rgba(0,0,0,0.85)',
          fontSize: 9,
          fontWeight: 600,
          minWidth: 26,
          textAlign: 'right'
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}

/**
 * 紧凑模式渲染(80x96)
 * 适合全局拓扑大屏,单屏可承载 100+ 节点
 * @param {Object} props - 组件属性
 * @returns {React.ReactElement} 紧凑节点
 */
function CompactNode({ data, nodeColor, typeLabel, IconComponent, selected }) {
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.offline;
  const alertCount = data.alertCount || 0;

  return (
    <div
      style={{
        position: 'relative',
        width: COMPACT_SIZE.width,
        height: COMPACT_SIZE.height
      }}
    >
      <AlertBadge count={alertCount} />
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          borderRadius: 12,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          border: `1px solid ${selected ? nodeColor : '#f0f0f0'}`,
          boxShadow: selected
            ? `0 4px 12px ${nodeColor}33`
            : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          cursor: 'pointer'
        }}
      >
        <StatusRing status={data.status} nodeColor={nodeColor} selected={selected} />

        {/* 图标区 */}
        <div
          style={{
            width: 44,
            height: 44,
            background: `${nodeColor}0a`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4
          }}
        >
          <IconComponent color={nodeColor} size={36} />
        </div>

        {/* 设备名 */}
        <Tooltip title={data.name || '未命名'} placement="bottom">
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(0,0,0,0.85)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              textAlign: 'center',
              lineHeight: 1.3
            }}
          >
            {data.name || '未命名'}
          </div>
        </Tooltip>

        {/* IP 或类型标签 */}
        <div
          style={{
            fontSize: 9,
            color: 'rgba(0,0,0,0.45)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
            textAlign: 'center'
          }}
        >
          {data.ipAddress || typeLabel}
        </div>

        {/* 中心节点标识 */}
        {data.isCenter && (
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              right: 6,
              fontSize: 9,
              color: '#faad14',
              fontWeight: 700
            }}
          >
            ★
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 详细模式渲染(180x140)
 * 适合机柜级下钻、故障排查
 * @param {Object} props - 组件属性
 * @returns {React.ReactElement} 详细节点
 */
function DetailNode({ data, nodeColor, typeLabel, IconComponent, selected }) {
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.offline;
  const alertCount = data.alertCount || 0;

  // 端口使用率
  const portCount = data.portCount || { total: 0, used: 0 };
  const portPercent = portCount.total > 0 ? (portCount.used / portCount.total) * 100 : 0;

  // 模拟指标(实际可从 data.metrics 获取)
  const cpuPercent = data.metrics?.cpu ?? 0;
  const memPercent = data.metrics?.mem ?? 0;

  return (
    <div
      style={{
        position: 'relative',
        width: DETAIL_SIZE.width,
        height: DETAIL_SIZE.height
      }}
    >
      <AlertBadge count={alertCount} />
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          border: `1px solid ${selected ? nodeColor : '#f0f0f0'}`,
          boxShadow: selected
            ? `0 4px 12px ${nodeColor}33`
            : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 顶部色带 + 名称 */}
        <div
          style={{
            background: `linear-gradient(90deg, ${nodeColor}, ${nodeColor}cc)`,
            color: '#fff',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 600
          }}
        >
          <Tooltip title={data.name || ''}>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 120
              }}
            >
              {data.name || '未命名'}
            </span>
          </Tooltip>
          <span
            style={{
              fontSize: 8,
              background: 'rgba(255,255,255,0.25)',
              padding: '0 5px',
              borderRadius: 6,
              flexShrink: 0
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* 主体:图标 + 信息 */}
        <div
          style={{
            flex: 1,
            padding: '5px 8px',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            minHeight: 0
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: `${nodeColor}0a`,
              borderRadius: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <IconComponent color={nodeColor} size={26} />
            {/* 状态点 */}
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
                border: '1.5px solid #fff',
                boxShadow: `0 0 3px ${statusColor}`
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 9,
                color: 'rgba(0,0,0,0.85)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {data.model || '—'}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'rgba(0,0,0,0.5)',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 1
              }}
            >
              {data.ipAddress || '—'}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>
              {data.deviceHeight ? `${data.deviceHeight}U · ` : ''}
              {data.location || data.rackName || ''}
              {data.isCenter && <span style={{ color: '#faad14', marginLeft: 3 }}>★</span>}
            </div>
          </div>
        </div>

        {/* 底部指标条 */}
        <div
          style={{
            padding: '3px 8px 5px',
            borderTop: '1px dashed #f0f0f0',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2px 8px'
          }}
        >
          <MetricBar
            label="CPU"
            value={cpuPercent}
            displayValue={cpuPercent > 0 ? `${cpuPercent}%` : '—'}
            color={nodeColor}
          />
          <MetricBar
            label="MEM"
            value={memPercent}
            displayValue={memPercent > 0 ? `${memPercent}%` : '—'}
            color={nodeColor}
          />
          <MetricBar
            label="PORT"
            value={portPercent}
            displayValue={portCount.total > 0 ? `${portCount.used}/${portCount.total}` : '—'}
            color={nodeColor}
          />
          <MetricBar
            label="NET"
            value={data.metrics?.net ?? 0}
            displayValue={data.metrics?.net != null ? `${data.metrics.net}%` : '—'}
            color={nodeColor}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 节点外壳主组件
 * 根据 mode 渲染紧凑或详细模式
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.type - 设备类型
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 节点外壳
 */
function NodeShell({ data, type = 'default', mode = 'compact' }) {
  if (!data) {
    return (
      <div
        style={{
          width: 96,
          height: 96,
          background: '#fff',
          borderRadius: 12,
          border: '1px dashed #d9d9d9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.35)',
          fontSize: 11
        }}
      >
        无数据
      </div>
    );
  }

  const nodeColor = TYPE_COLORS[type] || TYPE_COLORS.default;
  const typeLabel = TYPE_LABELS[type] || TYPE_LABELS.default;
  const IconComponent = getDeviceIcon(type);
  const selected = !!data.selected;

  return mode === 'detail' ? (
    <DetailNode
      data={data}
      nodeColor={nodeColor}
      typeLabel={typeLabel}
      IconComponent={IconComponent}
      selected={selected}
    />
  ) : (
    <CompactNode
      data={data}
      nodeColor={nodeColor}
      typeLabel={typeLabel}
      IconComponent={IconComponent}
      selected={selected}
    />
  );
}

export default NodeShell;
