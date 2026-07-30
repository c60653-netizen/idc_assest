import React, { useMemo, useCallback, useState } from 'react';
import { Select, Space, Button, Row, Col, Tag, Typography, Cascader } from 'antd';
import {
  ReloadOutlined,
  AppstoreOutlined,
  SearchOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option, OptGroup } = Select;

// 区块标题样式(浅色,内联)
const SECTION_TITLE_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(0, 0, 0, 0.45)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: 8
};

// 统计卡片样式(浅色,弱边界)
const STAT_CARD_STYLE = {
  background: '#fafafa',
  borderRadius: 8,
  padding: '8px 10px',
  border: '1px solid #f0f0f0'
};

/**
 * 状态分组配置(在线优先,故障次之,离线最后)
 */
const STATUS_GROUPS = [
  { key: 'online', label: '在线', color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
  { key: 'fault', label: '故障', color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7' },
  { key: 'offline', label: '离线', color: '#8c8c8c', bg: '#fafafa', border: '#f0f0f0' },
  { key: 'other', label: '其他', color: '#faad14', bg: '#fffbe6', border: '#ffe58f' }
];

/**
 * 根据设备状态返回分组 key
 * @param {Object} device - 设备对象
 * @returns {string} 分组 key
 */
function getDeviceStatusGroup(device) {
  const status = (device.status || '').toLowerCase();
  if (['online', 'running', 'active', 'normal', 'in-use'].includes(status)) return 'online';
  if (['fault', 'error', 'broken', 'warning'].includes(status)) return 'fault';
  if (['offline', 'down', 'stopped', 'inactive'].includes(status)) return 'offline';
  return 'other';
}

/**
 * 拓扑图左侧控制面板(浅色主题,扁平化融入左侧面板)
 * @param {Object} props - 组件属性
 * @param {Array} props.switchDevices - 交换机列表
 * @param {string} props.selectedSwitchId - 当前选中的交换机 ID
 * @param {Function} props.onSwitchChange - 切换交换机回调
 * @param {boolean} props.loading - 加载中状态
 * @param {Function} props.onRefresh - 刷新回调
 * @param {Object} props.statistics - 统计数据
 * @returns {React.ReactElement} 控制面板
 */
function TopologyControls({
  switchDevices,
  selectedSwitchId,
  onSwitchChange,
  loading,
  onRefresh,
  statistics
}) {
  // 机房/机柜筛选状态
  const [locationFilter, setLocationFilter] = useState(null);

  // 构建机房→机柜级联数据
  const locationOptions = useMemo(() => {
    const roomMap = {};
    (switchDevices || []).forEach(device => {
      const room = device.Rack?.Room;
      const rack = device.Rack;
      if (!room && !rack) return;
      const roomName = room?.name || '未分配机房';
      const roomId = room?.id || 'no-room';
      const rackName = rack?.name || '未分配机柜';
      const rackId = rack?.id || 'no-rack';
      if (!roomMap[roomId]) {
        roomMap[roomId] = { name: roomName, racks: {} };
      }
      if (!roomMap[roomId].racks[rackId]) {
        roomMap[roomId].racks[rackId] = { name: rackName, count: 0 };
      }
      roomMap[roomId].racks[rackId].count++;
    });
    return Object.entries(roomMap).map(([roomId, roomData]) => ({
      value: roomId,
      label: `${roomData.name} (${Object.values(roomData.racks).reduce((s, r) => s + r.count, 0)})`,
      children: Object.entries(roomData.racks).map(([rackId, rackData]) => ({
        value: rackId,
        label: `${rackData.name} (${rackData.count})`
      }))
    }));
  }, [switchDevices]);

  // 按机房/机柜筛选后的设备
  const filteredDevices = useMemo(() => {
    if (!locationFilter || locationFilter.length === 0) return switchDevices || [];
    const [roomId, rackId] = locationFilter;
    return (switchDevices || []).filter(device => {
      const deviceRoomId = device.Rack?.Room?.id || 'no-room';
      if (roomId && deviceRoomId !== roomId) return false;
      if (rackId) {
        const deviceRackId = device.Rack?.id || 'no-rack';
        if (deviceRackId !== rackId) return false;
      }
      return true;
    });
  }, [switchDevices, locationFilter]);

  // 按状态分组(基于筛选后的设备)
  const groupedDevices = useMemo(() => {
    const groups = {};
    STATUS_GROUPS.forEach(g => { groups[g.key] = []; });
    filteredDevices.forEach(device => {
      const groupKey = getDeviceStatusGroup(device);
      groups[groupKey].push(device);
    });
    return groups;
  }, [filteredDevices]);

  // 多字段搜索:支持按名称、IP、设备ID、型号搜索
  const filterOption = useCallback((input, option) => {
    if (!input) return true;
    const keyword = input.toLowerCase();
    const device = option?.device;
    if (!device) return false;
    const name = (device.name || '').toLowerCase();
    const ip = (device.ipAddress || '').toLowerCase();
    const deviceId = (device.deviceId || '').toLowerCase();
    const model = (device.model || '').toLowerCase();
    return name.includes(keyword) || ip.includes(keyword) || deviceId.includes(keyword) || model.includes(keyword);
  }, []);

  // 机房/机柜级联筛选变化处理
  const handleLocationChange = useCallback((value) => {
    setLocationFilter(value || null);
    // 筛选后如果当前选中的设备不在筛选结果中,清空选择
    if (value && selectedSwitchId) {
      const stillInFilter = filteredDevices.some(d => d.deviceId === selectedSwitchId);
      if (!stillInFilter) {
        onSwitchChange(null);
      }
    }
  }, [selectedSwitchId, filteredDevices, onSwitchChange]);

  return (
    <div>
      {/* 区块标题 */}
      <div style={SECTION_TITLE_STYLE}>
        <Space size={6}>
          <AppstoreOutlined style={{ fontSize: 12, color: '#1890ff' }} />
          <span>选择交换机</span>
          <Text style={{ fontSize: 10, color: 'rgba(0, 0, 0, 0.35)', fontWeight: 400 }}>
            ({filteredDevices.length}{filteredDevices.length !== (switchDevices?.length || 0) ? `/${switchDevices?.length || 0}` : ''} 台)
          </Text>
        </Space>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
          size="small"
          style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 11 }}
        />
      </div>

      {/* 机房/机柜级联筛选 */}
      {locationOptions.length > 0 && (
        <Cascader
          placeholder="按机房 / 机柜筛选"
          value={locationFilter || undefined}
          onChange={handleLocationChange}
          options={locationOptions}
          changeOnSelect
          allowClear
          size="small"
          style={{ width: '100%', marginBottom: 8 }}
          suffixIcon={<EnvironmentOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
          popupClassName="topo-light-dropdown"
        />
      )}

      {/* 交换机选择器(按状态分组 + 多字段搜索) */}
      <Select
        placeholder="搜索名称 / IP / 设备ID / 型号..."
        value={selectedSwitchId || undefined}
        onChange={onSwitchChange}
        style={{ width: '100%' }}
        allowClear
        showSearch
        popupClassName="topo-light-dropdown"
        filterOption={filterOption}
        optionLabelProp="label"
        suffixIcon={<SearchOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
        dropdownStyle={{ minWidth: 280 }}
        notFoundContent={locationFilter ? '当前机房/机柜下无交换机' : '暂无交换机'}
      >
        {STATUS_GROUPS.map(group => {
          const devices = groupedDevices[group.key] || [];
          if (devices.length === 0) return null;
          return (
            <OptGroup
              key={group.key}
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: group.color
                  }} />
                  <span style={{ color: group.color, fontWeight: 600 }}>{group.label}</span>
                  <span style={{ color: 'rgba(0, 0, 0, 0.35)', fontWeight: 400 }}>
                    ({devices.length})
                  </span>
                </div>
              }
            >
              {devices.map(device => {
                // 后端 /api/devices/all 返回 Rack/Room 关联(PascalCase)
                const rackName = device.Rack?.name;
                const roomName = device.Rack?.Room?.name;
                const locationText = [roomName, rackName].filter(Boolean).join(' / ');
                return (
                  <Option
                    key={device.deviceId}
                    value={device.deviceId}
                    label={device.name}
                    device={device}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{
                            fontWeight: 500,
                            color: 'rgba(0, 0, 0, 0.85)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {device.name}
                          </span>
                          {device.model && (
                            <Text style={{ fontSize: 10, color: 'rgba(0, 0, 0, 0.45)', flexShrink: 0 }}>
                              {device.model}
                            </Text>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'rgba(0, 0, 0, 0.45)' }}>
                          {device.ipAddress && (
                            <span>IP: {device.ipAddress}</span>
                          )}
                          {locationText && (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {locationText}
                            </span>
                          )}
                        </div>
                      </div>
                      <Tag
                        style={{
                          fontSize: 10,
                          borderRadius: 4,
                          margin: 0,
                          padding: '0 6px',
                          background: group.bg,
                          border: `1px solid ${group.border}`,
                          color: group.color,
                          flexShrink: 0
                        }}
                      >
                        {group.label}
                      </Tag>
                    </div>
                  </Option>
                );
              })}
            </OptGroup>
          );
        })}
      </Select>

      {/* 统计信息(有数据时显示) */}
      {statistics && (
        <div style={{ marginTop: 16 }}>
          {/* 分割线 */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, #f0f0f0, transparent)',
              margin: '0 -12px 16px'
            }}
          />

          {/* 核心指标 */}
          <div style={SECTION_TITLE_STYLE}>
            <span>核心指标</span>
          </div>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <div style={STAT_CARD_STYLE}>
                <div style={{ fontSize: 10, color: 'rgba(0, 0, 0, 0.45)', marginBottom: 2 }}>
                  设备数
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff', lineHeight: 1 }}>
                  {statistics.totalDevices || 0}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div style={STAT_CARD_STYLE}>
                <div style={{ fontSize: 10, color: 'rgba(0, 0, 0, 0.45)', marginBottom: 2 }}>
                  连接数
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#13c2c2', lineHeight: 1 }}>
                  {statistics.totalCables || 0}
                </div>
              </div>
            </Col>
          </Row>

          {/* 连接状态分布 */}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...SECTION_TITLE_STYLE, marginBottom: 6 }}>
              <span>连接状态</span>
            </div>
            <Space size={4} wrap>
              <Tag
                style={{
                  fontSize: 11,
                  borderRadius: 4,
                  margin: 0,
                  padding: '1px 8px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  color: '#52c41a'
                }}
              >
                {statistics.normalCables || 0} 正常
              </Tag>
              <Tag
                style={{
                  fontSize: 11,
                  borderRadius: 4,
                  margin: 0,
                  padding: '1px 8px',
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  color: '#ff4d4f'
                }}
              >
                {statistics.faultCables || 0} 故障
              </Tag>
              <Tag
                style={{
                  fontSize: 11,
                  borderRadius: 4,
                  margin: 0,
                  padding: '1px 8px',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  color: 'rgba(0, 0, 0, 0.65)'
                }}
              >
                {statistics.disconnectedCables || 0} 未连接
              </Tag>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopologyControls;
