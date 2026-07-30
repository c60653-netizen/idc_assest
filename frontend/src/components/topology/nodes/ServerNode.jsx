import React from 'react';
import NodeShell from './NodeShell';

/**
 * 服务器节点(双模式:紧凑/详细)
 * 通过 NodeShell + ServerIcon 统一渲染
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 服务器节点
 */
function ServerNode({ data, mode = 'compact' }) {
  return <NodeShell data={data} type="server" mode={mode} />;
}

export default ServerNode;
