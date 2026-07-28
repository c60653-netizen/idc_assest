import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Table,
  Tag,
  Progress,
  DatePicker,
  Select,
  Button,
  Tooltip,
  Badge,
  Typography,
  Space,
  Avatar,
  Spin,
  Switch,
  message,
} from 'antd';
import {
  PieChartOutlined,
  BarChartOutlined,
  WarningOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BoxPlotOutlined,
  ExclamationCircleOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  ExportOutlined,
  FallOutlined,
  RiseOutlined,
  MinusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { consumableRecordAPI, consumableCategoryAPI, consumableAPI } from '../api/cache';
import { selectStyles, datePickerStyles } from '../styles/deviceManagementStyles';
import { designTokens } from '../config/theme';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 130, damping: 18 },
  },
};

const PageContainer = styled.div`
  padding: 20px 24px 32px;
  background: ${designTokens.colors.background.secondary};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 12px 16px 24px;
  }
`;

const PageHeader = styled(motion.div)`
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .icon-wrapper {
    width: 44px;
    height: 44px;
    background: ${designTokens.colors.primary.gradient};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.22);

    .anticon {
      font-size: 22px;
      color: white;
    }
  }

  .title-content {
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: ${designTokens.colors.text.primary};
      line-height: 1.2;
    }

    .subtitle {
      color: ${designTokens.colors.text.secondary};
      font-size: 13px;
      margin-top: 2px;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .last-update {
    font-size: 12px;
    color: ${designTokens.colors.text.secondary};
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: ${designTokens.colors.background.card};
    border: 1px solid ${designTokens.colors.border};
    border-radius: 8px;
  }

  .auto-refresh {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: ${designTokens.colors.background.card};
    border: 1px solid ${designTokens.colors.border};
    border-radius: 8px;
    font-size: 13px;
    color: ${designTokens.colors.text.secondary};
  }
`;

const FilterCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
  border: 1px solid ${designTokens.colors.border};

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const FilterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .filter-label {
    font-size: 12px;
    font-weight: 600;
    color: ${designTokens.colors.text.secondary};
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
`;

const QuickFilterGroup = styled.div`
  display: flex;
  gap: 4px;
  background: ${designTokens.colors.background.secondary};
  padding: 3px;
  border-radius: 8px;
  border: 1px solid ${designTokens.colors.border};
`;

const QuickFilterBtn = styled.button`
  border: none;
  background: ${props => (props.$active ? designTokens.colors.background.card : 'transparent')};
  color: ${props =>
    props.$active ? designTokens.colors.primary.main : designTokens.colors.text.secondary};
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => (props.$active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none')};

  &:hover {
    color: ${designTokens.colors.primary.main};
  }
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid ${designTokens.colors.border};
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
    border-color: ${props => props.$borderColor || designTokens.colors.primary.main}40;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$accent || designTokens.colors.primary.gradient};
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .card-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    background: ${props => props.$iconBg || 'rgba(99, 102, 241, 0.1)'};
    color: ${props => props.$iconColor || designTokens.colors.primary.main};
  }

  .card-trend {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;

    &.up {
      color: ${designTokens.colors.success.main};
      background: rgba(16, 185, 129, 0.1);
    }

    &.down {
      color: ${designTokens.colors.error.main};
      background: rgba(239, 68, 68, 0.1);
    }

    &.neutral {
      color: ${designTokens.colors.text.secondary};
      background: rgba(107, 114, 128, 0.1);
    }
  }

  .card-value {
    font-size: 26px;
    font-weight: 700;
    color: ${designTokens.colors.text.primary};
    line-height: 1.1;
    display: flex;
    align-items: baseline;
    gap: 4px;

    .unit {
      font-size: 13px;
      font-weight: 500;
      color: ${designTokens.colors.text.secondary};
    }
  }

  .card-label {
    font-size: 12px;
    color: ${designTokens.colors.text.secondary};
    font-weight: 500;
    margin-top: 4px;
  }

  .card-foot {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed ${designTokens.colors.border};
    font-size: 11px;
    color: ${designTokens.colors.text.tertiary};
    display: flex;
    align-items: center;
    justify-content: space-between;

    .foot-value {
      color: ${designTokens.colors.text.secondary};
      font-weight: 600;
    }
  }
`;

const BentoGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled(motion.div)`
  background: ${designTokens.colors.background.card};
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid ${designTokens.colors.border};
  overflow: hidden;
  grid-column: ${props => props.$col || 'span 6'};
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
  }

  .card-header {
    padding: 14px 20px;
    border-bottom: 1px solid ${designTokens.colors.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: ${designTokens.colors.background.secondary};
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .header-icon {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        background: ${props => props.$iconBg || designTokens.colors.primary.gradient};
        color: white;
      }

      .header-title {
        font-size: 14px;
        font-weight: 600;
        color: ${designTokens.colors.text.primary};
      }
    }

    .header-extra {
      color: ${designTokens.colors.text.secondary};
      font-size: 12px;
      font-weight: 500;
      padding: 3px 10px;
      background: ${designTokens.colors.background.card};
      border-radius: 6px;
      border: 1px solid ${designTokens.colors.border};
    }
  }

  .card-body {
    padding: 16px 20px;
    flex: 1;
    overflow: hidden;
  }

  .card-body.no-pad {
    padding: 0;
  }
`;

// 出入库对比可视化
const InOutVisualization = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ComparisonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  .row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .row-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: ${designTokens.colors.text.secondary};
    }

    .row-value {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 14px;
      font-weight: 700;
      color: ${designTokens.colors.text.primary};

      .row-count {
        font-size: 12px;
        font-weight: 500;
        color: ${designTokens.colors.text.tertiary};
      }
    }
  }

  .bar-track {
    height: 8px;
    background: ${designTokens.colors.background.tertiary};
    border-radius: 6px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      background: ${props => props.$barColor || designTokens.colors.primary.main};
    }
  }
`;

const NetFlowBadge = styled.div`
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props =>
    props.$positive
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))'
      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(185, 28, 28, 0.04))'};
  border: 1px solid
    ${props =>
      props.$positive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};

  .net-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${designTokens.colors.text.secondary};
    font-weight: 500;
  }

  .net-value {
    font-size: 18px;
    font-weight: 700;
    color: ${props =>
      props.$positive ? designTokens.colors.success.main : designTokens.colors.error.main};
  }
`;

// 类别环形图
const DonutWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 480px) {
    flex-direction: column;
  }

  .donut-svg {
    flex-shrink: 0;
  }

  .donut-center {
    text-anchor: middle;
    dominant-baseline: middle;

    .donut-value {
      font-size: 20px;
      font-weight: 700;
      fill: ${designTokens.colors.text.primary};
    }

    .donut-label {
      font-size: 10px;
      fill: ${designTokens.colors.text.tertiary};
    }
  }

  .legend {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    max-height: 180px;
    overflow-y: auto;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: ${designTokens.colors.background.tertiary};
      }

      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex-shrink: 0;
      }

      .legend-name {
        flex: 1;
        font-size: 12px;
        color: ${designTokens.colors.text.primary};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .legend-value {
        font-size: 12px;
        font-weight: 600;
        color: ${designTokens.colors.text.secondary};
      }
    }
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
    font-size: 12px;
  }

  .ant-table-thead > tr > th {
    background: ${designTokens.colors.background.secondary};
    font-weight: 600;
    font-size: 11px;
    color: ${designTokens.colors.text.secondary};
    border-bottom: 1px solid ${designTokens.colors.border};
    padding: 8px 12px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .ant-table-tbody > tr > td {
    padding: 8px 12px;
    border-bottom: 1px solid ${designTokens.colors.border}40;
  }

  .ant-table-tbody > tr {
    height: 44px;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(99, 102, 241, 0.03);
  }

  .ant-pagination {
    padding: 10px 16px;
    margin: 0;
    background: ${designTokens.colors.background.secondary};
    border-top: 1px solid ${designTokens.colors.border};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${designTokens.colors.text.secondary};

  .empty-icon {
    font-size: 44px;
    margin-bottom: 12px;
    opacity: 0.35;
  }

  .empty-text {
    font-size: 13px;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .empty-subtext {
    font-size: 12px;
    opacity: 0.7;
  }
`;

const ConsumableStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [realTimeRefresh, setRealTimeRefresh] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [stats, setStats] = useState({
    inCount: 0,
    outCount: 0,
    inQuantity: 0,
    outQuantity: 0,
    recentRecords: [],
  });
  const [summary, setSummary] = useState({
    total: 0,
    lowStock: 0,
    totalValue: 0,
    byCategory: [],
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockPagination, setLowStockPagination] = useState({ current: 1, pageSize: 5 });
  const [categories, setCategories] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('30days');

  const quickFilters = [
    { key: 'today', label: '今日', days: 0 },
    { key: '7days', label: '7天', days: 7 },
    { key: '30days', label: '30天', days: 30 },
    { key: '90days', label: '90天', days: 90 },
  ];

  const loadCategories = async () => {
    try {
      const response = await consumableCategoryAPI.getList();
      setCategories(response || []);
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  };

  const loadStatistics = async (isAuto = false) => {
    try {
      if (!isAuto) {
        setLoading(true);
      }
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      };

      const statsResponse = await consumableRecordAPI.statistics(params);

      setStats({
        inCount: statsResponse?.inCount || 0,
        outCount: statsResponse?.outCount || 0,
        inQuantity: statsResponse?.inQuantity || 0,
        outQuantity: statsResponse?.outQuantity || 0,
        recentRecords: statsResponse?.recentRecords || [],
      });

      const summaryResponse = await consumableAPI.getStatistics();

      setSummary({
        total: summaryResponse?.total || 0,
        lowStock: summaryResponse?.lowStock || 0,
        totalValue: summaryResponse?.totalValue || 0,
        byCategory: summaryResponse?.byCategory || [],
      });

      if (isAuto) {
        setLastUpdateTime(new Date());
        setIsAutoRefreshing(false);
      }
    } catch (error) {
      const errorMsg = error?.message || error || '未知错误';
      if (!isAuto) {
        message.error('加载统计数据失败: ' + errorMsg);
      }
      console.error('加载统计数据失败:', error);
      setStats({ inCount: 0, outCount: 0, inQuantity: 0, outQuantity: 0, recentRecords: [] });
      setSummary({ total: 0, lowStock: 0, totalValue: 0, byCategory: [] });
    } finally {
      if (!isAuto) {
        setLoading(false);
      }
    }
  };

  const loadLowStockItems = async () => {
    try {
      const response = await consumableAPI.getLowStock();
      setLowStockItems(response || []);
    } catch (error) {
      console.error('加载低库存预警失败:', error?.message || error);
      setLowStockItems([]);
    }
  };

  useEffect(() => {
    loadCategories();
    loadStatistics();
    loadLowStockItems();
  }, []);

  useEffect(() => {
    if (realTimeRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        setIsAutoRefreshing(true);
        loadStatistics(true);
        loadLowStockItems();
        setLastUpdateTime(new Date());
      }, 30000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [realTimeRefresh]);

  const handleQuickFilter = key => {
    setQuickFilter(key);
    const filter = quickFilters.find(f => f.key === key);
    if (filter) {
      if (filter.days === 0) {
        setDateRange([dayjs().startOf('day'), dayjs()]);
      } else {
        setDateRange([dayjs().subtract(filter.days, 'days'), dayjs()]);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setIsAutoRefreshing(false);
    Promise.all([loadStatistics(false), loadLowStockItems()]).finally(() => {
      setLoading(false);
      setLastUpdateTime(new Date());
      if (!realTimeRefresh) {
        message.success('数据已手动刷新');
      }
    });
  };

  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  const getCategoryColor = category => {
    const predefinedColors = [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#8b5cf6',
      '#06b6d4',
      '#f97316',
      '#14b8a6',
      '#ef4444',
      '#3b82f6',
    ];

    const colorMap = {
      网络设备: '#6366f1',
      线缆: '#10b981',
      配件: '#f59e0b',
      工具: '#ec4899',
      其他: '#6b7280',
    };

    if (colorMap[category]) return colorMap[category];

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return predefinedColors[Math.abs(hash) % predefinedColors.length];
  };

  const netQuantity = useMemo(() => {
    return (stats?.inQuantity || 0) - (stats?.outQuantity || 0);
  }, [stats]);

  // 入库 / 出库 占比（用于条形对比）
  const maxFlow = useMemo(() => {
    return Math.max(stats?.inQuantity || 0, stats?.outQuantity || 0, 1);
  }, [stats]);

  const inRatio = ((stats?.inQuantity || 0) / maxFlow) * 100;
  const outRatio = ((stats?.outQuantity || 0) / maxFlow) * 100;

  // 类别环形图数据
  const donutData = useMemo(() => {
    const list = summary?.byCategory || [];
    const total = list.reduce((sum, item) => sum + (item.count || 0), 0);
    return { list, total };
  }, [summary]);

  // 计算环形图各段角度
  const donutSegments = useMemo(() => {
    if (!donutData.list.length || donutData.total === 0) return [];
    const segments = [];
    let cumulativeAngle = -90; // 从顶部开始
    donutData.list.slice(0, 8).forEach(item => {
      const count = item.count || 0;
      const percentage = (count / donutData.total) * 100;
      const angle = (count / donutData.total) * 360;
      segments.push({
        ...item,
        color: getCategoryColor(item.category),
        startAngle: cumulativeAngle,
        endAngle: cumulativeAngle + angle,
        percentage,
      });
      cumulativeAngle += angle;
    });
    // 其余类别合并
    if (donutData.list.length > 8) {
      const restCount = donutData.list
        .slice(8)
        .reduce((sum, item) => sum + (item.count || 0), 0);
      const angle = (restCount / donutData.total) * 360;
      segments.push({
        category: '其他',
        count: restCount,
        color: '#94a3b8',
        startAngle: cumulativeAngle,
        endAngle: cumulativeAngle + angle,
        percentage: (restCount / donutData.total) * 100,
      });
    }
    return segments;
  }, [donutData]);

  // SVG 圆弧路径（极坐标 → 笛卡尔坐标）
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (cx, cy, rOuter, rInner, startAngle, endAngle) => {
    const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const startInner = polarToCartesian(cx, cy, rInner, endAngle);
    const endInner = polarToCartesian(cx, cy, rInner, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  };

  const lowStockColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={26}
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.warning.main}, #fb923c)`,
              fontSize: '11px',
              flexShrink: 0,
            }}
          >
            <WarningOutlined />
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: designTokens.colors.text.primary,
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {text}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: designTokens.colors.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {record.specification || record.category || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '库存',
      key: 'stockStatus',
      width: '35%',
      align: 'center',
      render: (_, record) => {
        const current = record.currentStock || 0;
        const min = record.minStock || 0;
        const isLow = current < min;
        return (
          <div
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: isLow ? designTokens.colors.error.main : designTokens.colors.text.primary,
              }}
            >
              {current}
            </span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '10px' }}>/</span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '11px' }}>
              {min}
            </span>
            <span style={{ color: designTokens.colors.text.secondary, fontSize: '10px' }}>
              {record.unit || '个'}
            </span>
          </div>
        );
      },
    },
    {
      title: '充足率',
      key: 'rate',
      width: '25%',
      align: 'center',
      render: (_, record) => {
        const minStock = record.minStock || 0;
        const currentStock = record.currentStock || 0;

        if (minStock <= 0) {
          return (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              未设置
            </Text>
          );
        }

        const rate = Math.min(100, Math.round((currentStock / minStock) * 100));
        const color =
          rate < 30
            ? designTokens.colors.error.main
            : rate < 60
              ? designTokens.colors.warning.main
              : designTokens.colors.success.main;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Progress
              percent={rate}
              size="small"
              strokeColor={color}
              showInfo={false}
              style={{ width: 50 }}
            />
            <span
              style={{
                fontWeight: 600,
                fontSize: '11px',
                color,
                minWidth: 28,
                textAlign: 'right',
              }}
            >
              {rate}%
            </span>
          </div>
        );
      },
    },
  ];

  const recentColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 70,
      render: type => (
        <Tag
          icon={type === 'in' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
          color={type === 'in' ? 'success' : 'processing'}
          style={{ borderRadius: 10, fontWeight: 500, border: 'none', fontSize: '11px' }}
        >
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      ),
    },
    {
      title: '耗材',
      dataIndex: 'consumableName',
      key: 'consumableName',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar
            size={28}
            style={{
              background: record.category
                ? getCategoryColor(record.category)
                : designTokens.colors.info.main,
              fontSize: '11px',
            }}
          >
            {record.category?.charAt(0) || '耗'}
          </Avatar>
          <div>
            <div
              style={{ fontWeight: 600, fontSize: '13px', color: designTokens.colors.text.primary }}
            >
              {text || '-'}
            </div>
            {record.category && (
              <div style={{ fontSize: '11px', color: designTokens.colors.text.secondary }}>
                {record.category}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 90,
      render: (quantity, record) => (
        <Text
          strong
          style={{
            fontSize: '13px',
            color:
              record.type === 'in'
                ? designTokens.colors.success.main
                : designTokens.colors.error.main,
          }}
        >
          {record.type === 'in' ? '+' : '-'}
          {quantity} {record.unit || '个'}
        </Text>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: operator => (
        <Space size={6}>
          <Avatar size={22} style={{ background: designTokens.colors.info.main, fontSize: '11px' }}>
            {operator?.charAt(0) || '?'}
          </Avatar>
          <Text style={{ fontSize: '12px' }}>{operator || '-'}</Text>
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: date => (
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {dayjs(date).format('MM-DD HH:mm')}
        </Text>
      ),
    },
  ];

  // KPI 卡片配置
  const statsCards = [
    {
      key: 'total',
      value: summary?.total || 0,
      unit: '种',
      label: '耗材种类',
      icon: <DatabaseOutlined />,
      accent: designTokens.colors.primary.gradient,
      iconBg: 'rgba(99, 102, 241, 0.1)',
      iconColor: designTokens.colors.primary.main,
      borderColor: designTokens.colors.primary.main,
      foot: (
        <>
          <span>分类覆盖</span>
          <span className="foot-value">{donutData.list.length} 类</span>
        </>
      ),
      trend: null,
    },
    {
      key: 'lowStock',
      value: summary?.lowStock || 0,
      unit: '项',
      label: '库存预警',
      icon: <WarningOutlined />,
      accent: designTokens.colors.warning.gradient,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: designTokens.colors.warning.main,
      borderColor: designTokens.colors.warning.main,
      foot: (
        <>
          <span>状态</span>
          <span
            className="foot-value"
            style={{
              color:
                (summary?.lowStock || 0) > 0
                  ? designTokens.colors.warning.main
                  : designTokens.colors.success.main,
            }}
          >
            {(summary?.lowStock || 0) > 0 ? '需关注' : '全部充足'}
          </span>
        </>
      ),
      trend:
        (summary?.lowStock || 0) > 0
          ? { type: 'down', label: '需关注' }
          : { type: 'up', label: '正常' },
    },
    {
      key: 'inQuantity',
      value: stats?.inQuantity || 0,
      unit: '件',
      label: '期间入库',
      icon: <ArrowDownOutlined />,
      accent: designTokens.colors.success.gradient,
      iconBg: 'rgba(16, 185, 129, 0.1)',
      iconColor: designTokens.colors.success.main,
      borderColor: designTokens.colors.success.main,
      foot: (
        <>
          <span>入库次数</span>
          <span className="foot-value">{stats?.inCount || 0} 次</span>
        </>
      ),
      trend: { type: 'up', label: '入库' },
    },
    {
      key: 'outQuantity',
      value: stats?.outQuantity || 0,
      unit: '件',
      label: '期间出库',
      icon: <ArrowUpOutlined />,
      accent: designTokens.colors.secondary.gradient,
      iconBg: 'rgba(236, 72, 153, 0.1)',
      iconColor: designTokens.colors.secondary.main,
      borderColor: designTokens.colors.secondary.main,
      foot: (
        <>
          <span>出库次数</span>
          <span className="foot-value">{stats?.outCount || 0} 次</span>
        </>
      ),
      trend: { type: 'neutral', label: '出库' },
    },
  ];

  return (
    <PageContainer>
      <PageHeader variants={itemVariants} initial="hidden" animate="visible">
        <TitleSection>
          <motion.div
            className="icon-wrapper"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <BarChartOutlined />
          </motion.div>
          <div className="title-content">
            <h1>耗材统计</h1>
            <div className="subtitle">实时监控耗材库存状态与流转情况</div>
          </div>
        </TitleSection>
        <HeaderActions>
          {lastUpdateTime && (
            <div className="last-update">
              {isAutoRefreshing ? <Spin size="small" /> : <span style={{ fontSize: 8 }}>●</span>}
              {isAutoRefreshing
                ? '刷新中...'
                : `更新于 ${dayjs(lastUpdateTime).format('HH:mm:ss')}`}
            </div>
          )}
          <Tooltip title={realTimeRefresh ? '已开启30秒自动刷新' : '已关闭自动刷新'}>
            <div className="auto-refresh">
              <span>实时</span>
              <Switch
                size="small"
                checked={realTimeRefresh}
                onChange={setRealTimeRefresh}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </div>
          </Tooltip>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            style={{ height: 34, borderRadius: 8, borderColor: designTokens.colors.border }}
          >
            导出
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={isAutoRefreshing} />}
            onClick={handleRefresh}
            loading={loading && !isAutoRefreshing}
            style={{
              height: 34,
              borderRadius: 8,
              background: designTokens.colors.primary.gradient,
              border: 'none',
            }}
          >
            刷新
          </Button>
        </HeaderActions>
      </PageHeader>

      <FilterCard variants={itemVariants}>
        <FilterRow>
          <FilterGroup>
            <FilterItem>
              <span className="filter-label">时间范围</span>
              <RangePicker
                value={dateRange}
                onChange={dates => {
                  setDateRange(dates);
                  setQuickFilter(null);
                }}
                style={{ ...datePickerStyles.range, width: 280 }}
                allowClear={false}
              />
            </FilterItem>
            <FilterItem>
              <span className="filter-label">快速选择</span>
              <QuickFilterGroup>
                {quickFilters.map(filter => (
                  <QuickFilterBtn
                    key={filter.key}
                    $active={quickFilter === filter.key}
                    onClick={() => handleQuickFilter(filter.key)}
                  >
                    {filter.label}
                  </QuickFilterBtn>
                ))}
              </QuickFilterGroup>
            </FilterItem>
            <FilterItem>
              <span className="filter-label">类别</span>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ ...selectStyles.base, width: 160 }}
                showSearch
                placeholder="选择类别"
                optionFilterProp="children"
              >
                <Option value="all">全部类别</Option>
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.name}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </FilterItem>
          </FilterGroup>
          <FilterActions>
            <Button
              type="primary"
              onClick={() => loadStatistics(false)}
              loading={loading}
              icon={<ThunderboltOutlined />}
              style={{
                height: 36,
                borderRadius: 8,
                background: designTokens.colors.primary.gradient,
                border: 'none',
                padding: '0 20px',
                fontWeight: 500,
              }}
            >
              应用筛选
            </Button>
            <Button
              onClick={() => {
                setQuickFilter('30days');
                setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
                setCategoryFilter('all');
              }}
              icon={<ReloadOutlined />}
              style={{
                height: 36,
                borderRadius: 8,
                borderColor: designTokens.colors.border,
              }}
            >
              重置
            </Button>
          </FilterActions>
        </FilterRow>
      </FilterCard>

      <StatsGrid variants={containerVariants} initial="hidden" animate="visible">
        {statsCards.map(card => (
          <StatsCard
            key={card.key}
            variants={itemVariants}
            $accent={card.accent}
            $iconBg={card.iconBg}
            $iconColor={card.iconColor}
            $borderColor={card.borderColor}
          >
            <div className="card-top">
              <div className="card-icon">{card.icon}</div>
              {card.trend && (
                <div className={`card-trend ${card.trend.type}`}>
                  {card.trend.type === 'up' && <RiseOutlined />}
                  {card.trend.type === 'down' && <FallOutlined />}
                  {card.trend.type === 'neutral' && <MinusOutlined />}
                  {card.trend.label}
                </div>
              )}
            </div>
            <div className="card-value">
              {card.value}
              <span className="unit">{card.unit}</span>
            </div>
            <div className="card-label">{card.label}</div>
            {card.foot && <div className="card-foot">{card.foot}</div>}
          </StatsCard>
        ))}
      </StatsGrid>

      <BentoGrid variants={containerVariants} initial="hidden" animate="visible">
        {/* 出入库可视化对比 - 大块 */}
        <BentoCard
          variants={itemVariants}
          $col="span 7"
          $iconBg={designTokens.colors.info.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <ShoppingCartOutlined />
              </div>
              <span className="header-title">出入库流量分析</span>
            </div>
            <div className="header-extra">
              {dateRange[0]?.format('MM/DD')} - {dateRange[1]?.format('MM/DD')}
            </div>
          </div>
          <div className="card-body">
            <InOutVisualization>
              <ComparisonRow $barColor={designTokens.colors.success.main}>
                <div className="row-head">
                  <div className="row-label">
                    <ArrowDownOutlined style={{ color: designTokens.colors.success.main }} />
                    入库
                  </div>
                  <div className="row-value">
                    {stats?.inQuantity || 0}
                    <span className="row-count">/ {stats?.inCount || 0} 次</span>
                  </div>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${inRatio}%` }} />
                </div>
              </ComparisonRow>

              <ComparisonRow $barColor={designTokens.colors.secondary.main}>
                <div className="row-head">
                  <div className="row-label">
                    <ArrowUpOutlined style={{ color: designTokens.colors.secondary.main }} />
                    出库
                  </div>
                  <div className="row-value">
                    {stats?.outQuantity || 0}
                    <span className="row-count">/ {stats?.outCount || 0} 次</span>
                  </div>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${outRatio}%` }} />
                </div>
              </ComparisonRow>

              <NetFlowBadge $positive={netQuantity >= 0}>
                <div className="net-label">
                  {netQuantity >= 0 ? (
                    <RiseOutlined style={{ color: designTokens.colors.success.main }} />
                  ) : (
                    <FallOutlined style={{ color: designTokens.colors.error.main }} />
                  )}
                  {netQuantity >= 0 ? '净入库' : '净出库'}
                </div>
                <div className="net-value">
                  {netQuantity >= 0 ? '+' : ''}
                  {netQuantity} 件
                </div>
              </NetFlowBadge>
            </InOutVisualization>
          </div>
        </BentoCard>

        {/* 类别分布环形图 - 小块 */}
        <BentoCard
          variants={itemVariants}
          $col="span 5"
          $iconBg={designTokens.colors.secondary.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <PieChartOutlined />
              </div>
              <span className="header-title">类别分布</span>
            </div>
            <div className="header-extra">共 {donutData.total} 种</div>
          </div>
          <div className="card-body">
            {donutSegments.length > 0 ? (
              <DonutWrapper>
                <svg className="donut-svg" width={130} height={130} viewBox="0 0 130 130">
                  {donutSegments.map((seg, idx) => {
                    // 防止 angle === 360 时画不出
                    const safeEnd =
                      seg.endAngle - seg.startAngle >= 360 ? seg.endAngle - 0.01 : seg.endAngle;
                    return (
                      <path
                        key={idx}
                        d={describeArc(65, 65, 60, 38, seg.startAngle, safeEnd)}
                        fill={seg.color}
                        opacity={0.9}
                      >
                        <title>{`${seg.category}: ${seg.count} (${seg.percentage.toFixed(1)}%)`}</title>
                      </path>
                    );
                  })}
                  <text x="65" y="58" className="donut-center">
                    <tspan className="donut-value">{donutData.total}</tspan>
                  </text>
                  <text x="65" y="76" className="donut-center">
                    <tspan className="donut-label">总种类</tspan>
                  </text>
                </svg>
                <div className="legend">
                  {donutSegments.map((seg, idx) => (
                    <div className="legend-item" key={idx}>
                      <span
                        className="legend-dot"
                        style={{ background: seg.color }}
                      />
                      <span className="legend-name" title={seg.category}>
                        {seg.category}
                      </span>
                      <span className="legend-value">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </DonutWrapper>
            ) : (
              <EmptyState>
                <PieChartOutlined className="empty-icon" />
                <div className="empty-text">暂无类别数据</div>
                <div className="empty-subtext">添加耗材后将自动统计</div>
              </EmptyState>
            )}
          </div>
        </BentoCard>
      </BentoGrid>

      <BentoGrid variants={containerVariants} initial="hidden" animate="visible">
        {/* 库存预警 - 小块 */}
        <BentoCard
          variants={itemVariants}
          $col="span 5"
          $iconBg={designTokens.colors.warning.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <ExclamationCircleOutlined />
              </div>
              <span className="header-title">库存预警</span>
            </div>
            {lowStockItems.length > 0 ? (
              <Badge
                count={lowStockItems.length}
                style={{ backgroundColor: designTokens.colors.warning.main }}
              />
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: designTokens.colors.success.main,
                  fontWeight: 500,
                  padding: '3px 8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 6,
                }}
              >
                全部充足
              </span>
            )}
          </div>
          <div className="card-body no-pad">
            <StyledTable
              columns={lowStockColumns}
              dataSource={lowStockItems}
              rowKey="consumableId"
              pagination={{
                current: lowStockPagination.current,
                pageSize: lowStockPagination.pageSize,
                total: lowStockItems.length,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: total => `共 ${total} 条`,
                onChange: page => setLowStockPagination(prev => ({ ...prev, current: page })),
              }}
              size="small"
              scroll={{ x: 'max-content', y: 280 }}
              locale={{
                emptyText: (
                  <EmptyState>
                    <BoxPlotOutlined
                      className="empty-icon"
                      style={{ color: designTokens.colors.success.main }}
                    />
                    <div className="empty-text">库存充足</div>
                    <div className="empty-subtext">所有耗材均在安全范围内</div>
                  </EmptyState>
                ),
              }}
            />
          </div>
        </BentoCard>

        {/* 最近记录 - 大块 */}
        <BentoCard
          variants={itemVariants}
          $col="span 7"
          $iconBg={designTokens.colors.success.gradient}
        >
          <div className="card-header">
            <div className="header-left">
              <div className="header-icon">
                <HistoryOutlined />
              </div>
              <span className="header-title">最近出入库记录</span>
            </div>
            <div className="header-extra">最近 10 条</div>
          </div>
          <div className="card-body no-pad">
            <StyledTable
              columns={recentColumns}
              dataSource={stats?.recentRecords || []}
              rowKey="recordId"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <EmptyState>
                    <HistoryOutlined className="empty-icon" />
                    <div className="empty-text">暂无记录</div>
                    <div className="empty-subtext">出入库操作后将显示</div>
                  </EmptyState>
                ),
              }}
            />
          </div>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  );
};

export default ConsumableStatistics;
