import React from 'react';

/**
 * 统一设备图标库
 * 参考 Visio/Cisco 等距投影风格,扁平化 SVG 设计
 * 每个图标 48x48 viewBox,使用 currentColor 继承主题色
 */

/**
 * 交换机图标:扁平矩形机箱 + 端口阵列 + 状态 LED
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 交换机 SVG
 */
export function SwitchIcon({ color = '#1890ff', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 机箱主体 */}
      <rect x="4" y="14" width="40" height="20" rx="2" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 顶部状态条 */}
      <rect x="6" y="16" width="36" height="3" rx="0.5" fill={`${color}30`} />
      {/* 状态 LED */}
      <circle cx="9" cy="17.5" r="0.8" fill="#52c41a" />
      <circle cx="12" cy="17.5" r="0.8" fill={color} />
      <circle cx="15" cy="17.5" r="0.8" fill="#faad14" />
      {/* 端口阵列(2 行 x 8 列) */}
      {[0, 1].map(row =>
        [0, 1, 2, 3, 4, 5, 6, 7].map(col => (
          <rect
            key={`port-${row}-${col}`}
            x={8 + col * 4}
            y={21 + row * 4}
            width="3"
            height="2.5"
            rx="0.3"
            fill={row === 0 && col < 6 ? color : `${color}40`}
            opacity={row === 0 && col < 6 ? 0.8 : 0.4}
          />
        ))
      )}
      {/* 底部散热槽 */}
      <rect x="6" y="30" width="36" height="1.5" rx="0.3" fill={`${color}20`} />
      {/* 右侧 SFP 光口 */}
      <rect x="38" y="22" width="4" height="6" rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.5" />
    </svg>
  );
}

/**
 * 路由器图标:圆柱体 + 双向箭头 + WAN/LAN 标识
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 路由器 SVG
 */
export function RouterIcon({ color = '#722ed1', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 圆柱体主体(俯视) */}
      <ellipse cx="24" cy="14" rx="18" ry="5" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 圆柱侧面 */}
      <path
        d="M 6 14 L 6 24 Q 6 29 24 29 Q 42 29 42 24 L 42 14"
        fill={`${color}10`}
        stroke={color}
        strokeWidth="1.5"
      />
      {/* 圆柱底部曲线 */}
      <path d="M 6 24 Q 24 29 42 24" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 1" opacity="0.5" />
      {/* 双向箭头(表示路由转发) */}
      <g transform="translate(24, 19)">
        {/* 左箭头 */}
        <path d="M -10 0 L -4 -2 L -4 -0.5 L 4 -0.5 L 4 0.5 L -4 0.5 L -4 2 Z" fill={color} opacity="0.8" />
      </g>
      {/* 上方 WAN 标识(向上箭头) */}
      <g transform="translate(24, 8)">
        <path d="M 0 0 L -3 3 L -1 3 L -1 5 L 1 5 L 1 3 L 3 3 Z" fill={color} />
      </g>
      {/* 左右 LAN 接口指示 */}
      <circle cx="14" cy="20" r="1.2" fill={color} opacity="0.7" />
      <circle cx="34" cy="20" r="1.2" fill={color} opacity="0.7" />
      {/* 状态 LED */}
      <circle cx="18" cy="14" r="0.8" fill="#52c41a" />
      <circle cx="30" cy="14" r="0.8" fill={color} />
    </svg>
  );
}

/**
 * 服务器图标:机箱 + 硬盘托架 + 状态 LED 阵列
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 服务器 SVG
 */
export function ServerIcon({ color = '#52c41a', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 机箱外框 */}
      <rect x="8" y="4" width="32" height="40" rx="2" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 服务器单元 1 */}
      <rect x="10" y="6" width="28" height="10" rx="1" fill={`${color}10`} stroke={color} strokeWidth="0.8" />
      {/* 单元 1 硬盘托架 */}
      <rect x="12" y="8" width="8" height="6" rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.4" />
      <circle cx="14" cy="11" r="0.5" fill={color} />
      {/* 单元 1 状态 LED */}
      <circle cx="34" cy="9" r="0.6" fill="#52c41a" />
      <circle cx="36" cy="9" r="0.6" fill={color} />
      {/* 单元 1 电源按钮 */}
      <circle cx="36" cy="13" r="0.8" fill="none" stroke={color} strokeWidth="0.4" />
      {/* 服务器单元 2 */}
      <rect x="10" y="18" width="28" height="10" rx="1" fill={`${color}10`} stroke={color} strokeWidth="0.8" />
      <rect x="12" y="20" width="8" height="6" rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.4" />
      <circle cx="14" cy="23" r="0.5" fill={color} />
      <circle cx="34" cy="21" r="0.6" fill="#52c41a" />
      <circle cx="36" cy="21" r="0.6" fill={color} />
      <circle cx="36" cy="25" r="0.8" fill="none" stroke={color} strokeWidth="0.4" />
      {/* 服务器单元 3 */}
      <rect x="10" y="30" width="28" height="10" rx="1" fill={`${color}10`} stroke={color} strokeWidth="0.8" />
      <rect x="12" y="32" width="8" height="6" rx="0.5" fill={`${color}30`} stroke={color} strokeWidth="0.4" />
      <circle cx="14" cy="35" r="0.5" fill={color} />
      <circle cx="34" cy="33" r="0.6" fill="#faad14" />
      <circle cx="36" cy="33" r="0.6" fill={color} />
      <circle cx="36" cy="37" r="0.8" fill="none" stroke={color} strokeWidth="0.4" />
    </svg>
  );
}

/**
 * 存储图标:磁盘阵列 + 指示灯
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 存储 SVG
 */
export function StorageIcon({ color = '#fa8c16', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 存储柜外框 */}
      <rect x="6" y="4" width="36" height="40" rx="2" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 磁盘阵列(4 行) */}
      {[0, 1, 2, 3].map(row => (
        <g key={`disk-${row}`}>
          <rect
            x="8"
            y={6 + row * 9}
            width="32"
            height="7"
            rx="0.8"
            fill={`${color}20`}
            stroke={color}
            strokeWidth="0.6"
          />
          {/* 磁盘拉把 */}
          <rect x="10" y={8 + row * 9} width="6" height="3" rx="0.3" fill={`${color}40`} />
          {/* 磁盘状态 LED */}
          <circle cx="36" cy={9.5 + row * 9} r="0.7" fill={row === 2 ? '#faad14' : '#52c41a'} />
          <circle cx="38" cy={9.5 + row * 9} r="0.7" fill={color} opacity="0.6" />
        </g>
      ))}
      {/* 底部控制模块 */}
      <rect x="8" y="42" width="32" height="1.5" rx="0.3" fill={`${color}30`} />
    </svg>
  );
}

/**
 * 防火墙图标:砖墙图案 + 盾牌
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 防火墙 SVG
 */
export function FirewallIcon({ color = '#eb595a', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 砖墙外框 */}
      <rect x="4" y="8" width="40" height="32" rx="2" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 砖块图案(3 行) */}
      {[0, 1, 2].map(row => (
        <g key={`brick-${row}`}>
          {/* 砖块横线 */}
          <line
            x1="4"
            y1={16 + row * 8}
            x2="44"
            y2={16 + row * 8}
            stroke={color}
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* 砖块竖线(错位) */}
          {row % 2 === 0
            ? [0, 1, 2, 3].map(col => (
                <line
                  key={`v-${row}-${col}`}
                  x1={10 + col * 8}
                  y1={8 + row * 8}
                  x2={10 + col * 8}
                  y2={16 + row * 8}
                  stroke={color}
                  strokeWidth="0.6"
                  opacity="0.4"
                />
              ))
            : [0, 1, 2, 3, 4].map(col => (
                <line
                  key={`v-${row}-${col}`}
                  x1={6 + col * 8}
                  y1={16 + row * 8}
                  x2={6 + col * 8}
                  y2={24 + row * 8}
                  stroke={color}
                  strokeWidth="0.6"
                  opacity="0.4"
                />
              ))}
        </g>
      ))}
      {/* 中央盾牌(安全标识) */}
      <path
        d="M 24 14 L 30 17 L 30 24 Q 30 28 24 30 Q 18 28 18 24 L 18 17 Z"
        fill="#fff"
        stroke={color}
        strokeWidth="1.2"
      />
      {/* 盾牌中央对勾 */}
      <path d="M 21 22 L 23.5 24.5 L 27.5 20" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* 顶部状态 LED */}
      <circle cx="10" cy="11" r="0.8" fill="#52c41a" />
      <circle cx="38" cy="11" r="0.8" fill={color} />
    </svg>
  );
}

/**
 * 通用设备图标:机箱样式
 * @param {Object} props - 组件属性
 * @param {string} props.color - 主题色
 * @param {number} props.size - 图标尺寸
 * @returns {React.ReactElement} 通用设备 SVG
 */
export function DefaultIcon({ color = '#8c8c8c', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 机箱外框 */}
      <rect x="6" y="8" width="36" height="32" rx="2" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
      {/* 顶部状态条 */}
      <rect x="8" y="10" width="32" height="3" rx="0.5" fill={`${color}30`} />
      {/* 状态 LED */}
      <circle cx="11" cy="11.5" r="0.8" fill="#52c41a" />
      <circle cx="14" cy="11.5" r="0.8" fill={color} />
      <circle cx="17" cy="11.5" r="0.8" fill="#faad14" />
      {/* 中部网格(模拟设备插槽) */}
      {[0, 1, 2].map(row =>
        [0, 1, 2, 3].map(col => (
          <rect
            key={`slot-${row}-${col}`}
            x={10 + col * 7}
            y={16 + row * 6}
            width="5"
            height="4"
            rx="0.3"
            fill={`${color}25`}
            stroke={color}
            strokeWidth="0.3"
          />
        ))
      )}
      {/* 底部信息条 */}
      <rect x="8" y="35" width="32" height="3" rx="0.5" fill={`${color}20`} />
    </svg>
  );
}

/**
 * 设备类型 → 图标组件映射
 */
const ICON_MAP = {
  switch: SwitchIcon,
  router: RouterIcon,
  server: ServerIcon,
  storage: StorageIcon,
  firewall: FirewallIcon,
  default: DefaultIcon
};

/**
 * 按设备类型获取图标组件
 * @param {string} type - 设备类型
 * @returns {React.ComponentType} 图标组件
 */
export function getDeviceIcon(type) {
  return ICON_MAP[type] || ICON_MAP.default;
}

export default {
  SwitchIcon,
  RouterIcon,
  ServerIcon,
  StorageIcon,
  FirewallIcon,
  DefaultIcon,
  getDeviceIcon
};
