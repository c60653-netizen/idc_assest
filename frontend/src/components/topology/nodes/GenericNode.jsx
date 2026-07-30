import React from 'react';
import NodeShell from './NodeShell';

/**
 * 通用设备节点(双模式:紧凑/详细)
 * 适用于未知类型设备,通过 NodeShell + DefaultIcon 统一渲染
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 通用节点
 */
function GenericNode({ data, mode = 'compact' }) {
  return <NodeShell data={data} type={data?.type || 'default'} mode={mode} />;
}

export default GenericNode;
