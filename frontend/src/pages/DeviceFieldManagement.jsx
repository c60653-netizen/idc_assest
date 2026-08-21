import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  InputNumber,
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  FontSizeOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LockOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  FieldStringOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { designTokens as dt } from '../config/theme';
import CloseButton from '../components/CloseButton';

const { Option = Select.Option } = Select;

/* ============================ 选项编辑器 ============================ */
const OptionsEditor = ({ value, onChange }) => {
  const options = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    onChange([...options, { value: '', label: '' }]);
  };

  const handleRemove = index => {
    onChange(options.filter((_, i) => i !== index));
  };

  const handleUpdate = (index, field, fieldValue) => {
    const newOptions = options.map((opt, i) => (i === index ? { ...opt, [field]: fieldValue } : opt));
    onChange(newOptions);
  };

  return (
    <div
      style={{
        border: `1px solid ${dt.colors.border.light}`,
        borderRadius: dt.borderRadius.medium,
        padding: dt.spacing.md,
        background: dt.colors.background.secondary,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: dt.spacing.md, gap: dt.spacing.sm }}>
        <div style={{
          width: '4px', height: '16px',
          background: dt.colors.primary.gradient, borderRadius: '2px',
        }} />
        <span style={{ color: dt.colors.text.primary, fontSize: dt.typography.base, fontWeight: 600 }}>选项配置</span>
        <span style={{ color: dt.colors.text.tertiary, fontSize: dt.typography.sm }}>（值用于提交，标签用于显示）</span>
      </div>

      {options.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px', background: dt.colors.background.primary,
          borderRadius: dt.borderRadius.medium, border: `1px dashed ${dt.colors.border.medium}`,
        }}>
          <div style={{ color: dt.colors.text.tertiary, fontSize: dt.typography.base, marginBottom: dt.spacing.sm }}>
            暂无选项
          </div>
          <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleAdd}
            style={{ background: dt.colors.primary.gradient, border: 'none', borderRadius: dt.borderRadius.small, height: 36 }}>
            添加第一个选项
          </Button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: dt.spacing.sm, marginBottom: dt.spacing.sm }}>
            <div style={{ display: 'flex', gap: '12px', padding: '0 4px', marginBottom: '4px' }}>
              <span style={{ width: 160, color: dt.colors.text.secondary, fontSize: dt.typography.sm, fontWeight: 500 }}>值（value）</span>
              <span style={{ width: 160, color: dt.colors.text.secondary, fontSize: dt.typography.sm, fontWeight: 500 }}>标签（label）</span>
            </div>
            {options.map((opt, index) => (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                background: dt.colors.background.primary, borderRadius: dt.borderRadius.small,
                border: `1px solid ${dt.colors.border.light}`, transition: `all ${dt.transitions.fast}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: dt.colors.primary.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: dt.colors.primary.main, fontSize: dt.typography.sm, fontWeight: 600, flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <Input placeholder="值" value={opt.value}
                  onChange={e => handleUpdate(index, 'value', e.target.value)} style={{ width: 160, borderRadius: dt.borderRadius.small }} />
                <Input placeholder="标签" value={opt.label}
                  onChange={e => handleUpdate(index, 'label', e.target.value)} style={{ width: 160, borderRadius: dt.borderRadius.small }} />
                <Button type="text" danger icon={<MinusCircleOutlined />}
                  onClick={() => handleRemove(index)} style={{ flexShrink: 0 }}>删除</Button>
              </div>
            ))}
          </div>
          <Button type="dashed" icon={<PlusCircleOutlined />} onClick={handleAdd}
            style={{ width: '100%', height: 40, borderRadius: dt.borderRadius.medium, borderColor: dt.colors.border.medium, color: dt.colors.text.secondary }}>
            添加选项
          </Button>
        </>
      )}
    </div>
  );
};

/* ============================ 字段类型配置 ============================ */
const FIELD_TYPE_MAP = {
  string: { text: '文本', color: dt.colors.fieldType.string },
  number: { text: '数字', color: dt.colors.fieldType.number },
  boolean: { text: '布尔值', color: dt.colors.fieldType.boolean },
  select: { text: '下拉选择', color: dt.colors.fieldType.select },
  date: { text: '日期', color: dt.colors.fieldType.date },
  textarea: { text: '多行文本', color: dt.colors.fieldType.textarea },
};

const FIELD_TYPE_OPTIONS = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
  { value: 'textarea', label: '多行文本' },
];

const getFieldTypeIcon = type => {
  const iconMap = {
    string: <FontSizeOutlined />,
    number: <NumberOutlined />,
    boolean: <CheckCircleOutlined />,
    select: <AppstoreOutlined />,
    date: <CalendarOutlined />,
    textarea: <FileTextOutlined />,
  };
  return iconMap[type] || <FontSizeOutlined />;
};

// 强制锁定必填的系统核心字段
const FORCE_LOCKED_REQUIRED_FIELDS = ['name', 'serialNumber', 'position', 'height'];
// 强制锁定可见的系统核心字段
const FORCE_LOCKED_VISIBLE_FIELDS = ['name', 'serialNumber'];

/* 表格细分隔线 + 悬停高亮（通过 CSS 变量实现行悬停不闪频） */
const tableStyles = `
.field-mgmt-table .ant-table { background: transparent; }
.field-mgmt-table .ant-table-container { border-inline-start: none !important; }
.field-mgmt-table .ant-table-thead > tr > th {
  background: ${dt.colors.background.tertiary} !important;
  color: ${dt.colors.text.secondary};
  font-size: ${dt.typography.sm};
  font-weight: 600;
  border-bottom: 1px solid ${dt.colors.border.light} !important;
  padding-block: 12px;
}
.field-mgmt-table .ant-table-thead > tr > th::before { display: none !important; }
.field-mgmt-table .ant-table-tbody > tr > td {
  border-bottom: 1px solid ${dt.colors.neutral[100]} !important;
  padding-block: 13px;
  transition: background ${dt.transitions.fast};
}
.field-mgmt-table .ant-table-tbody > tr:hover > td {
  background: ${dt.colors.primary.bg} !important;
}
.field-mgmt-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
.field-mgmt-table .ant-pagination { margin-bottom: 0; }
`;

function DeviceFieldManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [selectedFieldType, setSelectedFieldType] = useState('string');
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50', '100'],
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
  });

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/deviceFields');
      setFields(response.data.sort((a, b) => a.order - b.order));
    } catch (error) {
      message.error('获取字段列表失败');
      console.error('获取字段列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFields(); }, []);

  /* 顶部统计 */
  const stats = useMemo(() => ({
    total: fields.length,
    system: fields.filter(f => f.isSystem).length,
    custom: fields.filter(f => !f.isSystem).length,
    select: fields.filter(f => f.fieldType === 'select').length,
  }), [fields]);

  const showModal = (field = null) => {
    setEditingField(field);
    if (field) {
      const fieldData = { ...field, options: Array.isArray(field.options) ? field.options : [] };
      setSelectedFieldType(field.fieldType || 'string');
      form.setFieldsValue(fieldData);
    } else {
      form.resetFields();
      setSelectedFieldType('string');
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingField(null);
    setSelectedFieldType('string');
  };

  const handleFieldTypeChange = value => {
    setSelectedFieldType(value);
    if (value !== 'select') form.setFieldsValue({ options: [] });
  };

  const handleSubmit = async values => {
    try {
      const fieldData = {
        ...values,
        options: values.options && values.options.length > 0 ? values.options : null,
      };
      if (editingField) {
        await axios.put(`/api/deviceFields/${editingField.fieldId}`, fieldData);
        message.success('字段更新成功');
      } else {
        await axios.post('/api/deviceFields', fieldData);
        message.success('字段创建成功');
      }
      setModalVisible(false);
      fetchFields();
      setEditingField(null);
      setSelectedFieldType('string');
    } catch (error) {
      message.error(editingField ? '字段更新失败' : '字段创建失败');
      console.error(editingField ? '字段更新失败:' : '字段创建失败:', error);
    }
  };

  const handleDelete = async fieldId => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个字段吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/deviceFields/${fieldId}`);
          message.success('字段删除成功');
          fetchFields();
        } catch (error) {
          message.error('字段删除失败');
          console.error('字段删除失败:', error);
        }
      },
    });
  };

  /* 状态指示点：必填 / 可见 */
  const StatusDot = ({ on, label, color }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: on ? color : dt.colors.border.medium,
      }} />
      <span style={{ color: on ? color : dt.colors.text.tertiary, fontSize: dt.typography.sm, fontWeight: 500 }}>
        {label}
      </span>
    </span>
  );

  const columns = useMemo(
    () => [
      {
        title: '字段名称',
        dataIndex: 'fieldName',
        key: 'fieldName',
        width: 170,
        render: (text, record) => (
          <Space size="small">
            <span style={{ color: dt.colors.text.primary, fontSize: dt.typography.base, fontWeight: 500 }}>{text}</span>
            {record.isSystem && (
              <Tooltip title="系统字段，不可删除">
                <LockOutlined style={{ color: dt.colors.warning.main, fontSize: 13 }} />
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: '显示名称',
        dataIndex: 'displayName',
        key: 'displayName',
        width: 130,
        render: text => <span style={{ color: dt.colors.text.secondary }}>{text}</span>,
      },
      {
        title: '字段类型',
        dataIndex: 'fieldType',
        key: 'fieldType',
        width: 130,
        render: type => {
          const config = FIELD_TYPE_MAP[type] || { text: type, color: dt.colors.text.tertiary };
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: '999px',
              background: `${config.color}15`, color: config.color, fontSize: dt.typography.sm, fontWeight: 500,
            }}>
              {getFieldTypeIcon(type)}
              {config.text}
            </span>
          );
        },
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        width: 90,
        render: required => <StatusDot on={required} label="必填" color={dt.colors.success.main} />,
      },
      {
        title: '可见',
        dataIndex: 'visible',
        key: 'visible',
        width: 90,
        render: visible => <StatusDot on={visible} label="可见" color={dt.colors.primary.main} />,
      },
      {
        title: '顺序',
        dataIndex: 'order',
        key: 'order',
        width: 80,
        align: 'center',
        render: order => (
          <span style={{
            display: 'inline-flex', minWidth: 30, justifyContent: 'center',
            padding: '1px 8px', borderRadius: dt.borderRadius.small,
            background: dt.colors.background.tertiary, color: dt.colors.text.secondary,
            fontSize: dt.typography.sm, fontWeight: 600,
          }}>
            {order}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button type="text" icon={<EditOutlined />} onClick={() => showModal(record)}
              style={{ color: dt.colors.primary.main, height: 28, padding: '0 8px', fontWeight: 500 }}>
              编辑
            </Button>
            {record.isSystem ? (
              <Tooltip title="系统字段不可删除">
                <Button type="text" danger icon={<DeleteOutlined />} disabled style={{ height: 28, padding: '0 8px' }}>
                  删除
                </Button>
              </Tooltip>
            ) : (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.fieldId)}
                style={{ height: 28, padding: '0 8px' }}>
                删除
              </Button>
            )}
          </Space>
        ),
      },
    ],
    []
  );

  /* 顶部统计卡片数据 */
  const statItems = [
    { key: 'total', label: '字段总数', value: stats.total, color: dt.colors.primary.main, icon: <DatabaseOutlined /> },
    { key: 'system', label: '系统字段', value: stats.system, color: dt.colors.warning.main, icon: <LockOutlined /> },
    { key: 'custom', label: '自定义字段', value: stats.custom, color: dt.colors.success.main, icon: <AppstoreOutlined /> },
    { key: 'select', label: '下拉选择', value: stats.select, color: dt.colors.purple.main, icon: <FieldStringOutlined /> },
  ];

  const formRowStyle = { display: 'flex', gap: dt.spacing.md };
  const formItemFlexStyle = { flex: 1 };
  const formActionsStyle = { marginBottom: 0, textAlign: 'right' };

  return (
    <div style={{
      minHeight: '100vh',
      background: dt.colors.background.secondary,
      padding: dt.spacing.lg,
    }}>
      <style>{tableStyles}</style>

      {/* 标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dt.spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dt.spacing.sm, fontSize: '20px', fontWeight: 600, color: dt.colors.text.primary }}>
          <span style={{
            width: 30, height: 30, borderRadius: dt.borderRadius.medium,
            background: dt.colors.primary.gradient, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DatabaseOutlined style={{ fontSize: 15 }} />
          </span>
          设备字段管理
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}
          style={{ background: dt.colors.primary.gradient, border: 'none', height: 36, borderRadius: dt.borderRadius.small, boxShadow: dt.shadows.small }}>
          添加字段
        </Button>
      </div>

      {/* 统计行 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: dt.spacing.md,
        marginBottom: dt.spacing.lg,
      }}>
        {statItems.map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', background: dt.colors.background.primary,
            borderRadius: dt.borderRadius.medium, boxShadow: dt.shadows.sm,
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: dt.borderRadius.small,
              background: `${item.color}15`, color: item.color,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.icon}
            </span>
            <div>
              <div style={{ color: dt.colors.text.secondary, fontSize: dt.typography.sm }}>{item.label}</div>
              <div style={{ color: dt.colors.text.primary, fontSize: '20px', fontWeight: 700, lineHeight: 1.2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 内容区：单一容器，弱化与页面分割 */}
      <div style={{
        background: dt.colors.background.primary,
        borderRadius: dt.borderRadius.large,
        border: `1px solid ${dt.colors.border.light}`,
        padding: dt.spacing.lg,
      }}>
        <div className="field-mgmt-table">
          <Table
            columns={columns}
            dataSource={fields}
            rowKey="fieldId"
            loading={loading}
            pagination={pagination}
            onChange={newPagination =>
              setPagination({ ...pagination, current: newPagination.current, pageSize: newPagination.pageSize })
            }
            scroll={{ x: 900 }}
            style={{ background: 'transparent' }}
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={<span style={{ fontWeight: 600 }}>{editingField ? '编辑字段' : '添加字段'}</span>}
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={handleCancel}
        footer={null}
        width={600}
        styles={{ body: { padding: dt.spacing.lg } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fieldName"
            label={<span style={{ fontWeight: 500 }}>字段名称</span>}
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="请输入字段名称（英文，如：deviceId）" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={<span style={{ fontWeight: 500 }}>显示名称</span>}
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="请输入显示名称（中文，如：设备ID）" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label={<span style={{ fontWeight: 500 }}>字段类型</span>}
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select placeholder="请选择字段类型" onChange={handleFieldTypeChange}>
              {FIELD_TYPE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={formRowStyle}>
            <Form.Item
              name="required"
              label={<span style={{ fontWeight: 500 }}>必填</span>}
              valuePropName="checked"
              style={formItemFlexStyle}
              tooltip={
                editingField && FORCE_LOCKED_REQUIRED_FIELDS.includes(editingField.fieldName)
                  ? '系统核心字段，不可关闭必填'
                  : undefined
              }
            >
              <Switch disabled={editingField && FORCE_LOCKED_REQUIRED_FIELDS.includes(editingField.fieldName)} />
            </Form.Item>

            <Form.Item
              name="visible"
              label={<span style={{ fontWeight: 500 }}>可见</span>}
              valuePropName="checked"
              style={formItemFlexStyle}
              tooltip={
                editingField && FORCE_LOCKED_VISIBLE_FIELDS.includes(editingField.fieldName)
                  ? '系统核心字段，在其他模块中被引用，不可关闭可见'
                  : undefined
              }
            >
              <Switch defaultChecked disabled={editingField && FORCE_LOCKED_VISIBLE_FIELDS.includes(editingField.fieldName)} />
            </Form.Item>
          </div>

          <Form.Item
            name="order"
            label={<span style={{ fontWeight: 500 }}>显示顺序</span>}
            rules={[{ required: true, message: '请输入显示顺序' }]}
          >
            <InputNumber placeholder="请输入显示顺序" min={0} style={{ width: '100%' }} />
          </Form.Item>

          {selectedFieldType === 'select' ? (
            <Form.Item
              name="options"
              label={<span style={{ fontWeight: 500 }}>选项配置</span>}
              tooltip="为下拉选择类型添加选项，值（value）用于提交数据，标签（label）用于显示"
            >
              <OptionsEditor />
            </Form.Item>
          ) : (
            <Form.Item
              name="options"
              label={<span style={{ fontWeight: 500 }}>选项配置</span>}
              tooltip="仅下拉选择类型需要配置选项"
            >
              <Input.TextArea
                rows={2}
                placeholder="仅下拉选择类型需要配置，此处不可编辑"
                disabled
                style={{ background: dt.colors.background.tertiary }}
              />
            </Form.Item>
          )}

          <Form.Item style={formActionsStyle}>
            <Space>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" htmlType="submit">确定</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceFieldManagement;