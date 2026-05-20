import { request } from '@umijs/max';

/**
 * 获取订单数据
 * @param params
 * @param options
 */
export async function getOrdersByParam(
  params: {
    current?: number;
    pageSize?: number;
    customerName?: string;
    [key: string]: any;
  },
  options?: { [key: string]: any },
) {
  return request<any>('/api/v1/iboss/getOrdersByParam', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}
