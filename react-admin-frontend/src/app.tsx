import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link, request as requestFn } from '@umijs/max';
import React from 'react';
import { Popover } from 'antd';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  SelectLang,
} from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  dnbCollections?: string[];
  keyCustomersMenu?: React.ReactNode;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (_error) {
      history.push(loginPath);
    }
    return undefined;
  };

  // 获取 DNB 集合列表
  const fetchDnbCollections = async (): Promise<string[]> => {
    try {
      const res = await requestFn('/api/v1/wildcards', {
        method: 'GET',
        params: { prefix: 'dnb' },
        skipErrorHandler: true,
      });
      return Array.isArray(res) ? res : (res.data || []);
    } catch {
      return [];
    }
  };

  // 获取并构建行业要客菜单数据
  const fetchKeyCustomersMenu = async (): Promise<React.ReactNode | null> => {
    try {
      const [customersRes, industriesRes] = await Promise.all([
        requestFn('/api/v1/wildcards/keycustomer', { method: 'GET', skipErrorHandler: true }),
        requestFn('/api/v1/wildcards/industry', { method: 'GET', skipErrorHandler: true }),
      ]);
      const customers = customersRes?.results || customersRes?.data?.results || [];
      const industries = industriesRes?.results || industriesRes?.data?.results || [];

      // Create a map for industryCode -> industry_name
      const industryMap: Record<string, string> = {};
      industries.forEach((ind: any) => {
        if (ind.industry_code && ind.industry_name) {
          industryMap[ind.industry_code] = ind.industry_name;
        }
      });

      // Group customers by industryCode
      const grouped: Record<string, any[]> = {};
      customers.forEach((c: any) => {
        const code = c.industryCode || '未知行业';
        if (!grouped[code]) grouped[code] = [];
        grouped[code].push(c);
      });

      const megaMenuNode = (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'nowrap', 
          gap: '32px', 
          padding: '24px', 
          width: 'max-content',
          maxWidth: '100vw',
          maxHeight: 'calc(100vh - 80px)', 
          overflowX: 'auto',
          overflowY: 'auto',
          backgroundColor: '#ffffff'
        }}>
          {Object.keys(grouped).map((code) => {
            const groupName = industryMap[code] || code;
            const count = grouped[code].length;
            return (
              <div key={code} style={{ flex: '0 0 auto', width: '160px', marginBottom: '16px' }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: '#111', 
                  fontSize: '14px',
                  marginBottom: '12px' 
                }}>
                  {groupName} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '12px' }}>({count})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {grouped[code].map((c: any) => (
                    <div key={c._id}>
                      <Link 
                        to={`/keycustomer/${c._id}`} 
                        className="mega-menu-link"
                        style={{ color: '#666', fontSize: '13px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={c.nameCn || c.nameEn || '未知公司'}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6a00')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                      >
                        {c.nameCn || c.nameEn || '未知公司'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );

      return megaMenuNode;
    } catch (e) {
      console.error('Failed to fetch key customers', e);
      return null;
    }
  };

  // 如果不是登录页面，执行
  const { location } = history;
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const currentUser = await fetchUserInfo();
    const dnbCollections = await fetchDnbCollections();
    const keyCustomersMenu = await fetchKeyCustomersMenu();
    return {
      fetchUserInfo,
      currentUser,
      dnbCollections,
      keyCustomersMenu,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
      <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDevOrTest
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 动态注入 DNB 集合作为二级菜单
    menuDataRender: (menuData: any[]) => {
      return menuData.map((item: any) => {
        if (item.path === '/dnb' && initialState?.dnbCollections?.length) {
          return {
            ...item,
            children: initialState.dnbCollections.map((col: string) => ({
              path: `/dnb/tree/${col}`,
              name: col,
            })),
          };
        }
        if (item.path === '/keycustomer') {
          return {
            ...item,
            children: undefined, // Prevent ProLayout from rendering a standard dropdown wrapper
          };
        }
        return item;
      });
    },
    menuItemRender: (itemProps, defaultDom) => {
      if (itemProps.path === '/keycustomer' && initialState?.keyCustomersMenu) {
        return (
          <Popover
            content={initialState.keyCustomersMenu}
            placement="bottom"
            trigger="hover"
            arrow={false}
            overlayClassName="keycustomer-mega-menu-overlay"
            overlayInnerStyle={{ padding: 0, borderRadius: '8px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
          >
            <div style={{ width: '100%', height: '100%' }}>
              {defaultDom}
            </div>
          </Popover>
        );
      }
      // Re-enable routing for all other native menus!
      if (itemProps.isUrl || !itemProps.path) {
        return defaultDom;
      }
      return <Link to={itemProps.path}>{defaultDom}</Link>;
    },
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          <style>{`
            .keycustomer-mega-menu-overlay {
              left: 50vw !important;
              transform: translateX(-50%) !important;
              max-width: 100vw !important;
            }
          `}</style>
          {children}
          {isDevOrTest && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // 生产环境与开发环境均使用同源相对路径，防止跨域问题
  baseURL: '',
  ...errorConfig,
};
