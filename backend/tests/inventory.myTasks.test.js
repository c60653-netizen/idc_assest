process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../db');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const InventoryPlan = require('../models/InventoryPlan');
const InventoryTask = require('../models/InventoryTask');

const JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';

const createApp = () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  const inventoryRouter = require('../routes/inventory');
  app.use('/api/inventory', inventoryRouter);
  return app;
};

const makeToken = (user) => jwt.sign({ userId: user.userId, username: user.username }, JWT_SECRET);

describe('GET /api/inventory/my-tasks', () => {
  let app;
  let viewer;
  let other;
  let plan;

  // 注意：beforeAll/afterAll 必须定义在 describe 内部。
  // 原因：jest.config.js 的 setupFilesAfterEnv（tests/setup.js）会在根级注册一个
  // 全局 afterAll 并执行 sequelize.close()；若本文件的 afterAll 也定义在根级（顶层），
  // 按注册顺序正序执行，全局钩子会先关闭连接，导致本文件 afterAll 再次 close 时
  // 抛出 SQLITE_MISUSE: Database is closed。放在 describe 内可保证本文件的
  // afterAll 先于全局钩子执行（与项目其他测试文件一致）。
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
  }, 30000);

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    app = createApp();

    viewer = await User.create({
      userId: 'USR-VIEWER',
      username: 'viewer',
      password: 'x',
      status: 'active',
    });
    other = await User.create({
      userId: 'USR-OTHER',
      username: 'other',
      password: 'x',
      status: 'active',
    });
    const role = await Role.create({
      roleId: 'role_inv',
      roleName: '盘点员',
      roleCode: 'viewer',
      description: '',
      status: 'active',
      permissions: ['inventory:view'],
    });
    await UserRole.create({ UserId: viewer.userId, RoleId: role.roleId });
    await UserRole.create({ UserId: other.userId, RoleId: role.roleId });

    plan = await InventoryPlan.create({
      planId: 'PLAN-MY',
      name: '一期盘点',
      type: 'full',
      status: 'pending',
      createdBy: viewer.userId,
    });

    await InventoryTask.create({
      taskId: 'TASK-MINE',
      planId: plan.planId,
      targetType: 'room',
      targetId: 'RM-1',
      targetName: '机房A',
      status: 'in_progress',
      assignedTo: viewer.userId,
      assignedAt: new Date(),
      totalDevices: 3,
      checkedDevices: 1,
    });
    await InventoryTask.create({
      taskId: 'TASK-THEIRS',
      planId: plan.planId,
      targetType: 'room',
      targetId: 'RM-2',
      targetName: '机房B',
      status: 'pending',
      assignedTo: other.userId,
    });
  });

  it('仅返回当前登录用户被分配的任务', async () => {
    const res = await request(app)
      .get('/api/inventory/my-tasks')
      .set('Authorization', `Bearer ${makeToken(viewer)}`);

    expect(res.status).toBe(200);
    expect(res.body.taskIds).toEqual(expect.arrayContaining(['TASK-MINE']));
    expect(res.body.taskIds).not.toContain('TASK-THEIRS');
  });

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/inventory/my-tasks');
    expect(res.status).toBe(401);
  });
});
