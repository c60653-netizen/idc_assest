/**
 * 远端备份上传工具模块
 * 支持 FTP、SFTP、WebDAV、SMB 等协议
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 协议类型枚举
const PROTOCOL_TYPES = {
  FTP: 'ftp',
  SFTP: 'sftp',
  WEBDAV: 'webdav',
  SMB: 'smb',
};

// 协议显示名称映射
const PROTOCOL_LABELS = {
  [PROTOCOL_TYPES.FTP]: 'FTP',
  [PROTOCOL_TYPES.SFTP]: 'SFTP (SSH 文件传输)',
  [PROTOCOL_TYPES.WEBDAV]: 'WebDAV',
  [PROTOCOL_TYPES.SMB]: 'SMB/CIFS 网络共享',
};

/**
 * FTP 上传实现
 */
async function uploadViaFTP(config, localFilePath, remotePath) {
  const { Client } = require('basic-ftp');

  const client = new Client();

  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.username,
      password: config.password,
      secure: config.secure || false,
      secureOptions: {
        rejectUnauthorized: config.rejectUnauthorized !== false,
      },
    });

    await client.cd(config.rootPath || '/');

    const dirPath = path.dirname(remotePath);
    if (dirPath !== '.') {
      await ensureRemoteDir(client, dirPath, 'ftp');
    }

    await client.uploadFrom(localFilePath, path.basename(remotePath));

    return {
      success: true,
      message: `FTP 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`FTP 上传失败：${error.message}`);
  } finally {
    client.close();
  }
}

/**
 * SFTP 上传实现
 * 注意：必须将 rootPath 拼接到远端路径前，否则文件会被上传到登录用户家目录下，
 * 而非配置的目标目录（参考 FTP 实现的 client.cd(rootPath) 行为）
 */
async function uploadViaSFTP(config, localFilePath, remotePath) {
  const Client = require('ssh2-sftp-client');
  const client = new Client();

  try {
    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey ? fs.readFileSync(config.privateKey) : undefined,
      passphrase: config.passphrase,
      readyTimeout: config.timeout || 10000,
    });

    // 拼接 rootPath 形成完整远端路径（默认 '/' 时不加前缀）
    const rootPath = config.rootPath && config.rootPath !== '/'
      ? config.rootPath.replace(/\/+$/, '')
      : '';
    const fullPath = rootPath ? `${rootPath}/${remotePath}` : remotePath;

    // 用 posix.dirname 避免在 Windows 上把正斜杠当反斜杠处理
    const dirPath = path.posix.dirname(fullPath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await ensureRemoteDir(client, dirPath, 'sftp');
    }

    await client.put(fs.createReadStream(localFilePath), fullPath);

    return {
      success: true,
      message: `SFTP 上传成功：${fullPath}`,
    };
  } catch (error) {
    throw new Error(`SFTP 上传失败：${error.message}`);
  } finally {
    await client.end();
  }
}

/**
 * WebDAV 上传实现
 */
async function uploadViaWebDAV(config, localFilePath, remotePath) {
  const { createClient } = require('webdav');

  const client = createClient(config.url, {
    username: config.username,
    password: config.password,
    authType: config.authType || 'password',
    headers: {
      'User-Agent': 'IDC-Backup-Client/1.0',
    },
  });

  try {
    const dirPath = path.dirname(remotePath);
    // 仅当存在真实目录前缀时才创建远程目录（避免 dirname='.' 或 '/' 触发多余调用）
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await ensureRemoteDir(client, dirPath, 'webdav');
    }

    const fileContent = fs.readFileSync(localFilePath);
    await client.putFileContents(remotePath, fileContent, {
      overwrite: true,
    });

    return {
      success: true,
      message: `WebDAV 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`WebDAV 上传失败：${error.message}`);
  }
}

/**
 * SMB/CIFS 网络共享上传实现
 */
async function uploadViaSMB(config, localFilePath, remotePath) {
  const smb = require('smb2');

  const client = new smb({
    share: `\\\\${config.host}\\${config.share}`,
    domain: config.domain || '',
    username: config.username,
    password: config.password,
  });

  try {
    const dirPath = path.dirname(remotePath);
    if (dirPath !== '.') {
      await ensureRemoteDir(client, dirPath, 'smb');
    }

    await client.writeFile(remotePath, fs.readFileSync(localFilePath));

    return {
      success: true,
      message: `SMB 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`SMB 上传失败：${error.message}`);
  }
}

/**
 * 确保远程目录存在
 */
async function ensureRemoteDir(client, dirPath, protocol) {
  try {
    if (protocol === 'ftp') {
      const dirs = dirPath.split('/').filter(d => d);
      for (const dir of dirs) {
        try {
          await client.cd(dir);
        } catch {
          await client.mkdir(dir);
          await client.cd(dir);
        }
      }
    } else if (protocol === 'sftp') {
      await client.mkdir(dirPath, true);
    } else if (protocol === 'webdav') {
      const parts = dirPath.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        try {
          await client.createDirectory(currentPath);
        } catch (error) {
          if (!error.status || error.status !== 405) {
            throw error;
          }
        }
      }
    } else if (protocol === 'smb') {
      const parts = dirPath.split(path.sep).filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += part + path.sep;
        try {
          await client.exists(currentPath);
        } catch {
          await client.mkdir(currentPath);
        }
      }
    }
  } catch (error) {
    console.warn(`创建远程目录失败 [${protocol}]:`, error.message);
  }
}

/**
 * 主上传函数 - 根据配置选择对应协议
 */
async function uploadToRemote(config, localFilePath, remotePath) {
  console.log(`开始上传到远端 [${config.protocol}]: ${remotePath}`);

  const startTime = Date.now();

  let result;

  switch (config.protocol) {
    case PROTOCOL_TYPES.FTP:
      result = await uploadViaFTP(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.SFTP:
      result = await uploadViaSFTP(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.WEBDAV:
      result = await uploadViaWebDAV(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.SMB:
      result = await uploadViaSMB(config, localFilePath, remotePath);
      break;
    default:
      throw new Error(`不支持的协议类型：${config.protocol}`);
  }

  const duration = Date.now() - startTime;
  const fileSize = fs.statSync(localFilePath).size;

  console.log(
    `远端上传完成 [${config.protocol}] - 耗时：${duration}ms, 文件大小：${(fileSize / 1024).toFixed(2)}KB`
  );

  return {
    ...result,
    protocol: config.protocol,
    protocolLabel: PROTOCOL_LABELS[config.protocol],
    duration,
    fileSize,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * 规范化远端根路径，返回不带末尾斜杠的路径（如 '/backups'），空则返回空串
 * @param {string} rootPath - 原始根路径
 * @returns {string} 规范化后的根路径
 */
function normalizeRootPath(rootPath) {
  if (!rootPath) return '';
  return String(rootPath).replace(/^\/+|\/+$/g, '');
}

/**
 * 构造测试文件远端相对路径（仅文件名，不含 rootPath 前缀）
 * 注意：rootPath 由各协议上传函数内部处理（FTP 用 cd，SFTP 用路径拼接），
 *      这里若再拼接一次会导致路径叠加（如 /root/test/root/test/...）
 * @param {Object} config - 远端配置（保留参数以向后兼容）
 * @returns {string} 测试文件相对路径
 */
function buildTestRemotePath(config) {
  // 忽略 config.rootPath，仅返回文件名
  return `backup-connection-test-${Date.now()}.txt`;
}

/**
 * WebDAV 轻量连接测试
 * 1. 先用 exists(rootPath) 验证 URL + 凭据 + 根目录可访问
 * 2. 再尝试在 rootPath 下上传 + 删除一个测试文件，验证可写
 * 3. 上传失败但认证通过时，仍返回成功（只读账号也可用），但提示无写权限
 * @param {Object} config - 远端配置
 * @returns {Promise<{success: boolean, message: string, error?: string, details?: Object}>}
 */
async function testWebDAVConnection(config) {
  const { createClient } = require('webdav');

  const client = createClient(config.url, {
    username: config.username,
    password: config.password,
    authType: config.authType || 'password',
    headers: { 'User-Agent': 'IDC-Backup-Client/1.0' },
  });

  const root = normalizeRootPath(config.rootPath);
  const rootPath = root ? `/${root}` : '/';

  // 第一步：验证认证 + 根目录可访问
  let rootExists = false;
  try {
    rootExists = await client.exists(rootPath);
  } catch (error) {
    return {
      success: false,
      message: `连接测试失败：${error.message}（请检查 URL、账号密码是否正确）`,
      error: error.message,
    };
  }

  if (!rootExists) {
    return {
      success: false,
      message: `连接测试失败：根目录不存在或无访问权限（${rootPath}）`,
      error: `Root path not accessible: ${rootPath}`,
    };
  }

  // 第二步：尝试上传 + 删除测试文件，验证可写权限
  const testFileName = `backup-connection-test-${Date.now()}.txt`;
  const testRemotePath = root ? `${root}/${testFileName}` : testFileName;
  const testContent = `IDC Backup Connection Test - ${new Date().toISOString()}`;
  const testFile = path.join(require('os').tmpdir(), `backup-test-${Date.now()}.txt`);

  try {
    fs.writeFileSync(testFile, testContent);
    const fileContent = fs.readFileSync(testFile);
    await client.putFileContents(testRemotePath, fileContent, { overwrite: true });

    // 上传成功后尝试删除测试文件（清理）
    try {
      await client.deleteFile(testRemotePath);
    } catch (e) {
      console.warn('删除 WebDAV 测试文件失败:', e.message);
    }

    return {
      success: true,
      message: '连接测试成功（认证通过，根目录可读写）',
      details: { rootPath, writable: true },
    };
  } catch (error) {
    // 认证已通过（exists 成功），仅无写权限 —— 仍认为连接可用
    return {
      success: true,
      message: `连接测试成功（认证通过，但根目录不可写：${error.message}）`,
      error: error.message,
      details: { rootPath, writable: false, writeError: error.message },
    };
  } finally {
    try {
      fs.unlinkSync(testFile);
    } catch (e) {
      // 忽略本地清理失败
    }
  }
}

/**
 * 测试远端连接
 * @param {Object} config - 远端配置
 * @returns {Promise<{success: boolean, message: string, error?: string, details?: Object}>}
 */
async function testRemoteConnection(config) {
  console.log(`测试远端连接 [${config.protocol}]...`);

  try {
    // WebDAV 使用轻量测试：避免写死 test/ 子目录触发 403
    if (config.protocol === PROTOCOL_TYPES.WEBDAV) {
      return await testWebDAVConnection(config);
    }

    const testContent = `IDC Backup Connection Test - ${new Date().toISOString()}`;
    const testFile = path.join(require('os').tmpdir(), `backup-test-${Date.now()}.txt`);
    fs.writeFileSync(testFile, testContent);

    // 使用 rootPath 作为测试目录前缀，避免写死 test/ 导致创建子目录失败
    const testRemotePath = buildTestRemotePath(config);

    const result = await uploadToRemote(config, testFile, testRemotePath);

    try {
      fs.unlinkSync(testFile);
    } catch (e) {
      console.warn('删除测试文件失败:', e.message);
    }

    return {
      success: true,
      message: '连接测试成功',
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `连接测试失败：${error.message}`,
      error: error.message,
    };
  }
}

module.exports = {
  PROTOCOL_TYPES,
  PROTOCOL_LABELS,
  uploadToRemote,
  testRemoteConnection,
  uploadViaFTP,
  uploadViaSFTP,
  uploadViaWebDAV,
  uploadViaSMB,
};
