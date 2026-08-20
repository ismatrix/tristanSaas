/**
 * MongoDB 自动化数据备份脚本
 * 
 * 核心规则：
 * 1. 每晚 23:00 执行备份
 * 2. 排除所有 DNB 开头的表（DNBFamilyTree-*、DNBWebFamilyTree-*、dnbCompanyDetail、dnb_cnpc 等）
 * 3. dmcBR、dmcTCV 每周备份一次，生成独立压缩包
 * 4. 每日备份：备份所有非 DNB、非 DMC 核心业务表并独立压缩
 * 5. 自动维护清理历史备份（每日备份保留 14 天，每周 DMC 备份保留 8 周）
 * 
 * 使用方式：
 *   node scripts/backup_mongodb.js --auto     (供 crontab 调度：每日执行日常备份，每周日追加执行 DMC 周备份)
 *   node scripts/backup_mongodb.js --type=daily   (手动执行日常业务表备份)
 *   node scripts/backup_mongodb.js --type=weekly  (手动执行 dmcBR / dmcTCV 独立周备份)
 *   node scripts/backup_mongodb.js --type=all     (同时执行日常备份与 DMC 周备份)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// 1. 加载项目 .env 配置
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
const DB_NAME = (MONGODB_URL.split('/').pop() || 'node-boilerplate').split('?')[0];

// 2. 确定备份存储根目录
let BACKUP_BASE_DIR = process.env.BACKUP_ROOT;
if (!BACKUP_BASE_DIR) {
  if (fs.existsSync('/Users/tristan')) {
    BACKUP_BASE_DIR = '/Users/tristan/Backups/TristanSaasMongoBackup';
  } else if (fs.existsSync('/home/tristan')) {
    BACKUP_BASE_DIR = '/home/tristan/workspaces/TristanSaasMongoBackup';
  } else {
    BACKUP_BASE_DIR = path.resolve(__dirname, '../backups');
  }
}

const DAILY_DIR = path.join(BACKUP_BASE_DIR, 'daily');
const WEEKLY_DIR = path.join(BACKUP_BASE_DIR, 'weekly');
const LOG_FILE = path.join(BACKUP_BASE_DIR, 'backup.log');

// 3. 寻找 mongodump 执行程序路径
function getMongodumpBin() {
  const candidatePaths = [
    process.env.MONGODUMP_BIN,
    '/opt/homebrew/bin/mongodump',
    '/usr/local/bin/mongodump',
    '/usr/bin/mongodump',
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const whichRes = execSync('which mongodump', { encoding: 'utf-8' }).trim();
    if (whichRes && fs.existsSync(whichRes)) return whichRes;
  } catch (e) {
    // ignore
  }

  return 'mongodump';
}

const MONGODUMP_BIN = getMongodumpBin();

// 4. 日志记录辅助函数
function log(msg) {
  const now = new Date();
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const logLine = `[${timeStr}] ${msg}`;
  console.log(logLine);
  try {
    if (!fs.existsSync(BACKUP_BASE_DIR)) {
      fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logLine + '\n', 'utf-8');
  } catch (err) {
    console.error('写入备份日志失败:', err.message);
  }
}

// 5. 格式化文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 6. 清理过期备份
function cleanOldBackups(dirPath, maxKeep = 14) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.tar.gz') || f.endsWith('.tar.Z') || f.endsWith('.zip'))
      .map(f => ({
        name: f,
        fullPath: path.join(dirPath, f),
        time: fs.statSync(path.join(dirPath, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      const toDelete = files.slice(maxKeep);
      toDelete.forEach(item => {
        try {
          fs.unlinkSync(item.fullPath);
          log(`  [清理] 已删除过期历史备份: ${item.name}`);
        } catch (e) {
          log(`  [警告] 删除历史备份失败: ${item.name} (${e.message})`);
        }
      });
    }
  } catch (err) {
    log(`  [错误] 清理目录 ${dirPath} 历史备份异常: ${err.message}`);
  }
}

// 7. 执行单个集合组的导出与压缩
async function dumpAndCompressCollections({
  targetDir,
  targetCollections,
  backupPrefix,
  db,
}) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const tempDumpFolder = path.join(targetDir, `_temp_${backupPrefix}_${timestamp}`);
  const archiveName = `${backupPrefix}_${timestamp}.tar.gz`;
  const archivePath = path.join(targetDir, archiveName);

  if (fs.existsSync(tempDumpFolder)) {
    fs.rmSync(tempDumpFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDumpFolder, { recursive: true });

  log(`================================================================`);
  log(`开始执行【${backupPrefix}】导出备份 (目标集合数: ${targetCollections.length})`);
  log(`输出目标包: ${archivePath}`);

  let totalDocs = 0;
  for (const colName of targetCollections) {
    try {
      const count = await db.collection(colName).countDocuments();
      totalDocs += count;
      log(`  -> 正在导出集合 [${colName}] (记录数: ${count})...`);

      const dumpCmd = `"${MONGODUMP_BIN}" --uri="${MONGODB_URL}" --db="${DB_NAME}" --collection="${colName}" --out="${tempDumpFolder}" --quiet`;
      execSync(dumpCmd, { stdio: 'pipe' });
    } catch (colErr) {
      log(`  [警告] 导出集合 [${colName}] 失败: ${colErr.message}`);
    }
  }

  // 压缩并清理临时目录
  log(`正在打包压缩为 .tar.gz...`);
  try {
    const tarCmd = `tar -czf "${archivePath}" -C "${tempDumpFolder}" "${DB_NAME}"`;
    execSync(tarCmd, { stdio: 'pipe' });
  } catch (tarErr) {
    log(`[错误] 压缩打包失败: ${tarErr.message}`);
    throw tarErr;
  } finally {
    try {
      fs.rmSync(tempDumpFolder, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }

  const stat = fs.statSync(archivePath);
  log(`【${backupPrefix}】备份完成！归档包大小: ${formatBytes(stat.size)}，总记录数: ${totalDocs}`);
  return { archivePath, size: stat.size, totalDocs };
}

// 8. 主入口函数
async function main() {
  const args = process.argv.slice(2);
  let runDaily = false;
  let runWeekly = false;

  const autoMode = args.includes('--auto');
  const typeArg = (args.find(a => a.startsWith('--type=')) || '').split('=')[1];

  if (autoMode) {
    // --auto 模式：每日必定执行日常备份；周日 (day === 0) 额外执行 DMC 周备份
    runDaily = true;
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0) {
      runWeekly = true;
    }
  } else if (typeArg === 'daily') {
    runDaily = true;
  } else if (typeArg === 'weekly') {
    runWeekly = true;
  } else if (typeArg === 'all') {
    runDaily = true;
    runWeekly = true;
  } else {
    // 默认执行 daily
    runDaily = true;
  }

  log(`----------------------------------------------------------------`);
  log(`MongoDB 自动备份任务启动 (DB: ${DB_NAME}, URL: ${MONGODB_URL.replace(/\/\/.*@/, '//***@')})`);
  log(`计划执行: ${[runDaily && '每日业务备份', runWeekly && '每周DMC独立备份'].filter(Boolean).join(' + ')}`);

  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // 获取全量集合列表
    const allCollectionsObj = await db.listCollections().toArray();
    const allCollectionNames = allCollectionsObj.map(c => c.name).sort();

    // 规则过滤分类：
    // 1. 排除所有以 DNB/dnb/diffDNB 开头的集合
    const isDnbCollection = (name) => {
      const n = name.trim().toLowerCase();
      return n.startsWith('dnb') || n.startsWith('diffdnb');
    };

    // 2. 判定是否为 DMC 专项集合
    const isDmcCollection = (name) => {
      return name === 'dmcBR' || name === 'dmcTCV';
    };

    // 筛选出日常业务表（非 DNB 且非 DMC）
    const dailyCollections = allCollectionNames.filter(name => !isDnbCollection(name) && !isDmcCollection(name));

    // 筛选出 DMC 周备份表
    const weeklyDmcCollections = allCollectionNames.filter(name => isDmcCollection(name));

    const excludedDnbCollections = allCollectionNames.filter(name => isDnbCollection(name));

    log(`集合统计分类:`);
    log(`  • 核心日常业务表: ${dailyCollections.length} 个`);
    log(`  • DMC 周备份表: ${weeklyDmcCollections.length} 个 (${weeklyDmcCollections.join(', ') || '无'})`);
    log(`  • 已排除的 DNB 表: ${excludedDnbCollections.length} 个`);

    // 1. 执行日常备份
    if (runDaily && dailyCollections.length > 0) {
      await dumpAndCompressCollections({
        targetDir: DAILY_DIR,
        targetCollections: dailyCollections,
        backupPrefix: 'daily_backup',
        db,
      });
      // 保持最近 14 份日常备份
      cleanOldBackups(DAILY_DIR, 14);
    }

    // 2. 执行每周 DMC 独立备份
    if (runWeekly && weeklyDmcCollections.length > 0) {
      await dumpAndCompressCollections({
        targetDir: WEEKLY_DIR,
        targetCollections: weeklyDmcCollections,
        backupPrefix: 'dmc_weekly_backup',
        db,
      });
      // 保持最近 8 份每周备份
      cleanOldBackups(WEEKLY_DIR, 8);
    }

    log(`所有指定备份流程全部顺利完成！`);
    log(`================================================================\n`);
  } catch (err) {
    log(`[FATAL] 备份任务发生严重异常: ${err.message}\n${err.stack}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
