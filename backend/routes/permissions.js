const logger = require('../utils/logger').module('PermissionsRoute');
const express = require('express');
const Permission = require('../models/Permission');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * 获取所有活跃权限列表
 * GET /api/permissions
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC']],
    });

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    logger.error('获取权限列表错误', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '获取权限列表失败',
    });
  }
});

module.exports = router;