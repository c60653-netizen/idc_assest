import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Popconfirm,
  Avatar,
  Tooltip,
  Badge,
  Divider,
  Progress,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ReloadOutlined,
  LockOutlined,
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  KeyOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { userAPI, roleAPI } from '../api';
import CloseButton from '../components/CloseButton';

const { Option } = Select;

/**
 * 计算密码强度
 * @param {string} password - 密码
 * @returns {{ score: number, label: string, color: string }} 强度评分
 */
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 10;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 15;
  if (/[^a-zA-Z\d]/.test(password)) score += 30;
  if (password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^a-zA-Z\d]/.test(password)) score = 100;
  const clamped = Math.min(100, Math.max(0, score));
  if (clamped <= 30) return { score: clamped, label: '弱', color: '#ff4d4f' };
  if (clamped <= 60) return { score: clamped, label: '中', color: '#faad14' };
  if (clamped <= 80) return { score: clamped, label: '强', color: '#52c41a' };
  return { score: clamped, label: '非常强', color: '#1677ff' };
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [avatarUser, setAvatarUser] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [searchUsername, setSearchUsername] = useState('');
  const [searchRealName, setSearchRealName] = useState('');
  const [committedSearch, setCommittedSearch] = useState({ username: '', realName: '' });
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const fileInputRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      if (committedSearch.username) {
        params.username = committedSearch.username;
      }
      if (committedSearch.realName) {
        params.realName = committedSearch.realName;
      }
      const response = await userAPI.list(params);
      if (response.success) {
        setUsers(response.data.users);
        setPagination(prev => ({ ...prev, total: response.data.total }));
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, activeTab, committedSearch]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await roleAPI.all();
      if (response.success) {
        setRoles(response.data);
      } else {
        message.error('获取角色列表失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      message.error('获取角色列表失败，请检查网络连接');
    }
  }, []);

  // 分页或 Tab 切换时刷新用户列表（依赖 fetchUsers，由其内部 useCallback 依赖自动驱动）
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 角色列表仅在挂载时拉取一次，避免重复请求
  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAdd = useCallback(() => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  }, []);

  /**
   * 搜索用户
   * 将输入值提交到 committedSearch，重置分页到第一页
   */
  const handleSearch = useCallback(() => {
    setCommittedSearch({ username: searchUsername, realName: searchRealName });
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [searchUsername, searchRealName]);

  const handleEdit = useCallback(user => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      status: user.status,
      roleIds: user.roles?.map(r => r.roleId) || [],
    });
    setModalVisible(true);
  }, []);

  const handleResetPassword = useCallback(user => {
    setPasswordUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  }, []);

  const handleAvatarClick = useCallback(user => {
    setAvatarUser(user);
    setAvatarModalVisible(true);
  }, []);

  const handleAvatarUpload = useCallback(
    async e => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.match(/image\/(jpeg|png|gif|webp)/)) {
        message.error('只支持 JPG、PNG、GIF 和 WebP 格式的图片');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        message.error('图片大小不能超过 5MB');
        return;
      }

      setUploadLoading(true);
      try {
        const response = await userAPI.uploadAvatar(avatarUser.userId, file);
        if (response.success) {
          message.success('头像上传成功');
          fetchUsers();
          setAvatarModalVisible(false);
        } else {
          message.error(response.message || '上传失败');
        }
      } catch (error) {
        message.error('上传失败');
      } finally {
        setUploadLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [avatarUser, fetchUsers]
  );

  const handleAvatarDelete = useCallback(async () => {
    try {
      const response = await userAPI.deleteAvatar(avatarUser.userId);
      if (response.success) {
        message.success('头像已删除');
        fetchUsers();
        setAvatarModalVisible(false);
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  }, [avatarUser, fetchUsers]);

  const handleDelete = useCallback(
    async userId => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这个用户吗？此操作不可恢复！',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await userAPI.delete(userId);
            if (response.success) {
              message.success('删除成功');
              fetchUsers();
            } else {
              message.error(response.message || '删除失败');
            }
          } catch (error) {
            message.error('删除失败');
          }
        },
      });
    },
    [fetchUsers]
  );

  const handleLockUnlock = useCallback(
    async record => {
      try {
        const newStatus = record.status === 'locked' ? 'active' : 'locked';
        const response = await userAPI.update(record.userId, {
          status: newStatus,
        });
        if (response.success) {
          message.success(record.status === 'locked' ? '解锁成功' : '锁定成功');
          fetchUsers();
        } else {
          message.error(response.message || '操作失败');
        }
      } catch (error) {
        message.error('操作失败');
      }
    },
    [fetchUsers]
  );

  const handleSubmit = useCallback(
    async values => {
      if (submitting) return; // 防止重复提交
      setSubmitting(true);
      try {
        let response;
        if (editingUser) {
          response = await userAPI.update(editingUser.userId, values);
        } else {
          response = await userAPI.create(values);
        }

        if (response.success) {
          message.success(editingUser ? '更新成功' : '创建成功');
          setModalVisible(false);
          fetchUsers();
        } else {
          message.error(response.message || '操作失败');
        }
      } catch (error) {
        message.error('操作失败');
      } finally {
        setSubmitting(false);
      }
    },
    [editingUser, fetchUsers, submitting]
  );

  const handleResetPasswordSubmit = useCallback(
    async values => {
      try {
        const response = await userAPI.resetPassword(passwordUser.userId, values);
        if (response.success) {
          message.success('密码重置成功');
          setPasswordModalVisible(false);
        } else {
          message.error(response.message || '重置失败');
        }
      } catch (error) {
        message.error('重置失败');
      }
    },
    [passwordUser]
  );

  const getStatusColor = status => {
    const colors = {
      active: 'green',
      inactive: 'red',
      locked: 'orange',
      pending: 'blue',
    };
    return colors[status] || 'default';
  };

  const getStatusText = status => {
    const texts = {
      active: '正常',
      inactive: '禁用',
      locked: '锁定',
      pending: '待审核',
    };
    return texts[status] || status;
  };

  const handleApprove = useCallback(
    async userId => {
      try {
        const response = await userAPI.approve(userId);
        if (response.success) {
          message.success('审核通过');
          fetchUsers();
        } else {
          message.error(response.message || '审核失败');
        }
      } catch (error) {
        message.error('审核失败');
      }
    },
    [fetchUsers]
  );

  const handleReject = useCallback(
    async userId => {
      try {
        const response = await userAPI.reject(userId);
        if (response.success) {
          message.success('已拒绝该用户的注册申请');
          fetchUsers();
        } else {
          message.error(response.message || '操作失败');
        }
      } catch (error) {
        message.error('操作失败');
      }
    },
    [fetchUsers]
  );

  const getAvatarUrl = user => {
    if (!user?.avatar) return null;
    return user.avatar;
  };

  const tableColumns = useMemo(
    () => [
      {
        title: '头像',
        key: 'avatar',
        width: 80,
        render: (_, record) => (
          <Badge dot={!!record.avatar} color="green" offset={[-5, 35]}>
            <Avatar
              size={48}
              icon={!record.avatar && <UserOutlined />}
              src={getAvatarUrl(record)}
              style={{
                backgroundColor: record.avatar ? 'transparent' : '#1890ff',
                cursor: 'pointer',
              }}
              onClick={() => handleAvatarClick(record)}
            />
          </Badge>
        ),
      },
      {
        title: '用户名',
        key: 'username',
        width: 150,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 500 }}>{record.realName || record.username}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>@{record.username}</div>
          </div>
        ),
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        width: 200,
        render: email => email || '-',
      },
      {
        title: '手机号',
        dataIndex: 'phone',
        key: 'phone',
        width: 130,
        render: phone => phone || '-',
      },
      {
        title: '角色',
        key: 'roles',
        render: (_, record) => (
          <Space wrap>
            {record.roles?.map(role => (
              <Tag key={role.roleId} color={role.roleCode === 'admin' ? 'blue' : 'green'}>
                {role.roleName}
              </Tag>
            )) || '-'}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: status => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
      },
      {
        title: '最后登录',
        key: 'lastLogin',
        render: (_, record) => (
          <div style={{ fontSize: '12px' }}>
            <div>
              {record.lastLoginTime ? new Date(record.lastLoginTime).toLocaleString() : '从未登录'}
            </div>
            <div style={{ color: '#999' }}>{record.lastLoginIp || '-'}</div>
          </div>
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            {record.status === 'pending' ? (
              <>
                <Popconfirm
                  title="确定要通过该用户的注册申请吗？"
                  onConfirm={() => handleApprove(record.userId)}
                  okText="通过"
                  cancelText="取消"
                >
                  <Tooltip title="通过">
                    <Button type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} />
                  </Tooltip>
                </Popconfirm>
                <Popconfirm
                  title="确定要拒绝该用户的注册申请吗？"
                  onConfirm={() => handleReject(record.userId)}
                  okText="拒绝"
                  cancelText="取消"
                >
                  <Tooltip title="拒绝">
                    <Button type="text" icon={<CloseOutlined />} style={{ color: '#ff4d4f' }} />
                  </Tooltip>
                </Popconfirm>
              </>
            ) : (
              <>
                <Tooltip title="编辑">
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                </Tooltip>
                <Tooltip title="重置密码">
                  <Button
                    type="text"
                    icon={<LockOutlined />}
                    onClick={() => handleResetPassword(record)}
                  />
                </Tooltip>
                <Popconfirm
                  title={
                    record.status === 'locked' ? '确定要解锁此用户吗？' : '确定要锁定此用户吗？'
                  }
                  onConfirm={() => handleLockUnlock(record)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Tooltip title={record.status === 'locked' ? '解锁' : '锁定'}>
                    <Button
                      type="text"
                      icon={record.status === 'locked' ? <ReloadOutlined /> : <LockOutlined />}
                      style={{ color: record.status === 'locked' ? '#52c41a' : '#faad14' }}
                    />
                  </Tooltip>
                </Popconfirm>
                <Popconfirm
                  title="确定要删除此用户吗？"
                  onConfirm={() => handleDelete(record.userId)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Tooltip title="删除">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </Space>
        ),
      },
    ],
    [
      handleAvatarClick,
      handleEdit,
      handleResetPassword,
      handleDelete,
      handleLockUnlock,
      handleApprove,
      handleReject,
    ]
  );

  const pageHeaderStyle = {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const cardStyle = {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  };

  const cardHeadStyle = {
    borderBottom: '1px solid #f0f0f0',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
  };

  const primaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  };

  const secondaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease',
  };

  const actionButtonStyle = {
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease',
  };

  const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
  };

  const modalHeaderAccent = {
    width: '4px',
    height: '20px',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '2px',
  };

  const avatarModalStyle = {
    textAlign: 'center',
    padding: '20px 0',
  };

  const avatarWrapperStyle = {
    marginBottom: '24px',
    position: 'relative',
    display: 'inline-block',
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>用户管理</h1>
        <Space size="middle">
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} style={secondaryButtonStyle}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={primaryButtonStyle}
          >
            添加用户
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="搜索用户名"
          value={searchUsername}
          onChange={e => setSearchUsername(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          style={{ width: 200, borderRadius: '8px' }}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        />
        <Input
          placeholder="搜索真实姓名"
          value={searchRealName}
          onChange={e => setSearchRealName(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          style={{ width: 200, borderRadius: '8px' }}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          style={{ borderRadius: '8px', height: '36px' }}
        >
          搜索
        </Button>
      </div>

      <Card
        style={cardStyle}
        styles={{ header: cardHeadStyle, body: { padding: '20px 24px' } }}
        tabList={[
          { key: 'all', tab: '全部用户' },
          { key: 'pending', tab: '待审核' },
          { key: 'active', tab: '正常' },
          { key: 'locked', tab: '锁定' },
          { key: 'inactive', tab: '禁用' },
        ]}
        activeTabKey={activeTab}
        onTabChange={key => {
          setActiveTab(key);
          setPagination(prev => ({ ...prev, current: 1 }));
        }}
      >
        <Table
          columns={tableColumns}
          dataSource={users}
          rowKey="userId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={newPagination => {
            setPagination(prev => ({ ...prev, ...newPagination }));
          }}
          rowClassName={() => 'table-row'}
        />
      </Card>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {editingUser ? '编辑用户' : '添加用户'}
          </div>
        }
        open={modalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => {
          setModalVisible(false);
          setPasswordStrength({ score: 0, label: '', color: '' });
        }}
        footer={null}
        width={560}
        destroyOnHidden
        styles={{
          body: { padding: '20px 24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          validateTrigger="onBlur"
          onValuesChange={(changedValues) => {
            if (changedValues.password) {
              setPasswordStrength(getPasswordStrength(changedValues.password));
            }
          }}
        >
          {/* ===== 基本信息 ===== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <IdcardOutlined style={{ color: '#667eea', fontSize: '16px' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>基本信息</span>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 20, message: '3-20个字符' },
                ]}
              >
                <Input
                  placeholder="请输入用户名"
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="realName"
                label="真实姓名"
                rules={[{ required: true, message: '请输入真实姓名' }]}
              >
                <Input
                  placeholder="请输入真实姓名"
                  prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '0 0 16px 0' }} />

          {/* ===== 联系方式 ===== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MailOutlined style={{ color: '#667eea', fontSize: '16px' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>联系方式</span>
          </div>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              placeholder="请输入邮箱地址"
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item name="phone" label="手机号">
            <Input
              placeholder="请输入手机号（选填）"
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Divider style={{ margin: '0 0 16px 0' }} />

          {/* ===== 权限与安全 ===== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <SafetyOutlined style={{ color: '#667eea', fontSize: '16px' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>权限与安全</span>
          </div>

          <Form.Item
            name="roleIds"
            label="角色"
            help="可选，不选则无角色权限"
          >
            <Select
              mode="multiple"
              placeholder="请选择用户角色"
              style={{ borderRadius: '8px' }}
              maxTagCount={3}
            >
              {roles.map((role) => (
                <Option key={role.roleId} value={role.roleId}>
                  {role.roleName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码长度不能少于6个字符' },
              ]}
              help={
                passwordStrength.label ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Progress
                      percent={passwordStrength.score}
                      showInfo={false}
                      size="small"
                      strokeColor={passwordStrength.color}
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <span style={{ fontSize: '12px', color: passwordStrength.color, fontWeight: 500 }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                ) : null
              }
            >
              <Input.Password
                placeholder="请输入初始密码"
                prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          )}

          {editingUser && (
            <Form.Item name="status" label="状态">
              <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
                <Option value="active">正常</Option>
                <Option value="inactive">禁用</Option>
                <Option value="locked">锁定</Option>
              </Select>
            </Form.Item>
          )}

          {editingUser && (
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[{ min: 6, message: '密码长度不能少于6个字符' }]}
              help="留空则不修改密码"
            >
              <Input.Password
                placeholder="留空则不修改密码"
                prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          )}

          {!editingUser && (
            <Form.Item name="status" label="状态">
              <Select placeholder="请选择状态" style={{ borderRadius: '8px' }}>
                <Option value="active">正常</Option>
                <Option value="inactive">禁用</Option>
                <Option value="locked">锁定</Option>
              </Select>
            </Form.Item>
          )}

          <Divider style={{ margin: '8px 0 0 0' }} />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '20px' }}>
            <Space size={12}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setPasswordStrength({ score: 0, label: '', color: '' });
                }}
                style={{ borderRadius: '8px', height: '40px', paddingLeft: '20px', paddingRight: '20px' }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={submitting}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
                  fontWeight: '500',
                  paddingLeft: '28px',
                  paddingRight: '28px',
                }}
              >
                {editingUser ? '保存修改' : '创建用户'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {`重置密码 - ${passwordUser?.username}`}
          </div>
        }
        open={passwordModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        width={400}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPasswordSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button
                onClick={() => setPasswordModalVisible(false)}
                style={{ borderRadius: '8px', height: '40px' }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  ...primaryButtonStyle,
                  width: 'auto',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={modalHeaderStyle}>
            <span style={modalHeaderAccent}></span>
            {`设置头像 - ${avatarUser?.username}`}
          </div>
        }
        open={avatarModalVisible}
        closeIcon={<CloseButton />}
        onCancel={() => setAvatarModalVisible(false)}
        footer={null}
        width={400}
        destroyOnHidden
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
        }}
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        <div style={avatarModalStyle}>
          <div style={avatarWrapperStyle}>
            <Badge dot={!!avatarUser?.avatar} color="green" offset={[-5, 35]}>
              <Avatar
                size={120}
                icon={!avatarUser?.avatar && <UserOutlined />}
                src={getAvatarUrl(avatarUser)}
                style={{
                  backgroundColor: avatarUser?.avatar ? 'transparent' : '#1890ff',
                  border: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
              />
            </Badge>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleAvatarUpload}
            />

            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => fileInputRef.current?.click()}
              loading={uploadLoading}
              block
              style={{
                ...primaryButtonStyle,
                height: '44px',
              }}
            >
              {avatarUser?.avatar ? '更换头像' : '上传头像'}
            </Button>

            {avatarUser?.avatar && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleAvatarDelete}
                block
                style={{ borderRadius: '8px', height: '44px' }}
              >
                删除头像
              </Button>
            )}
          </Space>

          <div style={{ marginTop: '16px', color: '#8c8c8c', fontSize: '12px' }}>
            支持 JPG、PNG、GIF、WebP 格式，大小不超过 5MB
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
