import React from 'react';
import NodeShell from './NodeShell';

/**
 * 防火墙节点(双模式:紧凑/详细)
 * 通过 NodeShell + FirewallIcon 统一渲染
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 防火墙节点
 */
function FirewallNode({ data, mode = 'compact' }) {
  return <NodeShell data={data} type="firewall" mode={mode} />;
}

export default FirewallNode;
