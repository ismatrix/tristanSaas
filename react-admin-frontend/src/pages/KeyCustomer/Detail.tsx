import { PageContainer } from '@ant-design/pro-components';
import { Card, Typography } from 'antd';
import React from 'react';
import { useParams } from '@umijs/max';

const KeyCustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <PageContainer title="公司详情">
      <Card>
        <Typography.Title level={3}>这只是一个简单的占位组件</Typography.Title>
        <Typography.Paragraph>
          当前选中的公司 ID 为: <strong>{id}</strong>
        </Typography.Paragraph>
        <Typography.Paragraph>
          在这里可以继续开发获取该公司详情的逻辑与展示页面。
        </Typography.Paragraph>
      </Card>
    </PageContainer>
  );
};

export default KeyCustomerDetail;
