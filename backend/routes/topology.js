const logger = require('../utils/logger').module('TopologyRoute');
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { Op } = require('sequelize');
const Cable = require('../models/Cable');
const Device = require('../models/Device');
const DevicePort = require('../models/DevicePort');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const TopologyLayout = require('../models/TopologyLayout');

// 查询设备关联时需要取的字段(避免 SELECT *)
const DEVICE_INCLUDE_ATTRS = [
  'deviceId', 'name', 'type', 'model', 'serialNumber', 'status',
  'ipAddress', 'rackId', 'position', 'height', 'powerConsumption',
  'isIdle', 'description', 'purchaseDate', 'warrantyExpiry'
];

/**
 * 构建线缆 edge 对象(统一字段)
 * @param {Object} cable - Cable 模型实例
 * @returns {Object} 前端使用的 edge 对象
 */
const buildEdge = (cable) => ({
  id: cable.cableId,
  source: cable.sourceDeviceId,
  target: cable.targetDeviceId,
  sourcePort: cable.sourcePort,
  targetPort: cable.targetPort,
  cableId: cable.cableId,
  cableType: cable.cableType,
  cableLength: cable.cableLength,
  cableLabel: cable.cableLabel,
  cableColor: cable.cableColor,
  status: cable.status,
  description: cable.description,
  installedAt: cable.installedAt
});

/**
 * 构建设备节点对象(统一字段,确保 /switch 和 /rack 路由返回结构一致)
 * 注意:position 字段保留给前端 ReactFlow 画布坐标,U位号使用 uPosition 避免冲突
 * @param {Object} device - Device 模型实例(已 include Rack->Room)
 * @param {boolean} isCenter - 是否为拓扑中心设备
 * @returns {Object} 前端使用的 node 对象
 */
const buildNode = (device, isCenter) => {
  const d = device.toJSON();
  const rack = d.Rack;
  const room = rack?.Room;
  return {
    id: d.deviceId,
    deviceId: d.deviceId,
    name: d.name,
    type: d.type,
    model: d.model,
    serialNumber: d.serialNumber,
    status: d.status,
    ipAddress: d.ipAddress,
    rackId: d.rackId,
    rackName: rack?.name,
    rackHeight: rack?.height,
    roomId: room?.roomId,
    roomName: room?.name,
    roomLocation: room?.location,
    uPosition: d.position,
    deviceHeight: d.height,
    powerConsumption: d.powerConsumption,
    isIdle: d.isIdle,
    description: d.description,
    purchaseDate: d.purchaseDate,
    warrantyExpiry: d.warrantyExpiry,
    isCenter
  };
};

/**
 * 批量统计设备端口使用情况
 * @param {Array<string>} deviceIds - 设备 ID 列表
 * @returns {Promise<Object>} deviceId -> { total, used, free, fault }
 */
const buildPortStats = async (deviceIds) => {
  const portStats = {};
  if (!deviceIds || deviceIds.length === 0) return portStats;

  const ports = await DevicePort.findAll({
    where: { deviceId: { [Op.in]: deviceIds } },
    attributes: ['deviceId', 'status']
  });

  ports.forEach(port => {
    if (!portStats[port.deviceId]) {
      portStats[port.deviceId] = { total: 0, used: 0, free: 0, fault: 0 };
    }
    portStats[port.deviceId].total++;
    if (port.status === 'occupied') portStats[port.deviceId].used++;
    else if (port.status === 'free') portStats[port.deviceId].free++;
    else if (port.status === 'fault') portStats[port.deviceId].fault++;
  });

  return portStats;
};

/**
 * 为节点列表附加 portCount 字段
 * @param {Array} nodes - 节点数组(会被原地修改)
 * @param {Object} portStats - 端口统计映射
 */
const attachPortStats = (nodes, portStats) => {
  nodes.forEach(node => {
    node.portCount = portStats[node.deviceId] || { total: 0, used: 0, free: 0, fault: 0 };
  });
};

/**
 * 构建统计信息对象
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组
 * @returns {Object} 统计信息
 */
const buildStatistics = (nodes, edges) => {
  const statistics = {
    totalDevices: nodes.length,
    totalCables: edges.length,
    normalCables: edges.filter(e => e.status === 'normal').length,
    faultCables: edges.filter(e => e.status === 'fault').length,
    disconnectedCables: edges.filter(e => e.status === 'disconnected').length,
    byDeviceType: {},
    byCableType: {}
  };

  nodes.forEach(node => {
    statistics.byDeviceType[node.type] = (statistics.byDeviceType[node.type] || 0) + 1;
  });

  edges.forEach(edge => {
    statistics.byCableType[edge.cableType] = (statistics.byCableType[edge.cableType] || 0) + 1;
  });

  return statistics;
};

router.get('/switch/:switchId', authMiddleware, requirePermission('topology:view'), async (req, res) => {
  try {
    const { switchId } = req.params;
    const { maxNodes = 100 } = req.query;

    const centerDevice = await Device.findByPk(switchId, {
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    if (!centerDevice) {
      return res.status(404).json({ success: false, error: '交换机不存在' });
    }

    if (centerDevice.type !== 'switch') {
      return res.status(400).json({ success: false, error: '指定设备不是交换机' });
    }

    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: switchId },
          { targetDeviceId: switchId }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: DEVICE_INCLUDE_ATTRS
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: DEVICE_INCLUDE_ATTRS
        }
      ]
    });

    const connectedDeviceIds = new Set();
    cables.forEach(cable => {
      if (cable.sourceDeviceId !== switchId) {
        connectedDeviceIds.add(cable.sourceDeviceId);
      }
      if (cable.targetDeviceId !== switchId) {
        connectedDeviceIds.add(cable.targetDeviceId);
      }
    });

    if (connectedDeviceIds.size > parseInt(maxNodes)) {
      return res.status(400).json({
        success: false,
        error: `连接设备数量(${connectedDeviceIds.size})超过限制(${maxNodes})，请使用更具体的筛选条件`
      });
    }

    const connectedDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: Array.from(connectedDeviceIds) } },
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    const nodes = [
      buildNode(centerDevice, true),
      ...connectedDevices.map(device => buildNode(device, false))
    ];

    const edges = cables.map(buildEdge);

    const allDeviceIds = [switchId, ...Array.from(connectedDeviceIds)];
    const portStats = await buildPortStats(allDeviceIds);
    attachPortStats(nodes, portStats);

    const statistics = buildStatistics(nodes, edges);

    res.json({
      success: true,
      data: {
        centerDevice: nodes[0],
        nodes: nodes.slice(1),
        edges,
        statistics
      }
    });
  } catch (error) {
    logger.error('获取拓扑数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rack/:rackId', authMiddleware, requirePermission('topology:view'), async (req, res) => {
  try {
    const { rackId } = req.params;
    const { maxNodes = 100 } = req.query;

    const devices = await Device.findAll({
      where: { rackId },
      attributes: ['deviceId']
    });

    const deviceIds = devices.map(d => d.deviceId);

    if (deviceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          centerDevice: null,
          nodes: [],
          edges: [],
          statistics: {
            totalDevices: 0,
            totalCables: 0,
            normalCables: 0,
            faultCables: 0,
            disconnectedCables: 0,
            byDeviceType: {},
            byCableType: {}
          }
        }
      });
    }

    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: { [Op.in]: deviceIds } },
          { targetDeviceId: { [Op.in]: deviceIds } }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: DEVICE_INCLUDE_ATTRS
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: DEVICE_INCLUDE_ATTRS
        }
      ]
    });

    const relatedDeviceIds = new Set(deviceIds);
    cables.forEach(cable => {
      relatedDeviceIds.add(cable.sourceDeviceId);
      relatedDeviceIds.add(cable.targetDeviceId);
    });

    if (relatedDeviceIds.size > parseInt(maxNodes)) {
      return res.status(400).json({
        success: false,
        error: `设备数量(${relatedDeviceIds.size})超过限制(${maxNodes})`
      });
    }

    const allDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: Array.from(relatedDeviceIds) } },
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    // 机柜视图下,该机柜内的设备标记为 isCenter=true
    const nodes = allDevices.map(device => buildNode(device, deviceIds.includes(device.deviceId)));

    const edges = cables.map(buildEdge);

    const portStats = await buildPortStats(Array.from(relatedDeviceIds));
    attachPortStats(nodes, portStats);

    const statistics = buildStatistics(nodes, edges);

    res.json({
      success: true,
      data: {
        centerDevice: null,
        nodes,
        edges,
        statistics
      }
    });
  } catch (error) {
    logger.error('获取机柜拓扑数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取已保存的拓扑布局
 * @route GET /api/topology/layout/:layoutKey
 * @param {string} req.params.layoutKey - 布局标识(switch:DEVxxx 或 rack:RACKxxx)
 * @returns {Object} { success, data: { nodesData, viewport } | null }
 */
router.get('/layout/:layoutKey', authMiddleware, requirePermission('topology:view'), async (req, res) => {
  try {
    const { layoutKey } = req.params;
    if (!layoutKey) {
      return res.status(400).json({ success: false, error: '缺少 layoutKey 参数' });
    }

    const layout = await TopologyLayout.findOne({ where: { layoutKey } });

    res.json({
      success: true,
      data: layout ? {
        nodesData: layout.nodesData,
        viewport: layout.viewport,
        updatedAt: layout.updatedAt,
      } : null,
    });
  } catch (error) {
    logger.error('获取拓扑布局失败', { error: error.message, layoutKey: req.params.layoutKey });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 保存拓扑布局(upsert:存在则更新,不存在则创建)
 * @route POST /api/topology/layout
 * @param {Object} req.body - { layoutKey, nodesData, viewport }
 * @returns {Object} { success, message }
 */
router.post('/layout', authMiddleware, requirePermission('topology:edit'), async (req, res) => {
  try {
    const { layoutKey, nodesData, viewport } = req.body;

    // 参数校验
    if (!layoutKey) {
      return res.status(400).json({ success: false, error: '缺少 layoutKey' });
    }
    if (!Array.isArray(nodesData)) {
      return res.status(400).json({ success: false, error: 'nodesData 必须是数组' });
    }

    // upsert:存在则更新,不存在则创建
    await TopologyLayout.upsert({
      layoutKey,
      nodesData,
      viewport: viewport || null,
    });

    logger.info('拓扑布局已保存', { layoutKey, nodeCount: nodesData.length });

    res.json({
      success: true,
      message: '布局保存成功',
      data: { layoutKey, nodeCount: nodesData.length },
    });
  } catch (error) {
    logger.error('保存拓扑布局失败', { error: error.message, layoutKey: req.body?.layoutKey });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 删除拓扑布局(重置为自动布局)
 * @route DELETE /api/topology/layout/:layoutKey
 * @param {string} req.params.layoutKey - 布局标识
 * @returns {Object} { success, message }
 */
router.delete('/layout/:layoutKey', authMiddleware, requirePermission('topology:edit'), async (req, res) => {
  try {
    const { layoutKey } = req.params;
    if (!layoutKey) {
      return res.status(400).json({ success: false, error: '缺少 layoutKey 参数' });
    }

    const deleted = await TopologyLayout.destroy({ where: { layoutKey } });

    if (deleted > 0) {
      logger.info('拓扑布局已删除', { layoutKey });
      res.json({ success: true, message: '布局已重置为自动布局' });
    } else {
      res.status(404).json({ success: false, error: '未找到对应布局' });
    }
  } catch (error) {
    logger.error('删除拓扑布局失败', { error: error.message, layoutKey: req.params.layoutKey });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
