#!/bin/bash
# 自动部署脚本，用于在远程服务器上拉取代码并自动运行生效

# 确保脚本遇到错误时立即退出
set -e

# 补全非交互式环境下的环境变量 PATH（确保能找到 pm2 命令）
export PATH=$PATH:/home/tristan/.npm-global/bin

echo "=== 开始自动部署更新 ==="

# 1. 拉取 GitHub 最新代码并强制覆盖本地
echo "1. 正在从 GitHub 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 2. 重新打包前端项目
echo "2. 正在重新编译前端项目..."
cd react-admin-frontend
npm run build
cd ..

# 3. 重启后端 PM2 进程
echo "3. 正在重启后端服务..."
# 如果 backend-api 进程已经在运行，则重启；否则根据配置文件启动
if pm2 show backend-api >/dev/null 2>&1; then
  pm2 restart backend-api
else
  pm2 start ecosystem.config.json --only backend-api
fi

echo "=== 部署更新完成并已运行生效！ ==="
