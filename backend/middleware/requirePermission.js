'use strict';

const logger = require('../utils/logger').module('RequirePermission');
const UserRole = require('../models/UserRole');
const Role = require('../models/Role');

/**
 * 权限校验中间件
 * 验证当前用户是否拥有指定权限码中的任意一个
 * 必须在 authMiddleware 之后使用（依赖 req.user.userId）
 *
 * @param  {...string} permissions - 允许的权限码列表（OR 关系，满足任一即可）
 * @returns {Function} Express 中间件
 *
 * @example
 * // 单个权限
 * router.post('/', authMiddleware, requirePermission('device:create'), handler);
 *
 * // 多个权限（OR 关系）
 * router.delete('/', authMiddleware, requirePermission('device:delete', 'admin'), handler);
 */
const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: '未认证',
        });
      }

      // 查询用户的所有角色
      const userRoles = await UserRole.findAll({
        where: { UserId: req.user.userId },
        include: [{ model: Role }],
      });

      if (!userRoles || userRoles.length === 0) {
        return res.status(403).json({
          success: false,
          message: '用户未分配角色，无操作权限',
        });
      }

      // 提取所有角色的权限码集合
      const allPermissionCodes = new Set();
      let isAdmin = false;

      for (const ur of userRoles) {
        const role = ur.Role;
        if (!role) continue;

        // admin 角色拥有所有权限
        if (role.roleCode === 'admin') {
          isAdmin = true;
          break;
        }

        // 角色的 permissions 字段是 JSON 数组
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach((p) => allPermissionCodes.add(p));
        }
      }

      // admin 放行所有
      if (isAdmin) {
        return next();
      }

      // * 表示全部权限
      if (allPermissionCodes.has('*')) {
        return next();
      }

      // 检查是否拥有任一要求的权限码
      const hasPermission = permissions.some((perm) => allPermissionCodes.has(perm));

      if (!hasPermission) {
        logger.warn('权限不足', {
          userId: req.user.userId,
          username: req.user.username,
          requiredPermissions: permissions,
          userPermissions: Array.from(allPermissionCodes),
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          message: '权限不足，无法执行此操作',
        });
      }

      next();
    } catch (error) {
      logger.error('权限校验失败', {
        error: error.message,
        userId: req.user?.userId,
      });
      return res.status(500).json({
        success: false,
        message: '权限校验失败',
      });
    }
  };
};

module.exports = requirePermission;
