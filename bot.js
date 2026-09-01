const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const urls = new Set();

  page.on('request', request => urls.add(request.url()));
  page.on('response', response => urls.add(response.url()));

  console.log('Apro Last Game...');

  try {
    await page.goto('https://www.asianbetsoccer.com/it/lastgame.html', {
      waitUntil: 'commit',
      timeout: 45000
    });
  } catch (e) {
    console.log('goto:', e.message);
  }

  await page.waitForTimeout(5000);

  try {
    const decline = page.locator('#CybotCookiebotDialogBodyButtonDecline');
    if (await decline.count()) {
      await decline.first().click({ force: true, timeout: 5000 });
      console.log('Cookiebot: Solo necessari cliccato');
    }
  } catch (e) {
    console.log('Cookiebot:', e.message);
  }

  await page.waitForTimeout(30000);

  const allUrls = [...urls].sort();

  const tableUrls = allUrls.filter(u =>
    u.includes('/tables/') ||
    u.includes('tablelast')
  );

  fs.writeFileSync('ALL-URLS.txt', allUrls.join('\n'));
  fs.writeFileSync('TABLE-URLS.txt', tableUrls.join('\n'));

  console.log('URL totali:', allUrls.length);
  console.log('URL tabelle:', tableUrls.length);

  tableUrls.forEach(u => console.log('TABLE:', u));

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
