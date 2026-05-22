#!/bin/bash
# 每天中午 12:00 导出 mongodb node-boilerplate 的所有表为 JSON 备份
# 按照 0-9 循环存放，保留最近 10 天

# 显式设置环境变量 PATH，确保 crontab 运行时能够找到 docker 命令
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

DB_NAME="node-boilerplate"
BACKUP_ROOT="/Users/tristan/Workspaces/TristanSaasMongoBackup"

# 使用自1970年以来的天数对10取模，生成0-9的循环子目录
DAYS_SINCE_EPOCH=$(expr $(date +%s) / 86400)
DIR_IDX=$(expr $DAYS_SINCE_EPOCH % 10)
BACKUP_DIR="$BACKUP_ROOT/$DIR_IDX"

mkdir -p "$BACKUP_DIR"

# 清空该槽位旧的备份文件
rm -f "$BACKUP_DIR"/*.json "$BACKUP_DIR"/*.tar.Z

# 获取所有集合（表）名称
COLS=$(docker exec mongodb mongosh "$DB_NAME" --quiet --eval "db.getCollectionNames().join(' ')")

echo "[$(date)] 备份开始... 将存入目录: $BACKUP_DIR" > "$BACKUP_DIR/backup.log"

for COL in $COLS; do
    echo "正在导出表: $COL" >> "$BACKUP_DIR/backup.log"
    # 使用 mongoexport 导出，并添加 --jsonArray 以便于恢复或读取
    docker exec mongodb mongoexport --db "$DB_NAME" --collection "$COL" --jsonArray > "$BACKUP_DIR/$COL.json"
done

echo "[$(date)] 备份完成，开始压缩..." >> "$BACKUP_DIR/backup.log"

cd "$BACKUP_DIR" || exit
TIMESTAMP=$(date +%Y%m%d%H%M%S)
tar -cZf "backup_${TIMESTAMP}.tar.Z" *.json
rm -f *.json

echo "[$(date)] 压缩完成。" >> "$BACKUP_DIR/backup.log"
