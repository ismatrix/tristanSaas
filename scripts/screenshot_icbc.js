const puppeteer = require('puppeteer');

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:8000/user/login', { waitUntil: 'networkidle2' });

  console.log('Filling login form...');
  await page.type('#username', 'admin');
  await page.type('#password', 'admin');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const targetUrl = 'http://localhost:8000/keyGlobalFamilyTree/653710657653710657?nameCn=%E4%B8%AD%E5%9B%BD%E5%B7%A5%E5%95%86%E9%93%B6%E8%A1%8C%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8';
  console.log(`Navigating to target family tree: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  console.log('Waiting 5 seconds for stats to load...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const screenshotPath = '/Users/tristan/.gemini/antigravity-ide/brain/5b3b19ae-9ac4-42a1-a06c-b126b71c68e0/final_verification_icbc.png';
  console.log(`Capturing screenshot to ${screenshotPath}...`);
  await page.screenshot({ path: screenshotPath });

  console.log('Done!');
  await browser.close();
}

main().catch(console.error);
