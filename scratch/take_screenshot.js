const puppeteer = require('../react-admin-frontend/node_modules/puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:8000/iboss?cb=1784539120');
  await page.goto('http://localhost:8000/iboss?cb=1784539120', { waitUntil: 'networkidle2' });

  // 检查是否登录
  const isLogin = await page.$('input[id="username"]');
  if (isLogin) {
    console.log('Logging in...');
    await page.type('#username', 'admin');
    await page.type('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  await new Promise(r => setTimeout(r, 3000));

  // 点击“要客分支” Tab
  console.log('Clicking 要客分支 tab...');
  const tabs = await page.$$('.ant-tabs-tab');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('要客分支')) {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 4000));

  const screenshotPath = '/Users/tristan/.gemini/antigravity-ide/brain/5b3b19ae-9ac4-42a1-a06c-b126b71c68e0/key_branches_tab_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved screenshot to ${screenshotPath}`);

  await browser.close();
}

capture().catch(console.error);
