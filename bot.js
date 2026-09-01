const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 }
  });

  await page.goto(
    'https://www.asianbetsoccer.com/it/lastgame.html',
    { waitUntil: 'networkidle', timeout: 120000 }
  );

  await page.waitForTimeout(15000);

  await page.screenshot({
    path: 'lastgame.png',
    fullPage: true
  });

  const html = await page.content();
  fs.writeFileSync('lastgame.html', html);

  console.log('Pagina salvata correttamente');

  await browser.close();
})();
