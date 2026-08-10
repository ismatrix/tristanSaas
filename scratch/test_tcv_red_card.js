const puppeteer = require('/Users/tristan/Workspaces/github/node-express-boilerplate/react-admin-frontend/node_modules/puppeteer');

async function runTest() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  const targetUrl = 'http://localhost:8000/keyGlobalFamilyTree/653710657653710657?nameCn=%E4%B8%AD%E5%9B%BD%E5%B7%A5%E5%95%86%E9%93%B6%E8%A1%8C%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8&cb=1784615360';
  console.log('Navigating to:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // 检查是否重定向到登录页
  const isLogin = await page.$('input[id="username"]');
  if (isLogin) {
    console.log('Logging in...');
    await page.type('#username', 'admin');
    await page.type('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  await new Promise(r => setTimeout(r, 3000));

  // 点击“家族树” Tab
  console.log('Clicking 家族树 tab...');
  const tabs = await page.$$('.ant-tabs-tab');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('家族树')) {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 4000));

  // 截全屏图查看浅红节点
  const screenshotPath1 = '/Users/tristan/.gemini/antigravity-ide/brain/5b3b19ae-9ac4-42a1-a06c-b126b71c68e0/verify_tcv_red_nodes.png';
  await page.screenshot({ path: screenshotPath1, fullPage: false });
  console.log(`Saved tree screenshot to ${screenshotPath1}`);

  await browser.close();
}

runTest().catch(console.error);
