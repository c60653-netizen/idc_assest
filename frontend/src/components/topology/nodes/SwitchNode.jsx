import React from 'react';
import NodeShell from './NodeShell';

/**
 * 交换机节点(双模式:紧凑/详细)
 * 通过 NodeShell + SwitchIcon 统一渲染,移除原 220x110 深色玻璃拟态实现
 * @param {Object} props - 组件属性
 * @param {Object} props.data - 节点数据
 * @param {string} props.mode - 显示模式(compact/detail)
 * @returns {React.ReactElement} 交换机节点
 */
function SwitchNode({ data, mode = 'compact' }) {
  return <NodeShell data={data} type="switch" mode={mode} />;
}

export default SwitchNode;
