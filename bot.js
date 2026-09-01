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
  const importantResponses = [];

  function saveNetworkFiles() {
    fs.writeFileSync(
      'network-log.json',
      JSON.stringify(networkLog, null, 2),
      'utf8'
    );

    const urls = [...new Set(networkLog.map(x => x.url).filter(Boolean))];

    fs.writeFileSync(
      'network-urls.txt',
      urls.join('\n'),
      'utf8'
    );

    fs.writeFileSync(
      'important-responses.json',
      JSON.stringify(importantResponses, null, 2),
      'utf8'
    );
  }

  // ===============================
  // REQUEST
  // ===============================

  page.on('request', request => {
    const type = request.resourceType();

    if (
      type === 'xhr' ||
      type === 'fetch' ||
      type === 'document' ||
      type === 'script'
    ) {
      networkLog.push({
        event: 'REQUEST',
        timestamp: new Date().toISOString(),
        method: request.method(),
        type: type,
        url: request.url(),
        postData: request.postData() || null
      });

      if (type === 'xhr' || type === 'fetch') {
        console.log(
          '>>>',
          request.method(),
          type,
          request.url()
        );
      }
    }
  });

  // ===============================
  // RESPONSE
  // ===============================

  page.on('response', async response => {
    const request = response.request();
    const type = request.resourceType();

    if (
      type !== 'xhr' &&
      type !== 'fetch'
    ) {
      return;
    }

    const url = response.url();

    let contentType = '';
    let body = '';

    try {
      contentType =
        (await response.headerValue('content-type')) || '';
    } catch (_) {}

    try {
      body = await response.text();

      // Limite 1 MB per risposta
      if (body.length > 1000000) {
        body = body.slice(0, 1000000);
      }
    } catch (_) {
      body = '[BODY NON DISPONIBILE]';
    }

    const item = {
      timestamp: new Date().toISOString(),
      status: response.status(),
      method: request.method(),
      type: type,
      url: url,
      contentType: contentType,
      postData: request.postData() || null,
      body: body
    };

    importantResponses.push(item);

    console.log(
      '<<<',
      response.status(),
      type,
      url
    );
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

      console.log('Navigazione avviata');
    } catch (e) {
      console.log(
        'Goto timeout/errore, continuo:',
        e.message
      );
    }

    await
