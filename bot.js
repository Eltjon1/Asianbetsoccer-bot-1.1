const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/140.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const networkLog = [];

  function interesting(url, type) {
    const u = url.toLowerCase();

    return (
      type === 'xhr' ||
      type === 'fetch' ||
      type === 'script' ||
      u.includes('last') ||
      u.includes('match') ||
      u.includes('game') ||
      u.includes('ajax') ||
      u.includes('json') ||
      u.includes('php')
    );
  }

  page.on('request', request => {
    const type = request.resourceType();
    const url = request.url();

    if (interesting(url, type)) {
      networkLog.push({
        event: 'REQUEST',
        method: request.method(),
        type: type,
        url: url,
        postData: request.postData() || null
      });

      console.log(
        '>>',
        request.method(),
        type,
        url
      );
    }
  });

  page.on('response', async response => {
    const request = response.request();
    const type = request.resourceType();
    const url = response.url();

    if (!interesting(url, type)) {
      return;
    }

    let contentType = '';
    let body = '';

    try {
      contentType =
        (await response.headerValue('content-type')) || '';

      if (
        contentType.includes('json') ||
        contentType.includes('text') ||
        contentType.includes('javascript') ||
        contentType.includes('html')
      ) {
        body = await response.text();

        if (body.length > 500000) {
          body = body.slice(0, 500000);
        }
      }

    } catch (e) {
      body = '[BODY NON LEGGIBILE]';
    }

    networkLog.push({
      event: 'RESPONSE',
      status: response.status(),
      type: type,
      url: url,
      contentType: contentType,
      body: body
    });

    console.log(
      '<<',
      response.status(),
      type,
      url
    );
  });

  try {

    console.log('Apro AsianBetSoccer...');

    await page.goto(
      'https://www.asianbetsoccer.com/it/lastgame.html',
      {
        waitUntil: 'commit',
        timeout: 45000
      }
    );

    console.log('Navigazione avviata');

    await page.waitForTimeout(8000);

    try {

      const soloNecessari = page.getByText(
        'Solo necessari',
        {
          exact: true
        }
      );

      const count =
        await soloNecessari.count();

      console.log(
        'Pulsanti "Solo necessari" trovati:',
        count
      );

      if (count > 0) {

        await soloNecessari
          .first()
          .click({
            force: true,
            timeout: 10000
          });

        console.log(
          'COOKIE: Solo necessari cliccato'
        );
      }

    } catch (e) {

      console.log(
        'Cookie non gestito:',
        e.message
      );

    }

    console.log(
      'Attendo le chiamate di rete...'
    );

    await page.waitForTimeout(30000);

    try {

      await page.evaluate(async () => {

        await new Promise(resolve => {

          let y = 0;

          const timer = setInterval(() => {

            window.scrollBy(0, 600);

            y += 600;

            if (
              y >= document.body.scrollHeight
            ) {
              clearInterval(timer);
              resolve();
            }

          }, 250);

        });

      });

    } catch (e) {

      console.log(
        'Scroll non eseguito:',
        e.message
      );

    }

    await page.waitForTimeout(5000);

    await page
      .evaluate(() => window.scrollTo(0, 0))
      .catch(() => {});

    await page.screenshot({
      path: 'lastgame.png',
      fullPage: true,
      timeout: 30000
    });

    console.log('Screenshot salvato');

    const html =
      await page.content();

    fs.writeFileSync(
      'lastgame.html',
      html,
      'utf8'
    );

    const bodyText =
      await page
        .locator('body')
        .innerText()
        .catch(() => '');

    fs.writeFileSync(
      'page-text.txt',
      bodyText,
      'utf8'
    );

    console.log('Pagina salvata');

  } catch (e) {

    console.log(
      'ERRORE PRINCIPALE:',
      e.message
    );

    try {

      await page.screenshot({
        path: 'error.png',
        fullPage: true,
        timeout: 20000
      });

    } catch (_) {}

  }

  fs.writeFileSync(
    'network-log.json',
    JSON.stringify(
      networkLog,
      null,
      2
    ),
    'utf8'
  );

  const urls = [
    ...new Set(
      networkLog.map(x => x.url)
    )
  ];

  fs.writeFileSync(
    'network-urls.txt',
    urls.join('\n'),
    'utf8'
  );

  console.log(
    'NETWORK LOG SALVATO:',
    networkLog.length,
    'eventi'
  );

  console.log(
    'URL DI RETE SALVATI:',
    urls.length
  );

  await browser.close();

  console.log('FINE');

})().catch(err => {

  console.error(
    'ERRORE FATALE:',
    err
  );

  process.exitCode = 1;

});
