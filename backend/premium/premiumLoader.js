'use strict';

const path = require('path');
const loggerBase = require('../utils/logger');

function resolvePremiumPackage() {
  const packageName = 'idc-premium';
  try {
    const entryPath = require.resolve(packageName, { paths: [path.join(__dirname, '..')] });
    return { packageName, entryPath };
  } catch (error) {
    return { packageName, entryPath: null };
  }
}

async function loadPremiumModule(app) {
  const logger = loggerBase.module('PremiumLoader');
  const { packageName, entryPath } = resolvePremiumPackage();

  if (!entryPath) {
    logger.info(`未检测到闭源模块（${packageName}），跳过加载，仅开源功能可用`);
    return false;
  }

  let premiumModule;
  try {
    delete require.cache[entryPath];
    premiumModule = require(entryPath);
  } catch (error) {
    logger.error('闭源模块加载失败，服务将以开源模式启动', {
      packageName,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }

  if (typeof premiumModule.register !== 'function') {
    logger.error(`闭源模块（${packageName}）未按约定导出 register(app) 函数，已跳过加载`);
    return false;
  }

  try {
    const { sequelize } = require('../db');
    const models = require('../models');
    await premiumModule.register({ app, sequelize, models, logger, packageName });
    logger.info(`闭源模块加载完成：${packageName} (v${premiumModule.version || 'unknown'})`);
    return true;
  } catch (error) {
    logger.error('闭源模块 register 执行失败，以开源模式运行', {
      packageName,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

module.exports = { loadPremiumModule };
