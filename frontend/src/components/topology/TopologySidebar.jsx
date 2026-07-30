import React from 'react';
import { Drawer, Descriptions, Tag, Badge, Row, Col, Progress, Space, Typography, Empty } from 'antd';
import {
  CloudServerOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  SwapOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const DEVICE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  firewall: '#eb595a',
  default: '#8c8c8c'
};

const DEVICE_ICONS = {
  switch: AppstoreOutlined,
  router: SwapOutlined,
  server: CloudServerOutlined,
  storage: DatabaseOutlined,
  firewall: CloudServerOutlined,
  default: CloudServerOutlined
};

const DEVICE_TYPE_LABELS = {
  switch: '交换机',
  router: '路由器',
  server: '服务器',
  storage: '存储',
  firewall: '防火墙',
  other: '其他设备'
};

// 设备状态映射(对齐 Device 模型 status 字段)
const DEVICE_STATUS_MAP = {
  online: { label: '在线', color: '#52c41a', badge: 'success' },
  offline: { label: '离线', color: 'rgba(0, 0, 0, 0.45)', badge: 'default' },
  fault: { label: '故障', color: '#ff4d4f', badge: 'error' },
  maintenance: { label: '维护中', color: '#faad14', badge: 'warning' }
};

const CABLE_COLORS = {
  ethernet: '#1890ff',
  fiber: '#13c2c2',
  copper: '#fa8c16'
};

const CABLE_TYPE_LABELS = {
  ethernet: '网线',
  fiber: '光纤',
  copper: '铜缆'
};

const CABLE_STATUS_MAP = {
  normal: { label: '正常', color: '#52c41a', badge: 'success' },
  fault: { label: '故障', color: '#ff4d4f', badge: 'error' },
  disconnected: { label: '未连接', color: 'rgba(0, 0, 0, 0.45)', badge: 'default' }
};

/**
 * 格式化日期展示(支持字符串/Date/null)
 * @param {string|Date|null} date - 日期
 * @returns {string} 格式化后的日期或 '-'
 */
function formatDate(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('zh-CN');
  } catch {
    return '-';
  }
}

/**
 * 格式化日期时间展示
 * @param {string|Date|null} date - 日期时间
 * @returns {string} 格式化后的日期时间或 '-'
 */
function formatDateTime(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('zh-CN');
  } catch {
    return '-';
  }
}

// 浅色卡片样式
const CARD_STYLE = {
  background: '#fff',
  border: '1px solid #f0f0f0',
  borderRadius: 12,
  marginBottom: 14,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
};

// Drawer 内容容器浅色背景
const DRAWER_CONTENT_STYLE = {
  background: '#fafafa',
  minHeight: '100%',
  padding: 16
};

// Descriptions item 标签样式
const LABEL_STYLE = { color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 };
const VALUE_STYLE = { color: 'rgba(0, 0, 0, 0.85)', fontSize: 13 };

// 卡片头部样式(统一)
const CARD_HEADER_STYLE = {
  padding: '10px 14px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(0, 0, 0, 0.85)'
};

// 代码/ID 类字段展示样式(统一)
const CODE_STYLE = {
  background: '#f0f5ff',
  border: '1px solid #adc6ff',
  borderRadius: 4,
  padding: '1px 6px',
  color: '#1890ff',
  fontSize: 12,
  fontFamily: 'monospace'
};

// 端口标签展示样式(用于连接详情中的端口标记)
const PORT_TAG_STYLE = {
  margin: 0,
  marginTop: 4,
  borderRadius: 4,
  fontSize: 11,
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  color: 'rgba(0, 0, 0, 0.85)',
  fontFamily: 'monospace'
};

/**
 * 拓扑图右侧详情抽屉(浅色主题)
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 是否显示
 * @param {Function} props.onClose - 关闭回调
 * @param {Object} props.selectedNode - 选中的节点
 * @param {Object} props.selectedEdge - 选中的边
 * @param {Object} props.data - 拓扑数据
 * @returns {React.ReactElement} 详情抽屉
 */
function TopologySidebar({ visible, onClose, selectedNode, selectedEdge, data }) {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  /**
   * 渲染设备详情
   * @returns {React.ReactElement} 设备详情内容
   */
  const renderDeviceDetail = () => {
    if (!selectedNode) return null;

    const IconComponent = DEVICE_ICONS[selectedNode.type] || DEVICE_ICONS.default;
    const nodeColor = DEVICE_COLORS[selectedNode.type] || DEVICE_COLORS.default;
    const typeLabel = DEVICE_TYPE_LABELS[selectedNode.type] || '其他设备';
    const statusInfo = DEVICE_STATUS_MAP[selectedNode.status] || DEVICE_STATUS_MAP.offline;
    const portCount = selectedNode.portCount || {};
    const usedPercent = portCount.total > 0 ? Math.round((portCount.used / portCount.total) * 100) : 0;

    // U位展示:支持数字(如 10)和区间(如 "10-13")
    const uPosition = selectedNode.uPosition;
    const uHeight = selectedNode.deviceHeight;
    const uPositionText = uPosition
      ? (uHeight > 1 ? `U${uPosition} - U${uPosition + uHeight - 1} (${uHeight}U)` : `U${uPosition}`)
      : '-';

    return (
      <div>
        {/* 设备头部卡片 */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: `linear-gradient(135deg, ${nodeColor}15 0%, ${nodeColor}05 100%), #fff`,
            border: `1px solid ${nodeColor}33`,
            borderRadius: 14,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${nodeColor}, ${nodeColor}aa)`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: `0 4px 12px ${nodeColor}55`
            }}
          >
            <IconComponent style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0, 0, 0, 0.88)', marginBottom: 4 }}>
            {selectedNode.name || '-'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>
            {selectedNode.deviceId || '-'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Tag
              style={{
                borderRadius: 6,
                margin: 0,
                background: `${nodeColor}10`,
                border: `1px solid ${nodeColor}55`,
                color: nodeColor
              }}
            >
              {typeLabel}
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                margin: 0,
                background: `${statusInfo.color}10`,
                border: `1px solid ${statusInfo.color}55`,
                color: statusInfo.color
              }}
            >
              {statusInfo.label}
            </Tag>
            {selectedNode.isCenter && (
              <Tag
                style={{
                  borderRadius: 6,
                  margin: 0,
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  color: '#faad14'
                }}
              >
                ★ 拓扑中心
              </Tag>
            )}
          </div>
        </div>

        {/* 设备基础信息 */}
        <div style={CARD_STYLE}>
          <div style={CARD_HEADER_STYLE}>基础信息</div>
          <div style={{ padding: '8px 14px' }}>
            <Descriptions column={1} size="small" labelStyle={LABEL_STYLE} contentStyle={VALUE_STYLE}>
              <Descriptions.Item label="设备型号">
                {selectedNode.model || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="序列号">
                <code style={CODE_STYLE}>
                  {selectedNode.serialNumber || '-'}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">
                <code style={CODE_STYLE}>
                  {selectedNode.ipAddress || '-'}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="所属机房">
                {selectedNode.roomName
                  ? `${selectedNode.roomName}${selectedNode.roomLocation ? ` (${selectedNode.roomLocation})` : ''}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="所属机柜">
                {selectedNode.rackName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="U位">
                {uPositionText}
              </Descriptions.Item>
              <Descriptions.Item label="U高度">
                {uHeight ? `${uHeight}U` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="功耗">
                {selectedNode.powerConsumption ? `${selectedNode.powerConsumption}W` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={statusInfo.badge}
                  text={<span style={{ color: statusInfo.color }}>{statusInfo.label}</span>}
                />
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>

        {/* 端口统计 */}
        {portCount.total > 0 && (
          <div style={CARD_STYLE}>
            <div style={CARD_HEADER_STYLE}>端口统计</div>
            <div style={{ padding: 14 }}>
              <Progress
                percent={usedPercent}
                strokeColor={{ from: nodeColor, to: `${nodeColor}aa` }}
                trailColor="#f0f0f0"
                size="small"
                format={(percent) => (
                  <span style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.65)' }}>
                    {portCount.used}/{portCount.total} 已用 ({percent}%)
                  </span>
                )}
              />
              <Row gutter={[8, 12]} style={{ marginTop: 12 }}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>总数</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(0, 0, 0, 0.85)' }}>{portCount.total || 0}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>已用</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}>{portCount.used || 0}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>空闲</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{portCount.free || 0}</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>故障</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: portCount.fault > 0 ? '#ff4d4f' : 'rgba(0, 0, 0, 0.25)' }}>{portCount.fault || 0}</div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* 其他扩展信息(仅在有数据时显示) */}
        {(selectedNode.purchaseDate || selectedNode.warrantyExpiry || selectedNode.description) && (
          <div style={CARD_STYLE}>
            <div style={CARD_HEADER_STYLE}>其他信息</div>
            <div style={{ padding: '8px 14px' }}>
              <Descriptions column={1} size="small" labelStyle={LABEL_STYLE} contentStyle={VALUE_STYLE}>
                <Descriptions.Item label="采购日期">
                  {formatDate(selectedNode.purchaseDate)}
                </Descriptions.Item>
                <Descriptions.Item label="保修到期">
                  {formatDate(selectedNode.warrantyExpiry)}
                </Descriptions.Item>
                {selectedNode.description && (
                  <Descriptions.Item label="描述">
                    <span style={{ color: 'rgba(0, 0, 0, 0.65)', fontSize: 12 }}>
                      {selectedNode.description}
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染连接详情
   * @returns {React.ReactElement} 连接详情内容
   */
  const renderEdgeDetail = () => {
    if (!selectedEdge) return null;

    const centerDevice = data?.centerDevice;
    const sourceDevice = selectedEdge.source === centerDevice?.deviceId
      ? centerDevice
      : data?.nodes?.find(n => n.id === selectedEdge.source);
    const targetDevice = selectedEdge.target === centerDevice?.deviceId
      ? centerDevice
      : data?.nodes?.find(n => n.id === selectedEdge.target);
    const cableColor = CABLE_COLORS[selectedEdge.cableType] || '#8c8c8c';
    const cableTypeLabel = CABLE_TYPE_LABELS[selectedEdge.cableType] || selectedEdge.cableType || '-';
    const cableStatus = CABLE_STATUS_MAP[selectedEdge.status] || CABLE_STATUS_MAP.disconnected;

    return (
      <div>
        {/* 连接头部卡片 */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: `linear-gradient(135deg, ${cableColor}15 0%, ${cableColor}05 100%), #fff`,
            border: `1px solid ${cableColor}33`,
            borderRadius: 14,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${cableColor}, ${cableColor}aa)`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: `0 4px 12px ${cableColor}55`
            }}
          >
            <SwapOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0, 0, 0, 0.88)', marginBottom: 4 }}>
            {cableTypeLabel}连接
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>
            {selectedEdge.cableId || '-'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Tag
              style={{
                borderRadius: 6,
                margin: 0,
                background: `${cableColor}10`,
                border: `1px solid ${cableColor}55`,
                color: cableColor
              }}
            >
              {cableTypeLabel}
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                margin: 0,
                background: `${cableStatus.color}10`,
                border: `1px solid ${cableStatus.color}55`,
                color: cableStatus.color
              }}
            >
              {cableStatus.label}
            </Tag>
          </div>
        </div>

        {/* 连接两端设备 */}
        <div style={CARD_STYLE}>
          <div style={CARD_HEADER_STYLE}>连接两端</div>
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 源设备 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#1890ff',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.85)', fontWeight: 500 }}>
                    {sourceDevice?.name || '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
                    {sourceDevice?.deviceId || '-'}
                  </div>
                </div>
                <Tag style={PORT_TAG_STYLE}>
                  {selectedEdge.sourcePort || '-'}
                </Tag>
              </div>

              {/* 连线指示 */}
              <div style={{ marginLeft: 3, height: 20, borderLeft: '2px dashed #d9d9d9' }} />

              {/* 目标设备 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#722ed1',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.85)', fontWeight: 500 }}>
                    {targetDevice?.name || '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
                    {targetDevice?.deviceId || '-'}
                  </div>
                </div>
                <Tag style={PORT_TAG_STYLE}>
                  {selectedEdge.targetPort || '-'}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        {/* 线缆信息 */}
        <div style={CARD_STYLE}>
          <div style={CARD_HEADER_STYLE}>线缆信息</div>
          <div style={{ padding: '8px 14px' }}>
            <Descriptions column={1} size="small" labelStyle={LABEL_STYLE} contentStyle={VALUE_STYLE}>
              <Descriptions.Item label="线缆ID">
                <code style={CODE_STYLE}>
                  {selectedEdge.cableId || '-'}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="线缆类型">
                {cableTypeLabel}
              </Descriptions.Item>
              <Descriptions.Item label="线缆长度">
                {selectedEdge.cableLength ? `${selectedEdge.cableLength}m` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="线缆标签">
                {selectedEdge.cableLabel || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="安装时间">
                {formatDateTime(selectedEdge.installedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={cableStatus.badge}
                  text={<span style={{ color: cableStatus.color }}>{cableStatus.label}</span>}
                />
              </Descriptions.Item>
              {selectedEdge.description && (
                <Descriptions.Item label="描述">
                  <span style={{ color: 'rgba(0, 0, 0, 0.65)', fontSize: 12 }}>
                    {selectedEdge.description}
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Drawer
      width={380}
      placement="right"
      open={visible}
      onClose={onClose}
      title={
        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0, 0, 0, 0.88)' }}>
          {selectedNode ? '设备详情' : '连接详情'}
        </span>
      }
      styles={{
        body: { padding: 0, background: '#fafafa' },
        header: { padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }
      }}
      rootClassName="topo-light-drawer"
    >
      <div style={DRAWER_CONTENT_STYLE}>
        {selectedNode ? renderDeviceDetail() : renderEdgeDetail()}
      </div>
    </Drawer>
  );
}

export default TopologySidebar;
