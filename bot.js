const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const net = [];

  page.on('request', req => {
    const t = req.resourceType();

    if (['xhr', 'fetch', 'document', 'script'].includes(t)) {
      net.push({
        event: 'REQUEST',
        method: req.method(),
        type: t,
        url: req.url(),
        postData: req.postData() || null
      });
    }
  });

  page.on('response', async res => {
    const req = res.request();
    const t = req.resourceType();

    if (!['xhr', 'fetch'].includes(t)) return;

    let body = '';
    let contentType = '';

    try {
      contentType = (await res.headerValue('content-type')) || '';
    } catch {}

    try {
      body = await res.text();
    } catch {
      body = '[BODY NON DISPONIBILE]';
    }

    if (body.length > 500000) {
      body = body.slice(0, 500000);
    }

    net.push({
      event: 'RESPONSE',
      status: res.status(),
      method: req.method(),
      type: t,
      url: res.url(),
      contentType,
      postData: req.postData() || null,
      body
    });
  });

  try {
    console.log('Apro AsianBetSoccer...');

    try {
      await page.goto(
        'https://www.asianbetsoccer.com/it/lastgame.html',
        {
          waitUntil: 'commit',
          timeout: 45000
        }
      );
    } catch (e) {
      console.log('Goto:', e.message);
    }

    await page.waitForTimeout(8000);

    try {
      const b = page.getByText('Solo necessari', {
        exact: true
      });

      if (await b.count()) {
        await b.first().click({
          force: true,
          timeout: 10000
        });

        console.log('Cookie chiuso');
      }
    } catch (e) {
      console.log('Cookie:', e.message);
    }

    await page.waitForTimeout(30000);

    await page.screenshot({
      path: 'lastgame.png',
      fullPage: true
    }).catch(() => {});

    fs.writeFileSync(
      'lastgame.html',
      await page.content(),
      'utf8'
    );

    const txt = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    fs.writeFileSync(
      'page-text.txt',
      txt,
      'utf8'
    );

  } catch (e) {
    console.log(
      'Errore generale:',
      e.message
    );
  }

  fs.writeFileSync(
    'network-log.json',
    JSON.stringify(net, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    'network-urls.txt',
    [...new Set(net.map(x => x.url).filter(Boolean))].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    'debug.txt',
    `URL finale: ${page.url()}\nEventi rete: ${net.length}\n`,
    'utf8'
  );

  await browser.close();

  console.log('FINE');

})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
