import { describe, it, expect } from 'vitest';
import {
  FILED_LABELS,
  DEFAULT_QR_FIELDS,
  buildQrUrl,
  buildQrTextContent,
  filterToRows,
  resolveQrFields,
  getTypeLabel,
} from '../deviceQr';

describe('deviceQr', () => {
  it('buildQrUrl 拼接公开页 URL，含 fields 查询', () => {
    const url = buildQrUrl('http://host', 'DEV-1', ['name', 'model']);
    expect(url).toBe('http://host/p/devices/DEV-1?fields=name,model');
  });

  it('buildQrUrl 无字段时不带 fields', () => {
    expect(buildQrUrl('http://host', 'DEV-1', [])).toBe('http://host/p/devices/DEV-1');
  });

  it('resolveQrFields 空数组回退默认字段', () => {
    const keys = resolveQrFields([]);
    expect(keys).toEqual(DEFAULT_QR_FIELDS);
  });

  it('filterToRows 仅输出勾选字段并做长度截断', () => {
    const device = { name: 'WEB-01', serialNumber: 'SN-001', ipAddress: '10.0.0.1' };
    const rows = filterToRows(device, ['name', 'ipAddress']);
    expect(rows).toEqual([
      { label: '名称', value: 'WEB-01' },
      { label: 'IP 地址', value: '10.0.0.1' },
    ]);
  });

  it('filterToRows 缺失字段输出占位符', () => {
    const rows = filterToRows({}, ['model']);
    expect(rows[0].value).toBe('—');
  });

  it('类型与状态 key 转中文展示', () => {
    const rows = filterToRows(
      { type: 'server', status: 'running' },
      ['type', 'status']
    );
    expect(rows).toEqual([
      { label: '类型', value: '服务器' },
      { label: '状态', value: '运行中' },
    ]);
    expect(getTypeLabel('switch')).toBe('交换机');
    expect(getTypeLabel('自定义类型')).toBe('自定义类型');
  });

  it('buildQrTextContent 生成纯文本信息（扫码直接展示，非链接）', () => {
    const text = buildQrTextContent(
      { name: 'WEB-01', model: 'R740', type: 'server', status: 'running' },
      ['name', 'type', 'model', 'status']
    );
    expect(text).toContain('名称：WEB-01');
    expect(text).toContain('类型：服务器');
    expect(text).toContain('状态：运行中');
    // 关键断言：内容为文本，不是跳转链接
    expect(text).not.toContain('/p/devices');
    expect(text).not.toContain('http');
  });
});
