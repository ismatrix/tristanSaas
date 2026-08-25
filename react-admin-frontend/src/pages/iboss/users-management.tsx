import React, { useState, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Tag,
  Space,
  Popconfirm,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  DeleteOutlined,
  LogoutOutlined,
  KeyOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  forceLogoutAt?: string;
  createdAt: string;
  updatedAt: string;
}

const UsersManagementPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState<boolean>(false);

  // 密码重置展示弹窗
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [resetUserInfo, setResetUserInfo] = useState<{ name: string; email: string; newPassword: string } | null>(null);

  // 统计指标
  const [stats, setStats] = useState<{ total: number; readonlyCount: number; adminCount: number }>({
    total: 0,
    readonlyCount: 0,
    adminCount: 0,
  });

  // 1. 强制登出用户
  const handleForceLogout = async (record: UserItem) => {
    try {
      const res = await request(`/api/v1/users/${record.id}/force-logout`, {
        method: 'POST',
      });
      if (res && res.success) {
        message.success(`用户【${record.name}】已被强制登出！其当前所有会话已失效，下次操作将自动跳回登录页。`);
        actionRef.current?.reload();
      } else {
        message.error(res?.message || '强制登出操作失败');
      }
    } catch (err: any) {
      console.error('Force logout error:', err);
      message.error(err?.data?.message || '强制登出失败');
    }
  };

  // 2. 密码重置
  const handleResetPassword = async (record: UserItem) => {
    try {
      const res = await request(`/api/v1/users/${record.id}/reset-password`, {
        method: 'POST',
      });
      if (res && res.success && res.newPassword) {
        setResetUserInfo({
          name: record.name,
          email: record.email,
          newPassword: res.newPassword,
        });
        setResetModalVisible(true);
        message.success(`用户【${record.name}】密码已成功重置！`);
        actionRef.current?.reload();
      } else {
        message.error(res?.message || '重置密码失败');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      message.error(err?.data?.message || '重置密码失败');
    }
  };

  // 3. 删除用户
  const handleDeleteUser = async (record: UserItem) => {
    try {
      await request(`/api/v1/users/${record.id}`, {
        method: 'DELETE',
      });
      message.success(`用户【${record.name}】账号已彻底删除！`);
      actionRef.current?.reload();
    } catch (err: any) {
      console.error('Delete user error:', err);
      message.error(err?.data?.message || '删除用户失败');
    }
  };

  // 4. 新建用户提交
  const handleCreateUser = async (values: any) => {
    setCreating(true);
    try {
      const password = values.password || Math.random().toString(36).slice(-8) + 'A1';
      const payload = {
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        password: password,
        role: values.role || 'readonly',
        isEmailVerified: true,
      };

      const res = await request('/api/v1/users', {
        method: 'POST',
        data: payload,
      });

      if (res) {
        message.success(`用户【${payload.name}】创建成功！`);
        setCreateModalVisible(false);
        createForm.resetFields();

        // 弹窗提示生成的新账号密码
        setResetUserInfo({
          name: payload.name,
          email: payload.email,
          newPassword: password,
        });
        setResetModalVisible(true);
        actionRef.current?.reload();
      }
    } catch (err: any) {
      console.error('Create user error:', err);
      message.error(err?.data?.message || '创建用户失败，请检查邮箱是否已存在');
    } finally {
      setCreating(false);
    }
  };

  // 表格列定义
  const columns: ProColumns<UserItem>[] = [
    {
      title: '序号',
      dataIndex: 'index',
      valueType: 'indexBorder',
      width: 60,
      align: 'center',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      copyable: true,
      ellipsis: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <strong style={{ color: '#1f1f1f', fontSize: 14 }}>{record.name}</strong>
        </Space>
      ),
    },
    {
      title: '登录邮箱 / 账号',
      dataIndex: 'email',
      copyable: true,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 500 }}>
          {record.email}
        </span>
      ),
    },
    {
      title: '权限角色',
      dataIndex: 'role',
      valueType: 'select',
      valueEnum: {
        readonly: { text: '只读访客 (只读查看)', status: 'Default' },
        user: { text: '普通用户 (可编辑)', status: 'Processing' },
        admin: { text: '超级管理员 (全部权限)', status: 'Success' },
      },
      render: (_, record) => {
        if (record.role === 'admin') {
          return <Tag color="gold" style={{ fontWeight: 'bold' }}>超级管理员</Tag>;
        }
        if (record.role === 'user') {
          return <Tag color="blue">标准用户 (编辑权限)</Tag>;
        }
        return <Tag color="purple">只读用户 (仅查看)</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isEmailVerified',
      hideInSearch: true,
      width: 110,
      render: (_, record) => (
        record.isEmailVerified ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>已激活</Tag>
        ) : (
          <Tag color="warning">未验证</Tag>
        )
      ),
    },
    {
      title: '最后强制登出时间',
      dataIndex: 'forceLogoutAt',
      hideInSearch: true,
      width: 170,
      render: (_, record) => {
        if (!record.forceLogoutAt) return <span style={{ color: '#bbb' }}>—</span>;
        return (
          <span style={{ color: '#fa8c16', fontSize: 12 }}>
            {dayjs(record.forceLogoutAt).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => [
        <Popconfirm
          key="logout"
          title="强制该用户下线？"
          description="点击后该用户在任何页面的下一次操作均会自动登出并跳转到登录界面。"
          okText="确定强制登出"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleForceLogout(record)}
        >
          <Button size="small" type="link" icon={<LogoutOutlined />} style={{ color: '#fa8c16', padding: 0 }}>
            强制登出
          </Button>
        </Popconfirm>,
        <Popconfirm
          key="reset"
          title="重置登录密码？"
          description={`将为【${record.name}】随机生成新的高强度登录密码，并使其旧 Session 立即失效。`}
          okText="确定重置"
          cancelText="取消"
          onConfirm={() => handleResetPassword(record)}
        >
          <Button size="small" type="link" icon={<KeyOutlined />} style={{ color: '#1890ff', padding: 0 }}>
            密码重置
          </Button>
        </Popconfirm>,
        <Popconfirm
          key="delete"
          title="彻底删除该用户账号？"
          description="此操作不可撤销，该账号将从系统中永久删除。"
          okText="彻底删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteUser(record)}
        >
          <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 'bold', color: '#111' }}>👥 系统用户信息与权限管控</span>
            <Tag color="blue">账号管理</Tag>
          </div>
        ),
        extra: [
          <Button key="create" type="primary" icon={<UserAddOutlined />} onClick={() => setCreateModalVisible(true)}>
            新建用户
          </Button>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            刷新列表
          </Button>,
        ],
      }}
    >
      {/* 概览统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>系统总注册用户</span>}
              value={stats.total}
              prefix={<UserOutlined style={{ color: '#1890ff', marginRight: 6 }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>位成员</span>}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #f9f0ff 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>只读访客用户 (受限查看)</span>}
              value={stats.readonlyCount}
              prefix={<SafetyCertificateOutlined style={{ color: '#722ed1', marginRight: 6 }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>位只读账号</span>}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>特权 / 超级管理员</span>}
              value={stats.adminCount}
              prefix={<LockOutlined style={{ color: '#fa8c16', marginRight: 6 }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>位管理员</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户表格 */}
      <ProTable<UserItem>
        headerTitle="全量用户信息列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        request={async (params = {}) => {
          const { current, pageSize, ...rest } = params;
          const res = await request('/api/v1/users', {
            params: {
              page: current || 1,
              limit: pageSize || 100,
              ...rest,
            },
          });
          const list = res?.results || (Array.isArray(res) ? res : []);
          const total = res?.totalResults || list.length;

          // 计算统计
          const rCount = list.filter((u: any) => u.role === 'readonly').length;
          const aCount = list.filter((u: any) => u.role === 'admin').length;
          setStats({
            total,
            readonlyCount: rCount,
            adminCount: aCount,
          });

          return {
            data: list,
            total,
            success: true,
          };
        }}
        columns={columns}
        pagination={{
          pageSize: 100,
          showSizeChanger: true,
        }}
      />

      {/* 新建用户 Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#1890ff' }} />
            <span>新建系统用户</span>
          </Space>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{ role: 'readonly' }}
        >
          <Form.Item
            name="name"
            label="用户姓名 / 显示名称"
            rules={[{ required: true, message: '请输入用户姓名' }]}
          >
            <Input placeholder="例如: Alex" />
          </Form.Item>
          <Form.Item
            name="email"
            label="登录邮箱 (账号唯一标识)"
            rules={[
              { required: true, message: '请输入登录邮箱' },
              { type: 'email', message: '请输入有效邮箱格式' },
            ]}
          >
            <Input placeholder="例如: alex@cmi.chinamobile.com" />
          </Form.Item>
          <Form.Item
            name="role"
            label="分配角色与权限"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="readonly">只读访客 (仅查看页面，禁止修改/删除/关联)</Select.Option>
              <Select.Option value="user">标准用户 (拥有业务数据编辑权限)</Select.Option>
              <Select.Option value="admin">超级管理员 (拥有全站所有操作管理权限)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="password"
            label="初始登录密码 (选填，留空则系统自动随机生成)"
          >
            <Input.Password placeholder="留空将自动生成 10 位强密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 密码生成/重置结果通知 Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#52c41a' }} />
            <span>登录凭证生成成功</span>
          </Space>
        }
        open={resetModalVisible}
        onOk={() => setResetModalVisible(false)}
        onCancel={() => setResetModalVisible(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已妥善保存"
      >
        <div style={{ padding: '12px 0' }}>
          <Paragraph>
            已为用户 <Text strong style={{ color: '#1890ff' }}>{resetUserInfo?.name}</Text> (<code>{resetUserInfo?.email}</code>) 成功生成登录凭证：
          </Paragraph>
          <Card style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#888', fontSize: 12 }}>新登录密码：</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace', color: '#52c41a', marginTop: 4 }}>
                  {resetUserInfo?.newPassword}
                </div>
              </div>
              <Tooltip title="复制新密码">
                <Button
                  icon={<CopyOutlined />}
                  type="primary"
                  onClick={() => {
                    if (resetUserInfo?.newPassword) {
                      navigator.clipboard.writeText(resetUserInfo.newPassword);
                      message.success('新密码已成功复制到剪贴板！');
                    }
                  }}
                >
                  复制密码
                </Button>
              </Tooltip>
            </div>
          </Card>
          <Paragraph style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
            💡 提示：旧登录 Session 已被强制失效，请将新密码同步给该用户。
          </Paragraph>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default UsersManagementPage;
