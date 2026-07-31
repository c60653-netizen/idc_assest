import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Spin, Alert, Tooltip, message } from 'antd';
import {
  SwapOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TopologyGraph from './TopologyGraph';
import TopologySidebar from './TopologySidebar';
import TopologyControls from './TopologyControls';

// 浅色背景(与主应用统一)
const LIGHT_BG = `
  radial-gradient(ellipse 80% 60% at 20% 10%, rgba(24, 144, 255, 0.04) 0%, transparent 60%),
  radial-gradient(ellipse 80% 60% at 80% 90%, rgba(114, 46, 209, 0.03) 0%, transparent 60%),
  linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)
`;

// 容器入场动画配置(stagger)
const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// 子元素入场动画配置
const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
};

/**
 * 拓扑图主弹窗(浅色主题)
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 是否显示
 * @param {Function} props.onClose - 关闭回调
 * @returns {React.ReactElement} 拓扑图弹窗
 */
function TopologyModal({ visible, onClose }) {
  const [switchDevices, setSwitchDevices] = useState([]);
  const [selectedSwitchId, setSelectedSwitchId] = useState(null);
  const [topologyData, setTopologyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const fetchSwitchDevices = useCallback(async () => {
    try {
      const response = await axios.get('/api/devices/all', {
        params: { pageSize: 50000, type: 'switch' }
      });
      setSwitchDevices(response.data.devices || []);
    } catch (err) {
      console.error('获取交换机列表失败:', err);
      message.error('获取交换机列表失败');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchSwitchDevices();
    }
  }, [visible, fetchSwitchDevices]);

  const handleSwitchChange = useCallback(async (switchId) => {
    setSelectedSwitchId(switchId);
    setSelectedNode(null);
    setSelectedEdge(null);
    setTopologyData(null);
    setError(null);

    if (!switchId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/topology/switch/${switchId}`, {
        params: { maxNodes: 100 }
      });

      if (response.data.success) {
        setTopologyData(response.data.data);
        setLastUpdateTime(new Date());
      } else {
        setError(response.data.error || '获取拓扑数据失败');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '获取拓扑数据失败';
      setError(errorMessage);
      console.error('获取拓扑数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node.data || node);
    setSelectedEdge(null);
    setSidebarVisible(true);
  }, []);

  const handleEdgeClick = useCallback((edge) => {
    setSelectedEdge(edge.data || edge);
    setSelectedNode(null);
    setSidebarVisible(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarVisible(false);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // 直接使用原始节点数据，不预先计算布局（布局由 TopologyGraph 内部统一处理）
  const graphElements = useMemo(() => {
    if (!topologyData) return { nodes: [], edges: [] };

    const centerDevice = topologyData.centerDevice;
    const connectedNodes = topologyData.nodes || [];
    const edges = topologyData.edges || [];

    const allNodes = centerDevice ? [centerDevice, ...connectedNodes] : connectedNodes;
    return { nodes: allNodes, edges };
  }, [topologyData]);

  const handleClose = useCallback(() => {
    setSelectedSwitchId(null);
    setTopologyData(null);
    setError(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setLastUpdateTime(null);
    onClose();
  }, [onClose]);

  // 格式化更新时间
  const updateTimeText = lastUpdateTime
    ? lastUpdateTime.toLocaleTimeString('zh-CN', { hour12: false })
    : null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
            }}
          >
            <SwapOutlined />
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0, 0, 0, 0.88)' }}>接线拓扑图</span>
          <Tooltip title="单击设备查看详情,双击设备滑出背板;点击连线查看线缆信息">
            <InfoCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 16 }} />
          </Tooltip>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width="92%"
      style={{ top: 16 }}
      bodyStyle={{
        padding: 0,
        height: 'calc(100vh - 140px)',
        background: LIGHT_BG,
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden'
      }}
      headerStyle={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '12px 24px'
      }}
      footer={null}
      destroyOnClose
      rootClassName="topo-light-modal"
    >
      <motion.div
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', height: '100%', gap: 12, padding: 12 }}
      >
        {/* 左侧控制面板(浅色统一面板) */}
        <motion.div
          variants={ITEM_VARIANTS}
          style={{
            width: 300,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
          }}
        >
          <TopologyControls
            switchDevices={switchDevices}
            selectedSwitchId={selectedSwitchId}
            onSwitchChange={handleSwitchChange}
            loading={loading}
            onRefresh={fetchSwitchDevices}
            statistics={topologyData?.statistics}
          />

          {/* 数据更新时间 */}
          <AnimatePresence>
            {updateTimeText && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  color: 'rgba(0, 0, 0, 0.45)',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0'
                }}
              >
                <ReloadOutlined style={{ fontSize: 10 }} />
                <span>数据更新于 {updateTimeText}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 主画布区域 */}
        <motion.div
          variants={ITEM_VARIANTS}
          style={{
            flex: 1,
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #f0f0f0',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
          }}
        >
          {/* 加载状态遮罩 */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <Spin
                  size="large"
                  indicator={
                    <ReloadOutlined
                      spin
                      style={{ fontSize: 32, color: '#1890ff' }}
                    />
                  }
                />
                <div style={{ color: 'rgba(0, 0, 0, 0.7)', fontSize: 13 }}>
                  正在加载拓扑数据...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 错误提示 */}
          <AnimatePresence>
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  right: 12,
                  zIndex: 10
                }}
              >
                <Alert
                  type="error"
                  message={error}
                  showIcon
                  style={{
                    borderRadius: 10,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 空状态提示 */}
          <AnimatePresence>
            {!loading && !error && !selectedSwitchId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.5, 0.85, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <CloudServerOutlined
                    style={{
                      fontSize: 56,
                      color: 'rgba(24, 144, 255, 0.35)',
                      filter: 'drop-shadow(0 4px 12px rgba(24, 144, 255, 0.15))'
                    }}
                  />
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(0, 0, 0, 0.85)', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                    网络拓扑可视化
                  </div>
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>
                    请从左侧选择交换机以生成拓扑图
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 拓扑图画布 */}
          <div style={{ width: '100%', height: '100%' }}>
            <TopologyGraph
              nodes={graphElements.nodes}
              edges={graphElements.edges}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              layoutKey={selectedSwitchId ? `switch:${selectedSwitchId}` : null}
            />
          </div>
        </motion.div>

        {/* 右侧详情抽屉 */}
        <TopologySidebar
          visible={sidebarVisible}
          onClose={handleSidebarClose}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          data={topologyData}
        />
      </motion.div>
    </Modal>
  );
}

export default TopologyModal;
