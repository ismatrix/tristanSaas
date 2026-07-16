const fs = require('fs');

function compare() {
  const localLogPath = '/Users/tristan/.gemini/antigravity-ide/brain/5b3b19ae-9ac4-42a1-a06c-b126b71c68e0/.system_generated/tasks/task-502.log';
  const prodLogPath = '/Users/tristan/.gemini/antigravity-ide/brain/5b3b19ae-9ac4-42a1-a06c-b126b71c68e0/.system_generated/tasks/task-513.log';

  function parseStats(logPath) {
    const content = fs.readFileSync(logPath, 'utf8').trim();
    const lines = content.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      const cleanLine = line.replace(/^\d+:\s*/, '');
      if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
        return JSON.parse(cleanLine);
      }
    }
    throw new Error('未在日志中找到 JSON 数组: ' + logPath);
  }

  const localStats = parseStats(localLogPath);
  const prodStats = parseStats(prodLogPath);

  const localMap = new Map(localStats.map(item => [item.name, item]));
  const prodMap = new Map(prodStats.map(item => [item.name, item]));

  const allNames = new Set([...localMap.keys(), ...prodMap.keys()]);
  const sortedNames = Array.from(allNames).sort();

  const report = {
    onlyInLocal: [],
    onlyInProd: [],
    differentCount: []
  };

  sortedNames.forEach(name => {
    const local = localMap.get(name);
    const prod = prodMap.get(name);

    if (local && !prod) {
      report.onlyInLocal.push({ name, count: local.count });
    } else if (!local && prod) {
      report.onlyInProd.push({ name, count: prod.count });
    } else {
      if (local.count !== prod.count) {
        report.differentCount.push({
          name,
          localCount: local.count,
          prodCount: prod.count,
          diff: local.count - prod.count
        });
      }
    }
  });

  console.log('=== 比对报告(仅输出差异) ===');
  console.log(JSON.stringify(report, null, 2));
}

compare();
