import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { history, request } from '@umijs/max';
import { Button } from 'antd';
import React from 'react';

const DnbList: React.FC = () => {
  const columns: ProColumns<{ name: string }>[] = [
    {
      title: '集合名称',
      dataIndex: 'name',
      render: (_, row) => (
        <a 
          onClick={() => history.push(`/dnb/tree/${row.name}`)}
          style={{ fontWeight: 'bold', fontSize: 16 }}
        >
          {row.name}
        </a>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, row) => [
        <Button key="view" type="primary" onClick={() => {
          history.push(`/dnb/tree/${row.name}`);
        }}>
          查看表结构树
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title={false} header={{ title: undefined, breadcrumb: {} }}>
      <ProTable<{ name: string }>
        headerTitle="数据库集合列表"
        rowKey="name"
        search={false}
        options={false}
        pagination={{ pageSize: 10 }}
        columns={columns}
        request={async () => {
          const res = await request('/api/v1/wildcards', {
            method: 'GET',
            params: { prefix: 'dnb' },
          });
          const arr = Array.isArray(res) ? res : (res.data || []);
          return {
            data: arr.map((item: string) => ({ name: item })),
            success: true,
            total: arr.length,
          };
        }}
      />
    </PageContainer>
  );
};

export default DnbList;
