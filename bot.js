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

  const requests = [];
  const responses = [];

  function safeWrite(name, data) {
    try {
      fs.writeFileSync(name, data, 'utf8');
    } catch (e) {
      console.log(`Errore scrittura ${name}:`, e.message);
    }
  }

  page.on('request', req => {
    const type = req.resourceType();

    if (['xhr', 'fetch', 'document', 'script'].includes(type)) {
      requests.push({
        event: 'REQUEST',
        method: req.method(),
        type,
        url: req.url(),
        postData: req.postData() || null
      });
    }
  });

  page.on('response', async res => {
    const req = res.request();
    const type = req.resourceType();

    if (!['xhr', 'fetch'].includes(type)) {
      return;
    }

    let contentType = '';
    let body = '';

    try {
      contentType = (await res.headerValue('content-type')) || '';
    } catch (_) {}

    try {
      body = await res.text();

      if (body.length > 500000) {
        body = body.slice(0, 500000);
      }
    } catch (_) {
      body = '[BODY NON DISPONIBILE]';
    }

    responses.push({
      event: 'RESPONSE',
      status: res.status(),
      method: req.method(),
      type,
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

      console.log('Navigazione avviata');
    } catch (e) {
      console.log(
        'Goto non completato:',
        e.message
      );
    }

    await page.waitForTimeout(8000);

    // Gestione Cookiebot
    let cookieClosed = false;

    const selectors = [
      '#CybotCookiebotDialogBodyButtonDecline',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      'button:has-text("Solo necessari")'
    ];

    for (const selector of selectors) {
      if (cookieClosed) {
        break;
      }

      try {
        const btn = page
          .locator(selector)
          .first();

        if (
          await btn.isVisible({
            timeout: 2000
          })
        ) {
          await btn.click({
            force: true,
            timeout: 5000
          });

          cookieClosed = true;

          console.log(
            'Cookiebot chiuso con:',
            selector
          );
        }
      } catch (_) {}
    }

    // Cerca anche dentro eventuali iframe
    if (!cookieClosed) {
      for (const frame of page.frames()) {
        try {
          const btn = frame
            .getByText(
              'Solo necessari',
              { exact: true }
            )
            .first();

          if (
            await btn.isVisible({
              timeout: 1500
            })
          ) {
            await btn.click({
              force: true,
              timeout: 5000
            });

            cookieClosed = true;

            console.log(
              'Cookiebot chiuso dentro iframe'
            );

            break;
          }
        } catch (_) {}
      }
    }

    // Fallback: rimuove solo l'overlay
    if (!cookieClosed) {
      try {
        await page.evaluate(() => {
          const ids = [
            'CybotCookiebotDialog',
            'CybotCookiebotDialogBodyUnderlay'
          ];

          for (const id of ids) {
            const el =
              document.getElementById(id);

            if (el) {
              el.style.display = 'none';
            }
          }

          document.documentElement.style.overflow =
            'auto';

          document.body.style.overflow =
            'auto';
        });

        console.log(
          'Cookiebot nascosto come fallback'
        );
      } catch (_) {}
    }

    await page.waitForTimeout(3000);

    console.log(
      'Attendo caricamento dinamico...'
    );

    await page.waitForTimeout(30000);

    // Scroll per attivare eventuali caricamenti lazy
    try {
      await page.evaluate(() => {
        window.scrollTo(
          0,
          document.body.scrollHeight
        );
      });

      await page.waitForTimeout(3000);

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
    } catch (_) {}

    await page.waitForTimeout(5000);

    // Screenshot
    try {
      await page.screenshot({
        path: 'lastgame.png',
        fullPage: true,
        timeout: 30000
      });

      console.log(
        'Screenshot salvato'
      );
    } catch (e) {
      console.log(
        'Screenshot fallito:',
        e.message
      );
    }

    // HTML
    try {
      const html =
        await page.content();

      safeWrite(
        'lastgame.html',
        html
      );

      console.log(
        'HTML salvato'
      );
    } catch (e) {
      console.log(
        'HTML fallito:',
        e.message
      );
    }

    // Testo visibile
    try {
      const text =
        await page
          .locator('body')
          .innerText({
            timeout: 10000
          });

      safeWrite(
        'page-text.txt',
        text
      );

      console.log(
        'Testo salvato'
      );
    } catch (e) {
      console.log(
        'Testo fallito:',
        e.message
      );
    }

  } catch (e) {
    console.log(
      'Errore generale:',
      e.message
    );
  }

  // Salvataggio rete
  const allNet = [
    ...requests,
    ...responses
  ];

  safeWrite(
    'network-log.json',
    JSON.stringify(
      allNet,
      null,
      2
    )
  );

  safeWrite(
    'responses.json',
    JSON.stringify(
      responses,
      null,
      2
    )
  );

  safeWrite(
    'network-urls.txt',
    [
      ...new Set(
        allNet
          .map(x => x.url)
          .filter(Boolean)
      )
    ].join('\n')
  );

  safeWrite(
    'debug.txt',
    [
      `URL finale: ${page.url()}`,
      `Richieste registrate: ${requests.length}`,
      `Risposte XHR/fetch: ${responses.length}`
    ].join('\n')
  );

  console.log(
    'Richieste registrate:',
    requests.length
  );

  console.log(
    'Risposte XHR/fetch:',
    responses.length
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
