import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Typography, Segmented, Tooltip, Button, message } from 'antd';
import { AppstoreOutlined, GoldOutlined, FullscreenOutlined, FullscreenExitOutlined, CameraOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { toPng } from 'html-to-image';
import { SwitchNode, ServerNode, RouterNode, StorageNode, GenericNode, FirewallNode, getNodeSize } from './nodes';
import CustomEdge from './CustomEdge';
import { topologyAPI } from '../../api';

const { Text: AntText } = Typography;

const DEVICE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  firewall: '#eb595a',
  default: '#8c8c8c'
};

const CABLE_COLORS = {
  ethernet: '#1890ff',
  fiber: '#13c2c2',
  copper: '#fa8c16'
};

/**
 * 缩放阈值
 * zoom < COMPACT_THRESHOLD:强制紧凑模式
 * zoom >= DETAIL_THRESHOLD:允许详细模式
 * 中间区间跟随用户选择
 */
const COMPACT_THRESHOLD = 0.6;
const DETAIL_THRESHOLD = 1.0;

/**
 * 节点宽高常量(根据模式动态返回)
 * 紧凑模式:96x96(所有设备类型统一)
 * 详细模式:180x140(所有设备类型统一)
 * @param {string} mode - 显示模式
 * @returns {{width:number, height:number}} 尺寸
 */
function getNodeTypeSize(mode = 'compact') {
  return getNodeSize(mode);
}

/**
 * 根据节点角色生成四方向 Handle 配置
 * - 中心节点(交换机):四方向各 2 个 source Handle + 四方向中点 1 个 target Handle,模拟全端口阵列
 * - 周边设备:四方向各 1 个 source + 1 个 target,支持任意方向接入
 * @param {Object} node - 节点数据
 * @param {string} mode - 显示模式(compact/detail)
 * @returns {Array} Handle 配置数组
 */
function getHandleConfigs(node, mode = 'compact') {
  if (!node) return [];

  const { width, height } = getNodeTypeSize(mode);
  const handles = [];

  if (node.isCenter) {
    // 中心节点:四方向各 2 个 source Handle(共 8 个,代表端口阵列)
    // 每个方向上的两个 Handle 分别位于 1/3 和 2/3 处
    const positions = [
      { pos: Position.Top, axis: 'x', range: width, prefix: 'top' },
      { pos: Position.Bottom, axis: 'x', range: width, prefix: 'bottom' },
      { pos: Position.Left, axis: 'y', range: height, prefix: 'left' },
      { pos: Position.Right, axis: 'y', range: height, prefix: 'right' }
    ];

    positions.forEach(({ pos, axis, range, prefix }) => {
      // 两个 source Handle 位于 1/3 和 2/3 处
      handles.push({
        id: `${prefix}-0`,
        type: 'source',
        position: pos,
        [axis]: range / 3
      });
      handles.push({
        id: `${prefix}-1`,
        type: 'source',
        position: pos,
        [axis]: (range * 2) / 3
      });
      // 一个 target Handle 位于中点
      handles.push({
        id: `${prefix}-t`,
        type: 'target',
        position: pos,
        [axis]: range / 2
      });
    });
  } else {
    // 周边设备:四方向各 1 个 source + 1 个 target,位于中点
    [
      { pos: Position.Top, axis: 'x', range: width, prefix: 'top' },
      { pos: Position.Bottom, axis: 'x', range: width, prefix: 'bottom' },
      { pos: Position.Left, axis: 'y', range: height, prefix: 'left' },
      { pos: Position.Right, axis: 'y', range: height, prefix: 'right' }
    ].forEach(({ pos, axis, range, prefix }) => {
      handles.push({
        id: `${prefix}-s`,
        type: 'source',
        position: pos,
        [axis]: range / 2
      });
      handles.push({
        id: `${prefix}-t`,
        type: 'target',
        position: pos,
        [axis]: range / 2
      });
    });
  }

  return handles;
}

/**
 * 根据周边设备相对中心节点的方位角度,选择中心节点上最近的 Handle 方向
 * @param {Object} sourcePos - 源节点位置
 * @param {Object} targetPos - 目标节点位置
 * @returns {string} 方向前缀(top/bottom/left/right)
 */
function getDirectionByAngle(sourcePos, targetPos) {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180 ~ 180

  // 将角度映射到四个方向:
  // right: -45 ~ 45
  // bottom: 45 ~ 135
  // left: 135 ~ 180 或 -180 ~ -135
  // top: -135 ~ -45
  if (angle >= -45 && angle < 45) return 'right';
  if (angle >= 45 && angle < 135) return 'bottom';
  if (angle >= -135 && angle < -45) return 'top';
  return 'left';
}

/**
 * 获取某方向上相反方向的前缀(用于周边设备选择朝向中心的 Handle)
 * @param {string} dir - 方向前缀
 * @returns {string} 相反方向前缀
 */
function getOppositeDirection(dir) {
  return { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[dir] || 'left';
}

/**
 * 设备节点容器:根据 data.type 分发到具体节点组件
 * 支持紧凑/详细双模式渲染,通过缩放级别或用户切换驱动
 * @param {Object} props - 节点属性
 * @param {Object} props.data - 节点数据(含 mode 字段决定渲染模式)
 * @returns {React.ReactElement} 设备节点
 */
function DeviceNode({ data }) {
  if (!data) {
    return (
      <div style={{ width: 96, height: 96, color: 'rgba(0,0,0,0.35)' }}>
        <AntText type="secondary">无数据</AntText>
      </div>
    );
  }

  const nodeType = data.type || 'default';
  const mode = data.mode || 'compact';

  // 获取 Handle 配置(基于当前模式)
  const handleConfigs = getHandleConfigs(data, mode);

  // 渲染单个 Handle(浅色主题:source 设备主色,target 白色描边)
  const renderHandle = (config) => {
    const isCenter = data.isCenter;
    const handleColor = DEVICE_COLORS[nodeType] || DEVICE_COLORS.default;
    const isSource = config.type === 'source';

    const bgColor = isSource ? handleColor : '#fff';
    const borderColor = isSource ? '#fff' : handleColor;
    const glow = isSource
      ? (isCenter ? `0 0 8px ${handleColor}aa` : `0 0 4px ${handleColor}88`)
      : `0 0 3px ${handleColor}55`;

    // 根据 Handle 位置方向确定定位属性(top/left)
    const isHorizontal = config.position === Position.Left || config.position === Position.Right;
    const positionStyle = isHorizontal
      ? { top: config.y, left: undefined }
      : { left: config.x, top: undefined };

    return (
      <Handle
        key={config.id}
        id={config.id}
        type={config.type}
        position={config.position}
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          width: isSource ? 10 : 8,
          height: isSource ? 10 : 8,
          borderRadius: '50%',
          boxShadow: glow,
          cursor: 'crosshair',
          transition: 'all 0.2s ease',
          ...positionStyle
        }}
      />
    );
  };

  return (
    <>
      {/* 渲染所有 Handle(接入点) */}
      {handleConfigs.map(renderHandle)}
      {nodeType === 'switch' && <SwitchNode data={data} mode={mode} />}
      {nodeType === 'server' && <ServerNode data={data} mode={mode} />}
      {nodeType === 'router' && <RouterNode data={data} mode={mode} />}
      {nodeType === 'storage' && <StorageNode data={data} mode={mode} />}
      {nodeType === 'firewall' && <FirewallNode data={data} mode={mode} />}
      {(nodeType === 'default' || !['switch', 'server', 'router', 'storage', 'firewall'].includes(nodeType)) && <GenericNode data={data} mode={mode} />}
    </>
  );
}

const nodeTypes = {
  device: DeviceNode
};

const edgeTypes = {
  custom: CustomEdge
};

/**
 * 网络拓扑分层布局算法
 * 按网络层级垂直分层,同层设备水平排列,父节点尽量在子节点中间
 *
 * 层级推断:
 *   L0:路由器/防火墙(网关层,最顶)
 *   L1-Ln:交换机(通过 BFS 从 L0 向下推断,平级交换机同层)
 *   Ln+1:终端设备(服务器/存储/其他,放在其连接的交换机下方)
 *
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组(用于推断层级关系)
 * @param {string} mode - 显示模式(影响布局间距)
 * @returns {Array} 带位置信息的节点
 */
function layoutNodes(nodes, edges = [], mode = 'compact') {
  if (!nodes || nodes.length === 0) return [];

  const isCompact = mode === 'compact';
  const NODE_WIDTH = isCompact ? 120 : 210;        // 节点宽度(含余量,详细模式适配 180 宽)
  const NODE_GAP = isCompact ? 40 : 70;            // 同层节点间水平间距
  const LAYER_HEIGHT = isCompact ? 180 : 180;      // 层间距(垂直,详细模式适配 140 高 + 上下间距)

  // ---------- 第 1 步:构build邻接表(无向图) ----------
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    if (adj[e.source] && adj[e.target]) {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    }
  });

  // ---------- 第 2 步:推断每个节点的层级 ----------
  const layer = {};
  const SWITCH_MAX_LAYER = 3; // 交换机最多到 L3,避免过深

  // 初始层级:按设备类型
  nodes.forEach(n => {
    if (n.type === 'router' || n.type === 'firewall') {
      layer[n.id] = 0;
    } else if (n.type === 'switch') {
      layer[n.id] = 1; // 默认 L1,后续 BFS 调整
    } else {
      layer[n.id] = 2; // 终端设备默认 L2,后续 BFS 调整
    }
  });

  // BFS 从 L0 设备开始,向下推断层级
  // 规则:交换机层级 = 上级层级 + 1(不超过 SWITCH_MAX_LAYER)
  //       终端设备层级 = 上级交换机层级 + 1
  const visited = new Set();
  const queue = [];

  // 入队所有 L0 设备(路由器/防火墙)
  nodes.forEach(n => {
    if (layer[n.id] === 0) {
      queue.push(n.id);
      visited.add(n.id);
    }
  });

  // 如果没有 L0 设备,则找顶级交换机(没有连接到其他交换机/路由器的交换机)作为根
  if (queue.length === 0) {
    const switches = nodes.filter(n => n.type === 'switch');
    switches.forEach(sw => {
      // 检查是否连接到其他交换机或路由器(上级)
      const hasUplink = adj[sw.id].some(neighborId => {
        const neighbor = nodes.find(n => n.id === neighborId);
        return neighbor && (neighbor.type === 'switch' || neighbor.type === 'router');
      });
      if (!hasUplink) {
        layer[sw.id] = 0;
        queue.push(sw.id);
        visited.add(sw.id);
      }
    });
  }

  while (queue.length > 0) {
    const cur = queue.shift();
    adj[cur].forEach(neighborId => {
      if (visited.has(neighborId)) return;
      const neighborNode = nodes.find(n => n.id === neighborId);
      if (!neighborNode) return;

      if (neighborNode.type === 'switch') {
        // 交换机层级 = 上级 + 1,但不超过 SWITCH_MAX_LAYER
        layer[neighborId] = Math.min(SWITCH_MAX_LAYER, layer[cur] + 1);
      } else {
        // 终端设备层级 = 上级交换机 + 1
        layer[neighborId] = layer[cur] + 1;
      }
      visited.add(neighborId);
      queue.push(neighborId);
    });
  }

  // 未访问的孤立设备保持默认层级

  // ---------- 第 3 步:按层级分组 ----------
  const layerMap = {};
  nodes.forEach(n => {
    const l = layer[n.id] ?? 2;
    if (!layerMap[l]) layerMap[l] = [];
    layerMap[l].push(n);
  });

  const layerKeys = Object.keys(layerMap).map(Number).sort((a, b) => a - b);

  // ---------- 第 4 步:计算每层节点的 X 坐标 ----------
  // 策略:同层设备水平居中均匀排列
  const positions = {};

  layerKeys.forEach(layerNum => {
    const layerNodes = layerMap[layerNum];
    const totalWidth = layerNodes.length * NODE_WIDTH + (layerNodes.length - 1) * NODE_GAP;
    const startX = -totalWidth / 2;

    layerNodes.forEach((node, i) => {
      positions[node.id] = {
        x: startX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2,
        y: layerNum * LAYER_HEIGHT
      };
    });
  });

  return nodes.map(node => ({
    ...node,
    position: positions[node.id] || { x: 0, y: 0 }
  }));
}

/**
 * 为边智能分配 sourceHandle 和 targetHandle
 * 算法:
 * 1. 根据源/目标节点的相对方位,确定连接方向(上/下/左/右)
 * 2. 中心节点:按方位选择对应方向的 Handle,同方向多个 Handle 按端口序号轮询
 * 3. 周边设备:选择朝向连接方向的 Handle(若朝向中心,则选择中心所在方向的反方向)
 * @param {Array} edges - 边数组
 * @param {Array} nodes - 节点数组(含位置信息)
 * @param {Object} centerNode - 中心节点
 * @returns {Array} 处理后的边
 */
function assignHandles(edges, nodes, centerNode) {
  if (!edges || edges.length === 0) return [];

  // 构建节点位置查找表
  const nodeMap = new Map();
  nodes.forEach(n => {
    nodeMap.set(n.id, {
      position: n.position,
      isCenter: n.isCenter,
      type: n.type
    });
  });

  // 按方向分组统计中心节点的出/入边,用于同方向 Handle 轮询分配
  const centerSourceByDir = { top: [], bottom: [], left: [], right: [] };
  const centerTargetByDir = { top: [], bottom: [], left: [], right: [] };

  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    // 中心节点作为 source:根据 target 相对中心的位置确定方向
    if (sourceNode.isCenter) {
      const dir = getDirectionByAngle(sourceNode.position, targetNode.position);
      centerSourceByDir[dir].push(edge);
    }
    // 中心节点作为 target:根据 source 相对中心的位置确定方向
    else if (targetNode.isCenter) {
      const dir = getDirectionByAngle(targetNode.position, sourceNode.position);
      centerTargetByDir[dir].push(edge);
    }
  });

  // 为同方向的边按端口序号排序,便于轮询分配 Handle
  const sortByIdx = (a, b) => {
    const portA = parseInt(a.sourcePort?.match(/\d+/)?.[0] || '0', 10);
    const portB = parseInt(b.sourcePort?.match(/\d+/)?.[0] || '0', 10);
    return portA - portB;
  };

  Object.keys(centerSourceByDir).forEach(dir => {
    centerSourceByDir[dir].sort(sortByIdx);
  });
  Object.keys(centerTargetByDir).forEach(dir => {
    centerTargetByDir[dir].sort(sortByIdx);
  });

  // 记录每条边的 Handle 分配
  const edgeHandleMap = new Map();

  // 中心节点作为 source:同方向 2 个 Handle 轮询
  Object.keys(centerSourceByDir).forEach(dir => {
    const dirEdges = centerSourceByDir[dir];
    dirEdges.forEach((edge, idx) => {
      const handleIdx = idx % 2; // 0 或 1(每个方向 2 个 source Handle)
      // 周边设备 target:选择朝向中心的方向(即 dir 的反方向)
      const targetDir = getOppositeDirection(dir);
      edgeHandleMap.set(edge.id, {
        sourceHandle: `${dir}-${handleIdx}`,
        targetHandle: `${targetDir}-t`
      });
    });
  });

  // 中心节点作为 target:同方向 1 个 target Handle
  Object.keys(centerTargetByDir).forEach(dir => {
    const dirEdges = centerTargetByDir[dir];
    dirEdges.forEach((edge) => {
      // 周边设备 source:选择朝向中心的方向(即 dir 的反方向)
      const sourceDir = getOppositeDirection(dir);
      edgeHandleMap.set(edge.id, {
        sourceHandle: `${sourceDir}-s`,
        targetHandle: `${dir}-t`
      });
    });
  });

  // 处理非中心节点之间的连接(若存在)
  edges.forEach(edge => {
    if (edgeHandleMap.has(edge.id)) return;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    const dir = getDirectionByAngle(sourceNode.position, targetNode.position);
    const oppositeDir = getOppositeDirection(dir);
    edgeHandleMap.set(edge.id, {
      sourceHandle: `${dir}-s`,
      targetHandle: `${oppositeDir}-t`
    });
  });

  return edges.map(edge => {
    const handle = edgeHandleMap.get(edge.id);
    return {
      ...edge,
      sourceHandle: handle?.sourceHandle || null,
      targetHandle: handle?.targetHandle || null
    };
  });
}

/**
 * 拓扑图主组件(浅色主题 + 双模式节点)
 * - 默认紧凑模式,缩放级别 >= DETAIL_THRESHOLD 自动切换到详细模式
 * - 用户可通过右下角切换器手动锁定模式
 * @param {Object} props - 组件属性
 * @param {Array} props.nodes - 节点数据
 * @param {Array} props.edges - 边数据
 * @param {Function} props.onNodeClick - 节点点击回调
 * @param {Function} props.onEdgeClick - 边点击回调
 * @param {Object} props.selectedNode - 当前选中节点
 * @param {Object} props.selectedEdge - 当前选中边
 * @returns {React.ReactElement} 拓扑图
 */
function TopologyGraph({ nodes, edges, onNodeClick, onEdgeClick, selectedNode, selectedEdge, layoutKey }) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  // 用户手动选择:auto / compact / detail
  const [modePreference, setModePreference] = useState('auto');
  // 当前实际生效的模式
  const [currentMode, setCurrentMode] = useState('compact');
  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 截图状态
  const [isCapturing, setIsCapturing] = useState(false);
  // 布局保存状态
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [hasSavedLayout, setHasSavedLayout] = useState(false);
  // 标记用户是否手动拖拽过节点(用于决定是否显示"保存布局"提示)
  const [layoutModified, setLayoutModified] = useState(false);
  // 已保存的布局数据(state,API 返回后触发重新渲染以应用保存的位置)
  const [savedLayout, setSavedLayout] = useState(null);
  // 标记 savedLayout 是否已加载完成(无论是否有保存的布局,只要 API 请求完成就是 true)
  const [savedLayoutLoaded, setSavedLayoutLoaded] = useState(false);
  // 标记是否已为当前 layoutKey 应用过布局(无论是自动还是保存的)
  const layoutAppliedForKeyRef = useRef(null);
  // 标记是否已为当前 layoutKey 应用过保存的布局(避免重复应用)
  const savedAppliedForKeyRef = useRef(null);
  const containerRef = useRef(null);
  // ReactFlow 实例(用于截图时保存/恢复视口)
  const rfInstanceRef = useRef(null);
  // fitView 初始缩放基准(用于区分"初始适配"与"用户主动放大")
  const fitZoomRef = useRef(null);
  const hasRecordedFitZoom = useRef(false);

  // 全屏切换:使用浏览器原生 Fullscreen API
  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // 监听全屏状态变化(兼容 ESC 退出)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // 缩放级别检测:仅在用户"主动放大超过 fitView 基准"时才切到详细模式
  // 这样加载时即使 fitView 把 zoom 拉到 >1.0,也保持紧凑概览
  const onMove = useCallback((event, viewport) => {
    if (modePreference !== 'auto') return;
    const zoom = viewport?.zoom || 1;

    // 首次 onMove:记录 fitView 基准缩放,不切换模式(保持 compact)
    if (!hasRecordedFitZoom.current) {
      fitZoomRef.current = zoom;
      hasRecordedFitZoom.current = true;
      return;
    }

    const fitZoom = fitZoomRef.current || 1;
    // detail 触发阈值:取 DETAIL_THRESHOLD 与 (fitZoom + 0.2) 的较大值
    // 确保用户必须主动放大超过加载时的缩放,才切到详细
    const detailThreshold = Math.max(DETAIL_THRESHOLD, fitZoom + 0.2);
    const newMode = zoom < COMPACT_THRESHOLD
      ? 'compact'
      : (zoom >= detailThreshold ? 'detail' : currentMode);

    if (newMode !== currentMode) {
      // 模式切换只更新尺寸,不重新布局(保留用户手动调整的位置)
      // 详细模式节点更宽,如出现重叠用户可手动拖拽或点 fitView
      setCurrentMode(newMode);
    }
  }, [modePreference, currentMode]);

  // 用户切换模式时,只更新尺寸不重新布局(保留位置)
  const handleModeChange = useCallback((value) => {
    setModePreference(value);
    // 切回 auto 时重置 fitView 基准,保持当前模式,等下次缩放触发
    if (value === 'auto') {
      hasRecordedFitZoom.current = false;
      fitZoomRef.current = null;
      return;
    }
    setCurrentMode(value);
  }, []);

  /**
   * 截图功能:切换到详细模式 + 2x 高清截图
   * 保留用户手动调整的节点位置和视口,截图后恢复
   */
  const handleScreenshot = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    // 保存当前模式 + 节点位置 + 视口(截图后恢复)
    const prevMode = modePreference;
    const prevCurrentMode = currentMode;
    const savedPositions = flowNodes.map(n => ({ id: n.id, position: { ...n.position } }));
    const savedViewport = rfInstanceRef.current?.getViewport?.();

    try {
      // 1. 切换到详细模式(确保设备信息可见)
      //    不触发重新布局(layoutAppliedRef 保持 true),保留用户手动调整的位置
      if (currentMode !== 'detail') {
        setModePreference('detail');
        setCurrentMode('detail');
        // 注意:不设置 layoutAppliedRef.current = false,避免重新布局破坏位置
      }

      // 2. 等待 React 重新渲染节点(尺寸变化)
      await new Promise(resolve => setTimeout(resolve, 350));

      // 3. 找到 ReactFlow 画布元素
      const flowEl = containerRef.current?.querySelector('.react-flow');
      if (!flowEl) {
        message.error('未找到拓扑图画布');
        return;
      }

      // 4. html-to-image 截图(对 SVG 连线支持更好,2x 高清)
      const dataUrl = await toPng(flowEl, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,               // 2 倍像素,保证文字清晰
        cacheBust: true,
        skipFonts: false,
        filter: (node) => {
          // 跳过 ReactFlow 内置控件(Controls/MiniMap/Attribution),只保留画布
          if (node?.classList?.contains('react-flow__controls')) return false;
          if (node?.classList?.contains('react-flow__minimap')) return false;
          if (node?.classList?.contains('react-flow__attribution')) return false;
          return true;
        }
      });

      // 5. 下载图片
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const link = document.createElement('a');
      link.download = `拓扑图_${timestamp}.png`;
      link.href = dataUrl;
      link.click();

      message.success('截图已保存');
    } catch (error) {
      console.error('截图失败:', error);
      message.error('截图失败,请重试');
    } finally {
      // 6. 恢复原模式
      setModePreference(prevMode);
      setCurrentMode(prevCurrentMode);

      // 7. 恢复节点位置(防止模式切换触发的布局副作用)
      await new Promise(resolve => setTimeout(resolve, 50));
      setFlowNodes(nodes => nodes.map(n => {
        const saved = savedPositions.find(s => s.id === n.id);
        return saved ? { ...n, position: saved.position } : n;
      }));

      // 8. 恢复视口
      if (savedViewport && rfInstanceRef.current?.setViewport) {
        await new Promise(resolve => setTimeout(resolve, 50));
        rfInstanceRef.current.setViewport(savedViewport, { duration: 0 });
      }

      setIsCapturing(false);
    }
  }, [isCapturing, modePreference, currentMode, flowNodes, setFlowNodes]);

  // 加载已保存的布局(layoutKey 变化时触发)
  useEffect(() => {
    if (!layoutKey) {
      setSavedLayout(null);
      setHasSavedLayout(false);
      setSavedLayoutLoaded(false);
      layoutAppliedForKeyRef.current = null;
      savedAppliedForKeyRef.current = null;
      return;
    }

    // layoutKey 变化时,重置布局应用标记和加载状态
    layoutAppliedForKeyRef.current = null;
    savedAppliedForKeyRef.current = null;
    setSavedLayoutLoaded(false);
    setSavedLayout(null);
    setHasSavedLayout(false);

    let cancelled = false;
    (async () => {
      try {
        const res = await topologyAPI.getLayout(layoutKey);
        if (cancelled) return;
        if (res) {
          // 附带 layoutKey,后续 effect 校验数据是否属于当前视图
          setSavedLayout({ ...res, layoutKey });
          setHasSavedLayout(true);
        }
      } catch (err) {
        // 静默失败(可能是未登录或网络错误)
      } finally {
        if (!cancelled) {
          setSavedLayoutLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [layoutKey]);

  // 用于取消待处理的 fitView/setViewport 定时器
  const viewportTimerRef = useRef(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (viewportTimerRef.current) {
        clearTimeout(viewportTimerRef.current);
      }
    };
  }, []);

  // 布局应用逻辑统一在下方"节点初始化 + 智能布局" effect 中处理
  // 通过 savedLayoutAppliedRef 标记判断是否需要应用保存的布局,避免时序竞争

  /**
   * 保存当前布局到后端
   * 持久化节点位置 + 视口状态,下次打开时恢复
   */
  const handleSaveLayout = useCallback(async () => {
    if (!layoutKey) {
      message.warning('当前视图不支持保存布局');
      return;
    }
    if (flowNodes.length === 0) {
      message.warning('暂无节点可保存');
      return;
    }
    setIsSavingLayout(true);
    try {
      const nodesData = flowNodes.map(n => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      }));
      const viewport = rfInstanceRef.current?.getViewport?.() || null;
      await topologyAPI.saveLayout({ layoutKey, nodesData, viewport });
      setHasSavedLayout(true);
      setLayoutModified(false);
      // 同步更新 savedLayout state(附带 layoutKey),标记已应用
      setSavedLayout({ nodesData, viewport, layoutKey });
      layoutAppliedForKeyRef.current = layoutKey;
      savedAppliedForKeyRef.current = layoutKey;
      message.success('布局已保存,下次打开将恢复此布局');
    } catch (err) {
      message.error('保存失败:' + (err?.response?.data?.error || err?.message || '未知错误'));
    } finally {
      setIsSavingLayout(false);
    }
  }, [layoutKey, flowNodes]);

  /**
   * 重置布局(删除已保存的布局,恢复自动布局)
   */
  const handleResetLayout = useCallback(async () => {
    if (!layoutKey || !hasSavedLayout) {
      // 本地重置:直接重新布局
      layoutAppliedForKeyRef.current = null;
      savedAppliedForKeyRef.current = null;
      setHasSavedLayout(false);
      setSavedLayout(null);
      setLayoutModified(false);
      message.info('已重置为自动布局');
      return;
    }
    setIsSavingLayout(true);
    try {
      await topologyAPI.deleteLayout(layoutKey);
      setSavedLayout(null);
      setHasSavedLayout(false);
      setLayoutModified(false);
      layoutAppliedForKeyRef.current = null;
      savedAppliedForKeyRef.current = null;
      message.success('已删除保存的布局,恢复自动布局');
    } catch (err) {
      message.error('重置失败:' + (err?.response?.data?.error || err?.message || '未知错误'));
    } finally {
      setIsSavingLayout(false);
    }
  }, [layoutKey, hasSavedLayout]);

  // 节点拖拽结束:标记布局已修改
  const onNodeDragStop = useCallback(() => {
    setLayoutModified(true);
  }, []);

  /**
   * 核心布局应用 effect:只负责计算和应用节点位置(自动布局或保存的布局)
   * 不处理 selected/hovered/mode 等状态更新,避免状态变化触发重新布局覆盖用户位置
   *
   * 关键改进:等待 savedLayoutLoaded 为 true 后才应用布局,避免竞态条件
   */
  useEffect(() => {
    // 清理之前的视口定时器,避免多个定时器竞争
    if (viewportTimerRef.current) {
      clearTimeout(viewportTimerRef.current);
      viewportTimerRef.current = null;
    }

    if (!nodes || nodes.length === 0 || !layoutKey) {
      setFlowNodes([]);
      return;
    }

    // 等待 savedLayout 加载完成(无论是否有保存的布局)
    // 这样可以避免拓扑数据先到就应用自动布局,之后保存布局返回又覆盖的竞态问题
    if (!savedLayoutLoaded) {
      return;
    }

    // 校验 savedLayout 是否属于当前 layoutKey
    const savedMatchesCurrent = savedLayout && savedLayout.layoutKey === layoutKey;
    const savedPositions = savedMatchesCurrent ? savedLayout.nodesData : null;
    const savedViewport = savedMatchesCurrent ? savedLayout.viewport : null;
    const hasSaved = Array.isArray(savedPositions) && savedPositions.length > 0;

    // 判断是否需要应用布局:
    // 1. 还没有为当前 key 应用过任何布局(首次加载)
    // 2. 有保存的布局,但还没有为当前 key 应用过保存的布局(处理异步返回的情况)
    const needApplyAuto = layoutAppliedForKeyRef.current !== layoutKey;
    const needApplySaved = hasSaved && savedAppliedForKeyRef.current !== layoutKey;
    const needApplyLayout = needApplyAuto || needApplySaved;

    if (!needApplyLayout) {
      return;
    }

    // 计算自动布局
    const layoutedNodes = layoutNodes(nodes, edges, currentMode);

    // 如果有保存的布局,优先使用保存的位置;否则使用自动布局位置
    const finalNodes = layoutedNodes.map(node => {
      const saved = hasSaved ? savedPositions.find(s => s.id === node.id) : null;
      const position = saved ? { x: saved.x, y: saved.y } : node.position;
      return {
        id: node.id,
        type: 'device',
        position,
        data: {
          ...node,
          mode: currentMode,
          selected: false,
          hovered: false
        },
        selected: false,
        style: { background: 'transparent', border: 'none' }
      };
    });

    setFlowNodes(finalNodes);

    // 更新标记
    layoutAppliedForKeyRef.current = layoutKey;
    if (hasSaved) {
      savedAppliedForKeyRef.current = layoutKey;
    }

    // 延迟处理视口(等待 ReactFlow 渲染完成)
    viewportTimerRef.current = setTimeout(() => {
      if (!rfInstanceRef.current) return;
      viewportTimerRef.current = null;

      if (hasSaved && savedViewport) {
        // 有保存的视口:直接恢复
        rfInstanceRef.current.setViewport(savedViewport);
        // 重置 fitView 记录基准,避免恢复视口后模式切换异常
        fitZoomRef.current = savedViewport.zoom || 1;
        hasRecordedFitZoom.current = true;
      } else if (needApplyAuto) {
        // 首次自动布局:自适应
        rfInstanceRef.current.fitView?.({ padding: 0.15, duration: 0 });
        // 重置 fitZoom 基准,等待 onMove 记录实际缩放值
        hasRecordedFitZoom.current = false;
        fitZoomRef.current = null;
      }
    }, 150);
  }, [nodes, edges, savedLayout, savedLayoutLoaded, layoutKey, setFlowNodes, currentMode]);

  /**
   * 节点状态更新 effect:只更新 selected/hovered 等显示状态,不改变节点位置
   */
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    setFlowNodes(prevNodes => {
      // 如果还没有应用过布局,不更新
      if (prevNodes.length === 0) return prevNodes;

      return prevNodes.map(prevNode => {
        const sourceNode = nodes.find(n => n.id === prevNode.id);
        if (!sourceNode) return prevNode;

        return {
          ...prevNode,
          data: {
            ...prevNode.data,
            ...sourceNode,
            mode: currentMode,
            selected: selectedNode?.id === prevNode.id,
            hovered: hoveredNodeId === prevNode.id
          },
          selected: selectedNode?.id === prevNode.id
        };
      });
    });
  }, [nodes, selectedNode, hoveredNodeId, currentMode, setFlowNodes]);

  // 边初始化 + Handle 分配
  useEffect(() => {
    if (!edges || edges.length === 0 || !flowNodes || flowNodes.length === 0) return;

    const centerNode = flowNodes.find(n => n.data?.isCenter);
    const nodesWithPos = flowNodes.map(n => ({
      id: n.id,
      position: n.position,
      isCenter: n.data?.isCenter,
      type: n.data?.type
    }));
    const processedEdges = assignHandles(edges, nodesWithPos, centerNode?.data);

    setFlowEdges(processedEdges.map(edge => {
      const baseColor = CABLE_COLORS[edge.cableType] || '#8c8c8c';
      const isFault = edge.status === 'fault';
      const isDisconnected = edge.status === 'disconnected';
      const strokeColor = isFault ? '#ff4d4f' : isDisconnected ? '#5c5c5c' : baseColor;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'custom',
        animated: !isDisconnected,
        data: edge,
        selected: selectedEdge?.id === edge.id,
        style: {
          stroke: strokeColor,
          strokeWidth: isFault ? 3 : 2
        }
      };
    }));
  }, [edges, flowNodes, selectedEdge]);

  const onNodeClickHandler = useCallback((event, node) => {
    if (onNodeClick) onNodeClick(node);
  }, [onNodeClick]);

  const onEdgeClickHandler = useCallback((event, edge) => {
    if (onEdgeClick) onEdgeClick(edge);
  }, [onEdgeClick]);

  const onNodeMouseEnterHandler = useCallback((event, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeaveHandler = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(0,0,0,0.35)' }}>
        <AntText type="secondary">暂无拓扑数据</AntText>
      </div>
    );
  }

  // 图例项渲染(紧凑版:色块/线条 + 文字)
  const renderLegendItem = (color, label, isLine = false, isDashed = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {isLine ? (
        <div style={{
          width: 16,
          height: isDashed ? 0 : 2,
          borderTop: isDashed ? `2px dashed ${color}` : 'none',
          background: isDashed ? 'none' : color,
          borderRadius: 1
        }} />
      ) : (
        <div style={{ width: 9, height: 9, background: color, borderRadius: 2 }} />
      )}
      <span style={{ color: 'rgba(0, 0, 0, 0.85)', fontSize: 10 }}>{label}</span>
    </div>
  );

  // 模式切换器选项
  const modeOptions = [
    { label: '自动', value: 'auto' },
    { label: '紧凑', value: 'compact' },
    { label: '详细', value: 'detail' }
  ];

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#fff'
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        onEdgeClick={onEdgeClickHandler}
        onNodeMouseEnter={onNodeMouseEnterHandler}
        onNodeMouseLeave={onNodeMouseLeaveHandler}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        onInit={(instance) => { rfInstanceRef.current = instance; }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.2}
        maxZoom={3}
        attributionPosition="bottom-left"
        style={{ background: 'transparent' }}
        defaultEdgeOptions={{
          type: 'custom',
          animated: false
        }}
      >
        <Background color="#e8e8e8" gap={24} size={1} />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          style={{
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const type = node.data?.type;
            return DEVICE_COLORS[type] || DEVICE_COLORS.default;
          }}
          nodeStrokeWidth={2}
          nodeBorderRadius={6}
          maskColor="rgba(0, 0, 0, 0.08)"
          style={{
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 8
          }}
        />

        {/* 右上角控制组(模式切换器 + 全屏按钮) */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Tooltip title={
            !layoutKey ? '当前视图不支持保存布局' :
            isSavingLayout ? '正在保存...' :
            hasSavedLayout ? (layoutModified ? '布局已修改,点击保存' : '布局已保存') :
            '保存当前布局,下次打开时恢复'
          }>
            <Button
              type="default"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveLayout}
              loading={isSavingLayout}
              disabled={!layoutKey}
              style={{
                background: layoutModified ? '#fffbe6' : '#fff',
                border: layoutModified ? '1px solid #faad14' : '1px solid #f0f0f0',
                borderRadius: 10,
                height: 32,
                width: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
              }}
            />
          </Tooltip>

          {hasSavedLayout && (
            <Tooltip title="重置为自动布局(删除已保存的布局)">
              <Button
                type="default"
                size="small"
                icon={<UndoOutlined />}
                onClick={handleResetLayout}
                disabled={isSavingLayout}
                style={{
                  background: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 10,
                  height: 32,
                  width: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
                }}
              />
            </Tooltip>
          )}

          <Tooltip title={isCapturing ? '正在截图...' : '截图保存(高清,含设备信息)'}>
            <Button
              type="default"
              size="small"
              icon={<CameraOutlined />}
              onClick={handleScreenshot}
              loading={isCapturing}
              style={{
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                height: 32,
                width: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
              }}
            />
          </Tooltip>

          <Tooltip title={isFullscreen ? '退出全屏 (ESC)' : '全屏显示'}>
            <Button
              type="default"
              size="small"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleToggleFullscreen}
              style={{
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                height: 32,
                width: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
              }}
            />
          </Tooltip>

          {/* 模式切换器 */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Tooltip title="缩放级别驱动自动切换:zoom<0.6 紧凑,zoom≥1.0 详细">
              <span style={{ color: 'rgba(0,0,0,0.65)', fontSize: 11 }}>显示模式</span>
            </Tooltip>
            <Segmented
              size="small"
              value={modePreference}
              onChange={handleModeChange}
              options={modeOptions}
            />
            <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: 10 }}>
              当前:{currentMode === 'compact' ? '紧凑' : '详细'}
            </span>
          </div>
        </div>

        {/* 图例面板(左下角,紧凑设计) */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '6px 9px',
            fontSize: 10,
            zIndex: 5,
            color: 'rgba(0, 0, 0, 0.85)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 600, color: 'rgba(0, 0, 0, 0.85)', letterSpacing: 0.2, fontSize: 10 }}>
            设备类型
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            {renderLegendItem('#1890ff', '交换机')}
            {renderLegendItem('#722ed1', '路由器')}
            {renderLegendItem('#52c41a', '服务器')}
            {renderLegendItem('#fa8c16', '存储')}
            {renderLegendItem('#eb595a', '防火墙')}
          </div>
          <div style={{ marginBottom: 3, fontWeight: 600, color: 'rgba(0, 0, 0, 0.85)', letterSpacing: 0.2, fontSize: 10 }}>
            线缆类型
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {renderLegendItem('#1890ff', '网线', true)}
            {renderLegendItem('#13c2c2', '光纤', true)}
            {renderLegendItem('#fa8c16', '铜缆', true)}
            {renderLegendItem('#ff4d4f', '故障', true, true)}
            {renderLegendItem('#8c8c8c', '断开', true, true)}
          </div>
        </div>

        {/* 状态说明(右下角) */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 11,
            zIndex: 5,
            color: 'rgba(0, 0, 0, 0.65)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            maxWidth: 220,
            lineHeight: 1.6
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#1890ff' }}>操作提示</div>
          <div>• 节点外圈色环表示状态(绿正常/红故障/灰离线)</div>
          <div>• 右上角数字角标 = 未确认告警数</div>
          <div>• 滚轮缩放:放大自动切详细,缩小自动切紧凑</div>
          <div>• 点击节点查看详情,点击连线查看线缆</div>
        </div>
      </ReactFlow>
    </div>
  );
}

export default TopologyGraph;
