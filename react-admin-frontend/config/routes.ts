/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },

  {
    path: '/admin',
    name: 'admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin',
        redirect: '/admin/sub-page',
      },
      {
        path: '/admin/sub-page',
        name: 'sub-page',
        component: './Admin',
      },
    ],
  },
  {
    name: '能力出海',
    icon: 'table',
    path: '/iboss',
    access: 'canIboss',
    routes: [
      {
        path: '/iboss',
        redirect: '/iboss/overseas-orders',
      },
      {
        name: 'overseas-orders',
        path: '/iboss/overseas-orders',
        component: './iboss/overseas-orders',
        hideInMenu: true,
      },
    ],
  },

  {
    name: '要客清单',
    icon: 'ProfileOutlined',
    path: '/key-customers',
    component: './iboss/key-customers',
  },
  {
    // DNB 家族树详情页，从要客清单的 globalUltimateDuns 列链接跳转，不显示在菜单中
    name: 'DNB家族树',
    path: '/DNBFamilyTree/:globalUltimateDuns',
    hideInMenu: true,
    component: './iboss/dnb-family-tree',
  },
  {
    name: 'DNB WEB家族树',
    path: '/DNBWebFamilyTree/:duns',
    hideInMenu: true,
    component: './iboss/dnb-web-family-tree',
  },
  {
    name: '境外分支比对',
    path: '/diffDNBFamilyTree/:duns',
    hideInMenu: true,
    component: './iboss/diff-dnb-family-tree',
  },
  {
    path: '/keycustomer',
    name: '海外家族树',
    icon: 'CrownOutlined',
    routes: [
      {
        path: '/keycustomer/:id',
        name: '公司详情',
        hideInMenu: true,
        component: './KeyCustomer/Detail',
      },
    ],
  },
  {
    name: '集团同步清单',
    icon: 'SyncOutlined',
    path: '/group-sync-list',
    component: './iboss/group-sync-list',
  },
  {
    name: '信息数据',
    icon: 'database',
    path: '/info-data',
    routes: [
      {
        path: '/info-data',
        redirect: '/info-data/region-units',
      },
      {
        name: '区域单元',
        path: '/info-data/region-units',
        component: './iboss/region-units',
      },
      {
        name: 'iBOSS客户',
        path: '/info-data/iboss-customers',
        component: './iboss/customers',
      },
      {
        name: 'iBOSS参与方',
        path: '/info-data/participants',
        component: './iboss/participants',
      },
    ],
  },
  {
    name: '要客海外家族树',
    path: '/keyGlobalFamilyTree/:gid',
    hideInMenu: true,
    component: './iboss/key-global-family-tree',
  },
  {
    path: '/',
    redirect: '/key-customers',
  },
  {
    component: '404',
    layout: false,
    path: './*',
  },
];
