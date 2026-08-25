/**
 * 设备资产二维码纯逻辑模块
 *
 * 提供二维码公开页 URL 拼接、字段解析与展示行生成等能力，
 * 供设备二维码生成/打印等组件调用。无副作用，便于单元测试。
 */

/** 字段 key → 展示标签 映射 */
export const FILED_LABELS = {
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

/** 默认展示字段（不含 ipAddress / description） */
export const DEFAULT_QR_FIELDS = [
  'deviceId',
  'name',
  'type',
  'model',
  'serialNumber',
  'position',
  'status',
];

/** 勾选列表展示顺序（全部可选字段） */
export const ALL_QR_FIELDS = [
  'name',
  'type',
  'model',
  'serialNumber',
  'deviceId',
  'position',
  'ipAddress',
  'status',
  'description',
];

/** 设备类型 key → 中文文案（与 deviceUtils TYPE_MAP 保持一致） */
const TYPE_LABELS = {
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  storage: '存储设备',
  other: '其他设备',
};

/** 状态值 → 中文文案（与 deviceUtils STATUS_MAP 保持一致） */
const STATUS_MAP = {
  running: '运行中',
  maintenance: '维护中',
  offline: '离线',
  fault: '故障',
  idle: '空闲',
};

/**
 * 设备类型转中文标签
 * @param {string} type - 设备类型 key（如 server）
 * @returns {string} 中文标签；未知类型原样返回
 */
export function getTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}

/** 展示值最大长度，超出截断加省略号 */
const MAX_VALUE_LENGTH = 60;

/** 缺失值占位符 */
const PLACEHOLDER = '—';

/**
 * 截断超长文本
 * @param {string} value - 原始文本
 * @returns {string} 超过 60 字符时截断并追加 '…'，否则原样返回
 */
function truncate(value) {
  if (typeof value !== 'string' || value.length <= MAX_VALUE_LENGTH) {
    return value;
  }
  return value.slice(0, MAX_VALUE_LENGTH) + '…';
}

/**
 * 解析二维码展示字段
 * @param {string[]} fields - 调用方传入的字段数组
 * @returns {string[]} 数组且非空时原样返回，否则回退 DEFAULT_QR_FIELDS
 */
export function resolveQrFields(fields) {
  if (Array.isArray(fields) && fields.length > 0) {
    return fields;
  }
  return DEFAULT_QR_FIELDS;
}

/**
 * 拼接设备公开页二维码 URL
 * @param {string} publicBase - 公开访问基础地址（末尾斜杠会被去除）
 * @param {string} deviceId - 设备编号（会做 URL 编码）
 * @param {string[]} [fields] - 展示字段；传空数组时不带 fields 查询，
 *                              未传/非数组时回退默认字段
 * @returns {string} 完整二维码 URL
 */
export function buildQrUrl(publicBase, deviceId, fields) {
  const base = String(publicBase || '').replace(/\/+$/, '');
  const path = `${base}/p/devices/${encodeURIComponent(deviceId)}`;
  // 传空数组 → 明确不带 fields 查询；未传/非数组 → 回退默认字段
  if (Array.isArray(fields) && fields.length === 0) {
    return path;
  }
  const keys = resolveQrFields(fields);
  return `${path}?fields=${keys.join(',')}`;
}

/**
 * 构建二维码纯文本内容（扫码直接展示，不跳转链接）
 *
 * Q 关注：二维码容量有限（UTF-8 中文约 3 字节/字），默认仅使用 resolveQrFields
 * 解析后的勾选字段逐行拼成 `标签：值`，字段过多或含超长 description 时可能超容，
 * 调用方需用 QRCode 库布尔值捕获容量错误，此处不做二次截断以保证信息完整。
 *
 * @param {Object} device - 设备数据
 * @param {string[]} [fields] - 勾选的字段数组（空/未传回退默认字段）
 * @returns {string} 多行设备信息文本；无有效字段时返回空串
 */
export function buildQrTextContent(device, fields) {
  const rows = filterToRows(device, fields);
  return rows.map((row) => `${row.label}：${row.value}`).join('\n');
}

/**
 * 取设备单行展示值
 * @param {Object} device - 设备数据（roomName/rackName 由调用方冗余提供）
 * @param {string} key - 字段 key
 * @returns {string} 拼接后的原始值（可能为空字符串）
 */
function resolveRowValue(device, key) {
  if (key === 'position') {
    // 拼接：机房 · 机柜 · U位
    const parts = [device.roomName, device.rackName];
    if (device.position !== null && device.position !== undefined && device.position !== '') {
      parts.push(`U${device.position}`);
    }
    return parts.filter((p) => p !== null && p !== undefined && p !== '').join(' · ');
  }
  if (key === 'type') {
    return getTypeLabel(device.type) || '';
  }
  if (key === 'status') {
    return STATUS_MAP[device.status] || device.status || '';
  }
  const value = device[key];
  return value === null || value === undefined ? '' : String(value);
}

/**
 * 生成二维码展示行
 * @param {Object} device - 设备数据
 * @param {string[]} fields - 勾选的字段数组（空/未传回退默认字段）
 * @returns {Array<{label: string, value: string}>} 按字段顺序的展示行，
 *   缺失字段 value 为占位符 '—'，行保留不过滤；所有值做 60 字符截断
 */
export function filterToRows(device, fields) {
  const keys = resolveQrFields(fields);
  return keys.map((key) => {
    const raw = resolveRowValue(device || {}, key);
    const value = raw === '' ? PLACEHOLDER : truncate(raw);
    return { label: FILED_LABELS[key] || key, value };
  });
}
