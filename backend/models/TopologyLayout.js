const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

/**
 * 拓扑布局模型
 * 用于持久化用户手动调整的拓扑图节点位置
 * layoutKey 设计:
 *   - switch 视图:`switch:{deviceId}`
 *   - rack 视图:`rack:{rackId}`
 * nodesData 存储格式:JSON 数组 `[{id, x, y}, ...]`
 */
const TopologyLayout = sequelize.define(
  'TopologyLayout',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    layoutKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'topology_layouts_layout_key_unique',
      comment: '布局唯一标识,如 switch:DEVxxx 或 rack:RACKxxx',
    },
    nodesData: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '节点位置 JSON 数组 [{id, x, y}, ...]',
    },
    viewport: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '视口状态 {x, y, zoom}',
    },
  },
  {
    tableName: 'TopologyLayouts',
    timestamps: true,
    underscored: false,
  }
);

module.exports = TopologyLayout;
