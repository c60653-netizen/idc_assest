/**
 * 公开设备信息牌路由（免鉴权）
 * 用于生成可对外展示的设备信息 HTML 卡片（如贴码扫描查看），
 * 通过字段白名单控制敏感信息（IP、备注）仅在显式指定时展示。
 */
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const logger = require('../utils/logger').module('Public');

// 允许公开展示的字段白名单及中文标签
const FIELD_LABELS = {
  deviceId: '设备编号',
  name: '名称',
  type: '类型',
  model: '型号',
  serialNumber: '序列号',
  position: '所在位置',
  ipAddress: 'IP 地址',
  status: '状态',
  description: '描述/备注',
};

// 默认展示字段（安全考虑：不含 ipAddress / description）
const DEFAULT_FIELDS = ['deviceId', 'name', 'type', 'model', 'serialNumber', 'position', 'status'];

// 设备类型中文映射
const TYPE_LABELS = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储设备',
  other: '其他设备',
};

// 设备状态中文映射
const STATUS_LABELS = {
  running: '运行中',
  maintenance: '维护中',
  offline: '离线',
  fault: '故障',
  idle: '空闲',
};

/**
 * 解析 fields 查询参数为合法字段列表
 * @param {string|undefined} fieldsRaw - 逗号分隔的字段名原始字符串
 * @returns {string[]} 白名单内的字段名数组；为空或全部非法时回退默认字段
 */
const resolveFields = (fieldsRaw) => {
  if (!fieldsRaw) {
    return [...DEFAULT_FIELDS];
  }
  const fields = String(fieldsRaw)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => Object.prototype.hasOwnProperty.call(FIELD_LABELS, item));
  const uniqueFields = [...new Set(fields)];
  return uniqueFields.length > 0 ? uniqueFields : [...DEFAULT_FIELDS];
};

/**
 * HTML 特殊字符转义，防止注入
 * @param {*} value - 待转义的任意值（会先转为字符串）
 * @returns {string} 转义后的安全字符串
 */
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * 计算设备所在位置描述（机房名 · 机柜名 · U位）
 * @param {Object} device - 含 Rack/Room 关联的设备实例
 * @returns {string} 位置描述字符串，信息缺失部分自动跳过
 */
const buildLocation = (device) => {
  const parts = [];
  const roomName = device.Rack && device.Rack.Room ? device.Rack.Room.name : null;
  const rackName = device.Rack ? device.Rack.name : null;
  if (roomName) {
    parts.push(roomName);
  }
  if (rackName) {
    parts.push(rackName);
  }
  if (device.position !== null && device.position !== undefined) {
    parts.push(`U${device.position}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '未知';
};

/**
 * 根据字段列表生成信息牌展示行
 * @param {Object} device - 含 Rack/Room 关联的设备实例
 * @param {string[]} fields - 待展示字段名数组
 * @returns {Array<{label: string, value: string, className: string}>} 展示行数组（空值行已过滤）
 */
const buildRows = (device, fields) => {
  const rows = [];
  fields.forEach((field) => {
    let value;
    if (field === 'position') {
      value = buildLocation(device);
    } else if (field === 'type') {
      value = TYPE_LABELS[device.type] || device.type;
    } else if (field === 'status') {
      value = STATUS_LABELS[device.status] || device.status;
    } else {
      value = device[field];
    }
    // 空值行过滤：null / undefined / 空字符串不展示
    if (value === null || value === undefined || value === '') {
      return;
    }
    const className = field === 'status' ? `status-${device.status}` : '';
    rows.push({ label: FIELD_LABELS[field], value: String(value), className });
  });
  return rows;
};

/**
 * 渲染移动端友好的设备信息牌 HTML 页面
 * @param {Array<{label: string, value: string, className: string}>} rows - 展示行数组
 * @returns {string} 完整 HTML 字符串
 */
const renderCardHtml = (rows) => {
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr><th>${escapeHtml(row.label)}</th><td class="${row.className}">${escapeHtml(row.value)}</td></tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>设备信息牌</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f5f6fa; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
.card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); }
.card-header { background: #1677ff; color: #fff; padding: 16px 20px; font-size: 18px; font-weight: 600; }
.info-table { width: 100%; border-collapse: collapse; }
.info-table th { text-align: left; width: 96px; padding: 12px 16px; color: #8c8c8c; font-weight: 500; font-size: 14px; white-space: nowrap; border-bottom: 1px solid #f0f0f0; }
.info-table td { padding: 12px 16px; font-size: 14px; color: #262626; word-break: break-all; border-bottom: 1px solid #f0f0f0; }
.card-footer { padding: 14px 16px; text-align: center; color: #bfbfbf; font-size: 12px; }
.status-running { color: #52c41a; }
.status-maintenance { color: #faad14; }
.status-offline { color: #8c8c8c; }
.status-fault { color: #ff4d4f; }
.status-idle { color: #36cfc9; }
</style>
</head>
<body>
<div class="card">
  <div class="card-header">设备信息牌</div>
  <table class="info-table">${rowsHtml}</table>
  <div class="card-footer">本卡片由 IDC 资产系统生成</div>
</div>
</body>
</html>`;
};

/**
 * 渲染错误提示 HTML 页面（404/500 通用）
 * @param {string} title - 错误标题
 * @param {string} message - 错误描述
 * @returns {string} 完整 HTML 字符串
 */
const renderErrorHtml = (title, message) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>设备信息牌</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f5f6fa; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
.card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); }
.card-header { background: #1677ff; color: #fff; padding: 16px 20px; font-size: 18px; font-weight: 600; }
.error-body { padding: 32px 20px; text-align: center; }
.error-title { font-size: 16px; color: #262626; margin-bottom: 8px; }
.error-message { font-size: 13px; color: #8c8c8c; }
.card-footer { padding: 14px 16px; text-align: center; color: #bfbfbf; font-size: 12px; }
</style>
</head>
<body>
<div class="card">
  <div class="card-header">设备信息牌</div>
  <div class="error-body">
    <div class="error-title">${escapeHtml(title)}</div>
    <div class="error-message">${escapeHtml(message)}</div>
  </div>
  <div class="card-footer">本卡片由 IDC 资产系统生成</div>
</div>
</body>
</html>`;

/**
 * 获取设备公开信息牌（免鉴权）
 * @route GET /p/devices/:deviceId
 * @param {Object} req - Express 请求对象（query.fields 为可选逗号分隔字段名）
 * @param {Object} res - Express 响应对象（返回 HTML）
 * @returns {Promise<void>}
 */
router.get('/devices/:deviceId', async (req, res) => {
  try {
    const fields = resolveFields(req.query.fields);
    const device = await Device.findByPk(req.params.deviceId, {
      include: [{ model: Rack, include: [{ model: Room }] }],
    });
    if (!device) {
      return res
        .status(404)
        .send(renderErrorHtml('设备不存在', '未找到该设备，请核对设备编号或联系管理员。'));
    }
    const rows = buildRows(device, fields);
    return res.send(renderCardHtml(rows));
  } catch (error) {
    logger.error('生成公开设备信息牌失败', {
      deviceId: req.params.deviceId,
      error: error.message,
    });
    return res.status(500).send(renderErrorHtml('服务异常', '信息牌生成失败，请稍后重试。'));
  }
});

module.exports = router;
