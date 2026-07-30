import React from 'react';
import NodeShell from './NodeShell';

/**
 * 存储节点(双模式:紧凑/详细)
 * 通过 NodeShell + StorageIcon 统一渲染
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 存储节点
 */
function StorageNode({ data, mode = 'compact' }) {
  return <NodeShell data={data} type="storage" mode={mode} />;
}

export default StorageNode;
