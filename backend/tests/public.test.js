process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const express = require('express');
const { sequelize } = require('../db');
const Device = require('../models/Device');
const Room = require('../models/Room');
const Rack = require('../models/Rack');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/p', require('../routes/public'));
  return app;
};

describe('公开设备信息牌', () => {
  let deviceId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const room = await Room.create({
      name: '机房A', location: '一层', area: 100, capacity: 10, description: 't',
    });
    const rack = await Rack.create({ name: 'A-01', height: 45, maxPower: 10, roomId: room.roomId });
    const device = await Device.create({
      name: 'WEB-01', type: 'server', model: 'Dell R740', serialNumber: 'SN-001',
      rackId: rack.rackId, position: 12, ipAddress: '10.0.0.12', status: 'running',
      description: '对外备注', powerConsumption: 0, isIdle: false,
    });
    deviceId = device.deviceId;
  });

  it('未指定 fields 时返回默认安全字段，且不含 ipAddress/description', async () => {
    const res = await request(createTestApp()).get(`/p/devices/${deviceId}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('WEB-01');
    expect(res.text).toContain('所在位置');
    expect(res.text).toContain('A-01');
    // 类型/状态 key 转中文展示
    expect(res.text).toContain('服务器');
    expect(res.text).toContain('运行中');
    expect(res.text).not.toContain('10.0.0.12');
    expect(res.text).not.toContain('对外备注');
  });

  it('显式传 fields=ipAddress 时才包含 IP', async () => {
    const res = await request(createTestApp()).get(`/p/devices/${deviceId}?fields=name,ipAddress`);
    expect(res.text).toContain('IP 地址');
    expect(res.text).toContain('10.0.0.12');
    expect(res.text).not.toContain('序列号');
  });

  it('设备不存在返回 404', async () => {
    const res = await request(createTestApp()).get('/p/devices/DEV-NOT-EXIST');
    expect(res.status).toBe(404);
  });

  it('传入未知字段名被忽略，不抛错', async () => {
    const res = await request(createTestApp()).get(`/p/devices/${deviceId}?fields=hackerField,model`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('型号');
  });
});
