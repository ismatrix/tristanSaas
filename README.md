# RESTful API Node Server Boilerplate

[![Build Status](https://travis-ci.org/hagopj13/node-express-boilerplate.svg?branch=master)](https://travis-ci.org/hagopj13/node-express-boilerplate)
[![Coverage Status](https://coveralls.io/repos/github/hagopj13/node-express-boilerplate/badge.svg?branch=master)](https://coveralls.io/github/hagopj13/node-express-boilerplate?branch=master)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A boilerplate/starter project for quickly building RESTful APIs using Node.js, Express, and Mongoose.

By running a single command, you will get a production-ready Node.js app installed and fully configured on your machine. The app comes with many built-in features, such as authentication using JWT, request validation, unit and integration tests, continuous integration, docker support, API documentation, pagination, etc. For more details, check the features list below.

## Quick Start

To create a project, simply run:

```bash
npx create-nodejs-express-app <project-name>
```

Or

```bash
npm init nodejs-express-app <project-name>
```

## Manual Installation

If you would still prefer to do the installation manually, follow these steps:

Clone the repo:

```bash
git clone --depth 1 https://github.com/hagopj13/node-express-boilerplate.git
cd node-express-boilerplate
npx rimraf ./.git
```

Install the dependencies:

```bash
yarn install
```

Set the environment variables:

```bash
cp .env.example .env

# open .env and modify the environment variables (if needed)
```

## Table of Contents

- [Features](#features)
- [Commands](#commands)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Logging](#logging)
- [Custom Mongoose Plugins](#custom-mongoose-plugins)
- [Linting](#linting)
- [Contributing](#contributing)

## Features

- **NoSQL database**: [MongoDB](https://www.mongodb.com) object data modeling using [Mongoose](https://mongoosejs.com)
- **Authentication and authorization**: using [passport](http://www.passportjs.org)
- **Validation**: request data validation using [Joi](https://github.com/hapijs/joi)
- **Logging**: using [winston](https://github.com/winstonjs/winston) and [morgan](https://github.com/expressjs/morgan)
- **Testing**: unit and integration tests using [Jest](https://jestjs.io)
- **Error handling**: centralized error handling mechanism
- **API documentation**: with [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) and [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)
- **Process management**: advanced production process management using [PM2](https://pm2.keymetrics.io)
- **Dependency management**: with [Yarn](https://yarnpkg.com)
- **Environment variables**: using [dotenv](https://github.com/motdotla/dotenv) and [cross-env](https://github.com/kentcdodds/cross-env#readme)
- **Security**: set security HTTP headers using [helmet](https://helmetjs.github.io)
- **Santizing**: sanitize request data against xss and query injection
- **CORS**: Cross-Origin Resource-Sharing enabled using [cors](https://github.com/expressjs/cors)
- **Compression**: gzip compression with [compression](https://github.com/expressjs/compression)
- **CI**: continuous integration with [Travis CI](https://travis-ci.org)
- **Docker support**
- **Code coverage**: using [coveralls](https://coveralls.io)
- **Code quality**: with [Codacy](https://www.codacy.com)
- **Git hooks**: with [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged)
- **Linting**: with [ESLint](https://eslint.org) and [Prettier](https://prettier.io)
- **Editor config**: consistent editor configuration using [EditorConfig](https://editorconfig.org)

## Commands

Running locally:

```bash
yarn dev
```

Running in production:

```bash
yarn start
```

Testing:

```bash
# run all tests
yarn test

# run all tests in watch mode
yarn test:watch

# run test coverage
yarn coverage
```

Docker:

```bash
# run docker container in development mode
yarn docker:dev

# run docker container in production mode
yarn docker:prod

# run all tests in a docker container
yarn docker:test
```

Linting:

```bash
# run ESLint
yarn lint

# fix ESLint errors
yarn lint:fix

# run prettier
yarn prettier

# fix prettier errors
yarn prettier:fix
```

## Environment Variables

The environment variables can be found and modified in the `.env` file. They come with these default values:

```bash
# Port number
PORT=3000

# URL of the Mongo DB
MONGODB_URL=mongodb://127.0.0.1:27017/node-boilerplate

# JWT
# JWT secret key
JWT_SECRET=thisisasamplesecret
# Number of minutes after which an access token expires
JWT_ACCESS_EXPIRATION_MINUTES=30
# Number of days after which a refresh token expires
JWT_REFRESH_EXPIRATION_DAYS=30

# SMTP configuration options for the email service
# For testing, you can use a fake SMTP service like Ethereal: https://ethereal.email/create
SMTP_HOST=email-server
SMTP_PORT=587
SMTP_USERNAME=email-server-username
SMTP_PASSWORD=email-server-password
EMAIL_FROM=support@yourapp.com
```

## Project Structure

```
src\
 |--config\         # Environment variables and configuration related things
 |--controllers\    # Route controllers (controller layer)
 |--docs\           # Swagger files
 |--middlewares\    # Custom express middlewares
 |--models\         # Mongoose models (data layer)
 |--routes\         # Routes
 |--services\       # Business logic (service layer)
 |--utils\          # Utility classes and functions
 |--validations\    # Request data validation schemas
 |--app.js          # Express app
 |--index.js        # App entry point
```

## API Documentation

To view the list of available APIs and their specifications, run the server and go to `http://localhost:3000/v1/docs` in your browser. This documentation page is automatically generated using the [swagger](https://swagger.io/) definitions written as comments in the route files.

### API Endpoints

> **提示**: 所有 HTTP 接口均挂载在 `/v1` 路由前缀下。开发环境下可直接通过 `http://localhost:3000/v1/docs/` 查看交互式 Swagger 文档。

#### 1. 认证与授权 (Authentication) - `/v1/auth`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/auth/register` | 用户注册 | 公开 |
| `POST` | `/v1/auth/login` | 用户登录，换取 Access 与 Refresh Token | 公开 |
| `POST` | `/v1/auth/logout` | 用户登出，注销 Refresh Token | 公开 |
| `POST` | `/v1/auth/refresh-tokens` | 刷新认证令牌 (Refresh Tokens) | 公开 |
| `POST` | `/v1/auth/forgot-password` | 发送重置密码邮件 | 公开 |
| `POST` | `/v1/auth/reset-password` | 根据重置令牌重置密码 | 公开 |
| `POST` | `/v1/auth/send-verification-email` | 发送邮箱验证邮件 | 需要登录认证 |
| `POST` | `/v1/auth/verify-email` | 验证邮箱有效性 | 公开 |
| `POST` | `/v1/auth/change-password` | 修改当前用户登录密码 | 需要登录认证 |

#### 2. 用户管理 (Users) - `/v1/users`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/users` | 创建新用户 | `editData` 权限 |
| `GET` | `/v1/users` | 分页与条件查询用户列表 | 需要登录认证 |
| `GET` | `/v1/users/:userId` | 获取指定用户详情 | 需要登录认证 |
| `PATCH` | `/v1/users/:userId` | 更新指定用户信息 | `editData` 权限 |
| `DELETE` | `/v1/users/:userId` | 删除指定用户 | `editData` 权限 |
| `POST` | `/v1/users/:userId/reset-password` | 管理员重置指定用户密码为默认密码 | `editData` 权限 |
| `POST` | `/v1/users/:userId/force-logout` | 强制指定用户下线（吊销Token） | `editData` 权限 |

#### 3. 要客总览与洞察 (Key Customer Overview) - `/v1/key-customer-overview`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/key-customer-overview/stats` | 获取要客总览全局统计指标（签约、计费、大盘趋势） | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/country-branches` | 获取指定国家下的分支明细（带要客集团中文名关联） | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/tcv-detail` | 获取指定客户在指定年份下的 TCV 签单明细列表 | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/br-detail` | 获取指定客户在指定年份下的 BR 计费明细列表 | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/family-tree-dashboard-stats` | 获取指定客户海外家族树 Dashboard 统计与分支明细 | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/penetrated-gids` | 获取所有已产生 CMI 业务渗透的要客集团 GID 列表 | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/family-tree-distinct-options` | 获取全球家族树去重下拉筛选选项（国家、区域、城市等） | 需要登录认证 |
| `GET` | `/v1/key-customer-overview/branches` | 获取全球家族树分支渗透列表（含历史 TCV 笔数、检索与分页） | 需要登录认证 |

#### 4. DNB 邓白氏数据平台 (DNB Integration) - `/v1/dnb`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/dnb/family-tree` | 同步 DNB 家族树数据到 MongoDB（单次请求） | 需要登录认证 |
| `GET` | `/v1/dnb/family-tree/sync-stream` | 分页流式同步家族树（SSE 实时推送拉取进度） | 需要登录认证 |
| `POST` | `/v1/dnb/company-detail/sync` | 批量同步 DNB 企业详情档案数据 | 需要登录认证 |
| `POST` | `/v1/dnb/company-detail/check-exist` | 批量检查指定 DUNS 列表在数据库中是否存在 | 需要登录认证 |
| `GET` | `/v1/dnb/company-detail/:duns` | 获取单个 DUNS 的企业详情档案 | 需要登录认证 |

#### 5. 能力出海与客户同步 (iBOSS Integration) - `/v1/iboss` & `/v1/iboss-customers`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/iboss/getOrdersByParam` | 代理请求上游 iBOSS 系统查询出海产品订单 | 公开 |
| `POST` | `/v1/iboss-customers/bulk-upsert` | 批量同步/更新 iBOSS 客户数据 | 需要登录认证 |
| `GET` | `/v1/iboss-customers` | 分页与条件查询 iBOSS 客户列表 | 需要登录认证 |

#### 6. 商机与订单管理 (Orders) - `/v1/orders`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/orders/bulk-upsert` | 批量新增/更新商机订单数据 | 需要登录认证 |
| `POST` | `/v1/orders` | 创建单个商机订单 | 需要登录认证 |
| `GET` | `/v1/orders` | 分页与条件查询商机订单列表 | 需要登录认证 |
| `GET` | `/v1/orders/:orderId` | 获取单个商机订单详情 | 需要登录认证 |
| `PATCH` | `/v1/orders/:orderId` | 更新指定商机订单 | 需要登录认证 |
| `DELETE` | `/v1/orders/:orderId` | 删除指定商机订单 | 需要登录认证 |

#### 7. 订单产品明细 (Order Details) - `/v1/order-details`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/order-details/bulk-upsert` | 批量新增/更新订单产品明细数据 | 需要登录认证 |
| `POST` | `/v1/order-details` | 创建单个订单产品明细 | 需要登录认证 |
| `GET` | `/v1/order-details` | 分页与条件查询订单产品明细列表 | 需要登录认证 |
| `GET` | `/v1/order-details/:orderDetailId` | 获取单个订单产品明细详情 | 需要登录认证 |
| `PATCH` | `/v1/order-details/:orderDetailId` | 更新指定订单产品明细 | 需要登录认证 |
| `DELETE` | `/v1/order-details/:orderDetailId` | 删除指定订单产品明细 | 需要登录认证 |

#### 8. 合同管理 (Contracts) - `/v1/contracts`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/contracts/bulk-upsert` | 批量新增/更新合同数据 | 需要登录认证 |
| `POST` | `/v1/contracts` | 创建单个合同记录 | 需要登录认证 |
| `GET` | `/v1/contracts` | 分页与条件查询合同列表 | 需要登录认证 |
| `GET` | `/v1/contracts/:contractId` | 获取单个合同详情 | 需要登录认证 |
| `PATCH` | `/v1/contracts/:contractId` | 更新指定合同信息 | 需要登录认证 |
| `DELETE` | `/v1/contracts/:contractId` | 删除指定合同 | 需要登录认证 |

#### 9. 合同产品明细 (Contract Details) - `/v1/contract-details`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/contract-details/bulk-upsert` | 批量新增/更新合同产品明细数据 | 需要登录认证 |
| `POST` | `/v1/contract-details` | 创建单个合同产品明细 | 需要登录认证 |
| `GET` | `/v1/contract-details` | 分页与条件查询合同产品明细列表 | 需要登录认证 |
| `GET` | `/v1/contract-details/:contractDetailId` | 获取单个合同产品明细详情 | 需要登录认证 |
| `PATCH` | `/v1/contract-details/:contractDetailId` | 更新指定合同产品明细 | 需要登录认证 |
| `DELETE` | `/v1/contract-details/:contractDetailId` | 删除指定合同产品明细 | 需要登录认证 |

#### 10. CMI 海外分支机构 (CMI Branches) - `/v1/cmi-branches`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/cmi-branches` | 获取 CMI 海外分支机构列表（支持按区域、国家筛选） | 需要登录认证 |
| `PATCH` | `/v1/cmi-branches/:branchId` | 更新指定海外分支机构信息 | 需要登录认证 |

#### 11. 通用动态集合管理 (Wildcards CRUD) - `/v1/wildcards`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/wildcards` | 获取所有支持的动态集合名称及配置元数据 | 需要登录认证 |
| `POST` | `/v1/wildcards/:collection/bulk-upsert` | 通用批量新增/更新指定集合中的文档数据 | `editData` 权限 |
| `POST` | `/v1/wildcards/:collection` | 通用向指定集合中单条新增文档 | `editData` 权限 |
| `GET` | `/v1/wildcards/:collection` | 通用多条件查询并分页获取集合文档列表 | 需要登录认证 |
| `DELETE` | `/v1/wildcards/:collection` | 通用按条件批量删除集合中的文档 | `editData` 权限 |
| `GET` | `/v1/wildcards/:collection/:id` | 通用获取集合中指定 ID 的单条文档详情 | 需要登录认证 |
| `PATCH` | `/v1/wildcards/:collection/:id` | 通用局部更新集合中指定 ID 的文档 | `editData` 权限 |
| `DELETE` | `/v1/wildcards/:collection/:id` | 通用删除集合中指定 ID 的单条文档 | `editData` 权限 |

#### 12. 数据治理变更日志 (Data Governance Logs) - `/v1/data-governance-logs`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/data-governance-logs` | 记录或更新一条数据治理/字段变更日志 | `editData` 权限 |
| `GET` | `/v1/data-governance-logs` | 查询数据治理变更历史日志列表 | 需要登录认证 |
| `DELETE` | `/v1/data-governance-logs` | 删除指定数据治理日志 | `editData` 权限 |

#### 13. 埋点与访问分析 (Page Views) - `/v1/page-views`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/page-views/record` | 前端页面访问行为静默埋点上报 | 公开 |
| `GET` | `/v1/page-views/overview` | 获取系统总访问量、PV/UV、今日指标等总体概览 | 公开 |
| `GET` | `/v1/page-views/stats` | 获取页面访问趋势折线图、各页面访问排名等统计数据 | 公开 |
| `GET` | `/v1/page-views/logs` | 查询访问明细流水日志（支持分页与条件筛选） | 公开 |

#### 14. 智能多语言翻译服务 (Translate) - `/v1/translate`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/translate` | 企业智能中英文翻译（优先谷歌在线代理，超时自动降级离线专有名词高精度词典） | 公开 |

#### 15. 交互式 API 文档 (Swagger UI) - `/v1/docs`

| HTTP 方法 | 接口路径 | 功能说明 | 权限要求 |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/docs/` | 在线交互式 Swagger API 文档与接口调试界面 | 仅开发环境（`NODE_ENV=development`） |


## Database Schema

> **核心数据库表结构字典**

> **说明**: 本文档记录了项目中当前全部核心业务集合（Collections）的表结构规范。
> 已按规则过滤排除 `DNB`/`dnb` 开头集合、数字结尾备份集合以及 `test` 开头测试集合，共计收录 **32 个核心业务集合**。

### 集合导航目录

- **1. 系统与认证管理 (System & Authentication)**
  - [`tokens` (认证与授权令牌表)](#1-tokens-认证与授权令牌表) — *11 条*
  - [`users` (系统用户表)](#2-users-系统用户表) — *15 条*
- **2. 要客总览与全球洞察 (Key Customer & Analytics)**
  - [`industry` (战略重点行业定义表)](#3-industry-战略重点行业定义表) — *25 条*
  - [`keyCustomerOverviewSnapshot` (要客总览大盘统计快照表)](#4-keycustomeroverviewsnapshot-要客总览大盘统计快照表) — *1 条*
  - [`keyEnCN` (要客中英文智能对照词典表)](#5-keyencn-要客中英文智能对照词典表) — *749 条*
  - [`keyFamilyTreeCustMapping` (家族树分支与签约客户映射表)](#6-keyfamilytreecustmapping-家族树分支与签约客户映射表) — *2,268 条*
  - [`keyGlobalFamilyTree` (全球要客企业家族树表)](#7-keyglobalfamilytree-全球要客企业家族树表) — *11,474 条*
  - [`keycustomer` (战略要客主档案表)](#8-keycustomer-战略要客主档案表) — *138 条*
  - [`unitnames` (海外经营单元组织机构表)](#9-unitnames-海外经营单元组织机构表) — *31 条*
- **3. 经营财务与签约流水 (Financial Performance)**
  - [`dmcBR` (DMC 实际出账计费收入流水表 (BR))](#10-dmcbr-dmc-实际出账计费收入流水表-br) — *4,761,765 条*
  - [`dmcTCV` (DMC 合同签约总价值明细表 (TCV))](#11-dmctcv-dmc-合同签约总价值明细表-tcv) — *181,830 条*
- **4. 商机、订单与合同管理 (Orders & Contracts)**
  - [`contractdetails` (合同产品行项明细表)](#12-contractdetails-合同产品行项明细表) — *959 条*
  - [`contracts` (商业合同主表)](#13-contracts-商业合同主表) — *3,401 条*
  - [`orderdetails` (订单产品明细表)](#14-orderdetails-订单产品明细表) — *347 条*
  - [`orders` (商机与业务订单主表)](#15-orders-商机与业务订单主表) — *408 条*
- **5. 能力出海与上游系统集成 (iBOSS Integration)**
  - [`ibossParticipantDetail` (iBOSS 出海商机产品明细表)](#16-ibossparticipantdetail-iboss-出海商机产品明细表) — *22,339 条*
  - [`ibossParticipants` (iBOSS 出海商机参与方主体表)](#17-ibossparticipants-iboss-出海商机参与方主体表) — *22,146 条*
  - [`ibosscustomers` (iBOSS 客户主数据同步表)](#18-ibosscustomers-iboss-客户主数据同步表) — *42,094 条*
- **6. 组织架构与联系人通讯录 (Organization & Contacts)**
  - [`cmiContacts` (CMI 内部销售与业务团队通讯录)](#19-cmicontacts-cmi-内部销售与业务团队通讯录) — *53 条*
  - [`cmibranches` (CMI 海外分支机构表)](#20-cmibranches-cmi-海外分支机构表) — *87 条*
  - [`custContacts` (外部客户关键联系人明细表)](#21-custcontacts-外部客户关键联系人明细表) — *117,304 条*
  - [`keyCMIContacts` (要客专属对接团队配置表)](#22-keycmicontacts-要客专属对接团队配置表) — *140 条*
- **7. 线下活动与拓展商机支撑 (Event & Offline Participants)**
  - [`excelParticipantContacts` (参会企业联系人明细表)](#23-excelparticipantcontacts-参会企业联系人明细表) — *26,618 条*
  - [`excelParticipantCustMapping` (参会企业与系统客户映射表)](#24-excelparticipantcustmapping-参会企业与系统客户映射表) — *10,818 条*
  - [`excelParticipants` (线下展会与拓展参会企业主体表)](#25-excelparticipants-线下展会与拓展参会企业主体表) — *22,363 条*
- **8. 数据治理与列映射配置 (Data Governance & Dynamic Mappings)**
  - [`columnMappingCMIContacts` (CMI 联系人动态列配置表)](#26-columnmappingcmicontacts-cmi-联系人动态列配置表) — *9 条*
  - [`columnMappingFamilyTree` (家族树表格动态列配置表)](#27-columnmappingfamilytree-家族树表格动态列配置表) — *42 条*
  - [`columnMappingGIDCust` (GID客户关联动态列配置表)](#28-columnmappinggidcust-gid客户关联动态列配置表) — *8 条*
  - [`columnMappingKeyContacts` (要客联系人动态列配置表)](#29-columnmappingkeycontacts-要客联系人动态列配置表) — *18 条*
  - [`datagovernancelogs` (数据治理变更审计日志表)](#30-datagovernancelogs-数据治理变更审计日志表) — *193 条*
- **9. 埋点监控与系统分析 (Audit & Page Views)**
  - [`pageViewLog` (页面访问流水明细日志表)](#31-pageviewlog-页面访问流水明细日志表) — *175 条*
  - [`pageViewStats` (页面访问趋势汇总统计表)](#32-pageviewstats-页面访问趋势汇总统计表) — *25 条*

---

### 1. 系统与认证管理 (System & Authentication)

#### 1. `tokens` (认证与授权令牌表)

- **记录规模**: `11` 条记录
- **业务说明**: 存储用户登录后颁发的 JWT 刷新令牌 (Refresh Token)、密码重置与邮箱验证令牌，支持黑名单吊销。
- **关联关系**: 外键 user 关联 users._id。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `blacklisted` | `boolean` | 黑名单标记 | 是否已进入黑名单作废 (true/false) |
| `token` | `string` | 认证令牌 | JWT 签名令牌内容字符串 |
| `user` | `ObjectID` | 所属用户 ID | 外键关联 users._id |
| `expires` | `date` | 令牌过期时间 | Token 凭据有效截止时间戳 |
| `type` | `string` | 令牌用途类型 | 如 refresh, resetPassword, verifyEmail |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |

#### 2. `users` (系统用户表)

- **记录规模**: `15` 条记录
- **业务说明**: 存储系统后台所有登录用户的账号、加密密码 Hash、用户权限角色以及安全状态。
- **关联关系**: 核心主表。主键 _id 被 tokens.user 引用；其 email 被 datagovernancelogs.operatorEmail、pageViewLog.userEmail 等记录。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `role` | `string` | 用户角色 | 系统角色权限：user (普通用户) / admin (管理员) |
| `isEmailVerified` | `boolean` | 邮箱认证状态 | 用户邮箱是否已通过邮件验证 (true/false) |
| `name` | `string` | 姓名 / 名称 | 用户姓名、企业全称或主体名称 |
| `email` | `string` | 电子邮箱 | 用户注册或联系人的有效电子邮箱账号 |
| `password` | `string` | 登录密码 | 通过 bcrypt 强哈希加密存储的密码散列值 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `forceLogoutAt` | `date` | 强制登出时间戳 | 管理员执行强制下线的时间，早于该时间的Token均失效 |

### 2. 要客总览与全球洞察 (Key Customer & Analytics)

#### 3. `industry` (战略重点行业定义表)

- **记录规模**: `25` 条记录
- **业务说明**: 定义出海战略聚焦的 8 大行业（如汽车、能源、互联网/科技、金融等）的中英文分类标准。
- **关联关系**: 作为行业分类维表，关联 keycustomer.industry 及看板分类维度。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `industry_code` | `string` | industry_code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `industry_name` | `string` | industry_name (名称) | 实体、客户或产品主体名称 |
| `industry_name_en` | `string` | industry_name_en | 业务扩展属性字段 |
| `source` | `string` | source | 业务扩展属性字段 |
| `parent_industry_code` | `string` | parent_industry_code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `define` | `string` | define | 业务扩展属性字段 |

#### 4. `keyCustomerOverviewSnapshot` (要客总览大盘统计快照表)

- **记录规模**: `1` 条记录
- **业务说明**: 预计算并持久化存储要客总览大盘的全局聚合统计指标（TCV总额、BR总额、行业渗透分布、国家趋势等），保障毫秒级加载。
- **关联关系**: 由 dmcTCV、dmcBR、keycustomer、keyGlobalFamilyTree 等多表异步聚合生成。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `string` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `computeDurationMs` | `number` | compute Duration Ms | 业务扩展属性字段 |
| `data` | `object` | data | 业务扩展属性字段 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |

#### 5. `keyEnCN` (要客中英文智能对照词典表)

- **记录规模**: `749` 条记录
- **业务说明**: 要客集团、子公司及出海企业名称的中英文标准对照与商业品牌专有名词对照库。
- **关联关系**: 支持企业搜索与智能翻译模块的跨语言精确匹配。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `collection` | `string` | collection | 业务扩展属性字段 |
| `column` | `string` | column | 业务扩展属性字段 |
| `en` | `string` | en | 业务扩展属性字段 |
| `cn` | `string` | cn | 业务扩展属性字段 |

#### 6. `keyFamilyTreeCustMapping` (家族树分支与签约客户映射表)

- **记录规模**: `2,268` 条记录
- **业务说明**: 维护海外家族树分支主体（DUNS）与实际签约结算客户名称（customerName）之间的关联映射。
- **关联关系**: 通过 gid 关联 keycustomer；通过 duns 关联 keyGlobalFamilyTree；通过 custName 关联 contracts/orders。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `ultimateGID` | `string` | ultimate G I D (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `GID` | `string` | 要客统一标识 (GID) | 中国移动统一分配的集团战略要客唯一标识 GID |
| `extCustId` | `string` | ext Cust Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `mappingPath` | `string` | mapping Path | 业务扩展属性字段 |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |

#### 7. `keyGlobalFamilyTree` (全球要客企业家族树表)

- **记录规模**: `11,474` 条记录
- **业务说明**: 基于全球邓白氏与企业股权穿透体系构建的全球要客母子公司与海外分支机构全景树。
- **关联关系**: 通过 GID 关联 keycustomer.GID；通过 duns 关联各海外分支；通过与 dmcTCV、dmcBR 关联分析各分支的历史签约与业务渗透。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `ultimateName` | `string` | ultimate Name (名称) | 实体、客户或产品主体名称 |
| `GID` | `string` | 要客统一标识 (GID) | 中国移动统一分配的集团战略要客唯一标识 GID |
| `companyNameCn` | `string` | company Name Cn | 业务扩展属性字段 |
| `companyNameEn` | `string` | company Name En | 业务扩展属性字段 |
| `registeredName` | `string` | registered Name (名称) | 实体、客户或产品主体名称 |
| `localLanguageName` | `string` | local Language Name (名称) | 实体、客户或产品主体名称 |
| `tradeName` | `string` | trade Name (名称) | 实体、客户或产品主体名称 |
| `formerNames` | `string` | former Names | 业务扩展属性字段 |
| `establishmentDate` | `string` | 成立时间 | 企业设立登记注册日期 |
| `cmiIndustry` | `string` | cmi Industry | 业务扩展属性字段 |
| `cmccIndustry` | `string` | cmcc Industry | 业务扩展属性字段 |
| `duns` | `string` | 邓白氏编码 (DUNS) | 邓白氏 9 位全球企业唯一身份标识 |
| `ultimateGID` | `string` | ultimate G I D (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `entityTypeName` | `string` | entity Type Name (名称) | 实体、客户或产品主体名称 |
| `competitors` | `string` | competitors | 业务扩展属性字段 |
| `operatingStatus` | `string` | operating Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `registeredCountry` | `string` | registered Country (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `registeredCity` | `string` | registered City (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `registeredAddress` | `string` | registered Address | 业务扩展属性字段 |
| `registrationNumber` | `string` | registration Number | 业务扩展属性字段 |
| `registrationType` | `string` | registration Type (类型/分类) | 业务所属模式或类别归属 |
| `enterpriseNature` | `string` | enterprise Nature | 业务扩展属性字段 |
| `email` | `string` | 电子邮箱 | 用户注册或联系人的有效电子邮箱账号 |
| `contactPhone` | `string` | 联系人电话 | 对接人员手机号码或直线座机 |
| `website` | `string` | 官方网站网址 | 企业官方门户网站 URL |
| `ceo` | `string` | ceo | 业务扩展属性字段 |
| `otherExecutives` | `string` | other Executives | 业务扩展属性字段 |
| `stockExchange` | `string` | stock Exchange | 业务扩展属性字段 |
| `mainBusiness` | `string` | main Business | 业务扩展属性字段 |
| `employeeCount` | `string` | employee Count | 业务扩展属性字段 |
| `revenueCurrency` | `string` | revenue Currency | 业务扩展属性字段 |
| `revenueYear` | `string` | revenue Year | 业务扩展属性字段 |
| `summary` | `string` | summary | 业务扩展属性字段 |
| `tags` | `string` | tags | 业务扩展属性字段 |
| `treeLevel` | `number` | tree Level | 业务扩展属性字段 |
| `subCount` | `number` | sub Count | 业务扩展属性字段 |
| `latitude` | `number` | latitude | 业务扩展属性字段 |
| `longitude` | `number` | longitude | 业务扩展属性字段 |
| `assetsUSD` | `number` | assets U S D | 业务扩展属性字段 |
| `marketValueUSD` | `number` | market Value U S D | 业务扩展属性字段 |
| `salesUSD` | `number` | sales U S D | 业务扩展属性字段 |
| `annualRevenue` | `number` | annual Revenue | 业务扩展属性字段 |
| `isDomesticUltimate` | `boolean` | is Domestic Ultimate | 业务扩展属性字段 |
| `isHeadquarters` | `boolean` | is Headquarters | 业务扩展属性字段 |
| `nationAgent` | `boolean` | nation Agent | 业务扩展属性字段 |
| `cmiRegion` | `string` | cmi Region | 业务扩展属性字段 |
| `dataSource` | `string` | data Source | 业务扩展属性字段 |
| `parentGID` | `string` | parent G I D (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `parentCompanyName` | `string` | parent Company Name (名称) | 实体、客户或产品主体名称 |

#### 8. `keycustomer` (战略要客主档案表)

- **记录规模**: `138` 条记录
- **业务说明**: 中国移动出海战略聚焦的头部要客集团法定档案（含 GID、中英文全称、行业、评级、集团主公司信息等）。
- **关联关系**: 核心主表。其 GID 关联 keyGlobalFamilyTree.GID、dmcTCV.GID、dmcBR.GID、keyFamilyTreeCustMapping.gid 等。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `PID` | `string` | 父级要客标识 (PID) | 上级归属要客集团标识，顶级集团该值为 0 或同 GID |
| `GID` | `string` | 要客统一标识 (GID) | 中国移动统一分配的集团战略要客唯一标识 GID |
| `globalUltimateDuns` | `string` | 最高母公司 DUNS | 企业股权最终控制人/全球最终母公司的邓白氏编码 |
| `nameEn` | `string` | 英文法定全称 | 企业境外注册或通用的英文法定全称 |
| `nameCn` | `string` | 中文标准全称 | 企业在工商登记的中文标准法定全称 |
| `source` | `string` | source | 业务扩展属性字段 |
| `sourceType` | `string` | source Type (类型/分类) | 业务所属模式或类别归属 |
| `industryCode` | `string` | industry Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `industryGroupCode` | `string` | industry Group Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `customerType` | `string` | customer Type (类型/分类) | 业务所属模式或类别归属 |
| `updateAt` | `string` | update At | 业务扩展属性字段 |
| `globalUltimateFamilyTreeMembersCount` | `number` | global Ultimate Family Tree Members Count | 业务扩展属性字段 |
| `customLeval` | `string` | custom Leval | 业务扩展属性字段 |
| `abbr` | `string` | 品牌英文缩写 | 企业通用英文商业品牌名称缩写 |
| `_ftCount` | `number` | _ft Count | 业务扩展属性字段 |
| `_ftLastSync` | `string` | _ft Last Sync | 业务扩展属性字段 |
| `_ftOverseasCount` | `number` | _ft Overseas Count | 业务扩展属性字段 |
| `_globalFtCount` | `number` | _global Ft Count | 业务扩展属性字段 |
| `_webFtCount` | `number` | _web Ft Count | 业务扩展属性字段 |
| `_webFtOverseasCount` | `number` | _web Ft Overseas Count | 业务扩展属性字段 |
| `keyWords` | `array` | key Words | 业务扩展属性字段 |

#### 9. `unitnames` (海外经营单元组织机构表)

- **记录规模**: `31` 条记录
- **业务说明**: 中国移动国际（CMI）在全球各国家和区域设立的海外经营单元 (Unit) 代码与名称映射。
- **关联关系**: 通过 UnitCode 与 dmcTCV.UnitCode、dmcBR.UnitCode 及 cmibranches 关联。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `UnitName` | `string` | 经营单元名称 | 负责签署或结算的 CMI 海外经营单位 |
| `UnitCode` | `string` | 经营单元代码 | 海外经营单位在财务组织树的编码 |
| `RegionCode` | `string` | 大区编码 | 大区标识代码 |

### 3. 经营财务与签约流水 (Financial Performance)

#### 10. `dmcBR` (DMC 实际出账计费收入流水表 (BR))

- **记录规模**: `4,761,765` 条记录
- **业务说明**: 市场经分 DMC 系统同步的实际出账月度计费收入明细（Billed Revenue），支持跨年度、月度的收入趋势与达标分析。
- **关联关系**: 核心财务流水。通过 GID 关联 keycustomer；通过 customerName 关联 contracts；通过 UnitCode 关联 unitnames。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `数据月份` | `string` | 数据月份 | 业务专有字段：数据月份 |
| `数据月份(日期格式)` | `string` | 数据月份(日期格式) | 业务专有字段：数据月份(日期格式) |
| `COA成本中心编码` | `string` | COA成本中心编码 | 业务专有字段：COA成本中心编码 |
| `COA公司编码` | `string` | COA公司编码 | 业务专有字段：COA公司编码 |
| `COA交易对手编码` | `string` | COA交易对手编码 | 业务专有字段：COA交易对手编码 |
| `COA科目编码` | `string` | COA科目编码 | 业务专有字段：COA科目编码 |
| `Region` | `null` | 所属业务大区 | 所属全球区域，如 APAC, EMEA, Americas |
| `iBOSS产品名称` | `string` | iBOSS产品名称 | 业务专有字段：iBOSS产品名称 |
| `财务经分产品ID` | `string` | 财务经分产品ID | 业务专有字段：财务经分产品ID |
| `财务经分产品名称` | `string` | 财务经分产品名称 | 业务专有字段：财务经分产品名称 |
| `财务系统产品编码` | `string` | 财务系统产品编码 | 业务专有字段：财务系统产品编码 |
| `财务系统产品名称` | `string` | 财务系统产品名称 | 业务专有字段：财务系统产品名称 |
| `财务系统客户或供应商名称` | `string` | 财务系统客户或供应商名称 | 业务专有字段：财务系统客户或供应商名称 |
| `草木本类型` | `string` | 草木本类型 | 业务专有字段：草木本类型 |
| `场景标签` | `null` | 场景标签 | 业务专有字段：场景标签 |
| `场景标签(英文)` | `null` | 场景标签(英文) | 业务专有字段：场景标签(英文) |
| `大区` | `null` | 大区 | 业务专有字段：大区 |
| `大区编码` | `string` | 大区编码 | 业务专有字段：大区编码 |
| `大区中文名称` | `string` | 大区中文名称 | 业务专有字段：大区中文名称 |
| `电路参考编号` | `string` | 电路参考编号 | 业务专有字段：电路参考编号 |
| `订单计费类型` | `string` | 订单计费类型 | 业务专有字段：订单计费类型 |
| `分析客户名称(规整后)` | `string` | 分析客户名称(规整后) | 业务专有字段：分析客户名称(规整后) |
| `服务结束日期` | `string` | 服务结束日期 | 业务专有字段：服务结束日期 |
| `服务开始日期` | `string` | 服务开始日期 | 业务专有字段：服务开始日期 |
| `关联产品类型` | `string` | 关联产品类型 | 业务专有字段：关联产品类型 |
| `客户经理名称` | `string` | 客户经理名称 | 业务专有字段：客户经理名称 |
| `客户经理账号` | `string` | 客户经理账号 | 业务专有字段：客户经理账号 |
| `客户企业运营商标识` | `string` | 客户企业运营商标识 | 业务专有字段：客户企业运营商标识 |
| `客户性质` | `string` | 客户性质 | 业务专有字段：客户性质 |
| `客户子类型编码` | `string` | 客户子类型编码 | 业务专有字段：客户子类型编码 |
| `客户子类型名称` | `string` | 客户子类型名称 | 业务专有字段：客户子类型名称 |
| `录入类型` | `null` | 录入类型 | 业务专有字段：录入类型 |
| `票据编号` | `string` | 票据编号 | 业务专有字段：票据编号 |
| `票据事务类型` | `string` | 票据事务类型 | 业务专有字段：票据事务类型 |
| `票据行描述` | `string` | 票据行描述 | 业务专有字段：票据行描述 |
| `签约客户编码` | `string` | 签约客户编码 | 业务专有字段：签约客户编码 |
| `签约客户名称` | `string` | 签约客户名称 | 业务专有字段：签约客户名称 |
| `签约客户行业` | `string` | 签约客户行业 | 业务专有字段：签约客户行业 |
| `三大市场类型` | `string` | 三大市场类型 | 业务专有字段：三大市场类型 |
| `上级企业名称` | `null` | 上级企业名称 | 业务专有字段：上级企业名称 |
| `市场经分产品分类` | `string` | 市场经分产品分类 | 业务专有字段：市场经分产品分类 |
| `是否纯自有` | `string` | 是否纯自有 | 业务专有字段：是否纯自有 |
| `是否国际业务收入` | `string` | 是否国际业务收入 | 业务专有字段：是否国际业务收入 |
| `是否商品销售收入` | `string` | 是否商品销售收入 | 业务专有字段：是否商品销售收入 |
| `适用拆分规则` | `string` | 适用拆分规则 | 业务专有字段：适用拆分规则 |
| `数据来源名称` | `string` | 数据来源名称 | 业务专有字段：数据来源名称 |
| `双计双考标识` | `string` | 双计双考标识 | 业务专有字段：双计双考标识 |
| `销售单元编码` | `string` | 销售单元编码 | 业务专有字段：销售单元编码 |
| `销售单元中文名称` | `string` | 销售单元中文名称 | 业务专有字段：销售单元中文名称 |
| `站点编码` | `string` | 站点编码 | 业务专有字段：站点编码 |
| `中外资客户标识` | `string` | 中外资客户标识 | 业务专有字段：中外资客户标识 |
| `终端客户名称` | `null` | 终端客户名称 | 业务专有字段：终端客户名称 |
| `最新考核范围` | `string` | 最新考核范围 | 业务专有字段：最新考核范围 |
| `最新考核销售单元编码` | `string` | 最新考核销售单元编码 | 业务专有字段：最新考核销售单元编码 |
| `拆分后港币金额` | `string` | 拆分后港币金额 | 业务专有字段：拆分后港币金额 |
| `拆分后港币金额｜绝对值` | `string` | 拆分后港币金额｜绝对值 | 业务专有字段：拆分后港币金额｜绝对值 |
| `拆分后港币收入金额` | `string` | 拆分后港币收入金额 | 业务专有字段：拆分后港币收入金额 |
| `等值港币金额` | `string` | 等值港币金额 | 业务专有字段：等值港币金额 |
| `等值港币收入金额` | `string` | 等值港币收入金额 | 业务专有字段：等值港币收入金额 |
| `分成比例` | `string` | 分成比例 | 业务专有字段：分成比例 |
| `_syncedAt` | `date` | _synced At | 业务扩展属性字段 |

#### 11. `dmcTCV` (DMC 合同签约总价值明细表 (TCV))

- **记录规模**: `181,830` 条记录
- **业务说明**: 市场经分 DMC 系统同步的合同签约流水（Total Contract Value），记录订单合同额、产品、客户与签约单位。
- **关联关系**: 核心财务流水。通过 GID 关联 keycustomer；通过 customerName 关联 contracts；通过 UnitCode 关联 unitnames。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `合同签署日期` | `string` | 合同签署日期 | 业务专有字段：合同签署日期 |
| `设置起租日期` | `string` | 设置起租日期 | 业务专有字段：设置起租日期 |
| `生成订单日期` | `string` | 生成订单日期 | 业务专有字段：生成订单日期 |
| `A端地域城市` | `null` | A端地域城市 | 业务专有字段：A端地域城市 |
| `A端地域国家或地区` | `null` | A端地域国家或地区 | 业务专有字段：A端地域国家或地区 |
| `A端地域全称` | `string` | A端地域全称 | 业务专有字段：A端地域全称 |
| `A端地域省份` | `null` | A端地域省份 | 业务专有字段：A端地域省份 |
| `B端地域城市` | `null` | B端地域城市 | 业务专有字段：B端地域城市 |
| `B端地域国家或地区` | `null` | B端地域国家或地区 | 业务专有字段：B端地域国家或地区 |
| `B端地域全称` | `string` | B端地域全称 | 业务专有字段：B端地域全称 |
| `B端地域省份` | `null` | B端地域省份 | 业务专有字段：B端地域省份 |
| `TCV产品名称` | `string` | TCV产品名称 | 业务专有字段：TCV产品名称 |
| `TCV订单类型` | `string` | TCV订单类型 | 业务专有字段：TCV订单类型 |
| `iBOSS产品类型ID` | `string` | iBOSS产品类型ID | 业务专有字段：iBOSS产品类型ID |
| `opportunity_id` | `string` | opportunity_id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `opportunity_name` | `string` | opportunity_name (名称) | 实体、客户或产品主体名称 |
| `产品类型ID` | `string` | 产品类型ID | 业务专有字段：产品类型ID |
| `场景标签英文名称` | `null` | 场景标签英文名称 | 业务专有字段：场景标签英文名称 |
| `场景标签中文名称` | `null` | 场景标签中文名称 | 业务专有字段：场景标签中文名称 |
| `大区` | `null` | 大区 | 业务专有字段：大区 |
| `大区编码` | `string` | 大区编码 | 业务专有字段：大区编码 |
| `大区编码_2` | `null` | 大区编码_2 | 业务专有字段：大区编码_2 |
| `大区中文名称` | `string` | 大区中文名称 | 业务专有字段：大区中文名称 |
| `带宽描述` | `string` | 带宽描述 | 业务专有字段：带宽描述 |
| `电路编号` | `string` | 电路编号 | 业务专有字段：电路编号 |
| `订单号码` | `string` | 订单号码 | 业务专有字段：订单号码 |
| `订单状态` | `string` | 订单状态 | 业务专有字段：订单状态 |
| `分成比例` | `string` | 分成比例 | 业务专有字段：分成比例 |
| `分析客户名称(规整后)` | `string` | 分析客户名称(规整后) | 业务专有字段：分析客户名称(规整后) |
| `供应商ID` | `string` | 供应商ID | 业务专有字段：供应商ID |
| `关联产品类型` | `string` | 关联产品类型 | 业务专有字段：关联产品类型 |
| `合同币种` | `string` | 合同币种 | 业务专有字段：合同币种 |
| `合同期限(月)` | `string` | 合同期限(月) | 业务专有字段：合同期限(月) |
| `合同主体中文名称` | `string` | 合同主体中文名称 | 业务专有字段：合同主体中文名称 |
| `合约结束日期` | `string` | 合约结束日期 | 业务专有字段：合约结束日期 |
| `合约开始日期` | `string` | 合约开始日期 | 业务专有字段：合约开始日期 |
| `合作标识` | `string` | 合作标识 | 业务专有字段：合作标识 |
| `计费周期` | `string` | 计费周期 | 业务专有字段：计费周期 |
| `客户经理名称` | `string` | 客户经理名称 | 业务专有字段：客户经理名称 |
| `客户经理账号` | `string` | 客户经理账号 | 业务专有字段：客户经理账号 |
| `客户类型` | `string` | 客户类型 | 业务专有字段：客户类型 |
| `客户企业运营商标识` | `string` | 客户企业运营商标识 | 业务专有字段：客户企业运营商标识 |
| `客户特性` | `string` | 客户特性 | 业务专有字段：客户特性 |
| `客户子类型` | `string` | 客户子类型 | 业务专有字段：客户子类型 |
| `客户子类型编码` | `string` | 客户子类型编码 | 业务专有字段：客户子类型编码 |
| `签约客户编码` | `string` | 签约客户编码 | 业务专有字段：签约客户编码 |
| `签约客户标识` | `string` | 签约客户标识 | 业务专有字段：签约客户标识 |
| `签约客户名称` | `string` | 签约客户名称 | 业务专有字段：签约客户名称 |
| `签约客户行业` | `string` | 签约客户行业 | 业务专有字段：签约客户行业 |
| `渠道介绍` | `string` | 渠道介绍 | 业务专有字段：渠道介绍 |
| `渠道名称` | `null` | 渠道名称 | 业务专有字段：渠道名称 |
| `上级企业名称` | `null` | 上级企业名称 | 业务专有字段：上级企业名称 |
| `市场经分产品ID` | `string` | 市场经分产品ID | 业务专有字段：市场经分产品ID |
| `市场经分产品分类` | `string` | 市场经分产品分类 | 业务专有字段：市场经分产品分类 |
| `是否纯转售` | `string` | 是否纯转售 | 业务专有字段：是否纯转售 |
| `是否国际业务收入标签` | `string` | 是否国际业务收入标签 | 业务专有字段：是否国际业务收入标签 |
| `四级产品名称` | `string` | 四级产品名称 | 业务专有字段：四级产品名称 |
| `销售单元编码` | `string` | 销售单元编码 | 业务专有字段：销售单元编码 |
| `销售单元中文名称` | `string` | 销售单元中文名称 | 业务专有字段：销售单元中文名称 |
| `终端客户产业` | `string` | 终端客户产业 | 业务专有字段：终端客户产业 |
| `终端客户名称` | `string` | 终端客户名称 | 业务专有字段：终端客户名称 |
| `主单元或协作单元` | `string` | 主单元或协作单元 | 业务专有字段：主单元或协作单元 |
| `归属销售单元签单金额` | `string` | 归属销售单元签单金额 | 业务专有字段：归属销售单元签单金额 |
| `汇率` | `string` | 汇率 | 业务专有字段：汇率 |
| `企业2020年商机协作` | `string` | 企业2020年商机协作 | 业务专有字段：企业2020年商机协作 |
| `签单金额(港币)` | `string` | 签单金额(港币) | 业务专有字段：签单金额(港币) |
| `渠道佣金费率` | `string` | 渠道佣金费率 | 业务专有字段：渠道佣金费率 |
| `一次性费用` | `string` | 一次性费用 | 业务专有字段：一次性费用 |
| `一次性费用(港币)` | `string` | 一次性费用(港币) | 业务专有字段：一次性费用(港币) |
| `周期性费用` | `string` | 周期性费用 | 业务专有字段：周期性费用 |
| `周期性费用(港币)` | `string` | 周期性费用(港币) | 业务专有字段：周期性费用(港币) |
| `_syncedAt` | `date` | _synced At | 业务扩展属性字段 |

### 4. 商机、订单与合同管理 (Orders & Contracts)

#### 12. `contractdetails` (合同产品行项明细表)

- **记录规模**: `959` 条记录
- **业务说明**: 商业合同项下订购的具体产品、带宽规格、计费模式、费率与行项条款明细。
- **关联关系**: 从表。通过 contractId / contractNumber 关联 contracts 主表。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `uuid` | `string` | uuid (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `baseInfo` | `object` | base Info | 业务扩展属性字段 |
| `contractTab` | `object` | contract Tab | 业务扩展属性字段 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `projectTeamInfoDialog` | `object` | project Team Info Dialog | 业务扩展属性字段 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |

#### 13. `contracts` (商业合同主表)

- **记录规模**: `3,401` 条记录
- **业务说明**: 商业合同全生命周期管理主表，包含合同编号、合同名称、生效终止日期、签约甲乙方、审批流状态等。
- **关联关系**: 主表。其 contractId / contractNo 关联 contractdetails.contractId；与 orders 存在项目维度的关联。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `uuid` | `string` | uuid (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `abEnd` | `null` | ab End | 业务扩展属性字段 |
| `abEndDesc` | `null` | ab End Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `affairId` | `null` | affair Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `approvalEndDate` | `null` | approval End Date (日期/时间) | 业务生命周期节点时间戳 |
| `approvalProduct` | `string` | approval Product | 业务扩展属性字段 |
| `approvalStartDate` | `string` | approval Start Date (日期/时间) | 业务生命周期节点时间戳 |
| `autoLaunched` | `string` | auto Launched | 业务扩展属性字段 |
| `basicCompanyId` | `null` | basic Company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `businessType` | `null` | business Type (类型/分类) | 业务所属模式或类别归属 |
| `businessTypeDesc` | `null` | business Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `circuitId` | `string` | circuit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `contactBelong` | `string` | contact Belong | 业务扩展属性字段 |
| `contactBelongDesc` | `string` | contact Belong Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `contracCurrency` | `string` | contrac Currency | 业务扩展属性字段 |
| `contractApprovalDate` | `string` | contract Approval Date (日期/时间) | 业务生命周期节点时间戳 |
| `contractExpireEndDate` | `null` | contract Expire End Date (日期/时间) | 业务生命周期节点时间戳 |
| `contractExpireStartDate` | `null` | contract Expire Start Date (日期/时间) | 业务生命周期节点时间戳 |
| `contractFee` | `number` | contract Fee (金额/资费) | 计费交易金额或成本资费 |
| `contractId` | `null` | contract Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `contractSubject` | `string` | contract Subject | 业务扩展属性字段 |
| `contractSubjectDesc` | `string` | contract Subject Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `createStaffId` | `string` | create Staff Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `createTime` | `string` | create Time (日期/时间) | 业务生命周期节点时间戳 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `creator` | `string` | creator | 业务扩展属性字段 |
| `creatorCompany` | `null` | creator Company | 业务扩展属性字段 |
| `creatorDepart` | `string` | creator Depart | 业务扩展属性字段 |
| `creatorDepartDesc` | `null` | creator Depart Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `creatorDesc` | `null` | creator Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `currency` | `string` | 交易结算币种 | 交易计价币种 (如 USD, HKD, CNY) |
| `currencyDesc` | `string` | currency Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `custId` | `string` | 客户标识 | 客户主键编码 |
| `custName` | `string` | 客户全称 | 签约或结算客户标准全称 |
| `cuurrentNodeDesc` | `string` | cuurrent Node Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `cuurrentNodeId` | `string` | cuurrent Node Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `dictProjectFlag` | `string` | dict Project Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `ebsCode` | `string` | ebs Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `electronicSignature` | `null` | electronic Signature | 业务扩展属性字段 |
| `electronicSignatureDesc` | `string` | electronic Signature Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `electronicSignatureRemark` | `null` | electronic Signature Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `endCustomer` | `string` | end Customer | 业务扩展属性字段 |
| `handleCode` | `null` | handle Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `handleDataRight` | `boolean` | handle Data Right | 业务扩展属性字段 |
| `handleId` | `string` | handle Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `isDraft` | `string` | is Draft | 业务扩展属性字段 |
| `isDraftDesc` | `null` | is Draft Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `isNewNode` | `null` | is New Node | 业务扩展属性字段 |
| `lastOptionType` | `null` | last Option Type (类型/分类) | 业务所属模式或类别归属 |
| `milestonePaymentStatus` | `null` | milestone Payment Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `mksOrderApprContractDetailVos` | `array` | mks Order Appr Contract Detail Vos | 业务扩展属性字段 |
| `newFlag` | `string` | new Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `offlineEntitySealRequired` | `null` | offline Entity Seal Required | 业务扩展属性字段 |
| `offlineEntitySealRequiredDesc` | `string` | offline Entity Seal Required Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `operator` | `null` | 治理操作人员 | 执行数据治理修正的用户姓名 |
| `orderApprovalId` | `string` | order Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `orderApprovalTitle` | `string` | order Approval Title | 业务扩展属性字段 |
| `overdueDays` | `null` | overdue Days | 业务扩展属性字段 |
| `productType` | `string` | 产品细分类别 | 产品形态或资费属性类别 |
| `productTypeDesc` | `string` | product Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `projectCode` | `string` | project Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `projectName` | `string` | project Name (名称) | 实体、客户或产品主体名称 |
| `projectSource` | `string` | project Source | 业务扩展属性字段 |
| `quantityOfOrder` | `string` | quantity Of Order | 业务扩展属性字段 |
| `remark` | `null` | remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `requestId` | `string` | request Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `requestStatus` | `number` | request Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `requestStatusDesc` | `string` | request Status Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `requestStatusName` | `string` | request Status Name (名称) | 实体、客户或产品主体名称 |
| `requestStatusNameE` | `string` | request Status Name E | 业务扩展属性字段 |
| `supplierName` | `null` | supplier Name (名称) | 实体、客户或产品主体名称 |
| `supplierNumber` | `null` | supplier Number | 业务扩展属性字段 |
| `supplierSource` | `null` | supplier Source | 业务扩展属性字段 |
| `totalCost` | `null` | total Cost (金额/资费) | 计费交易金额或成本资费 |
| `totalCostDesc` | `null` | total Cost Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `totalGrossMarginRate` | `null` | total Gross Margin Rate | 业务扩展属性字段 |
| `totalGrossMarginRateDesc` | `null` | total Gross Margin Rate Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `totalIncome` | `number` | total Income | 业务扩展属性字段 |
| `totalIncomeDesc` | `string` | total Income Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `updateStaffId` | `string` | update Staff Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `updateTime` | `string` | update Time (日期/时间) | 业务生命周期节点时间戳 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `workFlowType` | `null` | work Flow Type (类型/分类) | 业务所属模式或类别归属 |
| `workflowNewNodeid` | `string` | workflow New Nodeid (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `isFrameProject` | `null` | is Frame Project | 业务扩展属性字段 |

#### 14. `orderdetails` (订单产品明细表)

- **记录规模**: `347` 条记录
- **业务说明**: 订单项下具体产品开通明细、A/B 端电路站点、SLA 保证、端口速率及计费明细参数。
- **关联关系**: 从表。通过 orderId 关联 orders 主表。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `handleId` | `string` | handle Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `a2pSpecialDescList` | `null` | a2p Special Desc List | 业务扩展属性字段 |
| `a2pStandardDescList` | `null` | a2p Standard Desc List | 业务扩展属性字段 |
| `adjustPriceApprovalList` | `array` | adjust Price Approval List | 业务扩展属性字段 |
| `adjustmentTime` | `null` | adjustment Time (日期/时间) | 业务生命周期节点时间戳 |
| `adjustmentTimeCreate` | `null` | adjustment Time Create | 业务扩展属性字段 |
| `adjustmentTimeType` | `null` | adjustment Time Type (类型/分类) | 业务所属模式或类别归属 |
| `annualPriceAdjustmentPlan` | `null` | annual Price Adjustment Plan | 业务扩展属性字段 |
| `annualPriceAdjustmentPlans` | `null` | annual Price Adjustment Plans | 业务扩展属性字段 |
| `annualPriceAdjustmentRatio` | `null` | annual Price Adjustment Ratio | 业务扩展属性字段 |
| `associatePo` | `null` | associate Po | 业务扩展属性字段 |
| `backToBack` | `string` | back To Back | 业务扩展属性字段 |
| `batch` | `null` | batch | 业务扩展属性字段 |
| `batchTotal` | `null` | batch Total | 业务扩展属性字段 |
| `billType` | `null` | bill Type (类型/分类) | 业务所属模式或类别归属 |
| `billingCycle` | `number` | billing Cycle | 业务扩展属性字段 |
| `billingKind` | `null` | billing Kind (类型/分类) | 业务所属模式或类别归属 |
| `billingType` | `null` | billing Type (类型/分类) | 业务所属模式或类别归属 |
| `businessInfo` | `null` | business Info | 业务扩展属性字段 |
| `cdnPlatform` | `null` | cdn Platform | 业务扩展属性字段 |
| `cidcEstimatedBillingVOList` | `array` | cidc Estimated Billing V O List | 业务扩展属性字段 |
| `cidcMksPlanList` | `null` | cidc Mks Plan List | 业务扩展属性字段 |
| `commitmentAmount` | `number` | commitment Amount (金额/资费) | 计费交易金额或成本资费 |
| `commitmentAmountCurrency` | `null` | commitment Amount Currency | 业务扩展属性字段 |
| `commitmentAmountCurrencyName` | `null` | commitment Amount Currency Name (名称) | 实体、客户或产品主体名称 |
| `commitmentOrderType` | `null` | commitment Order Type (类型/分类) | 业务所属模式或类别归属 |
| `commitmentOrderTypeDesc` | `null` | commitment Order Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `commitmentOrderUnit` | `null` | commitment Order Unit | 业务扩展属性字段 |
| `commitmentOrderUnitDesc` | `null` | commitment Order Unit Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `commitmentOrderValue` | `number` | commitment Order Value | 业务扩展属性字段 |
| `commitmentOrderYearValue` | `null` | commitment Order Year Value | 业务扩展属性字段 |
| `connectionService` | `null` | connection Service | 业务扩展属性字段 |
| `consultsolution` | `null` | consultsolution | 业务扩展属性字段 |
| `consultsolutionBy` | `null` | consultsolution By | 业务扩展属性字段 |
| `consultsolutionRemark` | `null` | consultsolution Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `consultsolutionTime` | `null` | consultsolution Time (日期/时间) | 业务生命周期节点时间戳 |
| `couponCurrency` | `null` | coupon Currency | 业务扩展属性字段 |
| `couponType` | `null` | coupon Type (类型/分类) | 业务所属模式或类别归属 |
| `couponTypeName` | `null` | coupon Type Name (名称) | 实体、客户或产品主体名称 |
| `couponValue` | `null` | coupon Value | 业务扩展属性字段 |
| `cpeBWPlanPopList` | `array` | cpe B W Plan Pop List | 业务扩展属性字段 |
| `cpePlanPopList` | `array` | cpe Plan Pop List | 业务扩展属性字段 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `crossRegionPopList` | `array` | cross Region Pop List | 业务扩展属性字段 |
| `cspInfoPopList` | `array` | csp Info Pop List | 业务扩展属性字段 |
| `cumulativeCommitmentAmount` | `null` | cumulative Commitment Amount (金额/资费) | 计费交易金额或成本资费 |
| `currency` | `string` | 交易结算币种 | 交易计价币种 (如 USD, HKD, CNY) |
| `currencyName` | `string` | currency Name (名称) | 实体、客户或产品主体名称 |
| `customerContractBenefitsBillType` | `null` | customer Contract Benefits Bill Type (类型/分类) | 业务所属模式或类别归属 |
| `customerDesignatedSupplier` | `null` | customer Designated Supplier | 业务扩展属性字段 |
| `customerDesignatedSupplierDesc` | `null` | customer Designated Supplier Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `dataHall` | `null` | data Hall | 业务扩展属性字段 |
| `deepCooperation` | `null` | deep Cooperation | 业务扩展属性字段 |
| `effDate` | `null` | eff Date (日期/时间) | 业务生命周期节点时间戳 |
| `effTimeProcess` | `number` | eff Time Process | 业务扩展属性字段 |
| `excessUnit` | `null` | excess Unit | 业务扩展属性字段 |
| `feeSpecCode` | `null` | fee Spec Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `fullRack` | `null` | full Rack | 业务扩展属性字段 |
| `generalPopList` | `array` | general Pop List | 业务扩展属性字段 |
| `globalPlusType` | `null` | global Plus Type (类型/分类) | 业务所属模式或类别归属 |
| `halfRack` | `null` | half Rack | 业务扩展属性字段 |
| `imeiStr` | `null` | imei Str | 业务扩展属性字段 |
| `ipxSpecialPriceingApprovalId` | `null` | ipx Special Priceing Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `isCmiExportProduct` | `string` | is Cmi Export Product | 业务扩展属性字段 |
| `isIpxSpecialPriceingApproval` | `null` | is Ipx Special Priceing Approval | 业务扩展属性字段 |
| `isLadderPrice` | `null` | is Ladder Price (金额/资费) | 计费交易金额或成本资费 |
| `isSpecialPriceingApproval` | `string` | is Special Priceing Approval | 业务扩展属性字段 |
| `leasedLineType` | `null` | leased Line Type (类型/分类) | 业务所属模式或类别归属 |
| `mksCpeBWPlanPopDescList` | `null` | mks Cpe B W Plan Pop Desc List | 业务扩展属性字段 |
| `mksCpePlanPopDescList` | `null` | mks Cpe Plan Pop Desc List | 业务扩展属性字段 |
| `mksDssOperatorPlanVOList` | `null` | mks Dss Operator Plan V O List | 业务扩展属性字段 |
| `mksPlanDesc` | `null` | mks Plan Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `mksPlanIPNSiteInfoList` | `null` | mks Plan I P N Site Info List | 业务扩展属性字段 |
| `mksPlanPopDescCrossRegionInfoList` | `null` | mks Plan Pop Desc Cross Region Info List | 业务扩展属性字段 |
| `mksPlanPopDescCspInfoList` | `null` | mks Plan Pop Desc Csp Info List | 业务扩展属性字段 |
| `mksPlanPopDescGeneralInfoList` | `array` | mks Plan Pop Desc General Info List | 业务扩展属性字段 |
| `mksPlanPopDescList` | `array` | mks Plan Pop Desc List | 业务扩展属性字段 |
| `mksPlanPopDescOtherList` | `array` | mks Plan Pop Desc Other List | 业务扩展属性字段 |
| `mksPlanPopDescPortInfoList` | `array` | mks Plan Pop Desc Port Info List | 业务扩展属性字段 |
| `mksPlanPopIPNList` | `null` | mks Plan Pop I P N List | 业务扩展属性字段 |
| `mksRHSAccessoryPriceVoList` | `null` | mks R H S Accessory Price Vo List | 业务扩展属性字段 |
| `mksRHSServicePriceVoList` | `null` | mks R H S Service Price Vo List | 业务扩展属性字段 |
| `mksRackPowerList` | `array` | mks Rack Power List | 业务扩展属性字段 |
| `mksRoamClearPlanPopList` | `null` | mks Roam Clear Plan Pop List | 业务扩展属性字段 |
| `mksSupplierVos` | `array` | mks Supplier Vos | 业务扩展属性字段 |
| `mrcTotal` | `number` | mrc Total | 业务扩展属性字段 |
| `nonStandardRackNum` | `string` | non Standard Rack Num | 业务扩展属性字段 |
| `nrcTotal` | `number` | nrc Total | 业务扩展属性字段 |
| `numeralSyste` | `null` | numeral Syste | 业务扩展属性字段 |
| `oldPromotionCampaign` | `null` | old Promotion Campaign | 业务扩展属性字段 |
| `orderMargin` | `number` | order Margin | 业务扩展属性字段 |
| `otherPlanPopList` | `array` | other Plan Pop List | 业务扩展属性字段 |
| `otherrInfoPopList` | `null` | otherr Info Pop List | 业务扩展属性字段 |
| `phaseEffectiveTime` | `null` | phase Effective Time (日期/时间) | 业务生命周期节点时间戳 |
| `phaseNo` | `null` | phase No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `phaseStatus` | `string` | phase Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `phaseStatusName` | `string` | phase Status Name (名称) | 实体、客户或产品主体名称 |
| `planDesc` | `null` | plan Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `planId` | `string` | plan Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `planName` | `null` | plan Name (名称) | 实体、客户或产品主体名称 |
| `planNo` | `null` | plan No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `planPopA2PDescList` | `null` | plan Pop A2 P Desc List | 业务扩展属性字段 |
| `planPopA2PList` | `null` | plan Pop A2 P List | 业务扩展属性字段 |
| `planPopA2PSpecialList` | `null` | plan Pop A2 P Special List | 业务扩展属性字段 |
| `planPopA2PStandardList` | `null` | plan Pop A2 P Standard List | 业务扩展属性字段 |
| `planPopBcpList` | `array` | plan Pop Bcp List | 业务扩展属性字段 |
| `planPopClsList` | `array` | plan Pop Cls List | 业务扩展属性字段 |
| `planPopIctsList` | `null` | plan Pop Icts List | 业务扩展属性字段 |
| `planPopList` | `array` | plan Pop List | 业务扩展属性字段 |
| `planPopRhsList` | `array` | plan Pop Rhs List | 业务扩展属性字段 |
| `portInfoList` | `array` | port Info List | 业务扩展属性字段 |
| `priceAdjustment` | `null` | price Adjustment | 业务扩展属性字段 |
| `priceAdjustmentName` | `null` | price Adjustment Name (名称) | 实体、客户或产品主体名称 |
| `priceAdjustmentRemark` | `null` | price Adjustment Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `priceLevel` | `string` | price Level | 业务扩展属性字段 |
| `priceLevelName` | `string` | price Level Name (名称) | 实体、客户或产品主体名称 |
| `priceLevelRemark` | `null` | price Level Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `priceListCode` | `null` | price List Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `priceListType` | `null` | price List Type (类型/分类) | 业务所属模式或类别归属 |
| `procomSpePriceApprovalId` | `string` | procom Spe Price Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `profit` | `null` | profit | 业务扩展属性字段 |
| `promotionCampaign` | `null` | promotion Campaign | 业务扩展属性字段 |
| `rackPowerTotall` | `null` | rack Power Totall | 业务扩展属性字段 |
| `ratioMarkup` | `null` | ratio Markup | 业务扩展属性字段 |
| `relatedParty` | `null` | related Party | 业务扩展属性字段 |
| `relatedPartyDesc` | `null` | related Party Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `sdWanSupplementPlanPopList` | `null` | sd Wan Supplement Plan Pop List | 业务扩展属性字段 |
| `specialPriceingApprovalId` | `null` | special Priceing Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `standardRackNum` | `string` | standard Rack Num | 业务扩展属性字段 |
| `state` | `string` | state (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `sumCost` | `number` | sum Cost (金额/资费) | 计费交易金额或成本资费 |
| `sumMrc` | `number` | sum Mrc | 业务扩展属性字段 |
| `sumNrc` | `number` | sum Nrc | 业务扩展属性字段 |
| `sumPrice` | `number` | sum Price (金额/资费) | 计费交易金额或成本资费 |
| `supModAnnualPriceAdjustment` | `null` | sup Mod Annual Price Adjustment | 业务扩展属性字段 |
| `supplierDesc` | `null` | supplier Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `taxConfirmState` | `string` | tax Confirm State (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `totalResell` | `null` | total Resell | 业务扩展属性字段 |
| `totalResellDesc` | `null` | total Resell Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `uRack` | `null` | u Rack | 业务扩展属性字段 |
| `updateTime` | `string` | update Time (日期/时间) | 业务生命周期节点时间戳 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `urack` | `null` | urack | 业务扩展属性字段 |
| `usageBilling` | `null` | usage Billing | 业务扩展属性字段 |
| `usageBillingDesc` | `null` | usage Billing Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `useUnitInfoList` | `null` | use Unit Info List | 业务扩展属性字段 |
| `usingFboCapacityModel` | `null` | using Fbo Capacity Model | 业务扩展属性字段 |
| `usingFboCapacityModelDesc` | `null` | using Fbo Capacity Model Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `workOrderInfo` | `null` | work Order Info | 业务扩展属性字段 |
| `modificationIsRequired` | `null` | modification Is Required | 业务扩展属性字段 |
| `quantumSafe` | `null` | quantum Safe | 业务扩展属性字段 |
| `generalPopCombineList` | `null` | general Pop Combine List | 业务扩展属性字段 |
| `goGlobalProductName` | `null` | go Global Product Name (名称) | 实体、客户或产品主体名称 |
| `includesGoGlobalProduct` | `null` | includes Go Global Product | 业务扩展属性字段 |
| `paymentType` | `null` | payment Type (类型/分类) | 业务所属模式或类别归属 |

#### 15. `orders` (商机与业务订单主表)

- **记录规模**: `408` 条记录
- **业务说明**: 业务拓展订单与商机流程主表，涵盖售前商机、技术方案、网络电路设计、商务审批等全量流转字段。
- **关联关系**: 主表。其 orderId / prodOrdId 关联 orderdetails.orderId；通过 custId 关联客户主数据。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `requireCode` | `string` | require Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `aArea` | `null` | a Area (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `aAreaDesc` | `null` | a Area Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `aConnType` | `null` | a Conn Type (类型/分类) | 业务所属模式或类别归属 |
| `aConnTypeDesc` | `null` | a Conn Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `aPort` | `null` | a Port | 业务扩展属性字段 |
| `aPortDesc` | `null` | a Port Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `abroadSerOrThing` | `null` | abroad Ser Or Thing | 业务扩展属性字段 |
| `acceptSrc` | `string` | accept Src | 业务扩展属性字段 |
| `actualDuration` | `number` | actual Duration | 业务扩展属性字段 |
| `actualRfs` | `null` | actual Rfs | 业务扩展属性字段 |
| `addSiteNni` | `null` | add Site Nni | 业务扩展属性字段 |
| `addedService` | `null` | added Service | 业务扩展属性字段 |
| `applicant` | `null` | applicant | 业务扩展属性字段 |
| `arcFlag` | `null` | arc Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `arcTime` | `null` | arc Time (日期/时间) | 业务生命周期节点时间戳 |
| `attachList` | `null` | attach List | 业务扩展属性字段 |
| `audTime` | `null` | aud Time (日期/时间) | 业务生命周期节点时间戳 |
| `bArea` | `null` | b Area (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `bAreaDesc` | `null` | b Area Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `bConnType` | `null` | b Conn Type (类型/分类) | 业务所属模式或类别归属 |
| `bConnTypeDesc` | `null` | b Conn Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `bPort` | `null` | b Port | 业务扩展属性字段 |
| `bPortDesc` | `null` | b Port Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `bandWidth` | `null` | band Width | 业务扩展属性字段 |
| `bandwidthChanges` | `null` | bandwidth Changes | 业务扩展属性字段 |
| `batchParam` | `null` | batch Param | 业务扩展属性字段 |
| `billType` | `null` | bill Type (类型/分类) | 业务所属模式或类别归属 |
| `billingCycle` | `number` | billing Cycle | 业务扩展属性字段 |
| `billingKind` | `null` | billing Kind (类型/分类) | 业务所属模式或类别归属 |
| `billingStopDate` | `null` | billing Stop Date (日期/时间) | 业务生命周期节点时间戳 |
| `bindOrderFlag` | `null` | bind Order Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `bundleSales` | `null` | bundle Sales | 业务扩展属性字段 |
| `busiType` | `string` | busi Type (类型/分类) | 业务所属模式或类别归属 |
| `businessApprovalNo` | `null` | business Approval No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `businessApprovalStatus` | `null` | business Approval Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `businessChangeApplyVo` | `null` | business Change Apply Vo | 业务扩展属性字段 |
| `cableRoute1` | `null` | cable Route1 | 业务扩展属性字段 |
| `cableRoute2` | `null` | cable Route2 | 业务扩展属性字段 |
| `canQuickOrder` | `null` | can Quick Order | 业务扩展属性字段 |
| `canUndoArchive` | `null` | can Undo Archive | 业务扩展属性字段 |
| `cancelDate` | `null` | cancel Date (日期/时间) | 业务生命周期节点时间戳 |
| `cancelRemark` | `null` | cancel Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `cancelResult` | `null` | cancel Result | 业务扩展属性字段 |
| `category` | `null` | category (类型/分类) | 业务所属模式或类别归属 |
| `ccafId` | `null` | ccaf Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `cdnPlatform` | `null` | cdn Platform | 业务扩展属性字段 |
| `changeReason` | `null` | change Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `changeType` | `null` | change Type (类型/分类) | 业务所属模式或类别归属 |
| `channelId` | `null` | channel Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `channelIntroducing` | `null` | channel Introducing | 业务扩展属性字段 |
| `channelMrc` | `null` | channel Mrc | 业务扩展属性字段 |
| `channelName` | `null` | channel Name (名称) | 实体、客户或产品主体名称 |
| `channelNrc` | `null` | channel Nrc | 业务扩展属性字段 |
| `channelOrderProof` | `null` | channel Order Proof | 业务扩展属性字段 |
| `channelYrc` | `null` | channel Yrc | 业务扩展属性字段 |
| `circuitId` | `null` | circuit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `cmccCompletionDate` | `null` | cmcc Completion Date (日期/时间) | 业务生命周期节点时间戳 |
| `cmccNetworkPlatformType` | `null` | cmcc Network Platform Type (类型/分类) | 业务所属模式或类别归属 |
| `cmccNetworkPlatformTypeName` | `null` | cmcc Network Platform Type Name (名称) | 实体、客户或产品主体名称 |
| `commissionFileName` | `null` | commission File Name (名称) | 实体、客户或产品主体名称 |
| `commissionRate` | `null` | commission Rate | 业务扩展属性字段 |
| `commissionRateCelling` | `null` | commission Rate Celling | 业务扩展属性字段 |
| `companyOfCreator` | `null` | company Of Creator | 业务扩展属性字段 |
| `companyUnit` | `null` | company Unit | 业务扩展属性字段 |
| `connectionType` | `null` | connection Type (类型/分类) | 业务所属模式或类别归属 |
| `constructionPeriod` | `number` | construction Period | 业务扩展属性字段 |
| `contractBelong` | `string` | contract Belong | 业务扩展属性字段 |
| `contractCenterStatus` | `null` | contract Center Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `contractList` | `array` | contract List | 业务扩展属性字段 |
| `contractSigned` | `string` | contract Signed | 业务扩展属性字段 |
| `contractSubject` | `string` | contract Subject | 业务扩展属性字段 |
| `convergedNetworkRelList` | `null` | converged Network Rel List | 业务扩展属性字段 |
| `correlatedProductType` | `null` | correlated Product Type (类型/分类) | 业务所属模式或类别归属 |
| `correlatedProductTypeName` | `null` | correlated Product Type Name (名称) | 实体、客户或产品主体名称 |
| `correlatedRackNo` | `null` | correlated Rack No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `cpeFinishReply` | `null` | cpe Finish Reply | 业务扩展属性字段 |
| `createOperId` | `null` | create Oper Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `createStaffId` | `string` | create Staff Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `createStaffName` | `string` | create Staff Name (名称) | 实体、客户或产品主体名称 |
| `createTime` | `string` | create Time (日期/时间) | 业务生命周期节点时间戳 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `creator` | `null` | creator | 业务扩展属性字段 |
| `currencyRate` | `null` | currency Rate | 业务扩展属性字段 |
| `custArea` | `null` | cust Area (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `custCode` | `string` | cust Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custId` | `string` | 客户标识 | 客户主键编码 |
| `custManagerId` | `string` | cust Manager Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custManagerName` | `string` | cust Manager Name (名称) | 实体、客户或产品主体名称 |
| `custManagerNo` | `string` | cust Manager No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custManagerSalesUnitId` | `string` | cust Manager Sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custOppoSharing` | `null` | cust Oppo Sharing | 业务扩展属性字段 |
| `custOpposalesManagerSharing` | `null` | cust Opposales Manager Sharing | 业务扩展属性字段 |
| `custRefNo` | `null` | cust Ref No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custRoleType` | `null` | cust Role Type (类型/分类) | 业务所属模式或类别归属 |
| `custRoleTypeDesc` | `string` | cust Role Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `custType` | `string` | cust Type (类型/分类) | 业务所属模式或类别归属 |
| `custTypeDesc` | `string` | cust Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `customerName` | `string` | 签约客户名称 | 与 CMI 签订合同的外部企业法定名称 |
| `delayDay` | `number` | delay Day | 业务扩展属性字段 |
| `delayReason` | `null` | delay Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `delayReasonDetail` | `null` | delay Reason Detail | 业务扩展属性字段 |
| `deliveryDate` | `null` | delivery Date (日期/时间) | 业务生命周期节点时间戳 |
| `departmentOfCreator` | `null` | department Of Creator | 业务扩展属性字段 |
| `depositType` | `string` | deposit Type (类型/分类) | 业务所属模式或类别归属 |
| `depositTypeCurrency` | `null` | deposit Type Currency | 业务扩展属性字段 |
| `depositTypeFee` | `null` | deposit Type Fee (金额/资费) | 计费交易金额或成本资费 |
| `deptName` | `string` | dept Name (名称) | 实体、客户或产品主体名称 |
| `dictProjectFlag` | `string` | dict Project Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `dispatchWorkOrder` | `null` | dispatch Work Order | 业务扩展属性字段 |
| `earlyLeaseCertificate` | `null` | early Lease Certificate | 业务扩展属性字段 |
| `ebsCustomerCode` | `null` | ebs Customer Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `endContactPerson` | `null` | end Contact Person | 业务扩展属性字段 |
| `endCustomer` | `string` | end Customer | 业务扩展属性字段 |
| `endCustomerId` | `string` | end Customer Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `endCustomerIndustry` | `null` | end Customer Industry | 业务扩展属性字段 |
| `engineer` | `null` | engineer | 业务扩展属性字段 |
| `ensureLevel` | `null` | ensure Level | 业务扩展属性字段 |
| `esopBusinessCancelledNo` | `null` | esop Business Cancelled No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `esopFlag` | `null` | esop Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `esopNo` | `null` | esop No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `esopOrderNo` | `null` | esop Order No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `esopPriceChangeNo` | `null` | esop Price Change No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `esopProdOrdNo` | `null` | esop Prod Ord No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `estimatedRfs` | `null` | estimated Rfs | 业务扩展属性字段 |
| `extensionEndDate` | `null` | extension End Date (日期/时间) | 业务生命周期节点时间戳 |
| `extensionStartDate` | `null` | extension Start Date (日期/时间) | 业务生命周期节点时间戳 |
| `extensionXlcsId` | `null` | extension Xlcs Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `fileId` | `null` | file Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `flexibleBilling` | `null` | flexible Billing | 业务扩展属性字段 |
| `flowFinishDate` | `null` | flow Finish Date (日期/时间) | 业务生命周期节点时间戳 |
| `flowLeaseTime` | `null` | flow Lease Time (日期/时间) | 业务生命周期节点时间戳 |
| `flowStatus` | `number` | flow Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `frameSize` | `null` | frame Size | 业务扩展属性字段 |
| `generateOrderDate` | `null` | generate Order Date (日期/时间) | 业务生命周期节点时间戳 |
| `groupDataRightVOs` | `null` | group Data Right V Os | 业务扩展属性字段 |
| `handleCode` | `null` | handle Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `handleDomainConfigList` | `null` | handle Domain Config List | 业务扩展属性字段 |
| `handleIPLC` | `null` | handle I P L C | 业务扩展属性字段 |
| `handleId` | `string` | handle Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `handleIdList` | `null` | handle Id List | 业务扩展属性字段 |
| `handleListFlag` | `null` | handle List Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `handleListRelList` | `null` | handle List Rel List | 业务扩展属性字段 |
| `handleListStatus` | `string` | handle List Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `handleName` | `string` | handle Name (名称) | 实体、客户或产品主体名称 |
| `handleQuickOrder` | `null` | handle Quick Order | 业务扩展属性字段 |
| `handleSource` | `string` | handle Source | 业务扩展属性字段 |
| `handleType` | `number` | handle Type (类型/分类) | 业务所属模式或类别归属 |
| `handleWorkflowType` | `null` | handle Workflow Type (类型/分类) | 业务所属模式或类别归属 |
| `haveMsa` | `null` | have Msa | 业务扩展属性字段 |
| `hireTimeE` | `null` | hire Time E | 业务扩展属性字段 |
| `hireTimeS` | `null` | hire Time S | 业务扩展属性字段 |
| `importantProject` | `string` | important Project | 业务扩展属性字段 |
| `intentionCode` | `string` | intention Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `intentionId` | `string` | intention Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `intentionVo` | `null` | intention Vo | 业务扩展属性字段 |
| `internalOrder` | `boolean` | internal Order | 业务扩展属性字段 |
| `invoiceTaxShow` | `null` | invoice Tax Show | 业务扩展属性字段 |
| `ipxSpecialPriceingApprovalId` | `null` | ipx Special Priceing Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `isAcrossInfo` | `null` | is Across Info | 业务扩展属性字段 |
| `isAutoRetire` | `null` | is Auto Retire | 业务扩展属性字段 |
| `isIpxSpecialPriceingApproval` | `null` | is Ipx Special Priceing Approval | 业务扩展属性字段 |
| `isIru` | `null` | is Iru | 业务扩展属性字段 |
| `isNewFlowPath` | `null` | is New Flow Path | 业务扩展属性字段 |
| `isOrder` | `null` | is Order | 业务扩展属性字段 |
| `isSale` | `null` | is Sale | 业务扩展属性字段 |
| `isSla` | `null` | is Sla | 业务扩展属性字段 |
| `isSpecialPriceingApproval` | `null` | is Special Priceing Approval | 业务扩展属性字段 |
| `isSwapOrder` | `null` | is Swap Order | 业务扩展属性字段 |
| `isTimeout` | `string` | is Timeout | 业务扩展属性字段 |
| `itemCode` | `null` | item Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `jumperConfiguration` | `null` | jumper Configuration | 业务扩展属性字段 |
| `language` | `null` | language | 业务扩展属性字段 |
| `lastBillingCycle` | `null` | last Billing Cycle | 业务扩展属性字段 |
| `lastMrc` | `null` | last Mrc | 业务扩展属性字段 |
| `lastOrderType` | `null` | last Order Type (类型/分类) | 业务所属模式或类别归属 |
| `leaseBeforeContractApproval` | `null` | lease Before Contract Approval | 业务扩展属性字段 |
| `leaseRemark` | `null` | lease Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `leaseStartFrom` | `null` | lease Start From | 业务扩展属性字段 |
| `leaseStartTo` | `null` | lease Start To | 业务扩展属性字段 |
| `leaseTime` | `null` | lease Time (日期/时间) | 业务生命周期节点时间戳 |
| `linkRequireCode` | `null` | link Require Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `localBillingCustomer` | `null` | local Billing Customer | 业务扩展属性字段 |
| `localBillingCustomerName` | `null` | local Billing Customer Name (名称) | 实体、客户或产品主体名称 |
| `majorProjectNo` | `null` | major Project No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `majorProjectStatus` | `null` | major Project Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `majorProjectStatusName` | `null` | major Project Status Name (名称) | 实体、客户或产品主体名称 |
| `manuallySetTax` | `null` | manually Set Tax | 业务扩展属性字段 |
| `marketValue` | `null` | market Value | 业务扩展属性字段 |
| `milestonPaymentFlag` | `null` | mileston Payment Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `milestonePaymentStatus` | `string` | milestone Payment Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `milestoneType` | `null` | milestone Type (类型/分类) | 业务所属模式或类别归属 |
| `mksCmiSrOrderList` | `null` | mks Cmi Sr Order List | 业务扩展属性字段 |
| `mksCredit` | `null` | mks Credit | 业务扩展属性字段 |
| `mksDeliveryAddressList` | `null` | mks Delivery Address List | 业务扩展属性字段 |
| `mksHandleA2p` | `null` | mks Handle A2p | 业务扩展属性字段 |
| `mksHandleAas` | `null` | mks Handle Aas | 业务扩展属性字段 |
| `mksHandleCIDC` | `null` | mks Handle C I D C | 业务扩展属性字段 |
| `mksHandleCdn` | `null` | mks Handle Cdn | 业务扩展属性字段 |
| `mksHandleCloud` | `null` | mks Handle Cloud | 业务扩展属性字段 |
| `mksHandleCloudConn` | `null` | mks Handle Cloud Conn | 业务扩展属性字段 |
| `mksHandleCloudConnSec` | `null` | mks Handle Cloud Conn Sec | 业务扩展属性字段 |
| `mksHandleCoopSdWan` | `null` | mks Handle Coop Sd Wan | 业务扩展属性字段 |
| `mksHandleCustAcrossInfoVO` | `null` | mks Handle Cust Across Info V O | 业务扩展属性字段 |
| `mksHandleDss` | `null` | mks Handle Dss | 业务扩展属性字段 |
| `mksHandleEvpn` | `null` | mks Handle Evpn | 业务扩展属性字段 |
| `mksHandleExtendAttrList` | `null` | mks Handle Extend Attr List | 业务扩展属性字段 |
| `mksHandleGeneral` | `null` | mks Handle General | 业务扩展属性字段 |
| `mksHandleIDC` | `null` | mks Handle I D C | 业务扩展属性字段 |
| `mksHandleIDCPower` | `null` | mks Handle I D C Power | 业务扩展属性字段 |
| `mksHandleIOTCVO` | `null` | mks Handle I O T C V O | 业务扩展属性字段 |
| `mksHandleIPN` | `null` | mks Handle I P N | 业务扩展属性字段 |
| `mksHandleIPNCosList` | `null` | mks Handle I P N Cos List | 业务扩展属性字段 |
| `mksHandleIPNList` | `null` | mks Handle I P N List | 业务扩展属性字段 |
| `mksHandleIPT` | `null` | mks Handle I P T | 业务扩展属性字段 |
| `mksHandleInterconnection` | `null` | mks Handle Interconnection | 业务扩展属性字段 |
| `mksHandleMCloudVo` | `null` | mks Handle M Cloud Vo | 业务扩展属性字段 |
| `mksHandleManuallySetTaxeList` | `null` | mks Handle Manually Set Taxe List | 业务扩展属性字段 |
| `mksHandleMcloud` | `null` | mks Handle Mcloud | 业务扩展属性字段 |
| `mksHandleOperatorAcrossInfoVO` | `null` | mks Handle Operator Across Info V O | 业务扩展属性字段 |
| `mksHandleP2p` | `null` | mks Handle P2p | 业务扩展属性字段 |
| `mksHandlePiccdnBusinessList` | `null` | mks Handle Piccdn Business List | 业务扩展属性字段 |
| `mksHandleRHS` | `null` | mks Handle R H S | 业务扩展属性字段 |
| `mksHandleRoamClearing` | `null` | mks Handle Roam Clearing | 业务扩展属性字段 |
| `mksHandleRoamClearingVO` | `null` | mks Handle Roam Clearing V O | 业务扩展属性字段 |
| `mksHandleSaleContractInfos` | `array` | mks Handle Sale Contract Infos | 业务扩展属性字段 |
| `mksHandleSdWan` | `null` | mks Handle Sd Wan | 业务扩展属性字段 |
| `mksHandleTests` | `null` | mks Handle Tests | 业务扩展属性字段 |
| `mksHandleVpnCloudConn` | `null` | mks Handle Vpn Cloud Conn | 业务扩展属性字段 |
| `mksHandleVpop` | `null` | mks Handle Vpop | 业务扩展属性字段 |
| `mksHandleVpopIpsec` | `null` | mks Handle Vpop Ipsec | 业务扩展属性字段 |
| `mksInvoiceList` | `null` | mks Invoice List | 业务扩展属性字段 |
| `mksPlanList` | `null` | mks Plan List | 业务扩展属性字段 |
| `mksRackBatchOperationList` | `null` | mks Rack Batch Operation List | 业务扩展属性字段 |
| `mksRackPowerFilterList` | `null` | mks Rack Power Filter List | 业务扩展属性字段 |
| `mksRfsProblemList` | `null` | mks Rfs Problem List | 业务扩展属性字段 |
| `mksSdWanFailureContactList` | `null` | mks Sd Wan Failure Contact List | 业务扩展属性字段 |
| `msaFrameworkAgreement` | `null` | msa Framework Agreement | 业务扩展属性字段 |
| `msaNo` | `null` | msa No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `nailEnd` | `null` | nail End | 业务扩展属性字段 |
| `nailNextEnd` | `null` | nail Next End | 业务扩展属性字段 |
| `netType` | `null` | net Type (类型/分类) | 业务所属模式或类别归属 |
| `netTypeDesc` | `null` | net Type Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `networkingMethod` | `null` | networking Method | 业务扩展属性字段 |
| `newBiz` | `null` | new Biz | 业务扩展属性字段 |
| `newBizOrderApproval` | `null` | new Biz Order Approval | 业务扩展属性字段 |
| `newFileId` | `null` | new File Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `numberOfSplit` | `null` | number Of Split | 业务扩展属性字段 |
| `oldFileId` | `null` | old File Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `oldHandleId` | `null` | old Handle Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `oldIcts` | `null` | old Icts | 业务扩展属性字段 |
| `oldTapeWidth` | `null` | old Tape Width | 业务扩展属性字段 |
| `oldTapeWidthUnit` | `null` | old Tape Width Unit | 业务扩展属性字段 |
| `oldTapeWidthVal` | `null` | old Tape Width Val | 业务扩展属性字段 |
| `oneTimePaymentNrc` | `null` | one Time Payment Nrc | 业务扩展属性字段 |
| `onlineOffline` | `null` | online Offline | 业务扩展属性字段 |
| `operId` | `string` | oper Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `operTime` | `string` | oper Time (日期/时间) | 业务生命周期节点时间戳 |
| `opportProdId` | `string` | opport Prod Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `opportunityId` | `null` | opportunity Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `opportunityName` | `null` | opportunity Name (名称) | 实体、客户或产品主体名称 |
| `orderAcceptanceDate` | `null` | order Acceptance Date (日期/时间) | 业务生命周期节点时间戳 |
| `orderApprovalNo` | `string` | order Approval No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `orderApprovalReason` | `null` | order Approval Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `orderApprovalStatus` | `string` | order Approval Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `orderHandleFlag` | `null` | order Handle Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `orderType` | `string` | order Type (类型/分类) | 业务所属模式或类别归属 |
| `originalCircuitId` | `null` | original Circuit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `originalOrderType` | `null` | original Order Type (类型/分类) | 业务所属模式或类别归属 |
| `overseasCompletionDate` | `null` | overseas Completion Date (日期/时间) | 业务生命周期节点时间戳 |
| `paymentMode` | `number` | payment Mode | 业务扩展属性字段 |
| `peArea` | `null` | pe Area (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `peSiteDesc` | `null` | pe Site Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `pigeonhole` | `boolean` | pigeonhole | 业务扩展属性字段 |
| `planCurrencyName` | `null` | plan Currency Name (名称) | 实体、客户或产品主体名称 |
| `platformAccountId` | `null` | platform Account Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `platformAccountName` | `null` | platform Account Name (名称) | 实体、客户或产品主体名称 |
| `pmUserId` | `null` | pm User Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `pmUserName` | `null` | pm User Name (名称) | 实体、客户或产品主体名称 |
| `preHandleCode` | `null` | pre Handle Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `preTaxBearer` | `null` | pre Tax Bearer | 业务扩展属性字段 |
| `principalAgent` | `null` | principal Agent | 业务扩展属性字段 |
| `prodOrdId` | `string` | prod Ord Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `productId` | `string` | 产品标识编码 | 产品中心统一定义的产品编码 |
| `productItem` | `null` | product Item | 业务扩展属性字段 |
| `productName` | `string` | 产品名称 | 签约订购的通信或云网产品服务名称 |
| `productType` | `string` | 产品细分类别 | 产品形态或资费属性类别 |
| `projectCode` | `string` | project Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `projectLevel` | `null` | project Level | 业务扩展属性字段 |
| `projectSource` | `null` | project Source | 业务扩展属性字段 |
| `promiseSla` | `null` | promise Sla | 业务扩展属性字段 |
| `promotionCampaign` | `null` | promotion Campaign | 业务扩展属性字段 |
| `provisionDate` | `null` | provision Date (日期/时间) | 业务生命周期节点时间戳 |
| `provisionRemark` | `null` | provision Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `provisionResult` | `null` | provision Result | 业务扩展属性字段 |
| `provisionSource` | `null` | provision Source | 业务扩展属性字段 |
| `quotaCode` | `null` | quota Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `quotaId` | `null` | quota Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `quotateReqDate` | `string` | quotate Req Date (日期/时间) | 业务生命周期节点时间戳 |
| `quoteAuthority` | `null` | quote Authority | 业务扩展属性字段 |
| `rackRemark` | `null` | rack Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `reasonDesc` | `null` | reason Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `receivedTime` | `null` | received Time (日期/时间) | 业务生命周期节点时间戳 |
| `refEnquireList` | `null` | ref Enquire List | 业务扩展属性字段 |
| `refNo` | `null` | ref No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `remark` | `null` | remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `renewContract` | `null` | renew Contract | 业务扩展属性字段 |
| `repairCode` | `null` | repair Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `reqBsdDate` | `null` | req Bsd Date (日期/时间) | 业务生命周期节点时间戳 |
| `reqFinishDate` | `null` | req Finish Date (日期/时间) | 业务生命周期节点时间戳 |
| `reqFinishDateReason` | `null` | req Finish Date Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `requestId` | `string` | request Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `retireObject` | `null` | retire Object | 业务扩展属性字段 |
| `reviseDate` | `null` | revise Date (日期/时间) | 业务生命周期节点时间戳 |
| `rfsDate` | `null` | rfs Date (日期/时间) | 业务生命周期节点时间戳 |
| `rtdTestBandwidth` | `null` | rtd Test Bandwidth | 业务扩展属性字段 |
| `rtdTestBandwidthUnit` | `null` | rtd Test Bandwidth Unit | 业务扩展属性字段 |
| `rtdTestBandwidthUnitDesc` | `null` | rtd Test Bandwidth Unit Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `rtdTestOrNot` | `null` | rtd Test Or Not | 业务扩展属性字段 |
| `salesManager` | `null` | 客户经理 (AM) | 负责对接该客户的主管销售人员姓名 |
| `sameGroupIdRelList` | `null` | same Group Id Rel List | 业务扩展属性字段 |
| `sceneLabel` | `null` | scene Label | 业务扩展属性字段 |
| `sdwTunnelCode` | `null` | sdw Tunnel Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `selectCcafApproval` | `null` | select Ccaf Approval | 业务扩展属性字段 |
| `servNbr` | `string` | serv Nbr (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `servNbrList` | `null` | serv Nbr List | 业务扩展属性字段 |
| `serviceManager` | `null` | 服务经理 (SM) | 负责售后与交付协调的交付经理 |
| `serviceType` | `null` | service Type (类型/分类) | 业务所属模式或类别归属 |
| `serviceTypeRemark` | `null` | service Type Remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `setBsdDate` | `null` | set Bsd Date (日期/时间) | 业务生命周期节点时间戳 |
| `settlementPeriod` | `null` | settlement Period | 业务扩展属性字段 |
| `settlementType` | `null` | settlement Type (类型/分类) | 业务所属模式或类别归属 |
| `showUndoPending` | `null` | show Undo Pending | 业务扩展属性字段 |
| `siteId` | `null` | site Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `siteName` | `null` | site Name (名称) | 实体、客户或产品主体名称 |
| `sourceOrderServNbr` | `null` | source Order Serv Nbr (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `specialHandle` | `string` | special Handle | 业务扩展属性字段 |
| `specialPriceingApprovalId` | `null` | special Priceing Approval Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `spinOff` | `null` | spin Off | 业务扩展属性字段 |
| `startDeliveryDate` | `null` | start Delivery Date (日期/时间) | 业务生命周期节点时间戳 |
| `status` | `string` | status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `statusReason` | `null` | status Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `stopReasonDetail` | `null` | stop Reason Detail | 业务扩展属性字段 |
| `stopReasonDetailName` | `null` | stop Reason Detail Name (名称) | 实体、客户或产品主体名称 |
| `stopReasonType` | `null` | stop Reason Type (类型/分类) | 业务所属模式或类别归属 |
| `stopReasonTypeName` | `null` | stop Reason Type Name (名称) | 实体、客户或产品主体名称 |
| `subProdOrdId` | `string` | sub Prod Ord Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `subsId` | `string` | subs Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `subsProductId` | `string` | subs Product Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `supplierCircuitNo` | `null` | supplier Circuit No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `swapCurrencyCode` | `null` | swap Currency Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `swapCurrencyName` | `null` | swap Currency Name (名称) | 实体、客户或产品主体名称 |
| `swapOrderDetail` | `null` | swap Order Detail | 业务扩展属性字段 |
| `tapeWidth` | `null` | tape Width | 业务扩展属性字段 |
| `tapeWidthUnit` | `null` | tape Width Unit | 业务扩展属性字段 |
| `taskInfoVO` | `null` | task Info V O | 业务扩展属性字段 |
| `taxConfirmState` | `null` | tax Confirm State (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `taxCurrency` | `null` | tax Currency | 业务扩展属性字段 |
| `taxCurrencyName` | `null` | tax Currency Name (名称) | 实体、客户或产品主体名称 |
| `taxRateState` | `null` | tax Rate State (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `tenant` | `null` | tenant | 业务扩展属性字段 |
| `tenderInfo` | `null` | tender Info | 业务扩展属性字段 |
| `testAEnd` | `null` | test A End | 业务扩展属性字段 |
| `testDelay` | `null` | test Delay | 业务扩展属性字段 |
| `testExemptApproval` | `null` | test Exempt Approval | 业务扩展属性字段 |
| `testZEnd` | `null` | test Z End | 业务扩展属性字段 |
| `testingApplicationNo` | `null` | testing Application No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `testingApplicationStatus` | `null` | testing Application Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `testingApplicationStatusDesc` | `null` | testing Application Status Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `testingApplicationStatusDescE` | `null` | testing Application Status Desc E | 业务扩展属性字段 |
| `topCustomer` | `string` | top Customer | 业务扩展属性字段 |
| `totalIncome` | `null` | total Income | 业务扩展属性字段 |
| `totalResell` | `null` | total Resell | 业务扩展属性字段 |
| `trunkCircuitId` | `null` | trunk Circuit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `unfiling` | `boolean` | unfiling | 业务扩展属性字段 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `vpnNetNo` | `null` | vpn Net No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `wirelessAccessServiceType` | `null` | wireless Access Service Type (类型/分类) | 业务所属模式或类别归属 |
| `withoutMsaReason` | `null` | without Msa Reason (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `workflowStatus` | `null` | workflow Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `modificationIsRequired` | `null` | modification Is Required | 业务扩展属性字段 |
| `contractCode` | `string` | 合同编码 | 外部系统或财务认定的合同编码 |
| `correlatedProduct` | `null` | correlated Product | 业务扩展属性字段 |
| `firstEstimatedRfs` | `null` | first Estimated Rfs | 业务扩展属性字段 |
| `localBilling` | `null` | local Billing | 业务扩展属性字段 |
| `planSupplierName` | `string` | plan Supplier Name (名称) | 实体、客户或产品主体名称 |
| `serviceScenarios` | `null` | service Scenarios | 业务扩展属性字段 |
| `serviceTypeList` | `null` | service Type List | 业务扩展属性字段 |

### 5. 能力出海与上游系统集成 (iBOSS Integration)

#### 16. `ibossParticipantDetail` (iBOSS 出海商机产品明细表)

- **记录规模**: `22,339` 条记录
- **业务说明**: iBOSS 出海商机项下的细分产品类型、协同内容与业务规模详细记录。
- **关联关系**: 从表。关联 ibossParticipants 主体信息。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `companyBasicId` | `number` | company Basic Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `_syncedAt` | `date` | _synced At | 业务扩展属性字段 |
| `detailInfo` | `object` | detail Info | 业务扩展属性字段 |
| `companyNum` | `string` | company Num | 业务扩展属性字段 |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |

#### 17. `ibossParticipants` (iBOSS 出海商机参与方主体表)

- **记录规模**: `22,146` 条记录
- **业务说明**: 记录在 iBOSS 能力出海协同流程中涉及的各方参与主体（委托方、受托方、承办方、客户等）。
- **关联关系**: 与 ibossParticipantDetail 联合构成出海商机全景。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `companyBasicId` | `number` | company Basic Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `companyId` | `number` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `companyName` | `string` | company Name (名称) | 实体、客户或产品主体名称 |
| `registerStatus` | `string` | register Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `businessRegistrationNumber` | `string` | business Registration Number | 业务扩展属性字段 |
| `processStatus` | `string` | process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `applicantId` | `number` | applicant Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `employeeId` | `number` | employee Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `applicant` | `string` | applicant | 业务扩展属性字段 |
| `userSource` | `string` | user Source | 业务扩展属性字段 |
| `applicantDept` | `string` | applicant Dept | 业务扩展属性字段 |
| `registeredRegion` | `string` | registered Region | 业务扩展属性字段 |
| `enterpriseProcessStatus` | `string` | enterprise Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `enterpriseProcessStatusMeaning` | `string` | enterprise Process Status Meaning | 业务扩展属性字段 |
| `purchaseProcessStatus` | `string` | purchase Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `purchaseProcessStatusMeaning` | `string` | purchase Process Status Meaning | 业务扩展属性字段 |
| `productProcessStatus` | `string` | product Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `productProcessStatusMeaning` | `string` | product Process Status Meaning | 业务扩展属性字段 |
| `expendProcessStatus` | `string` | expend Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `expendProcessStatusMeaning` | `string` | expend Process Status Meaning | 业务扩展属性字段 |
| `mobileProcessStatus` | `string` | mobile Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `mobileProcessStatusMeaning` | `string` | mobile Process Status Meaning | 业务扩展属性字段 |
| `operatorProcessStatus` | `string` | operator Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `operatorProcessStatusMeaning` | `string` | operator Process Status Meaning | 业务扩展属性字段 |
| `channelProcessStatus` | `string` | channel Process Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `channelProcessStatusMeaning` | `string` | channel Process Status Meaning | 业务扩展属性字段 |
| `jegoTripStatus` | `string` | jego Trip Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `jegoTripStatusMeaning` | `string` | jego Trip Status Meaning | 业务扩展属性字段 |
| `companyEnglishName` | `string` | company English Name (名称) | 实体、客户或产品主体名称 |
| `listedCompanyRelatedFlag` | `string` | listed Company Related Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `listedCompanyRelatedMeaning` | `string` | listed Company Related Meaning | 业务扩展属性字段 |
| `custAccessStatus` | `string` | cust Access Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `custAccessStatusMeaning` | `string` | cust Access Status Meaning | 业务扩展属性字段 |
| `blacklistFlag` | `string` | blacklist Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `sourceCode` | `string` | source Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `sourceCodeMeaning` | `string` | source Code Meaning | 业务扩展属性字段 |
| `userSourceCode` | `string` | user Source Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `supplierStatus` | `string` | supplier Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `supplierStatusMeaning` | `string` | supplier Status Meaning | 业务扩展属性字段 |
| `customerStatus` | `string` | customer Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `customerStatusMeaning` | `string` | customer Status Meaning | 业务扩展属性字段 |
| `supplierCertificationStatus` | `string` | supplier Certification Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `supplierCertificationStatusMeaning` | `string` | supplier Certification Status Meaning | 业务扩展属性字段 |
| `registeredRegionMeaning` | `string` | registered Region Meaning | 业务扩展属性字段 |
| `processStatusMeaning` | `string` | process Status Meaning | 业务扩展属性字段 |
| `registeredCountry` | `string` | registered Country (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `_syncedAt` | `date` | _synced At | 业务扩展属性字段 |
| `companyIdString` | `string` | company Id String | 业务扩展属性字段 |
| `unifiedSocialCode` | `string` | unified Social Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `taxRegistrationNumber` | `string` | tax Registration Number | 业务扩展属性字段 |
| `companyNum` | `string` | company Num | 业务扩展属性字段 |
| `custEbsCode` | `string` | cust Ebs Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `supplierEbsCode` | `string` | supplier Ebs Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `parentCompanyId` | `number` | parent Company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `parentCompanyName` | `string` | parent Company Name (名称) | 实体、客户或产品主体名称 |

#### 18. `ibosscustomers` (iBOSS 客户主数据同步表)

- **记录规模**: `42,094` 条记录
- **业务说明**: 从集团上游 iBOSS 系统全量同步的客户基础信息、注册登记、行业分类、认证级别及联系渠道档案。
- **关联关系**: 通过 customerId 与 orders、contracts、ibossParticipants 进行关联校验。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `custId` | `string` | 客户标识 | 客户主键编码 |
| `allowUnion` | `string` | allow Union | 业务扩展属性字段 |
| `city` | `null` | 所在城市 | 企业注册或经营所在主要城市 |
| `commAddr` | `null` | comm Addr | 业务扩展属性字段 |
| `country` | `null` | 国家 / 地区 | 企业注册或运营所在国家/地区中文名称 |
| `createOperName` | `string` | create Oper Name (名称) | 实体、客户或产品主体名称 |
| `createTime` | `string` | create Time (日期/时间) | 业务生命周期节点时间戳 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `custCharacter` | `string` | cust Character | 业务扩展属性字段 |
| `custCharacterName` | `null` | cust Character Name (名称) | 实体、客户或产品主体名称 |
| `custCode` | `null` | cust Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `custIndustry` | `number` | cust Industry | 业务扩展属性字段 |
| `custIndustryName` | `string` | cust Industry Name (名称) | 实体、客户或产品主体名称 |
| `custVerifyId` | `string` | cust Verify Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `customerLabel` | `null` | customer Label | 业务扩展属性字段 |
| `customerLabelName` | `null` | customer Label Name (名称) | 实体、客户或产品主体名称 |
| `customerStatus` | `null` | customer Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `customerStatusName` | `null` | customer Status Name (名称) | 实体、客户或产品主体名称 |
| `customerType` | `number` | customer Type (类型/分类) | 业务所属模式或类别归属 |
| `customerTypeName` | `string` | customer Type Name (名称) | 实体、客户或产品主体名称 |
| `dataBusiType` | `null` | data Busi Type (类型/分类) | 业务所属模式或类别归属 |
| `dataBusiTypeName` | `null` | data Busi Type Name (名称) | 实体、客户或产品主体名称 |
| `dataManagerContactNo` | `null` | data Manager Contact No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `dataManagerId` | `null` | data Manager Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `dataManagerName` | `null` | data Manager Name (名称) | 实体、客户或产品主体名称 |
| `dataSalesUnit` | `null` | data Sales Unit | 业务扩展属性字段 |
| `dataSalesUnitEn` | `null` | data Sales Unit En | 业务扩展属性字段 |
| `dataSalesUnitId` | `null` | data Sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `dataSubCustomerType` | `string` | data Sub Customer Type (类型/分类) | 业务所属模式或类别归属 |
| `dataVerificationFlag` | `number` | data Verification Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `ebsCustCode` | `null` | ebs Cust Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `email` | `null` | 电子邮箱 | 用户注册或联系人的有效电子邮箱账号 |
| `enterpriseId` | `number` | enterprise Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `enterpriseName` | `string` | enterprise Name (名称) | 实体、客户或产品主体名称 |
| `enterpriseUnit` | `null` | enterprise Unit | 业务扩展属性字段 |
| `enterpriseUnitId` | `null` | enterprise Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `isDataVerifyFlag` | `string` | is Data Verify Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `isFlow` | `string` | is Flow | 业务扩展属性字段 |
| `isRelateCompany` | `null` | is Relate Company | 业务扩展属性字段 |
| `isRelateCompanyVal` | `null` | is Relate Company Val | 业务扩展属性字段 |
| `mobileBusiType` | `null` | mobile Busi Type (类型/分类) | 业务所属模式或类别归属 |
| `mobileBusiTypeName` | `null` | mobile Busi Type Name (名称) | 实体、客户或产品主体名称 |
| `mobileManagerId` | `null` | mobile Manager Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `mobileManagerName` | `null` | mobile Manager Name (名称) | 实体、客户或产品主体名称 |
| `mobileSalesUnit` | `null` | mobile Sales Unit | 业务扩展属性字段 |
| `mobileSalesUnitEn` | `null` | mobile Sales Unit En | 业务扩展属性字段 |
| `mobileSalesUnitId` | `null` | mobile Sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `mobileSubCustomerType` | `null` | mobile Sub Customer Type (类型/分类) | 业务所属模式或类别归属 |
| `mobileVerificationFlag` | `number` | mobile Verification Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `netacctId` | `null` | netacct Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `partnerFlag` | `null` | partner Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `province` | `null` | province | 业务扩展属性字段 |
| `registerAddress` | `null` | register Address | 业务扩展属性字段 |
| `registerAreaId` | `string` | register Area Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `registerAreaName` | `string` | register Area Name (名称) | 实体、客户或产品主体名称 |
| `salesUnit` | `string` | sales Unit | 业务扩展属性字段 |
| `salesUnitId` | `null` | sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `shortEnterpriseName` | `null` | short Enterprise Name (名称) | 实体、客户或产品主体名称 |
| `sicIndustry` | `number` | sic Industry | 业务扩展属性字段 |
| `sicIndustryName` | `string` | sic Industry Name (名称) | 实体、客户或产品主体名称 |
| `smsBusiType` | `null` | sms Busi Type (类型/分类) | 业务所属模式或类别归属 |
| `smsBusiTypeName` | `null` | sms Busi Type Name (名称) | 实体、客户或产品主体名称 |
| `smsManagerId` | `null` | sms Manager Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `smsManagerName` | `null` | sms Manager Name (名称) | 实体、客户或产品主体名称 |
| `smsSalesUnit` | `null` | sms Sales Unit | 业务扩展属性字段 |
| `smsSalesUnitEn` | `null` | sms Sales Unit En | 业务扩展属性字段 |
| `smsSalesUnitId` | `null` | sms Sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `smsSubCustomerType` | `null` | sms Sub Customer Type (类型/分类) | 业务所属模式或类别归属 |
| `smsVerificationFlag` | `number` | sms Verification Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `state` | `null` | state (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `taxNum` | `null` | tax Num | 业务扩展属性字段 |
| `topCustomer` | `string` | top Customer | 业务扩展属性字段 |
| `upEnterpriseId` | `number` | up Enterprise Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `updateTime` | `null` | update Time (日期/时间) | 业务生命周期节点时间戳 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `vipCertificationDate` | `null` | vip Certification Date (日期/时间) | 业务生命周期节点时间戳 |
| `vipDesc` | `null` | vip Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `vipDescName` | `null` | vip Desc Name (名称) | 实体、客户或产品主体名称 |
| `vipInvalidDate` | `null` | vip Invalid Date (日期/时间) | 业务生命周期节点时间戳 |
| `vipMonthNum` | `null` | vip Month Num | 业务扩展属性字段 |
| `vipValidityPeriod` | `null` | vip Validity Period | 业务扩展属性字段 |
| `vipValidityPeriodDesc` | `null` | vip Validity Period Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `voiceBusiType` | `null` | voice Busi Type (类型/分类) | 业务所属模式或类别归属 |
| `voiceManagerId` | `null` | voice Manager Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `voiceManagerName` | `null` | voice Manager Name (名称) | 实体、客户或产品主体名称 |
| `voiceSalesUnit` | `null` | voice Sales Unit | 业务扩展属性字段 |
| `voiceSalesUnitEn` | `null` | voice Sales Unit En | 业务扩展属性字段 |
| `voiceSalesUnitId` | `null` | voice Sales Unit Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `voiceSubCustomerType` | `null` | voice Sub Customer Type (类型/分类) | 业务所属模式或类别归属 |
| `voiceVerificationFlag` | `number` | voice Verification Flag (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `webSite` | `null` | web Site (地域/站点) | 地理位置、所在国家城市或电路接入站点 |

### 6. 组织架构与联系人通讯录 (Organization & Contacts)

#### 19. `cmiContacts` (CMI 内部销售与业务团队通讯录)

- **记录规模**: `53` 条记录
- **业务说明**: CMI 内部派驻各区域的客户经理 (AM)、解决方案经理 (SA) 及产品支撑人员名单与联系方式。
- **关联关系**: 通过 UnitCode / Region 对应相关海外经营单元。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `role` | `string` | 用户角色 | 系统角色权限：user (普通用户) / admin (管理员) |
| `name` | `string` | 姓名 / 名称 | 用户姓名、企业全称或主体名称 |
| `department` | `string` | 所属部门 | 人员所在业务部门或事业部 |
| `position` | `string` | 担任职务 | 人员在企业内担任的岗位职务 |
| `staffNo` | `string` | staff No (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `phoneNumber` | `string` | 联系电话 | 个人或部门联系电话 |
| `email` | `string` | 电子邮箱 | 用户注册或联系人的有效电子邮箱账号 |
| `City` | `string` | 所在城市 | 企业注册或经营所在主要城市 |
| `直属上级` | `string` | 直属上级 | 业务专有字段：直属上级 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |

#### 20. `cmibranches` (CMI 海外分支机构表)

- **记录规模**: `87` 条记录
- **业务说明**: 中国移动国际（CMI）在海外设立的分支子公司、办事处及代表处的官方基础信息。
- **关联关系**: 通过 region / countryCode 与 keyGlobalFamilyTree 关联进行本地化服务匹配。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `columnDesc_zh` | `string` | column Desc_zh | 业务扩展属性字段 |
| `columnValue` | `string` | column Value | 业务扩展属性字段 |
| `columnDesc` | `string` | column Desc (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `status` | `string` | status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `RegionCode` | `string` | 大区编码 | 大区标识代码 |
| `UnitCode` | `string` | 经营单元代码 | 海外经营单位在财务组织树的编码 |

#### 21. `custContacts` (外部客户关键联系人明细表)

- **记录规模**: `117,304` 条记录
- **业务说明**: 企业客户方的采购主管、CTO、技术负责人及日常商务对接人通讯录档案。
- **关联关系**: 通过 custId / customerName 关联企业客户主体。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `ultimateGID` | `string` | ultimate G I D (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `companyGId` | `string` | company G Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `duns` | `string` | 邓白氏编码 (DUNS) | 邓白氏 9 位全球企业唯一身份标识 |
| `contactId` | `string` | contact Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `prefix` | `null` | prefix | 业务扩展属性字段 |
| `firstName` | `string` | first Name (名称) | 实体、客户或产品主体名称 |
| `middleName` | `string` | middle Name (名称) | 实体、客户或产品主体名称 |
| `lastName` | `string` | last Name (名称) | 实体、客户或产品主体名称 |
| `title` | `string` | 访问页面标题 | 浏览器 Document Title |
| `directPhoneType` | `null` | direct Phone Type (类型/分类) | 业务所属模式或类别归属 |
| `facebookProfile` | `string` | facebook Profile | 业务扩展属性字段 |
| `linkedInProfileId` | `string` | linked In Profile Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `linkedInPublicProfileUrl` | `null` | linked In Public Profile Url | 业务扩展属性字段 |
| `twitterProfile` | `string` | twitter Profile | 业务扩展属性字段 |
| `functionId` | `string` | function Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `functionName` | `string` | function Name (名称) | 实体、客户或产品主体名称 |
| `shortFunctionName` | `string` | short Function Name (名称) | 实体、客户或产品主体名称 |
| `phoneNumber` | `string` | 联系电话 | 个人或部门联系电话 |
| `contactName` | `string` | 联系人姓名 | 业务对接人员姓名 |

#### 22. `keyCMIContacts` (要客专属对接团队配置表)

- **记录规模**: `140` 条记录
- **业务说明**: 针对战略重点要客专门指定的 CMI 牵头人、支撑专员与服务专班联系人绑定关系。
- **关联关系**: 通过 GID / gid 关联 keycustomer 主表。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `GID` | `string` | 要客统一标识 (GID) | 中国移动统一分配的集团战略要客唯一标识 GID |
| `PID` | `string` | 父级要客标识 (PID) | 上级归属要客集团标识，顶级集团该值为 0 或同 GID |
| `role` | `string` | 用户角色 | 系统角色权限：user (普通用户) / admin (管理员) |
| `cmiContactId` | `ObjectID` | cmi Contact Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |

### 7. 线下活动与拓展商机支撑 (Event & Offline Participants)

#### 23. `excelParticipantContacts` (参会企业联系人明细表)

- **记录规模**: `26,618` 条记录
- **业务说明**: 参会企业代表的姓名、职务、电话、邮箱及对接洽谈记录。
- **关联关系**: 外键关联 excelParticipants 主体。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `participantCompanyName` | `string` | participant Company Name (名称) | 实体、客户或产品主体名称 |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `contactName` | `string` | 联系人姓名 | 业务对接人员姓名 |
| `position` | `string` | 担任职务 | 人员在企业内担任的岗位职务 |
| `contactType` | `string` | contact Type (类型/分类) | 业务所属模式或类别归属 |
| `contactPhone` | `string` | 联系人电话 | 对接人员手机号码或直线座机 |
| `email` | `string` | 电子邮箱 | 用户注册或联系人的有效电子邮箱账号 |
| `cmiContactPerson` | `string` | cmi Contact Person | 业务扩展属性字段 |
| `isDefault` | `number` | is Default | 业务扩展属性字段 |
| `isEnabled` | `number` | is Enabled | 业务扩展属性字段 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `companyCode` | `string` | company Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `afterSalesServiceEscalationLevel` | `string` | after Sales Service Escalation Level | 业务扩展属性字段 |

#### 24. `excelParticipantCustMapping` (参会企业与系统客户映射表)

- **记录规模**: `10,818` 条记录
- **业务说明**: 记录线下参会名单与系统内部已签约/存量客户档案之间的对齐映射标记。
- **关联关系**: 将 excelParticipants 关联到 contracts/orders。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `companyNum` | `string` | company Num | 业务扩展属性字段 |
| `companyName` | `string` | company Name (名称) | 实体、客户或产品主体名称 |
| `extCustId` | `string` | ext Cust Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `extCustNum` | `number` | ext Cust Num | 业务扩展属性字段 |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |

#### 25. `excelParticipants` (线下展会与拓展参会企业主体表)

- **记录规模**: `22,363` 条记录
- **业务说明**: 整理录入历届中资企业出海大会、展会论坛及线下沙龙参会企业名录与出海意向。
- **关联关系**: 通过企业名称与 excelParticipantContacts 及系统内客户主档案进行匹配。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `companyName` | `string` | company Name (名称) | 实体、客户或产品主体名称 |
| `companyCode` | `string` | company Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `customerEbsCode` | `string` | customer Ebs Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `certifiedCountryRegion` | `string` | certified Country Region | 业务扩展属性字段 |
| `companyName_1` | `string` | company Name_1 | 业务扩展属性字段 |
| `isBlacklist` | `string` | is Blacklist | 业务扩展属性字段 |
| `registrationCountryRegion` | `string` | registration Country Region | 业务扩展属性字段 |
| `registrationAddress` | `string` | registration Address | 业务扩展属性字段 |
| `businessLicenseNumber` | `string` | business License Number | 业务扩展属性字段 |
| `listedCompanyRelatedParty` | `string` | listed Company Related Party | 业务扩展属性字段 |
| `dataSource` | `string` | data Source | 业务扩展属性字段 |
| `participantCertificationStatus` | `string` | participant Certification Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `procurementLineStatus` | `string` | procurement Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `ictsLineStatus` | `string` | icts Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `standardProductLineStatus` | `string` | standard Product Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `simpleExpenditureLineStatus` | `string` | simple Expenditure Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `mobileDeptLineStatus` | `string` | mobile Dept Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `operatorDeptLineStatus` | `string` | operator Dept Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `channelLineStatus` | `string` | channel Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `jegoTripMerchantLineStatus` | `string` | jego Trip Merchant Line Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `customerAccessStatus` | `string` | customer Access Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `supplierStatus` | `string` | supplier Status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `companyRegistrationDate` | `number` | company Registration Date (日期/时间) | 业务生命周期节点时间戳 |
| `communicationAddress` | `string` | communication Address | 业务扩展属性字段 |
| `isCommunicationAddressSameAsRegistration` | `string` | is Communication Address Same As Registration | 业务扩展属性字段 |
| `companyPhoneNumber` | `string` | company Phone Number | 业务扩展属性字段 |
| `companyFaxNumber` | `string` | company Fax Number | 业务扩展属性字段 |
| `companyEmail` | `string` | company Email | 业务扩展属性字段 |
| `officialWebsite` | `string` | official Website (地域/站点) | 地理位置、所在国家城市或电路接入站点 |
| `isEmailNotification` | `string` | is Email Notification | 业务扩展属性字段 |
| `dataSource_1` | `string` | data Source_1 | 业务扩展属性字段 |
| `procurementCategory` | `string` | procurement Category (类型/分类) | 业务所属模式或类别归属 |
| `procurementCategoryDescription` | `string` | procurement Category Description | 业务扩展属性字段 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `supplierEbsCode` | `string` | supplier Ebs Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `ictsLineSubmitTime` | `number` | icts Line Submit Time (日期/时间) | 业务生命周期节点时间戳 |
| `ictsLineApprovalTime` | `number` | icts Line Approval Time (日期/时间) | 业务生命周期节点时间戳 |
| `undertaker` | `string` | undertaker | 业务扩展属性字段 |
| `undertakerDept` | `string` | undertaker Dept | 业务扩展属性字段 |
| `productLineSubmitTime` | `number` | product Line Submit Time (日期/时间) | 业务生命周期节点时间戳 |
| `productLineApprovalTime` | `number` | product Line Approval Time (日期/时间) | 业务生命周期节点时间戳 |
| `unifiedSocialCreditCode` | `string` | unified Social Credit Code (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `companyNameAuxiliary` | `string` | company Name Auxiliary | 业务扩展属性字段 |

### 8. 数据治理与列映射配置 (Data Governance & Dynamic Mappings)

#### 26. `columnMappingCMIContacts` (CMI 联系人动态列配置表)

- **记录规模**: `9` 条记录
- **业务说明**: 配置 CMI 销售团队通讯录表格的列字段与展示逻辑。
- **关联关系**: 控制 cmiContacts 前端渲染。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `cmiColumnName` | `string` | cmi Column Name (名称) | 实体、客户或产品主体名称 |
| `type` | `string` | 令牌用途类型 | 如 refresh, resetPassword, verifyEmail |
| `columnName` | `string` | column Name (名称) | 实体、客户或产品主体名称 |
| `cmccColumnName` | `string` | cmcc Column Name (名称) | 实体、客户或产品主体名称 |
| `columnType` | `string` | column Type (类型/分类) | 业务所属模式或类别归属 |
| `fieldMeaning` | `string` | field Meaning | 业务扩展属性字段 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `sampleData` | `string` | sample Data | 业务扩展属性字段 |

#### 27. `columnMappingFamilyTree` (家族树表格动态列配置表)

- **记录规模**: `42` 条记录
- **业务说明**: 配置全球要客家族树在前端展示的列名、中英文标题、显示宽度、排序权重及数据类型。
- **关联关系**: 控制 keyGlobalFamilyTree 在前端表格界面的动态渲染规则。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `cmiColumnName` | `string` | cmi Column Name (名称) | 实体、客户或产品主体名称 |
| `type` | `string` | 令牌用途类型 | 如 refresh, resetPassword, verifyEmail |
| `columnName` | `string` | column Name (名称) | 实体、客户或产品主体名称 |
| `cmccColumnName` | `string` | cmcc Column Name (名称) | 实体、客户或产品主体名称 |
| `columnType` | `string` | column Type (类型/分类) | 业务所属模式或类别归属 |
| `fieldMeaning` | `string` | field Meaning | 业务扩展属性字段 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `sampleData` | `string` | sample Data | 业务扩展属性字段 |
| `remark` | `string` | remark (描述/备注) | 审批批注意见、补充说明或备注原因 |

#### 28. `columnMappingGIDCust` (GID客户关联动态列配置表)

- **记录规模**: `8` 条记录
- **业务说明**: 配置要客 GID 与签约客户名称关联映射表的字段展示规则。
- **关联关系**: 控制 keyFamilyTreeCustMapping 前端渲染。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `cmiColumnName` | `string` | cmi Column Name (名称) | 实体、客户或产品主体名称 |
| `type` | `string` | 令牌用途类型 | 如 refresh, resetPassword, verifyEmail |
| `columnName` | `string` | column Name (名称) | 实体、客户或产品主体名称 |
| `cmccColumnName` | `string` | cmcc Column Name (名称) | 实体、客户或产品主体名称 |
| `columnType` | `string` | column Type (类型/分类) | 业务所属模式或类别归属 |
| `fieldMeaning` | `string` | field Meaning | 业务扩展属性字段 |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |

#### 29. `columnMappingKeyContacts` (要客联系人动态列配置表)

- **记录规模**: `18` 条记录
- **业务说明**: 配置要客联系人前端表格的列映射与显示规则。
- **关联关系**: 控制 keyCMIContacts 前端渲染。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `cmiColumnName` | `string` | cmi Column Name (名称) | 实体、客户或产品主体名称 |
| `type` | `string` | 令牌用途类型 | 如 refresh, resetPassword, verifyEmail |
| `columnName` | `string` | column Name (名称) | 实体、客户或产品主体名称 |
| `cmccColumnName` | `string` | cmcc Column Name (名称) | 实体、客户或产品主体名称 |
| `columnType` | `string` | column Type (类型/分类) | 业务所属模式或类别归属 |
| `fieldMeaning` | `string` | field Meaning | 业务扩展属性字段 |
| `remark` | `null` | remark (描述/备注) | 审批批注意见、补充说明或备注原因 |
| `sampleData` | `null` | sample Data | 业务扩展属性字段 |

#### 30. `datagovernancelogs` (数据治理变更审计日志表)

- **记录规模**: `193` 条记录
- **业务说明**: 记录运营人员在前端表格中对各集合字段进行的治理修改、历史值变动、操作人和变更原因。
- **关联关系**: 通过 targetCollection 与 targetId 追溯关联被修改的数据文档。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `custId` | `string` | 客户标识 | 客户主键编码 |
| `rootGID` | `string` | root G I D (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `companyId` | `string` | company Id (编号/标识) | 系统唯一业务流水号、关联编码或外键 ID |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `notes` | `string` | notes | 业务扩展属性字段 |
| `staff` | `string` | staff | 业务扩展属性字段 |
| `status` | `string` | status (状态/标记) | 业务流程流转状态枚举或控制标记 |
| `updateAt` | `date` | update At | 业务扩展属性字段 |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |

### 9. 埋点监控与系统分析 (Audit & Page Views)

#### 31. `pageViewLog` (页面访问流水明细日志表)

- **记录规模**: `175` 条记录
- **业务说明**: 记录平台用户的每一次页面访问行为（包括完整 URL、路由、用户账号、IP 地址、UA、时间等）。
- **关联关系**: 通过 userEmail 关联 users.email。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `fullUrl` | `string` | 完整访问 URL | 用户请求的浏览器完整网址路径（含 Query 参数） |
| `nameCn` | `string` | 中文标准全称 | 企业在工商登记的中文标准法定全称 |
| `abbr` | `string` | 品牌英文缩写 | 企业通用英文商业品牌名称缩写 |
| `title` | `string` | 访问页面标题 | 浏览器 Document Title |
| `userEmail` | `string` | 访问用户账号 | 操作者的登录邮箱，未登录为空 |
| `userName` | `string` | 访问用户姓名 | 操作人员真实姓名 |
| `ip` | `string` | 用户客户端 IP | 访问发起的来源网络 IPv4/IPv6 地址 |
| `userAgent` | `string` | 终端浏览器 UA | 用户的浏览器与操作系统 User-Agent 字符串 |
| `referrer` | `string` | 前置来源 Referrer | 跳转至当前页面前的前置网页 URL |
| `path` | `string` | 页面路由路径 | 前端标准化路由地址（如 /keyGlobalFamilyTree） |
| `visitedAt` | `date` | 访问发生时间 | 页面请求访问被记录的时间戳 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |

#### 32. `pageViewStats` (页面访问趋势汇总统计表)

- **记录规模**: `25` 条记录
- **业务说明**: 按页面路径维度聚合的访问统计大盘（包含各页面的历史总 PV、独立 UV、最后访问人及最新访问时间）。
- **关联关系**: 由 pageViewLog 聚合更新或前端并发更新。

| 字段名 | 数据类型 | 中文名称 | 业务解释与关联说明 |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectID` | 主键 ID | MongoDB 文档唯一标识 ObjectId |
| `path` | `string` | 页面路由路径 | 前端标准化路由地址（如 /keyGlobalFamilyTree） |
| `__v` | `number` | 版本号 | Mongoose 内部文档乐观锁版本控制字段 |
| `abbr` | `string` | 品牌英文缩写 | 企业通用英文商业品牌名称缩写 |
| `createdAt` | `date` | 创建时间 | 记录首次入库时间（UTC） |
| `lastUserEmail` | `string` | 最后访问人账号 | 最后一位打开该页面的账号邮箱 |
| `lastUserName` | `string` | 最后访问人姓名 | 最后一位打开该页面的操作者 |
| `lastVisitedAt` | `date` | 最后访问时间 | 该页面最后一次被用户打开的时间 |
| `nameCn` | `string` | 中文标准全称 | 企业在工商登记的中文标准法定全称 |
| `pv` | `number` | 累计浏览量 (PV) | 该路由页面的历史累计浏览总次数 |
| `title` | `string` | 访问页面标题 | 浏览器 Document Title |
| `updatedAt` | `date` | 更新时间 | 记录最后一次变更更新时间（UTC） |
| `uv` | `number` | 累计访客数 (UV) | 该路由页面的去重访问独立用户数 |



## Error Handling

The app has a centralized error handling mechanism.

Controllers should try to catch the errors and forward them to the error handling middleware (by calling `next(error)`). For convenience, you can also wrap the controller inside the catchAsync utility wrapper, which forwards the error.

```javascript
const catchAsync = require('../utils/catchAsync');

const controller = catchAsync(async (req, res) => {
  // this error will be forwarded to the error handling middleware
  throw new Error('Something wrong happened');
});
```

The error handling middleware sends an error response, which has the following format:

```json
{
  "code": 404,
  "message": "Not found"
}
```

When running in development mode, the error response also contains the error stack.

The app has a utility ApiError class to which you can attach a response code and a message, and then throw it from anywhere (catchAsync will catch it).

For example, if you are trying to get a user from the DB who is not found, and you want to send a 404 error, the code should look something like:

```javascript
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
};
```

## Validation

Request data is validated using [Joi](https://joi.dev/). Check the [documentation](https://joi.dev/api/) for more details on how to write Joi validation schemas.

The validation schemas are defined in the `src/validations` directory and are used in the routes by providing them as parameters to the `validate` middleware.

```javascript
const express = require('express');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', validate(userValidation.createUser), userController.createUser);
```

## Authentication

To require authentication for certain routes, you can use the `auth` middleware.

```javascript
const express = require('express');
const auth = require('../../middlewares/auth');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', auth(), userController.createUser);
```

These routes require a valid JWT access token in the Authorization request header using the Bearer schema. If the request does not contain a valid access token, an Unauthorized (401) error is thrown.

**Generating Access Tokens**:

An access token can be generated by making a successful call to the register (`POST /v1/auth/register`) or login (`POST /v1/auth/login`) endpoints. The response of these endpoints also contains refresh tokens (explained below).

An access token is valid for 30 minutes. You can modify this expiration time by changing the `JWT_ACCESS_EXPIRATION_MINUTES` environment variable in the .env file.

**Refreshing Access Tokens**:

After the access token expires, a new access token can be generated, by making a call to the refresh token endpoint (`POST /v1/auth/refresh-tokens`) and sending along a valid refresh token in the request body. This call returns a new access token and a new refresh token.

A refresh token is valid for 30 days. You can modify this expiration time by changing the `JWT_REFRESH_EXPIRATION_DAYS` environment variable in the .env file.

## Authorization

The `auth` middleware can also be used to require certain rights/permissions to access a route.

```javascript
const express = require('express');
const auth = require('../../middlewares/auth');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', auth('manageUsers'), userController.createUser);
```

In the example above, an authenticated user can access this route only if that user has the `manageUsers` permission.

The permissions are role-based. You can view the permissions/rights of each role in the `src/config/roles.js` file.

If the user making the request does not have the required permissions to access this route, a Forbidden (403) error is thrown.

## Logging

Import the logger from `src/config/logger.js`. It is using the [Winston](https://github.com/winstonjs/winston) logging library.

Logging should be done according to the following severity levels (ascending order from most important to least important):

```javascript
const logger = require('<path to src>/config/logger');

logger.error('message'); // level 0
logger.warn('message'); // level 1
logger.info('message'); // level 2
logger.http('message'); // level 3
logger.verbose('message'); // level 4
logger.debug('message'); // level 5
```

In development mode, log messages of all severity levels will be printed to the console.

In production mode, only `info`, `warn`, and `error` logs will be printed to the console.\
It is up to the server (or process manager) to actually read them from the console and store them in log files.\
This app uses pm2 in production mode, which is already configured to store the logs in log files.

Note: API request information (request url, response code, timestamp, etc.) are also automatically logged (using [morgan](https://github.com/expressjs/morgan)).

## Custom Mongoose Plugins

The app also contains 2 custom mongoose plugins that you can attach to any mongoose model schema. You can find the plugins in `src/models/plugins`.

```javascript
const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const userSchema = mongoose.Schema(
  {
    /* schema definition here */
  },
  { timestamps: true }
);

userSchema.plugin(toJSON);
userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);
```

### toJSON

The toJSON plugin applies the following changes in the toJSON transform call:

- removes \_\_v, createdAt, updatedAt, and any schema path that has private: true
- replaces \_id with id

### paginate

The paginate plugin adds the `paginate` static method to the mongoose schema.

Adding this plugin to the `User` model schema will allow you to do the following:

```javascript
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};
```

The `filter` param is a regular mongo filter.

The `options` param can have the following (optional) fields:

```javascript
const options = {
  sortBy: 'name:desc', // sort order
  limit: 5, // maximum results per page
  page: 2, // page number
};
```

The plugin also supports sorting by multiple criteria (separated by a comma): `sortBy: name:desc,role:asc`

The `paginate` method returns a Promise, which fulfills with an object having the following properties:

```json
{
  "results": [],
  "page": 2,
  "limit": 5,
  "totalPages": 10,
  "totalResults": 48
}
```

## Linting

Linting is done using [ESLint](https://eslint.org/) and [Prettier](https://prettier.io).

In this app, ESLint is configured to follow the [Airbnb JavaScript style guide](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base) with some modifications. It also extends [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) to turn off all rules that are unnecessary or might conflict with Prettier.

To modify the ESLint configuration, update the `.eslintrc.json` file. To modify the Prettier configuration, update the `.prettierrc.json` file.

To prevent a certain file or directory from being linted, add it to `.eslintignore` and `.prettierignore`.

To maintain a consistent coding style across different IDEs, the project contains `.editorconfig`

## Contributing

Contributions are more than welcome! Please check out the [contributing guide](CONTRIBUTING.md).

## Inspirations

- [danielfsousa/express-rest-es2017-boilerplate](https://github.com/danielfsousa/express-rest-es2017-boilerplate)
- [madhums/node-express-mongoose](https://github.com/madhums/node-express-mongoose)
- [kunalkapadia/express-mongoose-es6-rest-api](https://github.com/kunalkapadia/express-mongoose-es6-rest-api)

## License

[MIT](LICENSE)
