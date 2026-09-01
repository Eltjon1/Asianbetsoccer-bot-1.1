const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const networkLog = [];

  // -------------------------------
  // REGISTRA LE RICHIESTE
  // -------------------------------
  page.on('request', request => {
    const type = request.resourceType();
    const url = request.url();

    if (
      type === 'xhr' ||
      type === 'fetch' ||
      type === 'script' ||
      url.toLowerCase().includes('last') ||
      url.toLowerCase().includes('match') ||
      url.toLowerCase().includes('game') ||
      url.toLowerCase().includes('ajax') ||
      url.toLowerCase().includes('json') ||
      url.toLowerCase().includes('php')
    ) {
      networkLog.push({
        event: 'REQUEST',
        method: request.method(),
        type: type,
        url: url,
        postData: request.postData() || null
      });

      console.log('>>', request.method(), type, url);
    }
  });

  // -------------------------------
  // REGISTRA LE RISPOSTE
  // -------------------------------
  page.on('response', async response => {
    try {
      const request = response.request();
      const type = request.resourceType();
      const url = response.url();

      if (
        type === 'xhr' ||
        type === 'fetch' ||
        url.toLowerCase().includes('last') ||
        url.toLowerCase().includes('match') ||
        url.toLowerCase().includes('game') ||
        url.toLowerCase().includes('ajax') ||
        url.toLowerCase().includes('json') ||
        url.toLowerCase().includes('php')
      ) {
        const contentType =
          (await response.headerValue('content-type')) || '';

        let body = '';

        try {
          if (
            contentType.includes('json') ||
            contentType.includes('text') ||
            contentType.includes('javascript') ||
            contentType.includes('html')
          ) {
            body = await response.text();

            // Evitiamo file giganteschi
            if (body.length > 500000) {
              body = body.substring(0, 500000);
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
      }
    } catch (e) {
      console.log('Errore lettura response:', e.message);
    }
  });

  try {
    console.log('Apro AsianBetSoccer...');

    await page.goto(
      'https://www.asianbetsoccer.com/it/lastgame.html',
      {
        waitUntil: 'domcontentloaded',
        timeout: 120000
      }
    );

    console.log('Pagina aperta');

    // Cookie
    await page.waitForTimeout(3000);

    try {
      const soloNecessari = page.getByText(
        'Solo necessari',
        { exact: true }
      );

      const count = await soloNecessari.count();

      console.log(
        'Pulsanti "Solo necessari" trovati:',
        count
      );

      if (count > 0) {
        await soloNecessari.first().click({
          timeout: 10000
        });

        console.log('COOKIE: Solo necessari cliccato');
      }
    } catch (e) {
      console.log(
        'Cookie non cliccato:',
        e.message
      );
    }

    console.log('Attendo caricamento dati...');

    // Diamo parecchio tempo alle chiamate AJAX
    await page.waitForTimeout(30000);

    // Scroll per attivare eventuali lazy-load
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;

        const distance = 500;

        const timer = setInterval(() => {
          window.scrollBy(0, distance);

          totalHeight += distance;

          if (
            totalHeight >=
            document.body.scrollHeight
          ) {
            clear
